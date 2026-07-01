# Verification examples

This document walks through the StaMS verification pipeline from a `.sm` source file to the JSON artifacts the studio uses. The **VerifyModel** plugin builds intermediate representations **in memory only**; the only persisted artifact on the verify path is `stams/verification-result` on the project registry (committed with the model).

Export plugins **ModelToVerification** and **ModelToConstraints** still exist for debugging and tests; they write the same JSON shapes to files/registry when run manually.

---

## 1. Source: `examples/turnstile.sm`

```sm
machine Turnstile {
  variables {
    alarmCount: float = 0.0
  }

  events {
    coin
    push
  }

  actions {
    unlock {
      alarmCount = alarmCount + 1.0
    }
    lock {
      alarmCount = 0.0
    }
    alarm {
      alarmCount = alarmCount + 1.0
    }
  }

  guards {
    canUnlock {
      alarmCount == 0.0
    }
  }

  constraints {
    safety noAlarmWhenLocked {
      alarmCount >= 0.0
    }
    goal eventuallyUnlocked {
      alarmCount >= 0.0
    }
  }

  initial state Locked {
    entry lock
    on coin -> Unlocked guard canUnlock do unlock
    on push -> Locked do alarm
  }

  state Unlocked {
    on push -> Locked do lock
    on coin -> Unlocked
  }
}
```

After **TextToModel** syncs this text, the GME project contains a `Machine` node `Turnstile` with states, transitions, actions, guards, and `Constraint` children (`noAlarmWhenLocked`, `eventuallyUnlocked`).

---

## 2. Ephemeral semantics IR (`stams.verification-model.v1`)

**VerifyModel** calls `model-export` in memory. This is the **transition system M** — same structure used by simulation.

Abbreviated example (expressions are AST objects, not strings):

```json
{
  "$schema": "stams.verification-model.v1",
  "version": 1,
  "machines": [{
    "name": "Turnstile",
    "variables": [{
      "name": "alarmCount",
      "type": "float",
      "init": { "kind": "number", "value": 0 }
    }],
    "events": ["coin", "push"],
    "actions": {
      "unlock": { "statements": [{ "kind": "assign", "target": "alarmCount", "expr": { "...": "alarmCount + 1.0" } }] },
      "lock":   { "statements": [{ "kind": "assign", "target": "alarmCount", "expr": { "...": "0.0" } }] },
      "alarm":  { "statements": [{ "kind": "assign", "target": "alarmCount", "expr": { "...": "alarmCount + 1.0" } }] }
    },
    "guards": {
      "canUnlock": { "expr": { "...": "alarmCount == 0.0" } }
    },
    "states": [
      { "name": "Locked", "isInitial": true, "isFinal": false, "entry": "lock" },
      { "name": "Unlocked", "isInitial": false, "isFinal": false, "entry": null }
    ],
    "transitions": [
      { "id": "Locked:coin:Unlocked", "source": "Locked", "target": "Unlocked", "event": "coin", "guard": "canUnlock", "action": "unlock" },
      { "id": "Locked:push:Locked", "source": "Locked", "target": "Locked", "event": "push", "action": "alarm" },
      { "id": "Unlocked:push:Locked", "source": "Unlocked", "target": "Locked", "event": "push", "action": "lock" },
      { "id": "Unlocked:coin:Unlocked", "source": "Unlocked", "target": "Unlocked", "event": "coin" }
    ]
  }]
}
```

**Not persisted** on the verify path.

---

## 3. Ephemeral properties IR (`stams.constraints.v1`)

**VerifyModel** calls `constraints-export` in memory. This is **φ** — safety and goal formulas.

```json
{
  "$schema": "stams.constraints.v1",
  "version": 1,
  "machines": [{
    "name": "Turnstile",
    "constraints": [
      {
        "name": "noAlarmWhenLocked",
        "kind": "safety",
        "formula": {
          "kind": "expr",
          "expr": { "...": "alarmCount >= 0.0" }
        }
      },
      {
        "name": "eventuallyUnlocked",
        "kind": "goal",
        "formula": {
          "kind": "ltl",
          "op": "eventually",
          "arg": {
            "kind": "expr",
            "expr": { "...": "alarmCount >= 0.0" }
          }
        }
      }
    ]
  }]
}
```

| Kind | Meaning (bounded to N steps) |
|------|------------------------------|
| **safety** | On every explored path, at every step along the path, the expression must hold. Counterexample = a trace where it fails. |
| **goal** | There must exist a path (within N steps) where the inner expression holds at some step. Witness trace is returned on success. |

**Not persisted** on the verify path.

---

## 4. Deployment configuration (`config/components.json`)

