/*globals define*/

define(['css!./styles/MonacoEditorWidget.css'], function () {
    'use strict';

    var WIDGET_CLASS = 'monaco-editor-widget',
        WORKER_URL = '/plugin/BuildMetaModel/../../build/workers/langium.worker.js';

    function MonacoEditorWidget(logger, container) {
        this._logger = logger.fork('Widget');
        this._el = container;
        this._editorContainer = null;
        this._worker = null;
        this._currentContent = '';
        this._filePath = null;
        this._onContentChange = null;
        this._initialize();
    }

    MonacoEditorWidget.prototype._initialize = function () {
        this._el.addClass(WIDGET_CLASS);
        this._el.empty();
        this._el.append(
            '<div class="monaco-toolbar">' +
            '<span class="monaco-status">Monaco + Langium (bootstrap)</span>' +
            '<button type="button" class="btn btn-xs btn-primary monaco-save">Save</button>' +
            '</div>' +
            '<div class="monaco-editor-host"></div>'
        );
        this._editorContainer = this._el.find('.monaco-editor-host');
        this._el.find('.monaco-save').on('click', this._handleSave.bind(this));
        this._bootstrapWorker();
        this._renderPlaceholder();
    };

    MonacoEditorWidget.prototype._bootstrapWorker = function () {
        var self = this;
        if (typeof Worker === 'undefined') {
            return;
        }
        try {
            self._worker = new Worker('/build/workers/langium.worker.js');
            self._worker.onmessage = function (event) {
                if (event.data && event.data.type === 'langium-worker-ready') {
                    self._logger.info('Langium worker ready');
                }
            };
        } catch (error) {
            self._logger.warn('Langium worker not available yet: ' + error.message);
        }
    };

    MonacoEditorWidget.prototype._renderPlaceholder = function () {
        this._editorContainer.html(
            '<pre class="monaco-placeholder"></pre>'
        );
        this._updatePlaceholder();
    };

    MonacoEditorWidget.prototype._updatePlaceholder = function () {
        this._editorContainer.find('.monaco-placeholder').text(this._currentContent || '// Open a File node to edit .sm DSL');
    };

    MonacoEditorWidget.prototype.setFileContent = function (filePath, content) {
        this._filePath = filePath;
        this._currentContent = content || '';
        this._updatePlaceholder();
        if (this._worker) {
            this._worker.postMessage({
                type: 'vfs-update',
                files: [{uri: filePath, content: this._currentContent}]
            });
        }
    };

    MonacoEditorWidget.prototype.onContentChange = function (fn) {
        this._onContentChange = fn;
    };

    MonacoEditorWidget.prototype._handleSave = function () {
        if (typeof this._onContentChange === 'function' && this._filePath) {
            this._onContentChange(this._filePath, this._currentContent);
        }
    };

    MonacoEditorWidget.prototype.applyMergeDecorations = function (_annotations) {
        // Phase 4: gutter markers and inline highlights
    };

    MonacoEditorWidget.prototype.onWidgetContainerResize = function () {
        // Phase 2: monaco.editor.layout()
    };

    MonacoEditorWidget.prototype.setTitle = function () {
        // overridden by panel
    };

    MonacoEditorWidget.prototype.destroy = function () {
        if (this._worker) {
            this._worker.terminate();
        }
    };

    MonacoEditorWidget.prototype.onActivate = function () {};
    MonacoEditorWidget.prototype.onDeactivate = function () {};

    // Legacy territory callbacks (unused once File-focused control is wired)
    MonacoEditorWidget.prototype.addNode = function () {};
    MonacoEditorWidget.prototype.removeNode = function () {};
    MonacoEditorWidget.prototype.updateNode = function () {};
    MonacoEditorWidget.prototype.onNodeClick = function () {};

    return MonacoEditorWidget;
});
