// jshint node: true
'use strict';
process.chdir(__dirname);

var gmeConfig = require('./config'),
    webgme = require('webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function (err) {
    if (err) {
        console.error('\n[StaMS] WebGME server failed to start.');
        console.error('[StaMS] port: ' + (gmeConfig.server.port) +
            ', mongo: ' + gmeConfig.mongo.uri);
        if (/ECONNREFUSED|failed to connect|topology|MongoNetworkError/i.test(String(err && err.message))) {
            console.error('[StaMS] Could not reach MongoDB — is it running at ' +
                gmeConfig.mongo.uri + ' ?');
        }
        console.error(err && err.stack ? err.stack : err);
        // Exit non-zero so `concurrently --kill-others-on-fail` tears down the studio (:4000).
        process.exit(1);
        return;
    }

    console.log('[StaMS] WebGME server listening on port ' + gmeConfig.server.port);
});
