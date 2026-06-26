'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = 8888;
config.mongo.uri = 'mongodb://127.0.0.1:27017/stams';

config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

// Guest access for the custom studio UI (webgme-dss pattern).
config.authentication.enable = true;
config.authentication.allowGuests = true;

// Prefer the custom React studio over the stock WebGME UI for day-to-day work.
config.client.pageTitle = 'StaMS — State Machine Studio';

// Serve worker bundles and other build artifacts at /build (via StudioAssets router).
config.rest.components.StudioAssets = config.rest.components.StudioAssets || {};
config.rest.components.StudioAssets.mount = 'build';

validateConfig(config);
module.exports = config;
