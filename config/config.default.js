'use strict';

var path = require('path'),
    config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

config.server.port = Number(process.env.STAMS_PORT) || 8888;

// Fully in-memory deployment: model/commits + auth/metadata via MemoryGMEAuth.
// No MongoDB (external or embedded) is required. `.sm` files are the durable format.
config.storage.database.type = 'memory';
config.authentication.enable = false;
config.authentication.gmeAuth = {
    path: require('./memory-auth').memoryGmeAuthPath()
};

config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

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

// Langium parse API for studio editor diagnostics (POST /api/stams/parse).
config.rest.components.SmParse = {
    src: path.join(__dirname, '../src/routers/SmParse/SmParse.js'),
    mount: 'api/stams',
    options: {}
};

// Bundled Langium runtime for server plugins (TextToModel, ModelToText, …).
config.requirejsPaths = config.requirejsPaths || {};
config.requirejsPaths['stams/sm-langium'] = './build/stams/sm-langium';
config.requirejsPaths['stams/verification/expr-ast'] = './src/common/verification/expr-ast';
config.requirejsPaths['stams/verification/model-export'] = './src/common/verification/model-export';
config.requirejsPaths['stams/verification/constraints-export'] = './src/common/verification/constraints-export';
config.requirejsPaths['stams/verification/simulation-engine'] = './src/common/verification/simulation-engine';
config.requirejsPaths['stams/verification/constraint-eval'] = './src/common/verification/constraint-eval';
config.requirejsPaths['stams/verification/bounded-verifier'] = './src/common/verification/bounded-verifier';
config.requirejsPaths['stams/verification/settings'] = './src/common/verification/settings';
config.requirejsPaths['stams/verification/verifier'] = './src/common/verification/verifier';
config.requirejsPaths['stams/verification/z3-runner'] = './src/common/verification/z3-runner';
config.requirejsPaths['stams/verification/smt-bmc'] = './src/common/verification/smt-bmc';
config.requirejsPaths['stams/verification/smt-expr'] = './src/common/verification/smt-expr';
config.requirejsPaths['stams/verification/z3-verifier'] = './src/common/verification/z3-verifier';

validateConfig(config);
module.exports = config;
