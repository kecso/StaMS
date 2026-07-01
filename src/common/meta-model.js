/*globals define*/
/*eslint-env node, browser*/
/**
 * WebGME metamodel sketch — kept in sync with state-machine.langium.
 * Used as reference when authoring the StateMachine seed; not executed at runtime.
 */
define([], function () {
    'use strict';

    return {
        types: [
            {
                name: 'Project',
                attributes: ['name'],
                children: ['File', 'Machine'],
                pointers: {},
                sets: {}
            },
            {
                name: 'File',
                attributes: ['path'],
                children: [],
                pointers: {},
                sets: {}
            },
            {
                name: 'Machine',
                attributes: ['name', 'description'],
                children: ['Variable', 'Event', 'Action', 'Guard', 'Constraint', 'State', 'Transition'],
                pointers: { definedIn: 'File' },
                sets: {}
            },
            {
                name: 'Variable',
                attributes: ['name', 'type', 'initExpr'],
                children: [],
                pointers: {},
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
                name: 'Guard',
                attributes: ['name', 'body'],
                children: [],
                pointers: {},
                sets: {}
            },
            {
                name: 'Constraint',
                attributes: ['name', 'kind', 'body'],
                children: [],
                pointers: {},
                sets: {}
            },
            {
                name: 'State',
                attributes: ['name', 'isInitial', 'isFinal'],
                children: [],
                pointers: { entry: 'Action', run: 'Action', exit: 'Action' },
                sets: {}
            },
            {
                name: 'Transition',
                attributes: [],
                children: [],
                pointers: {
                    src: 'State',
                    dst: 'State',
                    event: 'Event',
                    guard: 'Guard',
                    action: 'Action'
                },
                sets: {}
            }
        ],
        visualizers: {
            File: 'MonacoEditor'
        }
    };
});
