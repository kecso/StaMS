/*globals define*/
/*eslint-env node, browser*/
/**
 * Bounded verification by state-space exploration using the same step semantics as
 * simulation-engine. Produces stams.verification-result.v1 without persisting IR.
 */
define([
    'stams/verification/simulation-engine',
    'stams/verification/constraint-eval'
], function (SimulationEngine, ConstraintEval) {
    'use strict';

    var RESULT_SCHEMA = 'stams.verification-result.v1';

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

    function stateKey(trace) {
        var snap = SimulationEngine.getCurrentSnapshot(trace);
        return snap.state + '|' + JSON.stringify(snap.variables);
    }

    function cloneTrace(model, trace) {
        var machine = trace._runtime.machine;
        var replay = SimulationEngine.createTrace({ machines: [machine] }, trace.machine);
        (trace.steps || []).forEach(function (stepRecord) {
            if (stepRecord.guardPassed && stepRecord.transition) {
                var transition = (machine.transitions || []).filter(function (tr) {
                    return tr.id === stepRecord.transition.id;
                })[0];
                if (transition) {
                    SimulationEngine.stepTransition(replay, transition);
                }
            }
        });
        return replay;
    }

    function snapshotsAlongTrace(trace) {
        var list = [trace.initial];
        (trace.steps || []).forEach(function (stepRecord) {
            if (stepRecord.guardPassed) {
                list.push(stepRecord.after);
            }
        });
        return list;
    }

    /**
     * BFS explore unique (state, env) configurations up to maxDepth transitions.
     * Returns array of runtime traces (with _runtime).
     */
    function exploreTraces(model, machineName, maxDepth) {
        var machine = findMachine(model, machineName);
        if (!machine) {
            throw new Error('Machine not found: ' + machineName);
        }
        var root = SimulationEngine.createTrace(model, machineName);
        var queue = [root];
        var visited = {};
        var traces = [];

        while (queue.length > 0) {
            var trace = queue.shift();
            var key = stateKey(trace);
            if (visited[key]) {
                continue;
            }
            visited[key] = true;
            traces.push(trace);

            if (trace.steps.length >= maxDepth) {
                continue;
            }

            var enabled = SimulationEngine.getEnabledTransitions(trace);
            for (var i = 0; i < enabled.length; i += 1) {
                var child = cloneTrace(model, trace);
                SimulationEngine.stepTransition(child, enabled[i]);
                queue.push(child);
            }
        }
        return traces;
    }

    function truncateTraceToWitness(model, trace, witnessSnapshotIndex) {
        var machine = trace._runtime.machine;
        var replay = SimulationEngine.createTrace(model, trace.machine);
        var applied = 0;
        (trace.steps || []).forEach(function (stepRecord) {
            if (applied >= witnessSnapshotIndex) {
                return;
            }
            if (stepRecord.guardPassed && stepRecord.transition) {
                var transition = (machine.transitions || []).filter(function (tr) {
                    return tr.id === stepRecord.transition.id;
                })[0];
                if (transition) {
                    SimulationEngine.stepTransition(replay, transition);
                    applied += 1;
                }
            }
        });
        return SimulationEngine.stripRuntime(replay);
    }

    function checkSafety(constraint, traces, bound, machine) {
        var name = constraint.name;
        var formula = constraint.formula;
        for (var t = 0; t < traces.length; t += 1) {
            var snaps = snapshotsAlongTrace(traces[t]);
            for (var s = 0; s < snaps.length; s += 1) {
                if (!ConstraintEval.evaluateFormulaAtSnapshot(formula, snaps[s], machine)) {
                    return {
                        name: name,
                        kind: 'safety',
                        passed: false,
                        status: 'counterexample',
                        bound: bound,
                        message: 'Violated at step ' + s + ' on state ' + snaps[s].state + '.',
                        counterexample: SimulationEngine.stripRuntime(traces[t])
                    };
                }
            }
        }
        return {
            name: name,
            kind: 'safety',
            passed: true,
            status: 'proved',
            bound: bound,
            message: 'Proved (for ' + bound + ' steps).'
        };
    }

    function checkGoal(constraint, traces, bound, machine, model) {
        var name = constraint.name;
        var formula = constraint.formula;
        for (var t = 0; t < traces.length; t += 1) {
            var snaps = snapshotsAlongTrace(traces[t]);
            for (var s = 0; s < snaps.length; s += 1) {
                if (ConstraintEval.evaluateFormulaAtSnapshot(formula, snaps[s], machine)) {
                    var witness = truncateTraceToWitness(model, traces[t], s);
                    var stepLabel = s === 0 ? 'initial configuration' : 'step ' + s;
                    return {
                        name: name,
                        kind: 'goal',
                        passed: true,
                        status: 'proved',
                        bound: bound,
                        message: 'Witness at ' + stepLabel + ' on state ' + snaps[s].state +
                            ' (' + witness.steps.length + ' transition(s)).',
                        counterexample: witness
                    };
                }
            }
        }
        return {
            name: name,
            kind: 'goal',
            passed: false,
            status: 'counterexample',
            bound: bound,
            message: 'No witness within ' + bound + ' steps.'
        };
    }

    /**
     * @param {object} model - stams.verification-model.v1 (in memory)
     * @param {object} constraintsDoc - stams.constraints.v1 (in memory)
     * @param {string} machineName
     * @param {{ maxDepth: number }} options
     */
    function verify(model, constraintsDoc, machineName, options) {
        var maxDepth = (options && options.maxDepth) || 12;
        var machine = findMachine(model, machineName);
        if (!machine) {
            throw new Error('Machine not found: ' + machineName);
        }

        var constraintEntry = (constraintsDoc.machines || []).filter(function (m) {
            return m.name === machine.name;
        })[0];
        var constraints = (constraintEntry && constraintEntry.constraints) || [];

        var traces = exploreTraces(model, machineName, maxDepth);
        var results = constraints.map(function (constraint) {
            if (constraint.kind === 'goal') {
                return checkGoal(constraint, traces, maxDepth, machine, model);
            }
            return checkSafety(constraint, traces, maxDepth, machine);
        });

        return {
            $schema: RESULT_SCHEMA,
            version: 1,
            machine: machine.name,
            bound: maxDepth,
            engine: 'bounded-explore',
            results: results
        };
    }

    function findGoalWitness(model, constraintsDoc, machineName, options, constraint) {
        var maxDepth = (options && options.maxDepth) || 12;
        var machine = findMachine(model, machineName);
        if (!machine) {
            return null;
        }
        var traces = exploreTraces(model, machineName, maxDepth);
        return checkGoal(constraint, traces, maxDepth, machine, model);
    }

    return {
        RESULT_SCHEMA: RESULT_SCHEMA,
        verify: verify,
        exploreTraces: exploreTraces,
        findGoalWitness: findGoalWitness
    };
});
