'use strict';

/**
 * Runs before `npm start` (via the "prestart" hook).
 *
 * 1. Ensures studio-ui dependencies are installed (the primary UI).
 * 2. Ensures WebGME worker bundles exist under build/ (served at /build).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STUDIO_UI_DIR = path.join(ROOT, 'studio-ui');
const STUDIO_UI_NEXT = path.join(STUDIO_UI_DIR, 'node_modules', 'next');
const REQUIRED_ARTIFACTS = [
    path.join(ROOT, 'build', 'workers', 'langium.worker.js'),
    path.join(ROOT, 'build', 'workers', 'elk.worker.js'),
    path.join(ROOT, 'build', 'stams', 'sm-langium.js')
];

function run(command, label) {
    console.log('[prestart] ' + label);
    execSync(command, { stdio: 'inherit', cwd: ROOT, shell: true });
}

if (!fs.existsSync(STUDIO_UI_NEXT)) {
    console.log('[prestart] studio-ui dependencies missing — installing...');
    try {
        run('npm install --prefix studio-ui', 'installed studio-ui dependencies');
    } catch (err) {
        console.error('[prestart] failed to install studio-ui dependencies.');
        console.error('[prestart] run "npm install --prefix studio-ui" manually.');
        process.exit(1);
    }
}

const missingArtifacts = REQUIRED_ARTIFACTS.filter((artifact) => !fs.existsSync(artifact));

if (missingArtifacts.length > 0) {
    console.log('[prestart] missing build artifacts — running npm run build:');
    missingArtifacts.forEach((artifact) => {
        console.log('  - ' + path.relative(ROOT, artifact));
    });
    try {
        run('npm run build', 'built langium parser, workers, and plugins');
    } catch (err) {
        console.error('[prestart] build failed. /build/workers may 404 until you run "npm run build".');
    }
} else {
    console.log('[prestart] ready (studio-ui deps + build artifacts present).');
}
