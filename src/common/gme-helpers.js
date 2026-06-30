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
        GUARD: 'Guard',
        VARIABLE: 'Variable',
        CONSTRAINT: 'Constraint',
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

    function childByRelid(core, parent, relid) {
        if (typeof core.getChild === 'function') {
            return core.getChild(parent, relid);
        }
        if (typeof core.getNode === 'function') {
            return core.getNode(parent, relid);
        }
        return null;
    }

    function nodeFromPath(core, path) {
        if (!path) {
            return null;
        }
        if (typeof core.getNode === 'function' && core.getNode.length === 1) {
            return core.getNode(path);
        }
        return null;
    }

    function childFromPathOrRelid(core, parent, pathOrRelid) {
        var byPath = nodeFromPath(core, pathOrRelid);
        if (byPath) {
            return byPath;
        }
        return childByRelid(core, parent, pathOrRelid);
    }

    function childPaths(core, parent) {
        if (typeof core.getOwnChildrenPaths === 'function') {
            return core.getOwnChildrenPaths(parent);
        }
        if (typeof core.getChildrenPaths === 'function') {
            return core.getChildrenPaths(parent);
        }
        if (typeof core.getChildrenRelids === 'function') {
            return core.getChildrenRelids(parent);
        }
        return [];
    }

    function isValidChild(core, child) {
        if (!child) {
            return false;
        }
        if (typeof core.isValidNode === 'function') {
            return core.isValidNode(child);
        }
        return true;
    }

    function collectNodesOfType(core, rootNode, typeName) {
        var found = [];
        function walk(node) {
            if (!isValidChild(core, node)) {
                return;
            }
            var isMeta = typeof core.isMetaNode === 'function' && core.isMetaNode(node);
            if (!isMeta && isTypeOf(core, node, typeName)) {
                found.push(node);
            }
            childPaths(core, node).forEach(function (pathOrRelid) {
                walk(childFromPathOrRelid(core, node, pathOrRelid));
            });
        }
        walk(rootNode);
        if (found.length === 0 && typeof core.getRoot === 'function') {
            walk(core.getRoot(rootNode));
        }
        return found;
    }

    function getChildrenOfType(core, parent, typeName) {
        return collectNodesOfType(core, parent, typeName).filter(function (node) {
            return core.getParent(node) === parent;
        });
    }

    function getPointerTarget(core, node, pointerName) {
        var path = core.getPointerPath(node, pointerName);
        if (!path) {
            return null;
        }
        return nodeFromPath(core, path) || childFromPathOrRelid(core, node, path);
    }

    return {
        META_TYPES: META_TYPES,
        getMetaType: getMetaType,
        isTypeOf: isTypeOf,
        getChildrenOfType: getChildrenOfType,
        collectNodesOfType: collectNodesOfType,
        getPointerTarget: getPointerTarget,
        getPointerPath: function (core, node, pointerName) {
            var path = core.getPointerPath(node, pointerName);
            return path === null ? null : path;
        }
    };
});
