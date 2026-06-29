/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/sm-langium'
], function (PluginConfig, pluginMetadata, PluginBase, SmLangium) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function TextToModel() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    TextToModel.metadata = pluginMetadata;
    TextToModel.prototype = Object.create(PluginBase.prototype);
    TextToModel.prototype.constructor = TextToModel;

    // Cross-references are guaranteed linked here: main() fails earlier on any
    // error-severity diagnostic (which includes Langium linking errors), so a
    // present optional reference always has a resolved `.ref`.
    function refName(ref) {
        return ref ? ref.ref.name : undefined;
    }

    function optionalPointer(core, node, pointerName, target) {
        if (target) {
            core.setPointer(node, pointerName, target);
        }
    }

    function metaTypeName(core, node) {
        var metaNode = node ? core.getMetaType(node) : null;
        return metaNode ? core.getAttribute(metaNode, 'name') : null;
    }

    function removeDirectMachineChildren(core, rootNode) {
        return core.loadChildren(rootNode).then(function (children) {
            children.forEach(function (child) {
                if (metaTypeName(core, child) === 'Machine') {
                    core.deleteNode(child);
                }
            });
        });
    }

    /**
     * Parse `.sm` text from plugin config (Langium) and build flat Machine subgraphs.
     */
    TextToModel.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            config = self.getCurrentConfig(),
            content = config.text || '';

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        function fail(message) {
            self.createMessage(null, message, 'error');
            callback(new Error(message), self.result);
        }

        self.result.setSuccess(false);

        if (!content.trim()) {
            core.setRegistry(self.rootNode, 'TextToModel_bootstrap', Date.now().toString());
            return self.save('bootstrap', finish);
        }

        SmLangium.parseSm(content, 'memory:///document.sm')
            .then(function (parsed) {
                if (SmLangium.hasSyntaxErrors(parsed.document)) {
                    self.createMessage(
                        null,
                        'Syntax errors:\n' + SmLangium.formatSyntaxErrors(parsed.document),
                        'error'
                    );
                    fail('Langium reported syntax errors');
                    return;
                }

                if (SmLangium.hasParseErrors(parsed.diagnostics)) {
                    self.createMessage(
                        null,
                        'Validation/linking errors:\n' + SmLangium.formatDiagnostics(parsed.diagnostics),
                        'error'
                    );
                    fail('Langium reported validation/linking errors');
                    return;
                }

                return removeDirectMachineChildren(core, self.rootNode).then(function () {
                    buildMachines(parsed);
                    self.save('text-to-model', finish);
                });
            })
            .catch(function (err) {
                self.logger.error('TextToModel failed: ' + (err && err.stack ? err.stack : err));
                fail(err && err.message ? err.message : 'TextToModel failed');
            });

        function buildMachines(parsed) {
            parsed.model.machines.forEach(function (machine) {
                    var actions = {},
                        states = {},
                        events = {},
                        guards = {},
                        machineNode = self.core.createNode({parent: self.rootNode, base: self.META['Machine']});

                    self.core.setAttribute(machineNode, 'name', machine.name);

                    machine.variablesBlock?.variables.forEach(function (variable) {
                        var variableNode = self.core.createNode({parent: machineNode, base: self.META['Variable']});
                        self.core.setAttribute(variableNode, 'name', variable.name);
                        self.core.setAttribute(variableNode, 'type', variable.type);
                        if (variable.init) {
                            self.core.setAttribute(variableNode, 'initExpr', String(variable.init));
                        }
                    });

                    machine.eventsBlock?.events.forEach(function (event) {
                        var eventNode = self.core.createNode({parent: machineNode, base: self.META['Event']});
                        self.core.setAttribute(eventNode, 'name', event.name);
                        events[event.name] = eventNode;
                    });

                    machine.actionsBlock?.actions.forEach(function (action) {
                        var actionNode = self.core.createNode({parent: machineNode, base: self.META['Action']});
                        self.core.setAttribute(actionNode, 'name', action.name);
                        actions[action.name] = actionNode;
                    });

                    machine.guardsBlock?.guards.forEach(function (guard) {
                        var guardNode = self.core.createNode({parent: machineNode, base: self.META['Guard']});
                        self.core.setAttribute(guardNode, 'name', guard.name);
                        guards[guard.name] = guardNode;
                    });

                    machine.constraintsBlock?.constraints.forEach(function (constraint) {
                        var constraintNode = self.core.createNode({parent: machineNode, base: self.META['Constraint']});
                        self.core.setAttribute(constraintNode, 'name', constraint.name);
                        self.core.setAttribute(constraintNode, 'kind', constraint.kind);
                    });

                    machine.states.forEach(function (state) {
                        var stateNode = self.core.createNode({parent: machineNode, base: self.META['State']});
                        self.core.setAttribute(stateNode, 'name', state.name);
                        self.core.setAttribute(stateNode, 'isInitial', !!state.isInitial);
                        self.core.setAttribute(stateNode, 'isFinal', !!state.isFinal);
                        optionalPointer(core, stateNode, 'entry', actions[refName(state.entry)]);
                        optionalPointer(core, stateNode, 'run', actions[refName(state.run)]);
                        optionalPointer(core, stateNode, 'exit', actions[refName(state.exit)]);
                        states[state.name] = stateNode;
                    });

                    machine.states.forEach(function (state) {
                        var stateNode = states[state.name];
                        state.transitions.forEach(function (transition) {
                            var transitionNode = self.core.createNode({parent: machineNode, base: self.META['Transition']}),
                                targetName = refName(transition.target);
                            self.core.setPointer(transitionNode, 'src', stateNode);
                            self.core.setPointer(transitionNode, 'dst', states[targetName]);
                            optionalPointer(core, transitionNode, 'event', events[refName(transition.event)]);
                            optionalPointer(core, transitionNode, 'guard', guards[refName(transition.guard)]);
                            optionalPointer(core, transitionNode, 'action', actions[refName(transition.action)]);
                        });
                    });
                });
        }
    };

    TextToModel.configStructure = pluginMetadata.configStructure;
    return TextToModel;
});
