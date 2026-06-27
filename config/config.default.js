'use strict';

var path = require('path'),
    config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = 8888;

// Model/commit storage: in-memory for this session (see storage.database.type below).
// GmeAuth + project metadata still use MongoDB today; app.js starts an embedded
// mongod on a random port unless STAMS_MONGO_URI points at an external instance.
config.mongo.uri = 'mongodb://127.0.0.1:27017/stams';

// Ephemeral workspace: projects live in RAM for the session. `.sm` files (and
// import/export) are the durable exchange format — no MongoDB needed at runtime.
config.storage.database.type = 'memory';

config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

// Single implicit workspace user; no login or user-management UI.
config.authentication.enable = false;

// Prefer the custom React studio over the stock WebGME UI for day-to-day work.
config.client.pageTitle = 'StaMS — State Machine Studio';

// Single-server UI: exported Next.js app (see webgme-dss public/ pattern).
config.client.appDir = path.join(__dirname, '../studio-ui/out');

// StudioUi router: serves /studio/ when using static export paths.
config.rest.components.StudioUi = {
    src: path.join(__dirname, '../src/routers/StudioUi/StudioUi.js'),
    mount: '',
    options: {}
};

config.rest.components.StudioAssets = config.rest.components.StudioAssets || {};
config.rest.components.StudioAssets.mount = 'build';

// Bundled Langium runtime for server plugins (TextToModel, ModelToText, …).
config.requirejsPaths = config.requirejsPaths || {};
config.requirejsPaths['stams/sm-langium'] = './build/stams/sm-langium';

validateConfig(config);
module.exports = config;
