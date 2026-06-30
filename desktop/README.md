# StaMS Desktop

Native desktop wrapper around the StaMS studio. Uses the same fully in-memory backend as `npm start` — no MongoDB install or embedded `mongod`.

## Development

From the repository root (after `npm run setup`):

```bash
npm run desktop:start
```

This launches Electron, spawns `app.js` as a child process, waits for `:8888`, and opens the studio UI.

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
