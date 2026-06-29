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
- No external MongoDB required for normal use — StaMS starts a private ephemeral `mongod` on a random port (via `mongodb-memory-server`) because webgme-engine's GmeAuth still requires MongoDB even when model storage is `memory`. Set `STAMS_MONGO_URI` to use your own MongoDB instead.

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

**Runtime:** `npm start` runs a single WebGME server on `:8888` with an embedded MongoDB for auth/metadata (random port, discarded on exit). Model data uses in-memory storage. For an external MongoDB, set `STAMS_MONGO_URI` (e.g. `mongodb://127.0.0.1:27017/stams`).

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
| `npm run start:server` | WebGME API only (plugins, tests, CLI; embedded Mongo unless `STAMS_MONGO_URI` set) |
| `npm run dev` | Alias for `npm start` |
| `npm run build` | Langium parser + workers + plugins + studio UI |
| `npm run build:all` | Same as `npm run build` |
| `npm run plugin -- ...` | Run a plugin from CLI |
| `npm run seed` | Seed export instructions |

## License

MIT
