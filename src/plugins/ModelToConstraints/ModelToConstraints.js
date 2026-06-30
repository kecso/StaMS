/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers',
    'stams/verification/constraints-export'
], function (PluginConfig, pluginMetadata, PluginBase, GmeHelpers, ConstraintsExport) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function ModelToConstraints() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ModelToConstraints.metadata = pluginMetadata;
    ModelToConstraints.prototype = Object.create(PluginBase.prototype);
    ModelToConstraints.prototype.constructor = ModelToConstraints;

    ModelToConstraints.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig(),
            machineName = (config.machineName || '').trim() || null,
            registryKey = (config.registryKey || 'stams/constraints').trim();

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
                var constraints = ConstraintsExport.exportMachines(self.core, machines, machineName);
                var json = JSON.stringify(constraints, null, 2);
                self.core.setRegistry(self.rootNode, registryKey, json);
                self.createMessage(
                    null,
                    'Exported constraints for ' + constraints.machines.length + ' machine(s).',
                    'info'
                );
                return self.addArtifact('constraints', { 'constraints.json': json });
            })
            .then(function () {
                return new Promise(function (resolve, reject) {
                    self.save('constraints-export', function (saveErr) {
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

    ModelToConstraints.configStructure = pluginMetadata.configStructure;
    return ModelToConstraints;
});
