/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'fs',
    'path',
    'archiver',
    'stams/gme-helpers'
], function (PluginConfig, pluginMetadata, PluginBase, fs, path, archiver, GmeHelpers) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function FolderExport() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    FolderExport.metadata = pluginMetadata;
    FolderExport.prototype = Object.create(PluginBase.prototype);
    FolderExport.prototype.constructor = FolderExport;

    FolderExport.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            config = self.getCurrentConfig(),
            outputPath = config.outputPath,
            root = core.getRoot(self.rootNode),
            projectNodes,
            fileNodes,
            archive,
            output;

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        self.result.setSuccess(false);

        if (!outputPath) {
            self.core.setRegistry(self.rootNode, 'FolderExport_bootstrap', Date.now().toString());
            return self.save('bootstrap', finish);
        }

        projectNodes = GmeHelpers.getChildrenOfType(core, root, GmeHelpers.META_TYPES.PROJECT);
        fileNodes = [];
        projectNodes.forEach(function (project) {
            fileNodes = fileNodes.concat(
                GmeHelpers.getChildrenOfType(core, project, GmeHelpers.META_TYPES.FILE)
            );
        });

        output = fs.createWriteStream(outputPath);
        archive = archiver('zip', {zlib: {level: 9}});

        archive.on('error', function (err) {
            callback(err, self.result);
        });

        archive.pipe(output);
        fileNodes.forEach(function (fileNode) {
            var name = core.getAttribute(fileNode, 'name') || 'unnamed.sm';
            var content = core.getAttribute(fileNode, 'content') || '';
            archive.append(content, {name: name});
        });

        output.on('close', function () {
            self.logger.info('FolderExport wrote ' + archive.pointer() + ' bytes to ' + outputPath);
            self.save('folder-export', finish);
        });

        archive.finalize();
    };

    FolderExport.configStructure = pluginMetadata.configStructure;
    return FolderExport;
});
