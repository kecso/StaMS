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

    function TextToModel() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    TextToModel.metadata = pluginMetadata;
    TextToModel.prototype = Object.create(PluginBase.prototype);
    TextToModel.prototype.constructor = TextToModel;

    /**
     * Bootstrap implementation: validates target File node and records intent.
     * Phase 1 will wire Langium parse + incremental AST → GME diff.
     */
    TextToModel.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            config = self.getCurrentConfig(),
            filePath = config.fileNodePath,
            fileNode,
            content,
            machines;

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        self.result.setSuccess(false);

        if (!filePath) {
            core.setRegistry(self.rootNode, 'TextToModel_bootstrap', Date.now().toString());
            return self.save('bootstrap', finish);
        }

        fileNode = core.getNode(core.getRoot(self.rootNode), filePath);
        if (!fileNode || !GmeHelpers.isTypeOf(core, fileNode, GmeHelpers.META_TYPES.FILE)) {
            callback(new Error('fileNodePath must reference a File node'), self.result);
            return;
        }

        content = core.getAttribute(fileNode, 'content') || '';
        machines = GmeHelpers.getChildrenOfType(core, fileNode, GmeHelpers.META_TYPES.MACHINE);

        self.logger.info('TextToModel bootstrap: file=' + filePath +
            ', textLength=' + content.length + ', existingMachines=' + machines.length);

        // TODO(Phase 1): Langium parse → walk AST → minimal structural diff
        self.save('text-to-model', finish);
    };

    TextToModel.configStructure = pluginMetadata.configStructure;
    return TextToModel;
});
