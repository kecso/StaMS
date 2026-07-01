/*eslint-env node, mocha*/
/**
 * VerifyModel plugin on turnstile — in-memory IR, registry result only.
 */

describe('VerifyModel plugin', function () {
    this.timeout(20000);
    var testFixture = require('../../globals'),
        gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('VerifyModel'),
        fs = require('fs'),
        path = require('path'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        projectName = 'verifyModelProject',
        turnstile = fs.readFileSync(path.join(__dirname, '../../../examples/turnstile.sm'), 'utf8'),
        project,
        gmeAuth,
        storage,
        commitHash;

    before(function (done) {
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

    it('verifies turnstile constraints and writes registry result', function (done) {
        runPlugin('TextToModel', { text: turnstile }, function (err) {
            if (err) {
                return done(err);
            }
            runPlugin('VerifyModel', { machineName: 'Turnstile' }, function (err2, verifyResult) {
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
                        expect(verifyResult.success).to.equal(true);
                        var json = core.getRegistry(root, 'stams/verification-result');
                        expect(json).to.be.a('string');
                        var doc = JSON.parse(json);
                        expect(doc.$schema).to.equal('stams.verification-result.v1');
                        expect(doc.machine).to.equal('Turnstile');
                        expect(doc.results).to.have.length(2);
                        var byName = {};
                        doc.results.forEach(function (item) {
                            byName[item.name] = item;
                        });
                        expect(byName.noAlarmWhenLocked.status).to.equal('proved');
                        expect(byName.eventuallyUnlocked.passed).to.equal(true);
                    })
                    .nodeify(done);
            });
        });
    });
});
