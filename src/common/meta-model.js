/*globals define*/
/*eslint-env node, browser*/
define([], function () {
    'use strict';

    return {
        types: [
            {
                name: 'Project',
                attributes: ['name'],
                children: ['File'],
                pointers: {},
                sets: {}
            },
            {
                name: 'File',
                attributes: ['name', 'content'],
                children: ['Machine'],
                pointers: {},
                sets: {}
            },
            {
                name: 'Machine',
                attributes: ['name'],
                children: ['State', 'Event', 'Action', 'Transition', 'Import'],
                pointers: { initialState: 'State' },
                sets: {}
            },
            {
                name: 'State',
                attributes: ['name', 'isInitial', 'isFinal'],
                children: ['State'],
                pointers: {},
                sets: {}
            },
            {
                name: 'Transition',
                attributes: ['guardExpr', 'actionExpr'],
                children: [],
                pointers: { source: 'State', target: 'State', trigger: 'Event' },
                sets: {}
            },
            {
                name: 'Event',
                attributes: ['name'],
                children: [],
                pointers: {},
                sets: {}
            },
            {
                name: 'Action',
                attributes: ['name', 'body'],
                children: [],
                pointers: {},
                sets: {}
            },
            {
                name: 'Import',
                attributes: ['ref'],
                children: [],
                pointers: { resolvedFile: 'File' },
                sets: {}
            }
        ],
        visualizers: {
            File: 'MonacoEditor',
            Machine: 'SprottyDiagram'
        }
    };
});
