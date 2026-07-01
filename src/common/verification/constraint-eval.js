/*globals define*/
/*eslint-env node, browser*/
/**
 * Evaluate constraint formulas against simulation snapshots (expr-ast / small LTL).
 * Supports machine state via `state` (current state name) and `inState(Name)`.
 */
define([
    'stams/verification/expr-ast'
], function (ExprAst) {
    'use strict';

    function stateNames(machine) {
        return (machine && machine.states || []).map(function (state) {
            return state.name;
        });
    }

    function isStateName(machine, name) {
        return stateNames(machine).indexOf(name) >= 0;
    }

    function stateNameFromExpr(expr) {
        if (!expr) {
            return null;
        }
        if (expr.kind === 'string') {
            return expr.value;
        }
        if (expr.kind === 'var') {
            return expr.name;
        }
        return null;
    }

    function buildConstraintEnv(snapshot) {
        return Object.assign({}, snapshot.variables || {}, {
            state: snapshot.state
        });
    }

    function coerceNumber(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        if (typeof value === 'string') {
            var n = parseFloat(value);
            return isNaN(n) ? 0 : n;
        }
        return 0;
    }

    function evaluateConstraintExpr(expr, snapshot, machine) {
        if (!expr || !expr.kind) {
            return null;
        }
        var env = buildConstraintEnv(snapshot);

        switch (expr.kind) {
            case 'number':
            case 'string':
            case 'bool':
                return expr.value;
            case 'var':
                if (expr.name === 'state') {
                    return snapshot.state;
                }
                if (Object.prototype.hasOwnProperty.call(env, expr.name)) {
                    return env[expr.name];
                }
                return null;
            case 'call':
                if (expr.name === 'inState' && expr.args && expr.args.length === 1) {
                    var targetState = stateNameFromExpr(expr.args[0]);
                    return targetState !== null && snapshot.state === targetState;
                }
                throw new Error('Unsupported function in constraint: ' + expr.name);
            case 'unary': {
                var unaryArg = evaluateConstraintExpr(expr.arg, snapshot, machine);
                if (expr.op === '!') {
                    return !unaryArg;
                }
                return -coerceNumber(unaryArg);
            }
            case 'binary': {
                if (expr.op === '==' || expr.op === '!=') {
                    var stateCompare = compareStateEquality(expr, snapshot, machine, expr.op === '==');
                    if (stateCompare !== null) {
                        return stateCompare;
                    }
                }
                var left = evaluateConstraintExpr(expr.left, snapshot, machine);
                var right = evaluateConstraintExpr(expr.right, snapshot, machine);
                switch (expr.op) {
                    case '+':
                        return (typeof left === 'string' || typeof right === 'string')
                            ? String(left) + String(right)
                            : coerceNumber(left) + coerceNumber(right);
                    case '-':
                        return coerceNumber(left) - coerceNumber(right);
                    case '*':
                        return coerceNumber(left) * coerceNumber(right);
                    case '/':
                        return coerceNumber(left) / coerceNumber(right);
                    case '==':
                        return left === right;
                    case '!=':
                        return left !== right;
                    case '<':
                        return coerceNumber(left) < coerceNumber(right);
                    case '<=':
                        return coerceNumber(left) <= coerceNumber(right);
                    case '>':
                        return coerceNumber(left) > coerceNumber(right);
                    case '>=':
                        return coerceNumber(left) >= coerceNumber(right);
                    case '&&':
                        return left && right;
                    case '||':
                        return left || right;
                    default:
                        throw new Error('Unknown binary operator: ' + expr.op);
                }
            }
            default:
                throw new Error('Unknown expression kind: ' + expr.kind);
        }
    }

    /**
     * `state == Locked` / `state != Locked` where Locked is a state name, not a variable.
     */
    function compareStateEquality(expr, snapshot, machine, expectEqual) {
        var left = expr.left;
        var right = expr.right;
        var stateSide = null;
        var nameSide = null;

        if (left && left.kind === 'var' && left.name === 'state' && right) {
            stateSide = 'left';
            nameSide = right;
        } else if (right && right.kind === 'var' && right.name === 'state' && left) {
            stateSide = 'right';
            nameSide = left;
        } else {
            return null;
        }

        var stateName = stateNameFromExpr(nameSide);
        if (!stateName || !isStateName(machine, stateName)) {
            return null;
        }
        var matches = snapshot.state === stateName;
        return expectEqual ? matches : !matches;
    }

    function evaluateExprFormula(formula, snapshot, machine) {
        if (!formula || formula.kind !== 'expr' || !formula.expr) {
            return true;
        }
        return !!evaluateConstraintExpr(formula.expr, snapshot, machine);
    }

    /**
     * @param {object} formula - stams.constraints.v1 formula
     * @param {{ state: string, variables: object }} snapshot
     * @param {object} [machine] - verification model machine (for state names)
     */
    function evaluateFormulaAtSnapshot(formula, snapshot, machine) {
        if (!formula) {
            return true;
        }
        if (formula.kind === 'expr') {
            return evaluateExprFormula(formula, snapshot, machine);
        }
        if (formula.kind === 'ltl' && formula.op === 'eventually') {
            return evaluateFormulaAtSnapshot(formula.arg, snapshot, machine);
        }
        return true;
    }

    return {
        evaluateFormulaAtSnapshot: evaluateFormulaAtSnapshot,
        evaluateConstraintExpr: evaluateConstraintExpr,
        isStateName: isStateName
    };
});
