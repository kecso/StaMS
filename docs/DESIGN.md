# StaMS Design Document

This is the living Markdown design for **StaMS — State Machine Studio**. It reflects the current repository state and replaces the older high-level summary of `smstudio.docx`.

StaMS is a WebGME-based modeling studio for authoring, visualizing, simulating, verifying, importing/exporting, and merging state-machine behavior models. The implementation intentionally keeps WebGME as the modeling and collaboration substrate while replacing the stock WebGME UI with a custom React experience.

## Current Position

The current implementation is a foundation rather than a complete studio.

- Completed: WebGME server bootstrap, plugin skeletons and tests, Langium grammar generation, Monaco/Sprotty visualizer registration, worker builds, custom `studio-ui`, DSS-style start page, and WebGME browser-client/WebSocket integration.
- In progress: React studio shell, project open flow through `gmeClient.selectProject()`, seed export workflow, and the bridge from React panels to WebGME territories.
- Not started: full Monaco editor embedding inside the custom React UI, live Sprotty diagram panel, semantic model synchronization from the UI shell, constraint DSL, solver integration, simulator, trace viewer, and verification result visualization.

## Architectural Principles

- Keep WebGME as the authoritative model database, project/branch manager, plugin host, seed mechanism, and collaboration/event substrate.
- Use the WebGME browser client (`gmeClient`) over WebSockets for project and model operations. Do not use REST as the primary model data path.
- Keep Next.js, React, and MUI for the custom studio UI. Do not replace the framework to mimic another project.
- Follow useful `webgme-dss` patterns where they fit: custom start page, direct WebGME client use, project seeding, and project-specific routes.
- Treat Langium text, WebGME nodes, diagrams, simulation traces, and verification results as different views over one model, not separate sources of truth.
- Keep solver syntax out of the normal user workflow. Users should write domain-level requirements and constraints; StaMS should compile them to solver-specific input.

## Runtime Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ studio-ui (:4000)                                                │
│ Next.js + React + MUI                                            │
│ Start page · Studio shell · DSL · Diagram · Sim · Verification   │
│ Loads /gme-dist/webgme.classes.build.js                          │
│ Proxies /gmeConfig.json and /socket.io to WebGME                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ gmeClient over socket.io
┌───────────────────────────────▼─────────────────────────────────┐
│ WebGME server (:8888)                                            │
│ Projects · Branches · Territories · Plugins · Seeds · Blob       │
│ BuildMetaModel · TextToModel · ModelToText · MergeAnalysis       │
│ Future: VerifyModel · SimulateModel · TraceImport/Export         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ generated solver jobs / artifacts
┌───────────────────────────────▼─────────────────────────────────┐
│ Verification and simulation backends                             │
│ Shared transition-system IR                                      │
│ SMT-LIB/Z3 first · optional Alloy/MiniZinc/nuXmv exporters        │
└─────────────────────────────────────────────────────────────────┘
```

The UI currently runs on `:4000` and the WebGME server on `:8888`. Next.js rewrites proxy WebGME client assets and socket.io through the UI origin so the WebGME browser client can connect cleanly from the custom UI.

## Implemented Repository Shape

- `studio-ui/`: Next.js + React + MUI custom UI. It now uses `GmeClientProvider` and `gmeClient` for WebSocket communication.
- `studio-ui/src/components/start/`: DSS-style start page with welcome header, seed cards, and project list.
- `studio-ui/src/app/studio/[projectId]/page.tsx`: React studio shell that opens a WebGME project with `gmeClient.selectProject()`.
- `src/common/language/state-machine.langium`: state-machine DSL grammar.
- `src/common/language/generated/`: generated Langium parser artifacts.
- `src/common/meta-model.js`: WebGME meta-model definition helpers.
- `src/common/gme-helpers.js`: shared helpers for plugin-side model traversal and mutation.
- `src/plugins/BuildMetaModel/`: creates the WebGME meta-model in a project.
- `src/plugins/TextToModel/`: parses DSL text and synchronizes WebGME nodes.
- `src/plugins/ModelToText/`: serializes WebGME state-machine models back to DSL text.
- `src/plugins/FolderImport/` and `src/plugins/FolderExport/`: zip import/export of `.sm` files.
- `src/plugins/MergeAnalysis/`: domain-aware merge annotations.
- `src/visualizers/MonacoEditor/` and `src/visualizers/SprottyDiagram/`: WebGME visualizer registrations.
- `src/routers/StudioAssets/`: serves built worker assets from `/build`.
- `scripts/ensure-build.js`: startup guard for dependencies and worker artifacts.
- `scripts/build-seed.js`: seed export helper.
- `examples/`: sample `.sm` files.

## Burn-Down Snapshot

Legend: `[done]` means implemented and at least build/test checked; `[partial]` means architectural path exists but the user-facing feature is incomplete; `[todo]` means not implemented.

- Foundation and build pipeline: `[done]` 100%
  - Langium generation, worker bundling, plugin bundling, setup/start scripts, and tests are in place.
- WebGME server integration: `[done]` 90%
  - Server config, custom asset router, plugin execution, and guest access are present. Remaining work is seed hardening and production deployment settings.
- Custom start page: `[done]` 85%
  - DSS-style project selection and seed-based creation are present. Remaining work is polishing seed availability and project metadata.
- WebSocket data layer: `[done]` 80%
  - `gmeClient` bootstrap and project operations are present. Remaining work is territory subscriptions and robust reconnect/close behavior in the studio shell.
- DSL grammar and parser: `[partial]` 60%
  - Basic machine/events/actions/states/transitions/guards exist. Remaining work is diagnostics, richer guard/action semantics, and constraint-language integration.
- Text/model synchronization: `[partial]` 55%
  - Plugin structure exists. Remaining work is incremental editor integration, conflict handling, and user-facing sync feedback.
- Monaco editor experience: `[partial]` 35%
  - Visualizer scaffold and worker bundle exist. Remaining work is embedding Monaco in the React studio and wiring edits through WebGME.
- Sprotty diagram experience: `[partial]` 30%
  - Visualizer scaffold and ELK worker exist. Remaining work is live model-to-diagram projection, selection sync, and trace overlays.
- Merge analysis: `[partial]` 45%
  - Plugin exists. Remaining work is UI for conflicts, domain annotations, and guided resolution.
- Import/export: `[partial]` 50%
  - Plugin structure exists. Remaining work is UI integration and seed/export ergonomics.
- Verification and constraints: `[todo]` 0%
  - Design proposed below.
- Simulation and trace generation: `[todo]` 0%
  - Design proposed below.

## State Machine Language

The current DSL is intentionally small:

```stams
events { coin push }
actions { unlock(); lock(); alarm(); }

