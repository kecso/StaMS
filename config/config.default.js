'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = 8888;
// Required by the config validator even when storage is in-memory.
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

// Serve worker bundles and other build artifacts at /build (via StudioAssets router).
config.rest.components.StudioAssets = config.rest.components.StudioAssets || {};
config.rest.components.StudioAssets.mount = 'build';

// Bundled Langium runtime for server plugins (TextToModel, ModelToText, …).
config.requirejsPaths = config.requirejsPaths || {};
config.requirejsPaths['stams/sm-langium'] = './build/stams/sm-langium';

validateConfig(config);
module.exports = config;
