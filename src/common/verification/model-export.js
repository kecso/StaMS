/*globals define*/
/*eslint-env node, browser*/
/**
 * Export a GME Machine subtree to stams.verification-model.v1 JSON.
 */
define([
    'stams/gme-helpers',
    'stams/verification/expr-ast'
], function (GmeHelpers, ExprAst) {
    'use strict';

    var SCHEMA = 'stams.verification-model.v1';

    function attr(core, node, name, fallback) {
        var value = core.getAttribute(node, name);
        return value === undefined || value === null ? fallback : value;
    }

    function pointerName(core, node, pointer, pathIndex) {
        var target = GmeHelpers.getPointerTarget(core, node, pointer, pathIndex);
        return target ? attr(core, target, 'name', null) : null;
    }

    function transitionId(source, event, target) {
        return source + ':' + event + ':' + target;
    }

    function exportMachine(core, machineNode, subtreeNodes) {
        var pathIndex = subtreeNodes ? GmeHelpers.buildPathIndex(core, subtreeNodes) : null;
        function childrenOfType(typeName) {
            if (subtreeNodes) {
                return subtreeNodes.filter(function (node) {
                    return core.getParent(node) === machineNode &&
                        GmeHelpers.isTypeOf(core, node, typeName);
                });
            }
            return GmeHelpers.getChildrenOfType(core, machineNode, typeName);
        }

        var machineName = attr(core, machineNode, 'name', 'Machine'),
            variables = [],
            events = [],
            actions = {},
            guards = {},
            states = [],
            transitions = [];

        childrenOfType('Variable').forEach(function (variableNode) {
            var variable = {
                name: attr(core, variableNode, 'name', ''),
                type: attr(core, variableNode, 'type', 'int')
            };
            var initRaw = attr(core, variableNode, 'initExpr', null);
            if (initRaw) {
                var initBody = ExprAst.parseBodyJson(initRaw);
                if (initBody && initBody.expr) {
                    variable.init = typeof initBody.expr === 'string'
                        ? ExprAst.parseExprSource(initBody.expr)
                        : initBody.expr;
                }
            }
            variables.push(variable);
        });

        childrenOfType('Event').forEach(function (eventNode) {
            events.push(attr(core, eventNode, 'name', ''));
        });

        childrenOfType('Action').forEach(function (actionNode) {
            var name = attr(core, actionNode, 'name', '');
            actions[name] = {
                statements: ExprAst.bodyToStatements(attr(core, actionNode, 'body', null))
            };
        });

        childrenOfType('Guard').forEach(function (guardNode) {
            var name = attr(core, guardNode, 'name', '');
            guards[name] = {
                expr: ExprAst.guardBodyToExpr(attr(core, guardNode, 'body', null))
            };
        });

        childrenOfType('State').forEach(function (stateNode) {
            states.push({
                name: attr(core, stateNode, 'name', ''),
                isInitial: !!attr(core, stateNode, 'isInitial', false),
                isFinal: !!attr(core, stateNode, 'isFinal', false),
                entry: pointerName(core, stateNode, 'entry', pathIndex),
                run: pointerName(core, stateNode, 'run', pathIndex),
                exit: pointerName(core, stateNode, 'exit', pathIndex)
            });
        });

        childrenOfType('Transition').forEach(function (transitionNode) {
            var source = pointerName(core, transitionNode, 'src', pathIndex),
                target = pointerName(core, transitionNode, 'dst', pathIndex),
                event = pointerName(core, transitionNode, 'event', pathIndex);
            if (!source || !target || !event) {
                return;
            }
            transitions.push({
                id: transitionId(source, event, target),
                source: source,
                target: target,
                event: event,
                guard: pointerName(core, transitionNode, 'guard', pathIndex),
                action: pointerName(core, transitionNode, 'action', pathIndex)
            });
        });

        return {
            name: machineName,
            variables: variables,
            events: events,
            actions: actions,
            guards: guards,
            states: states,
            transitions: transitions
        };
    }

    function exportFromRoot(core, rootNode, machineName) {
        var machines = GmeHelpers.collectNodesOfType(core, rootNode, 'Machine');
        return exportMachines(core, machines, machineName);
    }

    function exportMachines(core, machines, machineName, subtreeNodes) {
        if (machineName) {
            machines = machines.filter(function (node) {
                return attr(core, node, 'name', '') === machineName;
            });
        }
        if (machines.length === 0) {
            throw new Error(machineName
                ? 'Machine not found: ' + machineName
                : 'No Machine nodes under project root');
        }
        return {
            $schema: SCHEMA,
            version: 1,
            machines: machines.map(function (machineNode) {
                return exportMachine(core, machineNode, subtreeNodes);
            })
        };
    }

    function findMachine(core, rootNode, machineName) {
        var machines = GmeHelpers.collectNodesOfType(core, rootNode, 'Machine');
        if (!machineName) {
            return machines[0] || null;
        }
        for (var i = 0; i < machines.length; i += 1) {
            if (attr(core, machines[i], 'name', '') === machineName) {
                return machines[i];
            }
        }
        return null;
    }

    return {
        SCHEMA: SCHEMA,
        exportFromRoot: exportFromRoot,
        exportMachines: exportMachines,
        exportMachine: exportMachine,
        findMachine: findMachine
    };
});
