/*globals define*/
/*eslint-env node, browser*/
/**
 * Stepwise simulator that grows a stams.trace.v1 document.
 */
define([
    'stams/verification/expr-ast'
], function (ExprAst) {
    'use strict';

    var SCHEMA = 'stams.trace.v1';

    function cloneEnv(env) {
        var copy = {};
        Object.keys(env).forEach(function (key) {
            copy[key] = env[key];
        });
        return copy;
    }

    function snapshot(stateName, env) {
        return {
            state: stateName,
            variables: cloneEnv(env)
        };
    }

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

    function findInitialState(machine) {
        var initial = null;
        (machine.states || []).forEach(function (state) {
            if (state.isInitial) {
                initial = state;
            }
        });
        if (!initial && machine.states && machine.states.length > 0) {
            initial = machine.states[0];
        }
        return initial;
    }

    function buildInitialEnv(machine) {
        var env = {};
        (machine.variables || []).forEach(function (variable) {
            if (variable.init) {
                env[variable.name] = ExprAst.evaluate(variable.init, env);
            } else {
                env[variable.name] = ExprAst.defaultInitForType(variable.type);
            }
        });
        return env;
    }

    function stateByName(machine, name) {
        for (var i = 0; i < (machine.states || []).length; i += 1) {
            if (machine.states[i].name === name) {
                return machine.states[i];
            }
        }
        return null;
    }

    function transitionsFor(machine, sourceName, eventName) {
        return (machine.transitions || []).filter(function (transition) {
            return transition.source === sourceName && transition.event === eventName;
        });
    }

    function runAction(machine, actionName, env) {
        if (!actionName) {
            return [];
        }
        var action = machine.actions[actionName];
        if (!action) {
            return [];
        }
        return ExprAst.executeStatements(action.statements, env);
    }

    function guardPasses(machine, guardName, env) {
        if (!guardName) {
            return true;
        }
        var guard = machine.guards[guardName];
        if (!guard) {
            return true;
        }
        return !!ExprAst.evaluate(guard.expr, env);
    }

    function createTrace(model, machineName) {
        var machine = findMachine(model, machineName);
        if (!machine) {
            throw new Error('Machine not found: ' + machineName);
        }
        var initialState = findInitialState(machine);
        if (!initialState) {
            throw new Error('Machine has no states: ' + machine.name);
        }
        var env = buildInitialEnv(machine);
        var effects = [];
        if (initialState.entry) {
            var entryAssignments = runAction(machine, initialState.entry, env);
            effects.push({
                phase: 'entry',
                action: initialState.entry,
                assignments: entryAssignments
            });
        }
        return {
            $schema: SCHEMA,
            version: 1,
            machine: machine.name,
            initial: snapshot(initialState.name, env),
            steps: [],
            _runtime: {
                machine: machine,
                stateName: initialState.name,
                env: env
            },
            _bootstrapEffects: effects
        };
    }

    function getEnabledEvents(trace) {
        var runtime = trace._runtime;
        var machine = runtime.machine;
        var seen = {};
        var enabled = [];
        (machine.transitions || []).forEach(function (transition) {
            if (transition.source !== runtime.stateName) {
                return;
            }
            if (seen[transition.event]) {
                return;
            }
            seen[transition.event] = true;
            enabled.push(transition.event);
        });
        return enabled;
    }

    function getCurrentSnapshot(trace) {
        var runtime = trace._runtime;
        return snapshot(runtime.stateName, runtime.env);
    }

    function stripRuntime(trace) {
        var copy = {
            $schema: trace.$schema,
            version: trace.version,
            machine: trace.machine,
            initial: trace.initial,
            steps: trace.steps
        };
        return copy;
    }

    function step(trace, eventName) {
        var runtime = trace._runtime;
        var machine = runtime.machine;
        var before = snapshot(runtime.stateName, runtime.env);
        var candidates = transitionsFor(machine, runtime.stateName, eventName);
        var chosen = null;
        var guardPassed = false;

        for (var i = 0; i < candidates.length; i += 1) {
            if (guardPasses(machine, candidates[i].guard, runtime.env)) {
                chosen = candidates[i];
                guardPassed = true;
                break;
            }
        }

        if (!chosen) {
            var failedStep = {
                index: trace.steps.length,
                event: eventName,
                transition: null,
                guardPassed: false,
                before: before,
                after: before,
                effects: [],
                note: candidates.length === 0 ? 'No transition for event' : 'Guard rejected all transitions'
            };
            trace.steps.push(failedStep);
            return failedStep;
        }

        var effects = [];
        var sourceState = stateByName(machine, runtime.stateName);
        var targetState = stateByName(machine, chosen.target);
        var isSelfTransition = chosen.source === chosen.target;

        if (sourceState && sourceState.exit && !isSelfTransition) {
            effects.push({
                phase: 'exit',
                action: sourceState.exit,
                assignments: runAction(machine, sourceState.exit, runtime.env)
            });
        }
        if (chosen.action) {
            effects.push({
                phase: 'transition',
                action: chosen.action,
                assignments: runAction(machine, chosen.action, runtime.env)
            });
        }

        runtime.stateName = chosen.target;

        if (targetState && targetState.entry && !isSelfTransition) {
            effects.push({
                phase: 'entry',
                action: targetState.entry,
                assignments: runAction(machine, targetState.entry, runtime.env)
            });
        }

        var stepRecord = {
            index: trace.steps.length,
            event: eventName,
            transition: {
                id: chosen.id,
                source: chosen.source,
                target: chosen.target,
                guard: chosen.guard || null,
                action: chosen.action || null
            },
            guardPassed: guardPassed,
            before: before,
            after: snapshot(runtime.stateName, runtime.env),
            effects: effects
        };
        trace.steps.push(stepRecord);
        return stepRecord;
    }

    function run(trace, events) {
        (events || []).forEach(function (eventName) {
            step(trace, eventName);
        });
        return stripRuntime(trace);
    }

    function simulate(model, machineName, events) {
        var trace = createTrace(model, machineName);
        return run(trace, events);
    }

    return {
        SCHEMA: SCHEMA,
        createTrace: createTrace,
        getEnabledEvents: getEnabledEvents,
        getCurrentSnapshot: getCurrentSnapshot,
        step: step,
        run: run,
        simulate: simulate,
        stripRuntime: stripRuntime
    };
});
