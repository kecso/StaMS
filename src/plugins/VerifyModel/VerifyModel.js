/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers',
    'stams/verification/model-export',
    'stams/verification/constraints-export',
    'stams/verification/bounded-verifier',
    'stams/verification/settings',
    'stams/verification/verifier'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    GmeHelpers,
    ModelExport,
    ConstraintsExport,
    Verifier,
    VerificationSettings
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function VerifyModel() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    VerifyModel.metadata = pluginMetadata;
    VerifyModel.prototype = Object.create(PluginBase.prototype);
    VerifyModel.prototype.constructor = VerifyModel;

    function verificationSettings() {
        var cfg = VerificationSettings || {};
        var registry = cfg.registry || {};
        return {
            maxDepth: typeof cfg.maxDepth === 'number' ? cfg.maxDepth : 12,
            timeoutMs: typeof cfg.timeoutMs === 'number' ? cfg.timeoutMs : 30000,
            engine: cfg.engine || 'auto',
            registryKey: registry.result || 'stams/verification-result',
            z3: cfg.z3 || {}
        };
    }

    VerifyModel.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig(),
            machineName = (config.machineName || '').trim() || null,
            settings = verificationSettings(),
            registryKey = (config.registryKey || settings.registryKey).trim();

        self.result.setSuccess(false);

        self.core.loadSubTree(self.rootNode)
            .then(function (nodes) {
                var machines = nodes.filter(function (node) {
                    var path = self.core.getPath(node);
                    if (path.indexOf('/G/') === 0 || path === '/G') {
                        return false;
                    }
                    return GmeHelpers.getMetaType(self.core, node) === 'Machine';
                });
                var model = ModelExport.exportMachines(self.core, machines, machineName, nodes);
                var constraintsDoc = ConstraintsExport.exportMachines(self.core, machines, machineName);
                var targetMachine = machineName || (model.machines[0] && model.machines[0].name);
                var result = Verifier.verify(model, constraintsDoc, targetMachine, settings);
                var json = JSON.stringify(result, null, 2);
                self.core.setRegistry(self.rootNode, registryKey, json);

                var passed = result.results.filter(function (r) {
                    return r.passed;
                }).length;
                self.createMessage(
                    null,
                    'Verified ' + result.results.length + ' constraint(s): ' +
                        passed + ' passed, ' + (result.results.length - passed) + ' failed (bound ' +
                        result.bound + ').',
                    'info'
                );
                return self.addArtifact('verification-result', { 'verification-result.json': json });
            })
            .then(function () {
                return new Promise(function (resolve, reject) {
                    self.save('verify-model', function (saveErr) {
                        if (saveErr) {
                            reject(saveErr);
                        } else {
                            resolve();
                        }
                    });
                });
            })
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                self.createMessage(null, err.message || String(err), 'error');
                callback(err, self.result);
            });
    };

    VerifyModel.configStructure = pluginMetadata.configStructure;
    return VerifyModel;
});
