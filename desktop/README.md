# StaMS Desktop

Native desktop wrapper around the StaMS studio. Uses the same fully in-memory backend as `npm start` — no MongoDB install or embedded `mongod`.

## Development

From the repository root (after `npm run setup`):

```bash
npm run desktop:start
```

This launches Electron, spawns `app.js` as a child process, waits for `:8888`, and opens the studio UI.

### Debug mode

If the app closes immediately or misbehaves, run with debug enabled so backend output, renderer errors, and DevTools are visible. Logs are always appended to the Electron user-data folder (`desktop.log`).

**From source (recommended):**

```bash
npm run desktop:debug
```

**Packaged build** — run from a terminal (not double-click), e.g. PowerShell:

```powershell
cd dist\desktop\win-unpacked
$env:STAMS_DESKTOP_DEBUG = "1"
.\StaMS.exe
```

Or the portable exe the same way after it extracts. In debug mode the app **stays open** if the backend exits, shows an error dialog, and writes details to `%APPDATA%\StaMS\desktop.log` (Windows).

## Build installers

```bash
npm run desktop:build
```

Outputs land in `dist/desktop/`:

| Platform | Artifact |
|----------|----------|
| Windows | `StaMS-<version>-portable.exe` |
| macOS | `StaMS-<version>.dmg` |
| Linux | `StaMS-<version>.AppImage` |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `STAMS_PORT` | `8888` | Backend listen port |
| `STAMS_DESKTOP_DEBUG` | (unset) | `1` = DevTools, console logging, keep window open if backend dies; log file always written |
