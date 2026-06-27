/*globals define*/
/*eslint-env node*/
/**
 * AMD entry for WebGME plugins. The Langium runtime is bundled as CommonJS
 * (build/stams/sm-langium.cjs) because the parser stack is Node-only.
 */
define([], function () {
    'use strict';
    var path = require('path');
    return require(path.join(__dirname, 'sm-langium.cjs'));
});
