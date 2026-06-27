// jshint node: true
'use strict';
process.chdir(__dirname);

const { startEmbeddedMongo, stopEmbeddedMongo } = require('./scripts/embedded-mongo');

let shuttingDown = false;

async function resolveMongoUri(gmeConfig) {
    if (process.env.STAMS_MONGO_URI) {
        console.log('[StaMS] Using external MongoDB (STAMS_MONGO_URI)');
        return process.env.STAMS_MONGO_URI;
    }

    const embedded = await startEmbeddedMongo();
    console.log('[StaMS] Using embedded MongoDB (ephemeral, random port — not your system :27017)');
    console.log('[StaMS] embedded mongo uri: ' + embedded.uri);
    return embedded.uri;
}

async function shutdown(server) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    await new Promise((resolve) => {
        if (!server || typeof server.stop !== 'function') {
            resolve();
            return;
        }
        server.stop(() => resolve());
    });
    await stopEmbeddedMongo();
}

async function main() {
    const gmeConfig = require('./config');
    const webgme = require('webgme');

    gmeConfig.mongo.uri = await resolveMongoUri(gmeConfig);
    webgme.addToRequireJsPaths(gmeConfig);

    const myServer = new webgme.standaloneServer(gmeConfig);

    const handleSignal = () => {
        void shutdown(myServer).finally(() => process.exit(0));
    };
    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    await new Promise((resolve, reject) => {
        myServer.start((err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('[StaMS] WebGME server listening on port ' + gmeConfig.server.port);
            console.log('[StaMS] model storage: ' + gmeConfig.storage.database.type);
            resolve();
        });
    });
}

main().catch(async (err) => {
    console.error('\n[StaMS] WebGME server failed to start.');
    if (process.env.STAMS_MONGO_URI) {
        console.error('[StaMS] Could not reach MongoDB at ' + process.env.STAMS_MONGO_URI);
    }
    console.error(err && err.stack ? err.stack : err);
    await stopEmbeddedMongo();
    process.exit(1);
});
