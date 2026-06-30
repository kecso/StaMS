'use strict';

/** Application root — repo root in dev, app.asar when packaged in Electron. */
function appRoot() {
    return process.env.STAMS_APP_ROOT || process.cwd();
}

module.exports = appRoot;
