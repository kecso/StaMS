/*globals define*/
/*eslint-env node*/
/**
 * Spawn Z3 on an SMT-LIB2 script and parse `(sat)` / `(unsat)` / `(unknown)`.
 *
 * Interface (server-side only):
 *   runZ3(smt2, options) -> { status, stdout, stderr, model, exitCode, commandLine }
 *   isZ3Available(options) -> boolean
 */
define([], function () {
    'use strict';

    function nodeRequire(name) {
        if (typeof module !== 'undefined' && module.require) {
            return module.require(name);
        }
        return require(name);
    }

    function parseStatus(stdout) {
        var text = String(stdout || '');
        // Z3 4.x prints bare `sat` / `unsat`; older docs often show parenthesized forms.
        if (/(?:^|\s)\(?unsat\)?(?:\s|$)/m.test(text)) {
            return 'unsat';
        }
        if (/(?:^|\s)\(?sat\)?(?:\s|$)/m.test(text)) {
            return 'sat';
        }
        if (/(?:^|\s)\(?unknown\)?(?:\s|$)/m.test(text)) {
            return 'unknown';
        }
        return 'error';
    }

    function parseModel(stdout) {
        var text = String(stdout || '');
        if (text.indexOf('define-fun') < 0) {
            return {};
        }
        var model = {};
        var defineRe = /\(define-fun\s+([^\s()]+)\s+\(\)\s+(\w+)([\s\S]*?)\)\s*\)/g;
        var match;
        while ((match = defineRe.exec(text)) !== null) {
            model[match[1]] = {
                sort: match[2],
                value: match[3].trim()
            };
        }
        return model;
    }

    /**
     * @param {string} smt2
     * @param {{ command?: string, args?: string[], timeoutMs?: number, cwd?: string }} [options]
     */
    function runZ3(smt2, options) {
        options = options || {};
        if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
            return {
                status: 'error',
                stdout: '',
                stderr: 'Z3 runner requires Node.js',
                model: {},
                exitCode: -1,
                commandLine: null
            };
        }

        var command = options.command || 'z3';
        var args = options.args || ['-in', '-smt2'];
        var timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 30000;
        var cp = nodeRequire('child_process');
        var commandLine = [command].concat(args).join(' ');

        try {
            var result = cp.spawnSync(command, args, {
                input: String(smt2),
                encoding: 'utf8',
                timeout: timeoutMs,
                cwd: options.cwd,
                maxBuffer: 16 * 1024 * 1024
            });
            var stdout = result.stdout || '';
            var stderr = result.stderr || '';
            var status = parseStatus(stdout);
            if (result.error && status === 'error') {
                stderr = (stderr ? stderr + '\n' : '') + (result.error.message || String(result.error));
            }
            return {
                status: status,
                stdout: stdout,
                stderr: stderr,
                model: status === 'sat' ? parseModel(stdout) : {},
                exitCode: typeof result.status === 'number' ? result.status : -1,
                commandLine: commandLine
            };
        } catch (err) {
            return {
                status: 'error',
                stdout: '',
                stderr: err.message || String(err),
                model: {},
                exitCode: -1,
                commandLine: commandLine
            };
        }
    }

    function isZ3Available(options) {
        var probe = runZ3('(set-logic QF_LIA)\n(check-sat)\n', options);
        return probe.status === 'sat' || probe.status === 'unsat' || probe.status === 'unknown';
    }

    return {
        runZ3: runZ3,
        isZ3Available: isZ3Available,
        parseStatus: parseStatus,
        parseModel: parseModel
    };
});
