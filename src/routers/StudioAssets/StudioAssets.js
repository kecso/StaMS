/*globals define*/
'use strict';

var express = require('express'),
    path = require('path'),
    appRoot = require('../../common/app-root'),
    router = express.Router();

function initialize(middlewareOpts) {
    var logger = middlewareOpts.logger.fork('StudioAssets'),
        buildDir = path.join(appRoot(), 'build');

    logger.debug('serving static assets from ' + buildDir);

    router.use('/', express.static(buildDir, {fallthrough: true}));
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
