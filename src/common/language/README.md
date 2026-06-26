# StaMS textual language (`.sm`)

This grammar is the source of truth for parsing. The WebGME metamodel in `meta-model.js` mirrors it for seed authoring.

## Scope (current)

- One `.sm` file may declare a `file` path and one or more `machine` blocks.
- Imports / cross-file references are **not** supported yet.
- `Machine.definedIn` links to a `File` node (path attribute); tooling can set this from the filename when omitted in text.

## Concepts

| Concept | Role | Containment | Attributes | References |
|---------|------|-------------|------------|------------|
| `Model` | Root of one `.sm` file | `FileDecl`, `Machine` | — | — |
| `FileDecl` | Logical file handle | — | `path` | — |
| `Machine` | First behavioral container | variables, events, actions, guards, constraints, states | `name`, `definedInPath?` | — |
| `Variable` | Machine-wide typed variable | — | `name`, `type` (`float` \| `string`), `init?` | — |
| `Event` | Trigger name | — | `name` | — |
| `Action` | Side-effect body (assignments / expressions) | — | `name`, `body` | — |
| `Guard` | Boolean check body | — | `name`, `body` | — |
| `Constraint` | Requirement (`safety` or `goal`) | — | `kind`, `name`, `body` | — |
| `State` | State (composite nesting allowed) | transitions, substates | `name`, `isInitial?`, `isFinal?` | `entry?`, `run?`, `exit?` → Action |
| `Transition` | Edge from source state | — | — | `event` → Event, `target` → State, `guard?` → Guard, `action?` → Action |

Transition **source** is the containing `State` (implicit in text; stored as `src` pointer in WebGME).

## Expression subgrammar

Shared by action/guard/constraint bodies and variable initializers:

- Literals: numbers, strings
- Variables: reference to `VariableDecl` in scope
- Operators: `!`, unary `-`, `*`, `/`, `+`, `-`, comparisons, `==`, `!=`, `&&`, `||`
- Calls: `name(args…)`

Type checking (float vs string) is not enforced in the grammar yet.

## Constraints / validation

Langium linking resolves cross-references. Additional checks live in `state-machine-validator.ts`:

- Machine must have exactly one `initial` state
- State names unique within a machine
- A state cannot be both `initial` and `final`

## Diagram layout

Diagram **structure** (states, transitions) is projected from the WebGME `Machine` subgraph (`model-to-sprotty.ts`). **Positions** are computed at render time by the ELK worker (`elk.worker.ts`), not stored in the `.sm` text. Optional persisted layout can be added later as WebGME registry attributes on `State` nodes if manual edits should survive reload.
