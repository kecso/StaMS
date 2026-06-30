'use strict';

/**
 * Launch the Electron desktop shell with STAMS_DESKTOP_DEBUG=1 (console + DevTools + log file).
 * Usage: npm run desktop:debug
 * Packaged: STAMS_DESKTOP_DEBUG=1 path\to\StaMS.exe  (run from cmd/PowerShell, not double-click)
 */

const path = require('path');
const { spawn } = require('child_process');

process.env.STAMS_DESKTOP_DEBUG = '1';

const electron = require('electron');
const mainJs = path.join(__dirname, '..', 'desktop', 'main.js');

const child = spawn(electron, [mainJs], {
  stdio: 'inherit',
  env: process.env,
  shell: false
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
