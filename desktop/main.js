'use strict';

/**
 * StaMS desktop shell — spawns the fully in-memory WebGME backend and opens the
 * exported studio UI in a native window.
 *
 * Uses ELECTRON_RUN_AS_NODE so the packaged Electron binary can run app.js
 * without shipping a separate Node runtime.
 *
 * Debug: set STAMS_DESKTOP_DEBUG=1 (see npm run desktop:debug). Logs go to
 * %APPDATA%/StaMS/desktop.log (or Electron userData on other platforms).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { app, BrowserWindow, shell, dialog } = require('electron');

const PORT = Number(process.env.STAMS_PORT || 8888);
const STUDIO_URL = `http://127.0.0.1:${PORT}/`;
const DEBUG = /^(1|true|yes)$/i.test(process.env.STAMS_DESKTOP_DEBUG || '');

let serverProcess = null;
let mainWindow = null;
let logStream = null;

function logPath() {
  return path.join(app.getPath('userData'), 'desktop.log');
}

function initLog() {
  if (logStream) {
    return;
  }
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    logStream = fs.createWriteStream(logPath(), { flags: 'a' });
    writeLog('--- desktop session start ---');
    writeLog(`packaged=${app.isPackaged} debug=${DEBUG} port=${PORT}`);
    writeLog(`log file: ${logPath()}`);
  } catch (err) {
    console.error('[desktop] failed to open log file:', err);
  }
}

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  if (DEBUG) {
    console.log('[desktop]', message);
  }
  logStream?.write(line + '\n');
}

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

function backendCwd() {
  return app.isPackaged ? app.getPath('userData') : appRoot();
}

function startBackend() {
  const root = appRoot();
  const appJs = path.join(root, 'app.js');

  writeLog(`spawning backend: ${appJs}`);
  writeLog(`backend cwd: ${backendCwd()}`);

  serverProcess = spawn(process.execPath, [appJs], {
    cwd: backendCwd(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      STAMS_PORT: String(PORT),
      STAMS_APP_ROOT: root
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    if (DEBUG) {
      process.stdout.write(chunk);
    }
    logStream?.write(`[backend:stdout] ${text}`);
  });
  serverProcess.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    if (DEBUG) {
      process.stderr.write(chunk);
    }
    logStream?.write(`[backend:stderr] ${text}`);
  });
  serverProcess.on('error', (err) => {
    writeLog(`backend spawn error: ${err.stack || err}`);
  });
  serverProcess.on('exit', (code, signal) => {
    writeLog(`backend exited code=${code} signal=${signal}`);
    if (code !== 0 && code !== null) {
      console.error(`[desktop] StaMS server exited with code ${code}`);
    }
    serverProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (DEBUG) {
        dialog.showErrorBox(
          'StaMS backend stopped',
          `The WebGME server exited (code=${code}, signal=${signal}).\n\n` +
            `See log: ${logPath()}\n\nThe window stays open in debug mode.`
        );
        return;
      }
      app.quit();
    }
  });
}

function stopBackend() {
  if (!serverProcess) {
    return;
  }
  writeLog('stopping backend');
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

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeLog(`did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (DEBUG) {
      writeLog(`renderer[${level}] ${message} (${sourceId}:${line})`);
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

  if (DEBUG) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    writeLog('DevTools opened (debug mode)');
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[desktop] second instance — quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    writeLog('second-instance focus');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    initLog();
    try {
      startBackend();
      await waitForPort(PORT);
      writeLog('backend ready, opening window');
      createWindow();
    } catch (err) {
      writeLog(`startup failed: ${err.stack || err}`);
      console.error('[desktop] Failed to start StaMS:', err);
      if (DEBUG) {
        dialog.showErrorBox('StaMS failed to start', String(err.stack || err));
      }
      stopBackend();
      app.exit(1);
    }
  });

  app.on('window-all-closed', () => {
    writeLog('window-all-closed');
    stopBackend();
    app.quit();
  });

  app.on('before-quit', () => {
    writeLog('before-quit');
    stopBackend();
  });
}
