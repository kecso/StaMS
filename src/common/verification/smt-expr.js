/*globals define*/
/*eslint-env node, browser*/
/**
 * Translate expr-ast nodes to SMT-LIB expressions over a variable map.
 * Constraint formulas may reference `state`, `state == StateName`, and `inState(StateName)`.
 */
define([
    'stams/verification/expr-ast'
], function (ExprAst) {
    'use strict';

    function smtSort(typeName) {
        if (typeName === 'bool') {
            return 'Bool';
        }
        if (typeName === 'int') {
            return 'Int';
        }
        if (typeName === 'float') {
            return 'Real';
        }
        return null;
    }

    function literal(expr) {
        if (expr.kind === 'number') {
            var n = expr.value;
            if (Number.isInteger(n)) {
                return String(n);
            }
            return '(/ ' + Math.round(n * 1000) + ' 1000)';
        }
        if (expr.kind === 'bool') {
            return expr.value ? 'true' : 'false';
        }
        if (expr.kind === 'string') {
            return null;
        }
        return null;
    }

    function stateIndex(machine, stateName) {
        for (var i = 0; i < (machine.states || []).length; i += 1) {
            if (machine.states[i].name === stateName) {
                return i;
            }
        }
        return -1;
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

    function encodeStatePredicate(machine, stateSymbol, stateName) {
        var idx = stateIndex(machine, stateName);
        if (idx < 0) {
            return null;
        }
        return '(= ' + stateSymbol + ' ' + idx + ')';
    }

    function tryEncodeStateEquality(expr, machine, stateSymbol, varName) {
        var left = expr.left;
        var right = expr.right;
        var nameExpr = null;

        if (left && left.kind === 'var' && left.name === 'state' && right) {
            nameExpr = right;
        } else if (right && right.kind === 'var' && right.name === 'state' && left) {
            nameExpr = left;
        } else {
            return null;
        }

        var stateName = stateNameFromExpr(nameExpr);
        if (!stateName || stateIndex(machine, stateName) < 0) {
            return null;
        }
        var pred = encodeStatePredicate(machine, stateSymbol, stateName);
        if (!pred) {
            return null;
        }
        return expr.op === '==' ? pred : '(not ' + pred + ')';
    }

    /**
     * @param {object} expr - expr-ast node
     * @param {function(string): string} varName - maps DSL var to SMT symbol
     * @param {{ machine?: object, stateSymbol?: string }} [ctx]
     */
    function exprToSmt(expr, varName, ctx) {
        ctx = ctx || {};
        var machine = ctx.machine;
        var stateSymbol = ctx.stateSymbol;

        if (!expr || !expr.kind) {
            return null;
        }

        if (machine && stateSymbol) {
            if (expr.kind === 'call' && expr.name === 'inState' && expr.args && expr.args.length === 1) {
                var inStateName = stateNameFromExpr(expr.args[0]);
                return inStateName ? encodeStatePredicate(machine, stateSymbol, inStateName) : null;
            }
            if (expr.kind === 'var' && expr.name === 'state') {
                return stateSymbol;
            }
            if (expr.kind === 'binary' && (expr.op === '==' || expr.op === '!=')) {
                var stateEq = tryEncodeStateEquality(expr, machine, stateSymbol, varName);
                if (stateEq) {
                    return stateEq;
                }
            }
        }

        switch (expr.kind) {
            case 'number':
            case 'bool':
                return literal(expr);
            case 'string':
                return null;
            case 'var':
                return varName(expr.name);
            case 'unary':
                if (expr.op === '!') {
                    var neg = exprToSmt(expr.arg, varName, ctx);
                    return neg ? '(not ' + neg + ')' : null;
                }
                if (expr.op === '-') {
                    var arg = exprToSmt(expr.arg, varName, ctx);
                    return arg ? '(- ' + arg + ')' : null;
                }
                return null;
            case 'binary': {
                var left = exprToSmt(expr.left, varName, ctx);
                var right = exprToSmt(expr.right, varName, ctx);
                if (!left || !right) {
                    return null;
                }
                switch (expr.op) {
                    case '+':
                        return '(+ ' + left + ' ' + right + ')';
                    case '-':
                        return '(- ' + left + ' ' + right + ')';
                    case '*':
                        return '(* ' + left + ' ' + right + ')';
                    case '/':
                        return '(/ ' + left + ' ' + right + ')';
                    case '==':
                        return '(= ' + left + ' ' + right + ')';
                    case '!=':
                        return '(not (= ' + left + ' ' + right + '))';
                    case '<':
                        return '(< ' + left + ' ' + right + ')';
                    case '<=':
                        return '(<= ' + left + ' ' + right + ')';
                    case '>':
                        return '(> ' + left + ' ' + right + ')';
                    case '>=':
                        return '(>= ' + left + ' ' + right + ')';
                    case '&&':
                        return '(and ' + left + ' ' + right + ')';
                    case '||':
                        return '(or ' + left + ' ' + right + ')';
                    default:
                        return null;
                }
            }
            case 'call':
                return null;
            default:
                return null;
        }
    }

    function formulaToSmt(formula, varName, ctx) {
        if (!formula) {
            return 'true';
        }
        if (formula.kind === 'expr') {
            return exprToSmt(formula.expr, varName, ctx) || null;
        }
        if (formula.kind === 'ltl' && formula.op === 'eventually') {
            return formulaToSmt(formula.arg, varName, ctx);
        }
        return null;
    }

    function statementsToSmt(statements, varNameBefore, varNameAfter) {
        var conj = [];
        var envBefore = {};
        (statements || []).forEach(function (stmt) {
            if (stmt.kind === 'assign') {
                var rhs = exprToSmt(stmt.expr, function (name) {
                    return varNameBefore(name);
                });
                if (!rhs) {
                    conj.length = 0;
                    return;
                }
                conj.push('(= ' + varNameAfter(stmt.target) + ' ' + rhs + ')');
                envBefore[stmt.target] = true;
            }
        });
        return conj;
    }

    return {
        smtSort: smtSort,
        exprToSmt: exprToSmt,
        formulaToSmt: formulaToSmt,
        statementsToSmt: statementsToSmt,
        guardBodyToExpr: ExprAst.guardBodyToExpr,
        stateIndex: stateIndex
    };
});
