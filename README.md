# StaMS — State Machine Studio

WebGME application demonstrating **Langium + Monaco + Sprotty + ELK** integration for state machine DSL authoring, with domain-aware merge analysis.

Repository: [github.com/kecso/StaMS](https://github.com/kecso/StaMS)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  studio-ui (Next.js + React + MUI)  :4000                   │
│  Project picker · custom layout · GME REST client           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api/webgme proxy
┌──────────────────────────▼──────────────────────────────────┐
│  WebGME Server  :8888                                        │
│  Plugins · Seed · Visualizers (panel/control/widget)         │
│  Langium workers · ELK workers · merge annotations           │
└─────────────────────────────────────────────────────────────┘
```

The **stock WebGME UI is not the primary interface**. The React `studio-ui` app follows patterns from the taxonomy dashboard (project cards, app-bar layout, tool launcher). WebGME visualizers (`MonacoEditor`, `SprottyDiagram`) remain registered for parity with standard WebGME architecture and can be embedded later.

See `docs/DESIGN.md` for the full design document.

## Prerequisites

- Node.js ≥ 20
- MongoDB (default `mongodb://127.0.0.1:27017/stams`)

## Quick start

```bash
# One-shot: installs server + studio-ui deps and builds everything
npm run setup

# Terminal 1 — WebGME API + plugins
npm start

# Terminal 2 — React studio
npm run start:ui

# Or both:
npm run dev
```

- WebGME API: http://localhost:8888
- Studio UI: http://localhost:4000

`npm start` runs a `prestart` guard (`scripts/ensure-build.js`) that builds the web
worker bundles on demand if they're missing, so `/build/workers/*` is never empty
and the Monaco/Sprotty visualizers stay responsive. Warm starts skip the build.

### Build commands

| Command | What it builds |
|---------|----------------|
| `npm run setup` | Install all deps + full build (first-time setup) |
| `npm run build` | Langium parser + web workers + plugins (everything the server serves) |
| `npm run build:all` | `build` plus the Next.js studio UI |
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
| `npm start` | WebGME standalone server |
| `npm run start:ui` | Next.js studio on port 4000 |
| `npm run dev` | Both server and UI |
| `npm run build:langium` | Regenerate Langium parser |
| `npm run build:workers` | Webpack worker bundles |
| `npm run plugin -- ...` | Run a plugin from CLI |
| `npm run seed` | Seed export instructions |

## License

MIT
