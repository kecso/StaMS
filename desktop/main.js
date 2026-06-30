'use strict';

/**
 * StaMS desktop shell — spawns the fully in-memory WebGME backend and opens the
 * exported studio UI in a native window.
 *
 * Uses ELECTRON_RUN_AS_NODE so the packaged Electron binary can run app.js
 * without shipping a separate Node runtime.
 */

const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { app, BrowserWindow, shell } = require('electron');

const PORT = Number(process.env.STAMS_PORT || 8888);
const STUDIO_URL = `http://127.0.0.1:${PORT}/`;

let serverProcess = null;
let mainWindow = null;

function appRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar');
  }
  return path.join(__dirname, '..');
}

function waitForPort(port, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/stams/session`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        schedule();
      });
      req.on('error', schedule);
      req.setTimeout(2000, () => {
        req.destroy();
        schedule();
      });
    };
    const schedule = () => {
      if (Date.now() > deadline) {
        reject(new Error(`StaMS server did not start within ${timeoutMs}ms`));
        return;
      }
      setTimeout(tryOnce, 500);
    };
    tryOnce();
  });
}

function startBackend() {
  const root = appRoot();
  const appJs = path.join(root, 'app.js');

  serverProcess = spawn(process.execPath, [appJs], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      STAMS_PORT: String(PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  serverProcess.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[desktop] StaMS server exited with code ${code}`);
    }
    serverProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      app.quit();
    }
  });
}

function stopBackend() {
  if (!serverProcess) {
    return;
  }
  serverProcess.kill();
  serverProcess = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'StaMS — State Machine Studio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(STUDIO_URL);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      startBackend();
      await waitForPort(PORT);
      createWindow();
    } catch (err) {
      console.error('[desktop] Failed to start StaMS:', err);
      stopBackend();
      app.exit(1);
    }
  });

  app.on('window-all-closed', () => {
    stopBackend();
    app.quit();
  });

  app.on('before-quit', () => {
    stopBackend();
  });
}
