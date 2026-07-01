/*globals define*/
/*eslint-env node, browser*/
/**
 * Verification facade: dispatches by deployment `engine` setting.
 *
 *   bounded  -> simulation BFS (bounded-verifier)
 *   z3       -> SMT BMC via Z3 (z3-verifier), error if unavailable
 *   auto     -> try Z3, fall back to bounded exploration
 */
define([
    'stams/verification/settings',
    'stams/verification/bounded-verifier',
    'stams/verification/z3-verifier'
], function (Settings, BoundedVerifier, Z3Verifier) {
    'use strict';

    function verify(model, constraintsDoc, machineName, options) {
        var settings = options || Settings;
        var engine = settings.engine || 'auto';
        var bound = typeof settings.maxDepth === 'number' ? settings.maxDepth : 12;
        var opts = {
            maxDepth: bound,
            timeoutMs: settings.timeoutMs,
            engine: engine,
            z3: settings.z3
        };

        if (engine === 'bounded') {
            return BoundedVerifier.verify(model, constraintsDoc, machineName, opts);
        }

        if (engine === 'z3') {
            return Z3Verifier.verifyOrError(
                model,
                constraintsDoc,
                machineName,
                opts,
                'Z3 encoding or solver unavailable.'
            );
        }

        var z3Result = Z3Verifier.tryVerify(model, constraintsDoc, machineName, opts);
        if (z3Result) {
            return z3Result;
        }
        return BoundedVerifier.verify(model, constraintsDoc, machineName, opts);
    }

    return {
        verify: verify
    };
});
