// jshint node: true
'use strict';

const path = require('path');

// Packaged Electron runs app.js from app.asar; that path is not a real directory on disk
// (chdir fails on Windows). Routers resolve assets via STAMS_APP_ROOT instead of cwd.
process.env.STAMS_APP_ROOT = __dirname;
if (!__dirname.includes('.asar')) {
    process.chdir(__dirname);
}

let shuttingDown = false;

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
}

async function main() {
    const gmeConfig = require('./config');
    const webgme = require('webgme');

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
            console.log('[StaMS] auth provider: MemoryGMEAuth (no MongoDB)');
            resolve();
        });
    });
}

main().catch((err) => {
    console.error('\n[StaMS] WebGME server failed to start.');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
});
