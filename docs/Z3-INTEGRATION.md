# Z3 integration

StaMS verification can use Microsoft **Z3** as an SMT backend for bounded model checking (BMC). The integration is split into small modules with explicit interfaces so the solver can be swapped or bundled later.

## Configuration

Same deployment file as the rest of StaMS verification: `config/components.json` → `StaMS_Verification.z3`:

```json
"z3": {
  "command": "z3",
  "args": ["-in", "-smt2"],
  "timeoutMs": 30000
}
```

Set `"engine": "z3"` to require Z3 (with bounded fallback on failure), or `"auto"` to prefer Z3 when available.

## Module map

| Module | Role |
|--------|------|
| `settings.js` | Loads `StaMS_Verification` from `components.json` |
| `verifier.js` | Facade: `bounded` / `z3` / `auto` |
| `bounded-verifier.js` | Reference semantics via `simulation-engine` BFS |
| `smt-expr.js` | `expr-ast` → SMT-LIB terms |
| `smt-bmc.js` | Unrolled transition system + property query |
| `z3-runner.js` | Process spawn + stdout parsing |
| `z3-verifier.js` | Per-constraint Z3 loop → `verification-result.v1` |

## `z3-runner.js` — talking to Z3

Z3 is invoked as a **child process** with the SMT-LIB script on **stdin**:

```bash
z3 -in -smt2 < query.smt2
```

### API

```javascript
runZ3(smt2, options) → {
  status: 'sat' | 'unsat' | 'unknown' | 'error',
  stdout: string,
  stderr: string,
  model: Record<string, { sort, value }>,  // when sat + (get-model)
  exitCode: number,
  commandLine: string
}

isZ3Available(options) → boolean   // probe (check-sat)
```

### Example session

**Input (stdin):**

```smt2
(set-option :produce-models true)
(set-logic QF_LIA)
(declare-fun x () Int)
(assert (> x 0))
(check-sat)
(get-model)
```

**Output (stdout):**

```text
sat
(model (define-fun x () Int 1))
```

**Safety encoding:** ask Z3 whether a violation exists within `N` steps:

- Unroll states `state_s0 … state_sN` (Int indices) and variables `v_s0 … v_sN`
- Constrain transitions with `(assert (or …))` per step
- **Safety:** `(assert (or (not φ_s0) … (not φ_sN)))` — `unsat` ⇒ proved
- **Goal:** `(assert (or φ_s0 … φ_sN))` — `sat` ⇒ witness

## `smt-bmc.js` — encoding interface

```javascript
supportsMachine(machine) → { ok: boolean, reason?: string }

encodeSafetyViolationQuery(model, machineName, constraint, bound)
  → { smt2, logic, bound, kind } | { error }

encodeGoalWitnessQuery(model, machineName, constraint, bound)
  → { smt2, logic, bound, kind } | { error }
```

Current limitations (encoder returns `{ error }` or `z3-verifier` returns `null` for `auto` fallback):

- `int`, `float` (`Real`), `bool` variables
- No `string` variables
- Safety: `expr` formulas only (not full LTL)
- Goals: `eventually` lowered to “holds at some step”
- No `call` in expressions
- Counterexample **traces** from Z3 models not yet reconstructed (result may have `counterexample: null`)

## `verifier.js` — dispatch

```javascript
verify(model, constraintsDoc, machineName, settings?) → stams.verification-result.v1
```

`VerifyModel` plugin calls this after in-memory `model-export` + `constraints-export`.

## Tests

```bash
npm test -- --grep "z3-runner|verification settings|VerifyModel"
```

`z3-runner` tests are skipped when `z3` is not on `PATH`.

## Bundling Z3 (desktop)

Not implemented yet. Planned approach:

1. Vendor platform binaries under `vendor/z3/`
2. Point `components.json` → `z3.command` at the packaged path in `prepare-desktop.js`
3. Keep `z3-runner.js` unchanged (still stdin/stdout SMT-LIB)
