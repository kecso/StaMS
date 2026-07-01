/*globals define*/
/*eslint-env node, browser*/
/**
 * StaMS verification deployment settings.
 *
 * Loaded from WebGME `config/components.json` under the key {@link COMPONENT_ID}
 * (see https://github.com/webgme/webgme/wiki/Component-Settings). The studio UI
 * reads the same key via `GET /api/componentSettings/StaMS_Verification`.
 */
define([], function () {
    'use strict';

    var COMPONENT_ID = 'StaMS_Verification';

    var DEFAULTS = {
        maxDepth: 12,
        timeoutMs: 30000,
        engine: 'auto',
        registry: {
            result: 'stams/verification-result'
        },
        z3: {
            command: 'z3',
            args: ['-in', '-smt2'],
            timeoutMs: 30000
        }
    };

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function merge(base, over) {
        var key;
        var out = {};
        for (key in base) {
            if (Object.prototype.hasOwnProperty.call(base, key)) {
                out[key] = base[key];
            }
        }
        if (!isObject(over)) {
            return out;
        }
        for (key in over) {
            if (!Object.prototype.hasOwnProperty.call(over, key)) {
                continue;
            }
            if (isObject(out[key]) && isObject(over[key])) {
                out[key] = merge(out[key], over[key]);
            } else {
                out[key] = over[key];
            }
        }
        return out;
    }

    function envInt(name, fallback) {
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            var n = parseInt(process.env[name], 10);
            if (!isNaN(n)) {
                return n;
            }
        }
        return fallback;
    }

    function envString(name, fallback) {
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return String(process.env[name]);
        }
        return fallback;
    }

    function loadDeploymentSettings() {
        if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
            return {};
        }
        try {
            var path = require('path');
            var fs = require('fs');
            var filePath = path.join(process.cwd(), 'config', 'components.json');
            var all = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return all[COMPONENT_ID] || {};
        } catch (e) {
            return {};
        }
    }

    function envOverrides() {
        var engine = envString('STAMS_VERIFY_ENGINE', null);
        return {
            maxDepth: envInt('STAMS_VERIFY_MAX_DEPTH', DEFAULTS.maxDepth),
            timeoutMs: envInt('STAMS_VERIFY_TIMEOUT_MS', DEFAULTS.timeoutMs),
            engine: engine || DEFAULTS.engine,
            z3: {
                command: envString('STAMS_Z3_COMMAND', DEFAULTS.z3.command),
                timeoutMs: envInt('STAMS_Z3_TIMEOUT_MS', DEFAULTS.z3.timeoutMs)
            }
        };
    }

    var resolved = merge(DEFAULTS, merge(loadDeploymentSettings(), envOverrides()));

    resolved.COMPONENT_ID = COMPONENT_ID;
    resolved.DEFAULTS = DEFAULTS;
    resolved.merge = merge;
    resolved.loadDeploymentSettings = loadDeploymentSettings;

    return resolved;
});
