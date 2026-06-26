/**
 * Copies the Monaco editor `min/vs` bundle into public/monaco/vs so the editor
 * loads from the studio's own origin instead of a CDN (works offline / behind a
 * proxy). Runs automatically via predev / prebuild.
 */
import { cp, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const destDir = join(root, 'public', 'monaco');
const dest = join(destDir, 'vs');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(src))) {
  console.warn('[copy-monaco] monaco-editor not installed yet, skipping.');
  process.exit(0);
}

if (await exists(dest)) {
  console.log('[copy-monaco] public/monaco/vs already present, skipping.');
  process.exit(0);
}

await mkdir(destDir, { recursive: true });
await cp(src, dest, { recursive: true });
console.log('[copy-monaco] copied monaco min/vs -> public/monaco/vs');
