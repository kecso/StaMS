/*eslint-env node, mocha*/

describe('StudioUi', function () {
    it('router module exports initialize/start/stop', function () {
        var router = require('../../../src/routers/StudioUi/StudioUi');
        require('assert').strictEqual(typeof router.initialize, 'function');
        require('assert').strictEqual(typeof router.router, 'function');
    });
});
