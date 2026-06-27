/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'stams/sm-langium'
], function (PluginConfig, pluginMetadata, PluginBase, SmLangium) {
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
     * Parse `.sm` text from plugin config (Langium) and traverse the AST.
     * GME node creation / incremental diff is the next step after this parse pass.
     */
    TextToModel.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            config = self.getCurrentConfig(),
            content = config.text || '';

        function finish(err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.result.setSuccess(true);
            callback(null, self.result);
        }

        function fail(message) {
            self.createMessage(self.MESSAGE_TYPES.error, message);
            callback(new Error(message), self.result);
        }

        self.result.setSuccess(false);

        if (!content.trim()) {
            core.setRegistry(self.rootNode, 'TextToModel_bootstrap', Date.now().toString());
            return self.save('bootstrap', finish);
        }

        SmLangium.parseSm(content, 'memory:///document.sm')
            .then(function (parsed) {
                var summary = SmLangium.summarizeModel(parsed.model, parsed.diagnostics);

                if (SmLangium.hasSyntaxErrors(parsed.document)) {
                    self.createMessage(
                        self.MESSAGE_TYPES.error,
                        'Syntax errors:\n' + SmLangium.formatSyntaxErrors(parsed.document)
                    );
                    fail('Langium reported syntax errors');
                    return;
                }

                if (SmLangium.hasParseErrors(parsed.diagnostics)) {
                    self.createMessage(
                        self.MESSAGE_TYPES.warning,
                        'Validation issues:\n' + SmLangium.formatDiagnostics(parsed.diagnostics)
                    );
                }

                // Traverse linked AST — hook GME sync in handlers below.
                SmLangium.traverseModel(parsed.model, {
                    onMachine: function (machine) {
                        self.logger.debug('machine: ' + machine.name);
                    },
                    onState: function (state, machine) {
                        self.logger.debug(
                            'state: ' + machine.name + '.' + state.name +
                            (state.isInitial ? ' (initial)' : '') +
                            (state.isFinal ? ' (final)' : '')
                        );
                    },
                    onTransition: function (transition, source, machine) {
                        var eventName = transition.event.ref ? transition.event.ref.name : '?';
                        var targetName = transition.target.ref ? transition.target.ref.name : '?';
                        self.logger.debug(
                            'transition: ' + machine.name + '.' + source.name +
                            ' --' + eventName + '--> ' + targetName
                        );
                    }
                });

                self.logger.info(
                    'TextToModel parsed textLength=' + content.length +
                    ', ast=' + JSON.stringify(summary)
                );

                // TODO: map parsed.model → create/update Machine/State/Transition nodes via core
                self.save('text-to-model', finish);
            })
            .catch(function (err) {
                fail(err && err.message ? err.message : 'Langium parse failed');
            });
    };

    TextToModel.configStructure = pluginMetadata.configStructure;
    return TextToModel;
});
