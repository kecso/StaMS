'use strict';

/**
 * Smoke-test the desktop backend spawn path (no Electron window).
 * Verifies in-memory MemoryGMEAuth startup and session API.
 */

const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = 18888;

function waitForSession(port, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/stams/session`, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(body));
            return;
          }
          schedule();
        });
      });
      req.on('error', schedule);
      req.setTimeout(2000, () => {
        req.destroy();
        schedule();
      });
    };
    const schedule = () => {
      if (Date.now() > deadline) {
        reject(new Error('timeout'));
        return;
      }
      setTimeout(tryOnce, 500);
    };
    tryOnce();
  });
}

async function main() {
  const child = spawn(process.execPath, [path.join(ROOT, 'app.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      STAMS_PORT: String(PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  try {
    const session = await waitForSession(PORT);
    if (!session.bootId) {
      throw new Error('session response missing bootId');
    }
    console.log('[desktop-smoke] ok bootId=' + session.bootId);
    process.exitCode = 0;
  } catch (err) {
    console.error('[desktop-smoke] failed:', err);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
}

main();
