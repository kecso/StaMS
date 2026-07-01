/*globals define*/
/*eslint-env node, browser*/
/**
 * Bounded model checking encoder: machine semantics -> SMT-LIB2 (unrolling).
 *
 * Public interface:
 *   supportsMachine(machine) -> { ok, reason? }
 *   encodeSafetyViolationQuery(model, machineName, constraint, bound) -> { smt2, logic } | { error }
 *   encodeGoalWitnessQuery(model, machineName, constraint, bound) -> { smt2, logic } | { error }
 */
define([
    'stams/verification/smt-expr'
], function (SmtExpr) {
    'use strict';

    function findMachine(model, machineName) {
        var machines = model.machines || [];
        if (!machineName) {
            return machines[0] || null;
        }
        for (var i = 0; i < machines.length; i += 1) {
            if (machines[i].name === machineName) {
                return machines[i];
            }
        }
        return null;
    }

    function stateIndex(machine, stateName) {
        for (var i = 0; i < machine.states.length; i += 1) {
            if (machine.states[i].name === stateName) {
                return i;
            }
        }
        return -1;
    }

    function initialState(machine) {
        for (var i = 0; i < machine.states.length; i += 1) {
            if (machine.states[i].isInitial) {
                return machine.states[i].name;
            }
        }
        return machine.states[0] && machine.states[0].name;
    }

    function supportsMachine(machine) {
        var i;
        if (!machine || !machine.states || machine.states.length === 0) {
            return { ok: false, reason: 'Machine has no states.' };
        }
        for (i = 0; i < (machine.variables || []).length; i += 1) {
            if (!SmtExpr.smtSort(machine.variables[i].type)) {
                return { ok: false, reason: 'Unsupported variable type: ' + machine.variables[i].type };
            }
            if (machine.variables[i].type === 'string') {
                return { ok: false, reason: 'String variables are not encoded for Z3 yet.' };
            }
        }
        return { ok: true };
    }

    function varSymbol(name, step) {
        return name + '_s' + step;
    }

    function stateSymbol(step) {
        return 'state_s' + step;
    }

    function declareVariables(lines, machine, bound) {
        var step;
        var i;
        lines.push('; state location at each step');
        for (step = 0; step <= bound; step += 1) {
            lines.push('(declare-fun ' + stateSymbol(step) + ' () Int)');
        }
        for (i = 0; i < (machine.variables || []).length; i += 1) {
            var variable = machine.variables[i];
            var sort = SmtExpr.smtSort(variable.type);
            lines.push('; variable ' + variable.name);
            for (step = 0; step <= bound; step += 1) {
                lines.push('(declare-fun ' + varSymbol(variable.name, step) + ' () ' + sort + ')');
            }
        }
    }

    function varNameAt(step) {
        return function (name) {
            return varSymbol(name, step);
        };
    }

    function initialConstraints(lines, machine) {
        var initState = stateIndex(machine, initialState(machine));
        lines.push('(assert (= ' + stateSymbol(0) + ' ' + initState + '))');
        (machine.variables || []).forEach(function (variable) {
            var initExpr = variable.init ? SmtExpr.exprToSmt(variable.init, varNameAt(0)) : null;
            if (!initExpr) {
                if (variable.type === 'bool') {
                    initExpr = 'false';
                } else {
                    initExpr = '0';
                }
            }
            lines.push('(assert (= ' + varSymbol(variable.name, 0) + ' ' + initExpr + '))');
        });
    }

    function transitionStepConstraints(lines, machine, step) {
        var srcStep = step;
        var dstStep = step + 1;
        var options = [];
        (machine.transitions || []).forEach(function (tr) {
            var srcIdx = stateIndex(machine, tr.source);
            var dstIdx = stateIndex(machine, tr.target);
            var conj = ['(= ' + stateSymbol(srcStep) + ' ' + srcIdx + ')'];
            var guardExpr = tr.guard && machine.guards[tr.guard]
                ? SmtExpr.exprToSmt(machine.guards[tr.guard].expr, varNameAt(srcStep))
                : 'true';
            if (!guardExpr) {
                return;
            }
            conj.push(guardExpr);
            conj.push('(= ' + stateSymbol(dstStep) + ' ' + dstIdx + ')');

            if (tr.action && machine.actions[tr.action]) {
                var action = machine.actions[tr.action];
                var assigns = SmtExpr.statementsToSmt(
                    action.statements,
                    varNameAt(srcStep),
                    varNameAt(dstStep)
                );
                if (assigns.length === 0 && action.statements && action.statements.length > 0) {
                    return;
                }
                conj = conj.concat(assigns);
                var assigned = {};
                (action.statements || []).forEach(function (stmt) {
                    if (stmt.kind === 'assign') {
                        assigned[stmt.target] = true;
                    }
                });
                (machine.variables || []).forEach(function (variable) {
                    if (!assigned[variable.name]) {
                        conj.push('(= ' + varSymbol(variable.name, dstStep) + ' ' +
                            varSymbol(variable.name, srcStep) + ')');
                    }
                });
            } else {
                (machine.variables || []).forEach(function (variable) {
                    conj.push('(= ' + varSymbol(variable.name, dstStep) + ' ' +
                        varSymbol(variable.name, srcStep) + ')');
                });
            }

            options.push('(and ' + conj.join(' ') + ')');
        });

        var stutter = [
            '(= ' + stateSymbol(dstStep) + ' ' + stateSymbol(srcStep) + ')'
        ];
        (machine.variables || []).forEach(function (variable) {
            stutter.push('(= ' + varSymbol(variable.name, dstStep) + ' ' +
                varSymbol(variable.name, srcStep) + ')');
        });
        options.push('(and ' + stutter.join(' ') + ')');

        if (options.length === 0) {
            lines.push('(assert (= ' + stateSymbol(dstStep) + ' ' + stateSymbol(srcStep) + '))');
            return;
        }
        lines.push('(assert (or ' + options.join(' ') + '))');
    }

    function buildHeader(machine, bound) {
        var hasFloat = (machine.variables || []).some(function (v) {
            return v.type === 'float';
        });
        return {
            logic: hasFloat ? 'QF_LRA' : 'QF_LIA',
            bound: bound
        };
    }

    function encodeUnrolling(model, machineName, bound) {
        var machine = findMachine(model, machineName);
        if (!machine) {
            return { error: 'Machine not found: ' + machineName };
        }
        var support = supportsMachine(machine);
        if (!support.ok) {
            return { error: support.reason };
        }
        var meta = buildHeader(machine, bound);
        var lines = [
            '(set-option :produce-models true)',
            '(set-logic ' + meta.logic + ')'
        ];
        declareVariables(lines, machine, bound);
        initialConstraints(lines, machine);
        var step;
        for (step = 0; step < bound; step += 1) {
            transitionStepConstraints(lines, machine, step);
        }
        return {
            machine: machine,
            bound: bound,
            logic: meta.logic,
            preamble: lines.join('\n')
        };
    }

    function encodeSafetyViolationQuery(model, machineName, constraint, bound) {
        var enc = encodeUnrolling(model, machineName, bound);
        if (enc.error) {
            return { error: enc.error };
        }
        var formula = constraint.formula;
        if (!formula || formula.kind !== 'expr') {
            return { error: 'Z3 safety encoding supports expr formulas only (not LTL yet).' };
        }
        var lines = [enc.preamble];
        var violationSteps = [];
        var step;
        for (step = 0; step <= enc.bound; step += 1) {
            var phi = SmtExpr.formulaToSmt(formula, varNameAt(step), {
                machine: enc.machine,
                stateSymbol: stateSymbol(step)
            });
            if (!phi) {
                return { error: 'Could not encode safety formula for Z3.' };
            }
            violationSteps.push('(not ' + phi + ')');
        }
        lines.push('(assert (or ' + violationSteps.join(' ') + '))');
        lines.push('(check-sat)');
        lines.push('(get-model)');
        return {
            smt2: lines.join('\n'),
            logic: enc.logic,
            bound: enc.bound,
            kind: 'safety'
        };
    }

    function encodeGoalWitnessQuery(model, machineName, constraint, bound) {
        var enc = encodeUnrolling(model, machineName, bound);
        if (enc.error) {
            return { error: enc.error };
        }
        var formula = constraint.formula;
        var inner = formula;
        if (formula && formula.kind === 'ltl' && formula.op === 'eventually') {
            inner = formula.arg;
        }
        var witnessSteps = [];
        var step;
        for (step = 0; step <= enc.bound; step += 1) {
            var phi = SmtExpr.formulaToSmt(inner, varNameAt(step), {
                machine: enc.machine,
                stateSymbol: stateSymbol(step)
            });
            if (!phi) {
                return { error: 'Could not encode goal formula for Z3.' };
            }
            witnessSteps.push(phi);
        }
        var lines = [enc.preamble];
        lines.push('(assert (or ' + witnessSteps.join(' ') + '))');
        lines.push('(check-sat)');
        lines.push('(get-model)');
        return {
            smt2: lines.join('\n'),
            logic: enc.logic,
            bound: enc.bound,
            kind: 'goal'
        };
    }

    return {
        supportsMachine: supportsMachine,
        encodeSafetyViolationQuery: encodeSafetyViolationQuery,
        encodeGoalWitnessQuery: encodeGoalWitnessQuery,
        encodeUnrolling: encodeUnrolling,
        findMachine: findMachine
    };
});
