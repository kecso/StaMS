/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers',
    'stams/verification/model-export',
    'stams/verification/simulation-engine'
], function (PluginConfig, pluginMetadata, PluginBase, GmeHelpers, ModelExport, SimulationEngine) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function SimulateMachine() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    SimulateMachine.metadata = pluginMetadata;
    SimulateMachine.prototype = Object.create(PluginBase.prototype);
    SimulateMachine.prototype.constructor = SimulateMachine;

    function parseEvents(raw) {
        if (!raw || !String(raw).trim()) {
            return [];
        }
        var parsed = JSON.parse(String(raw));
        if (!Array.isArray(parsed)) {
            throw new Error('events must be a JSON array of event names');
        }
        return parsed;
    }

    SimulateMachine.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig(),
            machineName = (config.machineName || '').trim() || null,
            registryKey = (config.registryKey || 'stams/trace').trim(),
            events;

        self.result.setSuccess(false);

        try {
            events = parseEvents(config.events);
        } catch (parseErr) {
            self.createMessage(null, parseErr.message || String(parseErr), 'error');
            return callback(parseErr, self.result);
        }

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
                var targetMachine = machineName || (model.machines[0] && model.machines[0].name);
                var trace = SimulationEngine.simulate(model, targetMachine, events);
                var json = JSON.stringify(trace, null, 2);
                self.core.setRegistry(self.rootNode, registryKey, json);
                self.createMessage(
                    null,
                    'Simulated ' + events.length + ' event(s); trace has ' + trace.steps.length + ' step(s).',
                    'info'
                );
                return self.addArtifact('trace', { 'trace.json': json });
            })
            .then(function () {
                return new Promise(function (resolve, reject) {
                    self.save('simulate-machine', function (saveErr) {
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

    SimulateMachine.configStructure = pluginMetadata.configStructure;
    return SimulateMachine;
});