WebGME’s main `config.default.js` schema cannot be extended with arbitrary top-level keys. StaMS verification settings live in **`config/components.json`** under the component id **`StaMS_Verification`** ([Component Settings](https://github.com/webgme/webgme/wiki/Component-Settings)):

```json
{
  "StaMS_Verification": {
    "maxDepth": 12,
    "timeoutMs": 30000,
    "engine": "auto",
    "registry": { "result": "stams/verification-result" },
    "z3": {
      "command": "z3",
      "args": ["-in", "-smt2"],
      "timeoutMs": 30000
    }
  }
}
```

| `engine` | Behaviour |
|----------|-----------|
| `bounded` | BFS on `simulation-engine` only |
| `z3` | SMT BMC via Z3; falls back to bounded if Z3/encoding unavailable |
| `auto` | Try Z3 first, then bounded exploration |

**Server:** `stams/verification/settings.js` merges defaults + `components.json` + env (`STAMS_VERIFY_*`, `STAMS_Z3_COMMAND`).

**Studio UI:** `GET /api/componentSettings/StaMS_Verification` (see `studio-ui/src/lib/stams-component-settings.ts`).

---

## 5. Verification engines

### 5a. Bounded exploration (`bounded-explore`)

1. BFS-expores unique `(state, variables)` configurations up to `maxDepth` transitions, using `simulation-engine` step semantics (same as the Simulate drawer).
2. **Safety:** checks the formula at every snapshot on every explored trace; first violation → `counterexample` trace.
3. **Goal:** checks whether any snapshot on any explored trace satisfies the inner expression; first witness → `proved` with optional witness trace.

### 5b. Z3 / SMT-LIB (`z3-bmc`) — see `docs/Z3-INTEGRATION.md`

Pipeline:

```
model + constraints  →  smt-bmc.js (unrolling)  →  SMT-LIB2 string
                              ↓
                         z3-runner.js (spawn z3 -in -smt2)
                              ↓
                    (sat) / (unsat) / (unknown)  →  verification-result
```

With `engine: auto`, Z3 is used when the binary is on `PATH` and the machine encodes successfully; otherwise bounded exploration runs.

---

## 6. Persisted result (`stams.verification-result.v1`)

After **VerifyModel** runs, the project registry key `stams/verification-result` holds:

```json
{
  "$schema": "stams.verification-result.v1",
  "version": 1,
  "machine": "Turnstile",
  "bound": 12,
  "engine": "bounded-explore",
  "results": [
    {
      "name": "noAlarmWhenLocked",
      "kind": "safety",
      "passed": true,
      "status": "proved",
      "bound": 12,
      "message": "Proved (for 12 steps)."
    },
    {
      "name": "eventuallyUnlocked",
      "kind": "goal",
      "passed": true,
      "status": "proved",
      "bound": 12,
      "message": "Witness at step 0 on state Locked (for 12 steps).",
      "counterexample": {
        "$schema": "stams.trace.v1",
        "version": 1,
        "machine": "Turnstile",
        "initial": { "state": "Locked", "variables": { "alarmCount": 0 } },
        "steps": []
      }
    }
  ]
}
```

| Field | Role |
|-------|------|
| `bound` | Depth limit used for this run |
| `engine` | Backend id (`bounded-explore`, later `z3-bmc`, …) |
| `status` | `proved` \| `counterexample` \| `unknown` \| `error` |
| `message` | Human-readable summary; safety pass uses **"Proved (for N steps)."** |
| `counterexample` | `stams.trace.v1` — violation path or goal witness; playable in the Verify drawer |

The plugin **commits** the project so the UI can read the registry on the active branch.

---

## 7. Counterexample trace (`stams.trace.v1`)

When safety fails (example: constraint `alarmCount < 0.0`), the result includes a full trace, e.g. after `push` from `Locked`:

```json
{
  "$schema": "stams.trace.v1",
  "version": 1,
  "machine": "Turnstile",
  "initial": { "state": "Locked", "variables": { "alarmCount": 0 } },
  "steps": [{
    "index": 0,
    "event": "push",
    "transition": {
      "id": "Locked:push:Locked",
      "source": "Locked",
      "target": "Locked",
      "action": "alarm"
    },
    "guardPassed": true,
    "before": { "state": "Locked", "variables": { "alarmCount": 0 } },
    "after": { "state": "Locked", "variables": { "alarmCount": 1 } },
    "effects": []
  }]
}
```

This is the same format as **SimulateMachine** / the in-browser simulator.

---

## 8. Studio UI flow

1. Open **Diagram** → **Verify** (right drawer).
2. Constraints list is read from GME (`Constraint` nodes) — no server round-trip for the list.
3. **Run verification** → `VerifyModel` server plugin.
4. Result cards show pass/fail, status, and message per constraint.
5. **Play trace** on a result with `counterexample` → diagram highlights state/transition; step prev/next scrubs the trace.

---

## 9. Running from the CLI / tests

```bash
# Unit tests (bounded verifier + plugin)
npm test -- --grep "bounded-verifier|VerifyModel"

# Full plugin build (includes VerifyModel)
npm run build:plugins
```

Plugin test flow: `TextToModel` with `examples/turnstile.sm` → `VerifyModel` → read `stams/verification-result` from project root registry.

---

## 10. Roadmap (not implemented yet)

| Item | Notes |
|------|--------|
| Z3 counterexample traces | Reconstruct `stams.trace.v1` from Z3 model |
| Bundled Z3 in desktop | `vendor/z3/` + `components.json` command path |
| Remove / hide export plugins | ModelToVerification, ModelToConstraints → dev/test only |
| User-facing depth/timeout | Stay in config file for now |
