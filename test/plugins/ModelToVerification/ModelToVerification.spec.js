/*eslint-env node, mocha*/
/**
 * ModelToVerification + SimulateMachine on turnstile model.
 */

describe('ModelToVerification plugin', function () {
    this.timeout(20000);
    var testFixture = require('../../globals'),
        gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('ModelToVerification'),
        fs = require('fs'),
        path = require('path'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        projectName = 'verificationProject',
        turnstile = fs.readFileSync(path.join(__dirname, '../../../examples/turnstile.sm'), 'utf8'),
        project,
        gmeAuth,
        storage,
        commitHash;

    before(function (done) {
        if (process.env.TEST_MONGO_URI) {
            gmeConfig.mongo.uri = process.env.TEST_MONGO_URI;
        }
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: testFixture.path.join(__dirname, '../../../src/seeds/StateMachine/StateMachine.webgmex'),
                    projectName: projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                });
            })
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                return project.createBranch('test', commitHash);
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            .then(function () {
                return gmeAuth.unload();
            })
            .nodeify(done);
    });

    function runPlugin(pluginName, config, done) {
        project.getBranchHash('test')
            .then(function (branchHash) {
                var manager = new PluginCliManager(null, logger, gmeConfig),
                    context = {
                        project: project,
                        commitHash: branchHash,
                        branchName: 'test',
                        activeNode: '/1'
                    };
                manager.executePlugin(pluginName, config, context, done);
            })
            .catch(done);
    }

    it('exports verification model with action bodies from TextToModel', function (done) {
        runPlugin('TextToModel', { text: turnstile }, function (err, textResult) {
            if (err) {
                return done(err);
            }
            expect(textResult.success).to.equal(true);

            var Q = testFixture.Q,
                Core = testFixture.requirejs('common/core/coreQ'),
                core = new Core(project, { globConf: gmeConfig, logger: logger }),
                ModelExport = testFixture.requirejs('stams/verification/model-export'),
                GmeHelpers = testFixture.requirejs('stams/gme-helpers');

            project.getBranchHash('test')
                .then(function (branchHash) {
                    return Q.ninvoke(project, 'loadObject', branchHash);
                })
                .then(function (commitObj) {
                    return core.loadRoot(commitObj.root);
                })
                .then(function (root) {
                    return core.loadSubTree(root).then(function (nodes) {
                        return { root: root, nodes: nodes };
                    });
                })
                .then(function (loaded) {
                    var root = loaded.root,
                        nodes = loaded.nodes;
                    var byType = {};
                    nodes.forEach(function (node) {
                        var metaNode = core.getMetaType(node),
                            typeName = metaNode ? core.getAttribute(metaNode, 'name') : '(none)';
                        byType[typeName] = byType[typeName] || [];
                        byType[typeName].push({
                            name: core.getAttribute(node, 'name'),
                            path: core.getPath(node)
                        });
                    });
                    function instances(typeName) {
                        return (byType[typeName] || []).filter(function (entry) {
                            return entry.path.indexOf('/G/') !== 0 && entry.path !== '/G';
                        });
                    }
                    var machineNodes = nodes.filter(function (node) {
                        var metaNode = core.getMetaType(node),
                            typeName = metaNode ? core.getAttribute(metaNode, 'name') : '(none)',
                            path = core.getPath(node);
                        return typeName === 'Machine' && path.indexOf('/G/') !== 0 && path !== '/G';
                    });
                    expect(machineNodes.length).to.equal(1);

                    var model = ModelExport.exportMachines(core, machineNodes, 'Turnstile', nodes);
                    expect(model.$schema).to.equal('stams.verification-model.v1');
                    expect(model.machines[0].actions.unlock.statements).to.have.length(1);
                    expect(model.machines[0].guards.canUnlock.expr.kind).to.equal('binary');
                })
                .nodeify(done);
        });
    });

    it('simulates turnstile coin/push sequence into trace artifact', function (done) {
        runPlugin('TextToModel', { text: turnstile }, function (err) {
            if (err) {
                return done(err);
            }
            runPlugin('SimulateMachine', {
                machineName: 'Turnstile',
                events: '["coin","push"]'
            }, function (err2, simResult) {
                if (err2) {
                    return done(err2);
                }
                var Q = testFixture.Q,
                    Core = testFixture.requirejs('common/core/coreQ'),
                    core = new Core(project, { globConf: gmeConfig, logger: logger });

                project.getBranchHash('test')
                    .then(function (branchHash) {
                        return Q.ninvoke(project, 'loadObject', branchHash);
                    })
                    .then(function (commitObj) {
                        return core.loadRoot(commitObj.root);
                    })
                    .then(function (root) {
                        var json = core.getRegistry(root, 'stams/trace');
                        expect(simResult.success).to.equal(true);
                        var trace = JSON.parse(json);
                        expect(trace.$schema).to.equal('stams.trace.v1');
                        expect(trace.steps).to.have.length(2);
                        expect(trace.steps[1].after.state).to.equal('Locked');
                    })
                    .nodeify(done);
            });
        });
    });
});
