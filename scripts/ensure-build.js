'use strict';

/**
 * Runs before `npm start` (via the "prestart" hook).
 *
 * The WebGME server serves bundled web workers and other artifacts from `build/`
 * through the StudioAssets router (mounted at `/build`). If those artifacts are
 * missing, requests to `/build/workers/*.js` 404 and the Monaco/Sprotty
 * visualizers appear "nonresponsive". This guard builds them on demand so a fresh
 * checkout just works with `npm start`, while keeping warm starts instant.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_ARTIFACTS = [
    path.join(__dirname, '..', 'build', 'workers', 'langium.worker.js'),
    path.join(__dirname, '..', 'build', 'workers', 'elk.worker.js')
];

const missing = REQUIRED_ARTIFACTS.filter((artifact) => !fs.existsSync(artifact));

if (missing.length === 0) {
    console.log('[ensure-build] build artifacts present, skipping build.');
    process.exit(0);
}

console.log('[ensure-build] missing build artifacts, running full build:');
missing.forEach((artifact) => console.log('  - ' + path.relative(path.join(__dirname, '..'), artifact)));

try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (err) {
    console.error('[ensure-build] build failed. Start may serve an empty /build endpoint.');
    console.error('[ensure-build] run "npm run build" manually to see details.');
    // Do not block the server from starting; surface the issue but continue.
    process.exit(0);
}
