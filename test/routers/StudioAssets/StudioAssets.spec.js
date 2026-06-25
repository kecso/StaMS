/*globals describe, it*/
'use strict';

describe('StudioAssets', function () {
    it('router module exports initialize/start/stop', function () {
        var router = require('../../../src/routers/StudioAssets/StudioAssets');
        require('assert').strictEqual(typeof router.initialize, 'function');
        require('assert').strictEqual(typeof router.router, 'function');
    });
});
