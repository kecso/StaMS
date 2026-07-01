/*globals define*/
/*eslint-env node*/
/**
 * Z3-backed bounded verification (SMT-LIB BMC). Returns null when unavailable so
 * `verifier.js` can fall back to bounded exploration in `engine: auto`.
 */
define([
    'stams/verification/smt-bmc',
    'stams/verification/z3-runner',
    'stams/verification/bounded-verifier'
], function (SmtBmc, Z3Runner, BoundedVerifier) {
    'use strict';

    var RESULT_SCHEMA = 'stams.verification-result.v1';

    function z3Options(settings) {
        var z3 = (settings && settings.z3) || {};
        return {
            command: z3.command || 'z3',
            args: z3.args || ['-in', '-smt2'],
            timeoutMs: typeof z3.timeoutMs === 'number' ? z3.timeoutMs : settings.timeoutMs
        };
    }

    function safetyResult(constraint, bound, z3Outcome) {
        if (z3Outcome.status === 'unsat') {
            return {
                name: constraint.name,
                kind: 'safety',
                passed: true,
                status: 'proved',
                bound: bound,
                message: 'Proved (for ' + bound + ' steps) via Z3.'
            };
        }
        if (z3Outcome.status === 'sat') {
            return {
                name: constraint.name,
                kind: 'safety',
                passed: false,
                status: 'counterexample',
                bound: bound,
                message: 'Z3 found a violating path within ' + bound + ' steps.',
                counterexample: null
            };
        }
        return {
            name: constraint.name,
            kind: 'safety',
            passed: false,
            status: 'unknown',
            bound: bound,
            message: 'Z3 returned ' + z3Outcome.status + ': ' + (z3Outcome.stderr || z3Outcome.stdout || '')
        };
    }

    function goalResult(constraint, bound, z3Outcome, witnessTrace) {
        if (z3Outcome.status === 'sat') {
            return {
                name: constraint.name,
                kind: 'goal',
                passed: true,
                status: 'proved',
                bound: bound,
                message: witnessTrace && witnessTrace.message
                    ? witnessTrace.message.replace(/\.$/, '') + ' via Z3.'
                    : 'Z3 found a witness within ' + bound + ' steps.',
                counterexample: witnessTrace ? witnessTrace.counterexample : null
            };
        }
        if (z3Outcome.status === 'unsat') {
            return {
                name: constraint.name,
                kind: 'goal',
                passed: false,
                status: 'counterexample',
                bound: bound,
                message: 'No witness within ' + bound + ' steps (Z3).'
            };
        }
        return {
            name: constraint.name,
            kind: 'goal',
            passed: false,
            status: 'unknown',
            bound: bound,
            message: 'Z3 returned ' + z3Outcome.status + ': ' + (z3Outcome.stderr || z3Outcome.stdout || '')
        };
    }

    function tryVerify(model, constraintsDoc, machineName, settings) {
        settings = settings || {};
        var z3Opts = z3Options(settings);
        if (!Z3Runner.isZ3Available(z3Opts)) {
            return null;
        }

        var machine = SmtBmc.findMachine(model, machineName);
        if (!machine) {
            return null;
        }
        var support = SmtBmc.supportsMachine(machine);
        if (!support.ok) {
            return null;
        }

        var bound = typeof settings.maxDepth === 'number' ? settings.maxDepth : 12;
        var constraintEntry = (constraintsDoc.machines || []).filter(function (m) {
            return m.name === machine.name;
        })[0];
        var constraints = (constraintEntry && constraintEntry.constraints) || [];
        var results = [];
        var i;

        for (i = 0; i < constraints.length; i += 1) {
            var constraint = constraints[i];
            var encoded = constraint.kind === 'goal'
                ? SmtBmc.encodeGoalWitnessQuery(model, machineName, constraint, bound)
                : SmtBmc.encodeSafetyViolationQuery(model, machineName, constraint, bound);
            if (encoded.error) {
                return null;
            }
            var z3Outcome = Z3Runner.runZ3(encoded.smt2, z3Opts);
            if (constraint.kind === 'goal') {
                var witnessTrace = null;
                if (z3Outcome.status === 'sat') {
                    witnessTrace = BoundedVerifier.findGoalWitness(
                        model,
                        constraintsDoc,
                        machineName,
                        settings,
                        constraint
                    );
                }
                results.push(goalResult(constraint, bound, z3Outcome, witnessTrace));
            } else {
                results.push(safetyResult(constraint, bound, z3Outcome));
            }
        }

        return {
            $schema: RESULT_SCHEMA,
            version: 1,
            machine: machine.name,
            bound: bound,
            engine: 'z3-bmc',
            results: results
        };
    }

    function verifyOrError(model, constraintsDoc, machineName, settings, reason) {
        var result = tryVerify(model, constraintsDoc, machineName, settings);
        if (result) {
            return result;
        }
        var bounded = BoundedVerifier.verify(model, constraintsDoc, machineName, settings);
        bounded.message = reason || 'Z3 unavailable; used bounded exploration.';
        return bounded;
    }

    return {
        tryVerify: tryVerify,
        verifyOrError: verifyOrError
    };
});
