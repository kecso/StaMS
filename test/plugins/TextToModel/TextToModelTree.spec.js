/*eslint-env node, mocha*/
/**
 * Verifies TextToModel builds a tree the diagram can read:
 * machines under root, states under machine, transition pointers resolvable.
 */

describe('TextToModel tree output', function () {
    this.timeout(20000);
    var testFixture = require('../../globals'),
        gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('TextToModelTree'),
        fs = require('fs'),
        path = require('path'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        projectName = 'treeProject',
        pluginName = 'TextToModel',
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

    it('creates machine + states reachable from root', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            context = {
                project: project,
                commitHash: commitHash,
                branchName: 'test',
                activeNode: '/1'
            };

        manager.executePlugin(pluginName, { text: turnstile }, context, function (err, pluginResult) {
            if (err) {
                return done(err);
            }
            try {
                expect(pluginResult.success).to.equal(true);
            } catch (e) {
                return done(e);
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
                    return core.loadSubTree(root);
                })
                .then(function (nodes) {
                    var byType = {};
                    nodes.forEach(function (node) {
                        var metaNode = core.getMetaType(node),
                            typeName = metaNode ? core.getAttribute(metaNode, 'name') : '(none)';
                        byType[typeName] = byType[typeName] || [];
                        byType[typeName].push({
                            name: core.getAttribute(node, 'name'),
                            path: core.getPath(node),
                            parent: core.getParent(node) ? core.getPath(core.getParent(node)) : null
                        });
                    });
                    // Real model instances live under the machine (path /j/...);
                    // meta-type nodes live under the META container (/G/...).
                    function instances(typeName) {
                        return (byType[typeName] || []).filter(function (entry) {
                            return entry.path.indexOf('/G/') !== 0 && entry.path !== '/G';
                        });
                    }
                    expect(instances('Machine').length).to.equal(1);
                    expect(instances('State').length).to.equal(2);
                    expect(instances('Transition').length).to.equal(4);
                    var machinePath = instances('Machine')[0].path;
                    instances('Transition').forEach(function (transition) {
                        expect(transition.parent).to.equal(machinePath);
                    });
                })
                .nodeify(done);
        });
    });
});
