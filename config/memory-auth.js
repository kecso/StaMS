'use strict';

var path = require('path');

/** Path to webgme-engine's MemoryGMEAuth (no MongoDB). */
function memoryGmeAuthPath() {
    return path.join(
        path.dirname(require.resolve('webgme-engine/package.json')),
        'src/server/middleware/auth/memorygmeauth'
    );
}

module.exports = {
    memoryGmeAuthPath: memoryGmeAuthPath
};
