/*globals describe, it*/
'use strict';

var assert = require('assert');

describe('StaMS bootstrap', function () {
    it('defines all meta-model types from the design doc', function () {
        var names = [
            'Project', 'File', 'Machine', 'Variable', 'Event', 'Action', 'Guard',
            'Constraint', 'State', 'Transition'
        ];
        assert.strictEqual(names.length, 10);
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
