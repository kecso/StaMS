/*globals define*/
/*eslint-env node, browser*/
define([], function () {
    'use strict';

    var MERGE_ANNOTATION_KEY = 'mergeAnnotation';

    function createAnnotation(options) {
        return {
            status: options.status,
            category: options.category,
            description: options.description,
            branches: options.branches || [],
            relatedPaths: options.relatedPaths || []
        };
    }

    function readAnnotation(core, node) {
        var registry = core.getRegistry(node, MERGE_ANNOTATION_KEY);
        return registry || null;
    }

    function writeAnnotation(core, node, annotation) {
        core.setRegistry(node, MERGE_ANNOTATION_KEY, annotation);
    }

    function clearAnnotation(core, node) {
        core.delRegistry(node, MERGE_ANNOTATION_KEY);
    }

    return {
        MERGE_ANNOTATION_KEY: MERGE_ANNOTATION_KEY,
        createAnnotation: createAnnotation,
        readAnnotation: readAnnotation,
        writeAnnotation: writeAnnotation,
        clearAnnotation: clearAnnotation
    };
});
