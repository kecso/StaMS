/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/meta-model'
], function (PluginConfig, pluginMetadata, PluginBase, MetaModel) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function BuildMetaModel() {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    BuildMetaModel.metadata = pluginMetadata;
    BuildMetaModel.prototype = Object.create(PluginBase.prototype);
    BuildMetaModel.prototype.constructor = BuildMetaModel;

    BuildMetaModel.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            root = core.getRoot(self.rootNode),
            metaSheet = core.getChild(root, 'MetaAspectSet'),
            fco = core.getFCO(root),
            typeNodes = {},
            i,
            typeDesc,
            node,
            attr,
            pointerName,
            childType,
            validChildren;

        self.result.setSuccess(false);

        if (!metaSheet) {
            callback(new Error('MetaAspectSet not found — open an EmptyProject'), self.result);
            return;
        }

        for (i = 0; i < MetaModel.types.length; i += 1) {
            typeDesc = MetaModel.types[i];
            node = core.createNode({parent: metaSheet, base: fco});
            core.setAttribute(node, 'name', typeDesc.name);
            core.setRegistry(node, 'position', {x: 120 + (i % 3) * 180, y: 80 + Math.floor(i / 3) * 120});
            typeNodes[typeDesc.name] = node;

            for (attr = 0; attr < typeDesc.attributes.length; attr += 1) {
                core.setAttributeMeta(node, typeDesc.attributes[attr], {type: 'string'});
            }
        }

        for (i = 0; i < MetaModel.types.length; i += 1) {
            typeDesc = MetaModel.types[i];
            node = typeNodes[typeDesc.name];

            if (typeDesc.children.length) {
                validChildren = core.getValidChildrenPaths(node);
                typeDesc.children.forEach(function (childTypeName) {
                    if (typeNodes[childTypeName]) {
                        core.setPointerMetaTarget(node, 'validChildren', typeNodes[childTypeName], 1);
                    }
                });
            }

            for (pointerName in typeDesc.pointers) {
                if (Object.prototype.hasOwnProperty.call(typeDesc.pointers, pointerName)) {
                    childType = typeDesc.pointers[pointerName];
                    if (typeNodes[childType]) {
                        core.setPointerMetaTarget(node, pointerName, typeNodes[childType], 1);
                    }
                }
            }
        }

        self.logger.info('BuildMetaModel created ' + MetaModel.types.length + ' meta types');
        self.save('meta-model created', function (err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        });
    };

    BuildMetaModel.configStructure = pluginMetadata.configStructure;
    return BuildMetaModel;
});
