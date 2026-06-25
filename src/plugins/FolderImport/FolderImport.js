/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/gme-helpers'
], function (PluginConfig, pluginMetadata, PluginBase, GmeHelpers) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function FolderImport() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    FolderImport.metadata = pluginMetadata;
    FolderImport.prototype = Object.create(PluginBase.prototype);
    FolderImport.prototype.constructor = FolderImport;

    FolderImport.prototype.main = function (callback) {
        var self = this,
            config = self.getCurrentConfig();

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        self.result.setSuccess(false);

        if (!config.zipPath) {
            self.core.setRegistry(self.rootNode, 'FolderImport_bootstrap', Date.now().toString());
            return self.save('bootstrap', finish);
        }

        self.logger.info('FolderImport bootstrap: zipPath=' + config.zipPath);
        self.save('folder-import', finish);
    };

    FolderImport.configStructure = pluginMetadata.configStructure;
    return FolderImport;
});
