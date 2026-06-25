/*globals define, WebGMEGlobal*/

define(['css!./styles/SprottyDiagramWidget.css'], function () {
    'use strict';

    var WIDGET_CLASS = 'sprotty-diagram-widget';

    function SprottyDiagramWidget(logger, container) {
        this._logger = logger.fork('Widget');
        this._el = container;
        this._svgHost = null;
        this._elkWorker = null;
        this._machinePath = null;
        this._initialize();
    }

    SprottyDiagramWidget.prototype._initialize = function () {
        this._el.addClass(WIDGET_CLASS);
        this._el.empty();
        this._el.append(
            '<div class="sprotty-toolbar">' +
            '<span class="sprotty-status">Sprotty + ELK (read-only, bootstrap)</span>' +
            '</div>' +
            '<div class="sprotty-canvas"><svg class="sprotty-svg" width="100%" height="100%"></svg></div>'
        );
        this._svgHost = this._el.find('.sprotty-svg');
        this._bootstrapElkWorker();
    };

    SprottyDiagramWidget.prototype._bootstrapElkWorker = function () {
        var self = this;
        if (typeof Worker === 'undefined') {
            return;
        }
        try {
            self._elkWorker = new Worker('/build/workers/elk.worker.js');
            self._elkWorker.onmessage = function (event) {
                if (event.data && event.data.type === 'elk-worker-ready') {
                    self._logger.info('ELK worker ready');
                }
            };
        } catch (error) {
            self._logger.warn('ELK worker not available yet: ' + error.message);
        }
    };

    SprottyDiagramWidget.prototype.renderGraph = function (graph) {
        var self = this,
            svg = self._svgHost[0],
            ns = 'http://www.w3.org/2000/svg';

        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        if (!graph || !graph.children) {
            return;
        }

        graph.children.forEach(function (element, index) {
            if (element.type === 'node:state') {
                var rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', String(40 + (index % 4) * 160));
                rect.setAttribute('y', String(40 + Math.floor(index / 4) * 100));
                rect.setAttribute('width', '120');
                rect.setAttribute('height', '48');
                rect.setAttribute('rx', '6');
                rect.setAttribute('fill', '#2d5a87');
                rect.setAttribute('stroke', '#8ec8ff');
                rect.setAttribute('data-gme-path', element.id);
                rect.style.cursor = 'pointer';
                rect.addEventListener('click', function () {
                    if (typeof self.onNodeClick === 'function') {
                        self.onNodeClick(element.id);
                    }
                });
                svg.appendChild(rect);

                var label = document.createElementNS(ns, 'text');
                label.setAttribute('x', String(100 + (index % 4) * 160));
                label.setAttribute('y', String(68 + Math.floor(index / 4) * 100));
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', '#fff');
                label.textContent = element.children && element.children[0] ? element.children[0].text : '';
                svg.appendChild(label);
            }
        });

        if (self._elkWorker) {
            self._elkWorker.postMessage({requestId: 'bootstrap', graph: graph});
        }
    };

    SprottyDiagramWidget.prototype.applyMergeBadges = function () {
        // Phase 4: conflict badges on nodes/edges
    };

    SprottyDiagramWidget.prototype.onWidgetContainerResize = function () {};

    SprottyDiagramWidget.prototype.setTitle = function () {};

    SprottyDiagramWidget.prototype.destroy = function () {
        if (this._elkWorker) {
            this._elkWorker.terminate();
        }
    };

    SprottyDiagramWidget.prototype.onActivate = function () {};
    SprottyDiagramWidget.prototype.onDeactivate = function () {};

    SprottyDiagramWidget.prototype.addNode = function () {};
    SprottyDiagramWidget.prototype.removeNode = function () {};
    SprottyDiagramWidget.prototype.updateNode = function () {};

    return SprottyDiagramWidget;
});