machine Turnstile {
  initial state Locked {
    on coin -> Unlocked / unlock();
    on push -> Locked / alarm();
  }
  state Unlocked {
    on push -> Locked / lock();
  }
}
```

The grammar supports:

- Top-level imports.
- Global event and action declarations.
- Machines with local events/actions.
- Nested states.
- Initial states.
- Event-triggered transitions.
- String guards as placeholders.

The next language step should replace opaque string guards with typed expressions shared by simulation and verification. That gives one semantics for editing, model sync, simulation, and solver export.

## Proposed Constraint And Verification Layer

StaMS should provide a domain-specific requirements language rather than asking users to write raw solver input. Solver languages are powerful, but they are not appropriate as the primary studio-facing syntax.

### Recommended User-Facing Constraint DSL

Add a second Langium grammar, either as `requirements` blocks inside `.sm` files or as companion `.req` files attached to a `File`/`Machine` node.

Example:

```stams
machine Turnstile {
  events { coin push reset }
  vars {
    alarmed: bool = false
    credits: int 0..3 = 0
  }

  initial state Locked {
    on coin -> Unlocked / credits = credits + 1
    on push -> Locked / alarmed = true
  }

  state Unlocked {
    on push -> Locked / credits = credits - 1
  }
}

requirements {
  safety no_free_entry:
    always state == Unlocked implies credits > 0

  safety no_fault:
    always not state == Fault

  reachability can_alarm:
    eventually alarmed == true

  scenario reset_recovers:
    from any send reset within 3 steps reaches Locked
}
```

The requirement language should have these concepts:

- `vars`: finite-domain booleans, bounded integers, and enums. Bounds matter because they make simulation and bounded verification tractable.
- `requires` / assumptions: environment restrictions, such as which events are allowed in which state.
- `safety`: invariants that must hold at every reachable step.
- `reachability`: goals for finding traces to a target condition.
- `scenario`: guided checks that combine event sequences, nondeterminism, and expected states.
- `liveness` later: eventuality properties, initially bounded only.
- Named requirements: every solver result maps back to a requirement node.

### Solver Language Survey

SMT-LIB + Z3 is the best first backend.

- It is a standard solver interchange format for satisfiability modulo theories.
- It maps cleanly to transition systems: declare state variables at step `k`, encode `init`, encode `trans(k, k+1)`, assert a bad condition or negated requirement, and call `check-sat`.
- It supports booleans, enums via datatypes, bounded integers, arithmetic, and uninterpreted functions if needed later.
- It can produce concrete models that StaMS can turn into counterexample traces.
- It supports bounded model checking and can later support k-induction-style proof attempts for safety requirements.

Alloy is attractive as an optional exploratory backend.

- It is more readable than SMT-LIB and has excellent counterexample/trace semantics.
- Its relational logic is useful for structural constraints over models, meta-model sanity checks, and design-space exploration.
- It is bounded by nature, which fits early-stage trace exploration.
- It is less ideal as the first backend for executable state-machine semantics because we would still need a translation layer and an Alloy runtime/tooling story.

MiniZinc is useful for optimization and scheduling-style constraints, not as the primary behavior verifier.

- It has a JavaScript interface and can run with native or WebAssembly support.
- It is strong for constraint programming problems such as resource allocation, configuration, scheduling, and "find a trace optimizing X".
- It is less natural for temporal safety proofs than SMT/model-checking backends.
- It could become an optional backend for "generate a trace of N steps satisfying these coverage goals".

nuXmv/NuSMV is useful for temporal model checking export.

- It supports CTL/LTL specifications and generates counterexample traces.
- It is a natural match for finite-state machines with temporal requirements.
- It adds a heavier external binary/tooling dependency and licensing/deployment concerns, so it should be an exporter/backend option rather than the first required runtime.

### Recommended Verification Architecture

Build a shared transition-system intermediate representation (IR) and make every verification/simulation backend consume it.

```text
WebGME model / DSL text
        │
        ▼
