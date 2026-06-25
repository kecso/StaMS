/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers',
    'stams/merge-annotations'
], function (PluginConfig, pluginMetadata, PluginBase, GmeHelpers, MergeAnnotations) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function MergeAnalysis() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    MergeAnalysis.metadata = pluginMetadata;
    MergeAnalysis.prototype = Object.create(PluginBase.prototype);
    MergeAnalysis.prototype.constructor = MergeAnalysis;

    MergeAnalysis.prototype.main = function (callback) {
        var self = this;

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        self.core.setRegistry(self.rootNode, 'MergeAnalysis_bootstrap', Date.now().toString());
        self.logger.info('MergeAnalysis bootstrap: domain conflict rules not yet wired');
        self.save('merge-analysis', finish);
    };

    MergeAnalysis.configStructure = pluginMetadata.configStructure;
    return MergeAnalysis;
});
