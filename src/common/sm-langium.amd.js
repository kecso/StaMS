/*globals define, require*/
/*eslint-env node*/
/**
 * AMD entry for WebGME plugins. The Langium runtime is bundled as CommonJS
 * (build/stams/sm-langium.cjs) because the parser stack is Node-only.
 *
 * Loaded server-side by WebGME's requirejs (r.js). The AMD factory has no
 * `__dirname`, so the sibling `.cjs` is located via the requirejs `module.uri`
 * (the resolved absolute path of this wrapper).
 */
define(['module'], function (module) {
    'use strict';
    // Use Node's native require (r.js exposes it as require.nodeRequire) so the
    // CommonJS bundle is evaluated by Node — giving it __dirname/__filename/etc.
    // The AMD require would otherwise evaluate the .cjs in a context lacking them.
    var nodeRequire = (typeof require === 'function' && require.nodeRequire) || require;
    var path = nodeRequire('path');
    var here = module && module.uri ? path.dirname(module.uri) : __dirname;
    return nodeRequire(path.resolve(here, 'sm-langium.cjs'));
});
