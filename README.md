# StaMS — State Machine Studio

WebGME application demonstrating **Langium + Monaco + Sprotty + ELK** integration for state machine DSL authoring, with domain-aware merge analysis.

Repository: [github.com/kecso/StaMS](https://github.com/kecso/StaMS)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  WebGME Server  :8888  (single process)                       │
│  ├─ API / socket.io / gme-dist (engine)                      │
│  ├─ studio-ui/out  (exported Next.js — config.client.appDir) │
│  ├─ /build         (workers, plugins via StudioAssets)     │
│  └─ /studio/       (StudioUi router → studio/index.html)     │
└─────────────────────────────────────────────────────────────┘
```

The **stock WebGME UI is not the primary interface**. The React studio follows the [webgme-dss](https://github.com/webgme/webgme-dss) pattern: webpack/Next builds into a static `appDir`, and `webgme.standaloneServer` serves everything on one port. The browser talks to WebGME directly (same origin) — no proxy layer in production.

For **hot reload during development**, `npm run dev` still runs Next.js on `:4000` with rewrites to `:8888`.

WebGME visualizers (`MonacoEditor`, `SprottyDiagram`) remain registered for parity with standard WebGME architecture and can be embedded later.

See `docs/DESIGN.md` for the full design document.

## Prerequisites

- Node.js ≥ 20
- **No MongoDB** — model/commits and auth/metadata are fully in-memory (`storage.database.type = memory` + `MemoryGMEAuth`). `.sm` files are the durable exchange format. A backend restart clears projects; the studio detects this via `GET /api/stams/session` (`bootId`) and wipes stale browser cache automatically.

StaMS depends on [webgme](https://github.com/webgme/webgme) **`main`** (`github:webgme/webgme#main`); webgme-engine comes transitively from that dependency. Run `npm install` after pulling StaMS to pick up upstream changes.

## Quick start

```bash
# One-shot: installs server + studio-ui deps and builds everything
npm run setup

# Start the studio (single WebGME server on :8888)
npm start
```

Open **http://localhost:8888** — that is the main interface.

| URL | Service |
|-----|---------|
| http://localhost:8888 | **StaMS studio** (exported Next.js + WebGME API) |
| http://localhost:4000 | Dev-only: Next.js with HMR (`npm run dev`) |

`npm start` runs a `prestart` guard that installs `studio-ui` dependencies if needed
and builds worker bundles when missing, so a fresh checkout works after `npm run setup`.

**Runtime:** `npm start` runs a single in-memory WebGME server on `:8888` (no external database).

### Desktop app

```bash
npm run desktop:start    # Electron window + in-memory backend
npm run desktop:build    # Portable .exe (Windows) / .dmg / .AppImage → dist/desktop/
```

See `desktop/README.md` for details.

### Backend only

For plugin development, CLI tools, or tests without the Next.js shell:

```bash
npm run start:server    # WebGME API on :8888 (embedded Mongo by default)
```

`npm run dev` is an alias for `npm start`.

### Build commands

| Command | What it builds |
|---------|----------------|
| `npm run setup` | Install all deps + full build (first-time setup) |
| `npm run build` | Langium parser + workers + plugins + studio UI (`studio-ui/out`) |
| `npm run build:all` | Same as `npm run build` |
| `npm run build:langium` | Langium parser/AST from the grammar |
| `npm run build:workers` | Webpack bundles for `langium.worker` and `elk.worker` |
| `npm run build:plugins` | Rollup bundles for plugins (for future TS plugins) |
| `npm run build:ui` | Next.js production build of `studio-ui` |
| `npm run clean` | Remove the `build/` directory |

## First-time meta-model setup

1. Create a project from **EmptyProject** (via studio UI or WebGME API)
2. Run the **BuildMetaModel** plugin (server-side) on `master`
3. Export as seed — see `src/seeds/StateMachine/README.md`

## Plugins

| Plugin | Purpose |
|--------|---------|
| `BuildMetaModel` | Create meta-types (Project, File, Machine, State, …) |
| `TextToModel` | Langium parse → incremental GME sync |
| `ModelToText` | GME → DSL serialization |
| `FolderImport` | Zip of `.sm` files → File nodes |
| `FolderExport` | File nodes → zip download |
| `MergeAnalysis` | Domain-aware 3-way merge annotations |

## Visualizers

| Visualizer | Node | Technology |
|------------|------|------------|
| `MonacoEditor` | `File` | Monaco + Langium worker |
| `SprottyDiagram` | `Machine` | Sprotty + ELK worker |

Workers are built to `build/workers/` and served at `/build/workers/` via the `StudioAssets` router.

## Development phases

Tracked in `docs/DESIGN.md` §11 — Foundation (this bootstrap) → Monaco → Sprotty → Merge → Import/Export.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time install + full build |
| `npm start` | **Studio UI (:4000) + WebGME API (:8888)** — normal way to run StaMS |
| `npm run start:server` | WebGME API only (plugins, tests, CLI) |
| `npm run dev` | Alias for `npm start` |
| `npm run build` | Langium parser + workers + plugins + studio UI |
| `npm run build:all` | Same as `npm run build` |
| `npm run plugin -- ...` | Run a plugin from CLI |
| `npm run seed` | Seed export instructions |
| `npm run desktop:start` | Native desktop shell (Electron + embedded backend) |
| `npm run desktop:build` | Build portable desktop installer |

## License

MIT
