/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers',
    'stams/verification/model-export'
], function (PluginConfig, pluginMetadata, PluginBase, GmeHelpers, ModelExport) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ModelToVerification() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ModelToVerification.metadata = pluginMetadata;
    ModelToVerification.prototype = Object.create(PluginBase.prototype);
    ModelToVerification.prototype.constructor = ModelToVerification;

    ModelToVerification.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig(),
            machineName = (config.machineName || '').trim() || null,
            registryKey = (config.registryKey || 'stams/verification-model').trim();

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
                var json = JSON.stringify(model, null, 2);
                self.core.setRegistry(self.rootNode, registryKey, json);
                self.createMessage(
                    null,
                    'Exported ' + model.machines.length + ' machine(s) to registry key "' + registryKey + '".',
                    'info'
                );
                return self.addArtifact('verification-model', { 'verification-model.json': json });
            })
            .then(function () {
                return new Promise(function (resolve, reject) {
                    self.save('verification-export', function (saveErr) {
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

    ModelToVerification.configStructure = pluginMetadata.configStructure;
    return ModelToVerification;
});