StateMachine AST + semantic index
        │
        ▼
Transition-System IR
  - states
  - events
  - variables and domains
  - initial condition
  - transition relation
  - action/update semantics
  - requirement predicates
        │
        ├── Simulator interpreter
        ├── SMT-LIB/Z3 bounded verifier
        ├── Alloy exporter (optional)
        ├── MiniZinc trace generator (optional)
        └── nuXmv exporter (optional)
```

The first solver implementation should be a WebGME plugin named `VerifyModel`.

- Input: active `Machine` or `File`, selected requirements, max depth, solver timeout, and backend.
- Output: a `VerificationRun` result artifact containing status, requirement results, generated solver input, solver output, and normalized traces.
- Execution: server-side plugin first, because native solver binaries and timeouts are easier to manage on the server.
- UI: React verification panel submits plugin jobs through the WebGME client and listens for plugin notifications/territory updates.
- Persistence: results are stored as WebGME nodes or blob artifacts so runs can be compared across branches.

The normalized result should use a solver-independent shape:

```json
{
  "requirement": "no_fault",
  "status": "proved-bounded | counterexample | unknown | error",
  "bound": 12,
  "trace": [
    {"step": 0, "state": "Locked", "event": null, "vars": {"alarmed": false}},
    {"step": 1, "state": "Locked", "event": "push", "vars": {"alarmed": true}}
  ],
  "artifacts": {
    "smt2": "blob-hash",
    "solverLog": "blob-hash"
  }
}
```

### Bounded Verification Semantics

For the first implementation, keep the promise precise:

- "Find a trace to a faulty state within N steps."
- "Find a counterexample to this safety requirement within N steps."
- "No counterexample was found up to N steps."

Only claim proof when using a complete finite-state exploration or a successful induction/model-checking backend. A bounded `unsat` result is useful, but it is not a universal proof unless the explored bound is complete for the finite state space or an induction step succeeds.

### Faulty State Support

Add first-class faulty/error annotations to the model:

```stams
state Fault <<fault>> {
}

