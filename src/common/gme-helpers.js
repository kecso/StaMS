/*globals define*/
/*eslint-env node, browser*/
define([], function () {
    'use strict';

    var META_TYPES = {
        PROJECT: 'Project',
        FILE: 'File',
        MACHINE: 'Machine',
        STATE: 'State',
        TRANSITION: 'Transition',
        EVENT: 'Event',
        ACTION: 'Action',
        IMPORT: 'Import'
    };

    function getMetaType(core, node) {
        if (!node) {
            return null;
        }
        var metaNode = core.getMetaType(node);
        return metaNode ? core.getAttribute(metaNode, 'name') : null;
    }

    function isTypeOf(core, node, typeName) {
        return getMetaType(core, node) === typeName;
    }

    function getChildrenOfType(core, parent, typeName) {
        return core.getChildrenPaths(parent)
            .map(function (path) { return core.getNode(parent, path); })
            .filter(function (child) { return isTypeOf(core, child, typeName); });
    }

    function getPointerPath(core, node, pointerName) {
        var path = core.getPointerPath(node, pointerName);
        return path === null ? null : path;
    }

    return {
        META_TYPES: META_TYPES,
        getMetaType: getMetaType,
        isTypeOf: isTypeOf,
        getChildrenOfType: getChildrenOfType,
        getPointerPath: getPointerPath
    };
});
