/*globals define*/
'use strict';

/**
 * Serves exported Next.js studio routes that WebGME static rules do not cover.
 * The bulk of the UI is served from config.client.appDir (studio-ui/out).
 */
var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    appRoot = require('../../common/app-root'),
    router = express.Router();

var studioOutDir;

function sendStudioIndex(res) {
    var studioIndex = path.join(studioOutDir, 'studio', 'index.html');
    if (!fs.existsSync(studioIndex)) {
        res.status(503).send(
            'Studio UI not built. Run "npm run build:ui" from the StaMS root.'
        );
        return;
    }
    res.sendFile(studioIndex);
}

function initialize(middlewareOpts) {
    var logger = middlewareOpts.logger.fork('StudioUi');
    studioOutDir = path.join(appRoot(), 'studio-ui', 'out');

    logger.debug('studio export directory: ' + studioOutDir);

    router.get(['/studio', '/studio/'], function (req, res) {
        sendStudioIndex(res);
    });

    logger.debug('ready');
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