requirements {
  safety no_fault:
    always not in Fault
}
```

This keeps common verification workflows simple:

- Generate a trace to any state tagged `fault`.
- Generate a trace that violates a named safety requirement.
- Show the trace over the diagram and in a step table.

## Simulation Layer

Simulation should be simple, deterministic where possible, and use the same transition-system IR as verification.

### Minimum Simulator

The first simulator should support:

- Reset: return to the initial configuration.
- Send event: user selects an enabled event; simulator advances one step.
- Step count: user asks for `N` random steps.
- Random trace: simulator chooses enabled events/transitions for `N` steps.
- Seeded random mode: user can reproduce a random trace by keeping the seed.
- Trace export: save the trace as JSON and optionally as `.smtrace`.
- Trace replay: load a verification counterexample and replay it in the simulator.

### Simulation Semantics

At each step:

1. Determine current active state configuration.
2. Find enabled transitions for the input event.
3. Evaluate guards using the shared typed expression evaluator.
4. Apply action/update semantics.
5. Enter the target state and emit trace data.

If multiple transitions are enabled, the simulator should expose the nondeterminism:

- Manual mode asks the user to choose.
- Random mode chooses one using the configured seed.
- Verification mode treats all enabled transitions as possible.

### UI Shape

Add a `Simulation` tab to the studio page:

- Current state badge and variable inspector.
- Event buttons for enabled events.
- Reset button.
- `Random trace` control with number of steps and optional seed.
- Trace timeline.
- "Open in diagram" overlay that highlights active states and traversed transitions.

Verification and simulation should share the same trace viewer. A trace found by Z3, Alloy, or nuXmv should be replayable in the simulator panel without caring which backend produced it.

## Studio UI Roadmap

The React studio should converge on these panels:

- Start page: DSS-style project creation/listing over `gmeClient`.
- Project shell: active branch, project metadata, tabs, plugin status, and WebGME connection status.
- DSL editor: Monaco + Langium diagnostics + text/model sync.
- Diagram: Sprotty + ELK projection from the active machine.
- Object tree: WebGME territory-backed model browser.
- Simulation: reset, send event, random trace, replay trace.
- Verification: named requirements, bounded depth, backend selector, results, counterexample/proof artifacts.
- Merge: branch comparison, domain-aware conflicts, guided resolution.
- Import/export: folder zip import/export, seed export helpers.

## Plugin Roadmap

Existing plugins remain valid and should be extended rather than replaced.

- `BuildMetaModel`: keep as the first-time meta-model bootstrap.
- `TextToModel`: evolve toward incremental sync from the Monaco editor.
- `ModelToText`: keep text serialization deterministic for diffs and exports.
- `FolderImport` / `FolderExport`: expose from the React UI.
- `MergeAnalysis`: map merge conflicts to state-machine concepts and UI annotations.
- `VerifyModel`: new plugin that compiles the transition-system IR to SMT-LIB first, with optional exporters later.
- `SimulateModel`: optional server-side plugin for long/random/batch simulations; the normal interactive simulator can run client-side from the same IR.

## Data Model Extensions

Add or refine meta-model concepts:

- `Variable`: name, type, lower/upper bound or enum literals, initial value.
- `Guard`: typed expression instead of raw string.
- `Action`: either symbolic named action or explicit variable update.
- `Requirement`: name, kind, expression, bound/default options, enabled flag.
- `VerificationRun`: backend, bounds, status, started/finished timestamps, result artifacts.
- `Trace`: ordered steps, event, active state, variable valuation, violated requirement.
- `State.kind`: normal, initial, final, fault.

## Implementation Phases From Here

Phase 1: Stabilize current foundation.

- Confirm `npm start` local workflow with MongoDB and free ports.
- Harden WebSocket reconnect/cleanup behavior.
- Export and register the `StateMachine` seed.
- Add project metadata so the start page can filter StaMS projects without guessing.

Phase 2: Make the custom studio actually model-aware.

- Add WebGME territory subscription in the React studio shell.
- Show object tree from live WebGME nodes.
- Embed Monaco and connect it to the Langium worker.
- Wire `TextToModel` and `ModelToText` into editor save/load flows.

Phase 3: Add diagram and trace visualization.

- Project active machine to Sprotty model.
- Run ELK layout in the existing worker.
- Sync selections among tree, text, and diagram.
- Add trace overlay support for simulation and verification.

Phase 4: Add typed expressions and requirements.

- Extend Langium grammar with variables, expressions, updates, requirements, and fault annotations.
- Add semantic validation for domains, unknown events/actions/variables, and invalid expressions.
- Persist requirements as WebGME nodes.

Phase 5: Add simulation.

- Implement shared transition-system IR.
- Implement client-side interpreter.
- Add reset/send-event/random-trace UI.
- Persist and replay traces.

Phase 6: Add verification.

- Implement `VerifyModel` plugin.
- Generate SMT-LIB for bounded reachability and safety checks.
- Integrate Z3 or a compatible SMT solver server-side.
- Normalize solver results into StaMS traces.
- Display counterexamples/proof-bounded results in the UI.

Phase 7: Optional advanced backends.

- Alloy exporter for relational/structural exploration.
- MiniZinc backend for coverage/optimization trace generation.
- nuXmv exporter for CTL/LTL model checking.
- k-induction or complete finite-state proof mode for stronger safety claims.

## Open Design Questions

- Should requirements live inline in `.sm` files, in separate `.req` files, or as WebGME nodes rendered into either form?
- Should named actions remain opaque hooks, or should StaMS require explicit variable updates for verification-grade models?
- What is the minimal typed expression language that is useful without becoming a general programming language?
- Should simulation run entirely client-side for interactivity, or should every trace be persisted through WebGME immediately?
- Which solver packaging path is acceptable for the target environment: native Z3 binary, WebAssembly solver, Dockerized service, or optional local install?
- How strong does "proof" need to be for the first demo: bounded no-counterexample, complete finite-state exploration, or induction-backed proof?

## Near-Term Definition Of Done

A credible next demo should show:

- Start page creates/opens projects over WebSocket.
- A seeded project opens in the React studio.
- The object tree, DSL editor, and diagram all reflect the same WebGME model.
- The user can reset the simulator, send events, and generate a random trace of `N` steps.
- The user can mark a state as `fault`, run "find trace to fault" with a depth bound, and see the generated trace replayed in the same trace viewer.
- The README and design document accurately describe WebSocket-first architecture, not REST-first architecture.
