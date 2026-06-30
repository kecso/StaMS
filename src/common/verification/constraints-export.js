/*globals define*/
/*eslint-env node, browser*/
/**
 * Export Constraint nodes to stams.constraints.v1 JSON.
 */
define([
    'stams/gme-helpers',
    'stams/verification/expr-ast'
], function (GmeHelpers, ExprAst) {
    'use strict';

    var SCHEMA = 'stams.constraints.v1';

    function attr(core, node, name, fallback) {
        var value = core.getAttribute(node, name);
        return value === undefined || value === null ? fallback : value;
    }

    function constraintFormula(body, kind) {
        var expr = ExprAst.guardBodyToExpr(body);
        if (kind === 'goal') {
            return {
                kind: 'ltl',
                op: 'eventually',
                arg: { kind: 'expr', expr: expr }
            };
        }
        return { kind: 'expr', expr: expr };
    }

    function exportMachineConstraints(core, machineNode) {
        var constraints = GmeHelpers.getChildrenOfType(core, machineNode, 'Constraint').map(function (node) {
            var kind = attr(core, node, 'kind', 'safety');
            return {
                name: attr(core, node, 'name', ''),
                kind: kind,
                formula: constraintFormula(attr(core, node, 'body', null), kind)
            };
        });
        return {
            name: attr(core, machineNode, 'name', 'Machine'),
            constraints: constraints
        };
    }

    function exportFromRoot(core, rootNode, machineName) {
        var machines = GmeHelpers.collectNodesOfType(core, rootNode, 'Machine');
        return exportMachines(core, machines, machineName);
    }

    function exportMachines(core, machines, machineName) {
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
                return exportMachineConstraints(core, machineNode);
            })
        };
    }

    return {
        SCHEMA: SCHEMA,
        exportFromRoot: exportFromRoot,
        exportMachines: exportMachines,
        exportMachineConstraints: exportMachineConstraints
    };
});
