/*globals define*/
'use strict';

/**
 * POST /api/stams/parse — Langium parse + validation (same pipeline as TextToModel).
 * Body: { "text": "..." }
 */
var express = require('express'),
    path = require('path'),
    router = express.Router();

var SmLangium;

function loadSmLangium() {
    if (!SmLangium) {
        SmLangium = require(path.join(process.cwd(), 'build', 'stams', 'sm-langium.cjs'));
    }
    return SmLangium;
}

function toMarker(diagnostic) {
    var line = (diagnostic.range && diagnostic.range.start && diagnostic.range.start.line) || 0;
    var col = (diagnostic.range && diagnostic.range.start && diagnostic.range.start.character) || 0;
    var endLine = (diagnostic.range && diagnostic.range.end && diagnostic.range.end.line) || line;
    var endCol = (diagnostic.range && diagnostic.range.end && diagnostic.range.end.character) || col + 1;
    var severity = diagnostic.severity === 1 ? 'error' : 'warning';
    return {
        severity: severity,
        message: diagnostic.message || '',
        startLineNumber: line + 1,
        startColumn: col + 1,
        endLineNumber: endLine + 1,
        endColumn: Math.max(endCol + 1, col + 2)
    };
}

function initialize(middlewareOpts) {
    var logger = middlewareOpts.logger.fork('SmParse');

    router.post('/parse', function (req, res) {
        var text = req.body && req.body.text;
        if (typeof text !== 'string') {
            res.status(400).json({ error: 'Request body must include a string "text" field.' });
            return;
        }

        var sm = loadSmLangium();
        var documentUri = 'memory:///parse.sm';

        sm.parseSm(text, documentUri)
            .then(function (parsed) {
                var summary = sm.summarizeModel(parsed.model, parsed.diagnostics);
                var syntaxErrors = sm.hasSyntaxErrors(parsed.document)
                    ? sm.formatSyntaxErrors(parsed.document)
                    : '';
                var markers = [];

                if (syntaxErrors) {
                    syntaxErrors.split('\n').forEach(function (line) {
                        if (line.trim()) {
                            markers.push({
                                severity: 'error',
                                message: line,
                                startLineNumber: 1,
                                startColumn: 1,
                                endLineNumber: 1,
                                endColumn: 2
                            });
                        }
                    });
                }

                parsed.diagnostics.forEach(function (diagnostic) {
                    markers.push(toMarker(diagnostic));
                });

                var hasErrors = sm.hasSyntaxErrors(parsed.document) || sm.hasParseErrors(parsed.diagnostics);

                res.json({
                    ok: !hasErrors,
                    summary: summary,
                    diagnostics: markers,
                    syntaxErrors: syntaxErrors || undefined
                });
            })
            .catch(function (err) {
                logger.error('parse failed: ' + (err && err.stack ? err.stack : err));
                res.status(500).json({
                    error: err && err.message ? err.message : 'Parse failed'
                });
            });
    });

    logger.debug('ready (POST /api/stams/parse)');
}

function start(callback) {
    callback();
}

function stop(callback) {
    callback();
}

module.exports = {
    initialize: initialize,
    router: router,
    start: start,
    stop: stop
};
