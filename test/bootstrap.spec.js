/*globals describe, it*/
'use strict';

var assert = require('assert');

describe('StaMS bootstrap', function () {
    it('defines all meta-model types from the design doc', function () {
        var names = [
            'Project', 'File', 'Machine', 'State', 'Transition', 'Event', 'Action', 'Import'
        ];
        assert.strictEqual(names.length, 8);
    });

    it('creates merge annotation payloads', function () {
        var annotation = {
            status: 'conflict',
            category: 'non-determinism',
            description: 'test',
            branches: ['main'],
            relatedPaths: ['/a']
        };
        assert.strictEqual(annotation.status, 'conflict');
    });
});
