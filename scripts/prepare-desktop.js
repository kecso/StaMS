'use strict';

/**
 * Prepare for electron-builder: ensure optional engine deps exist and prune
 * packages that are not needed in the packaged desktop runtime.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NODE_MODULES = path.join(ROOT, 'node_modules');

function removeIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function ensureAzureAdPackage() {
  const pkgDir = path.join(NODE_MODULES, 'azure-ad-verify-token-commonjs');
  if (!fs.existsSync(pkgDir)) {
    throw new Error(
      'azure-ad-verify-token-commonjs is missing; run npm install at the repo root'
    );
  }
}

/** Hoisted deps may need linking into webgme-engine/node_modules for electron-builder. */
function linkHoistedEngineDep(packageName) {
  const src = path.join(NODE_MODULES, packageName);
  if (!fs.existsSync(src)) {
    return;
  }
  const engineModules = path.join(NODE_MODULES, 'webgme-engine', 'node_modules');
  const dest = path.join(engineModules, packageName);
  if (fs.existsSync(dest)) {
    return;
  }
  fs.mkdirSync(engineModules, { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(src, dest, linkType);
  console.log('[desktop] linked ' + packageName + ' into webgme-engine/node_modules');
}

/** Not used at server runtime — studio-ui ships static Monaco in studio-ui/out. */
function pruneDesktopOnlyPackages() {
  const toRemove = [
    path.join(NODE_MODULES, '@codingame'),
    path.join(NODE_MODULES, 'monaco-languageclient'),
    path.join(NODE_MODULES, 'monaco-editor')
  ];
  for (const target of toRemove) {
    if (fs.existsSync(target)) {
      console.log('[desktop] pruning ' + path.relative(ROOT, target));
      removeIfExists(target);
    }
  }
}

ensureAzureAdPackage();
linkHoistedEngineDep('azure-ad-verify-token-commonjs');
pruneDesktopOnlyPackages();
console.log('[desktop] prepare complete');
