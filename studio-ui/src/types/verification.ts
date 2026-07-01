/**
 * Client-side mirror of the `stams.verification-model.v1` and `stams.trace.v1`
 * JSON contracts (see repo `schemas/`). Kept structurally identical so a trace
 * grown in the browser is byte-compatible with one produced by the
 * `SimulateMachine` server plugin.
 */

export type SmExpr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'var'; name: string }
  | { kind: 'binary'; op: BinaryOp; left: SmExpr; right: SmExpr }
  | { kind: 'unary'; op: '!' | '-'; arg: SmExpr }
  | { kind: 'call'; name: string; args: SmExpr[] };

export type BinaryOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '&&'
  | '||';

export type SmStatement =
  | { kind: 'assign'; target: string; expr: SmExpr }
  | { kind: 'expr'; expr: SmExpr };

export interface SmVariable {
  name: string;
  type: 'int' | 'float' | 'bool' | 'string';
  init?: SmExpr;
}

export interface SmAction {
  statements: SmStatement[];
}

export interface SmGuard {
  expr: SmExpr;
}

export interface SmVerificationState {
  name: string;
  isInitial: boolean;
  isFinal: boolean;
  entry?: string | null;
  run?: string | null;
  exit?: string | null;
}

export interface SmVerificationTransition {
  id: string;
  source: string;
  target: string;
  event: string;
  guard?: string | null;
  action?: string | null;
}

export interface SmVerificationMachine {
  name: string;
  variables: SmVariable[];
  events: string[];
  actions: Record<string, SmAction>;
  guards: Record<string, SmGuard>;
  states: SmVerificationState[];
  transitions: SmVerificationTransition[];
}

export interface SmVerificationModel {
  $schema: 'stams.verification-model.v1';
  version: 1;
  machines: SmVerificationMachine[];
}

export type SmValue = number | string | boolean | null;

export interface SmTraceSnapshot {
  state: string;
  variables: Record<string, SmValue>;
}

export interface SmTraceAssignment {
  target: string;
  before: SmValue;
  after: SmValue;
}

export interface SmTraceEffect {
  phase: 'exit' | 'transition' | 'entry';
  action: string;
  assignments: SmTraceAssignment[];
}

export interface SmTraceStep {
  index: number;
  event: string;
  transition: {
    id: string;
    source: string;
    target: string;
    guard?: string | null;
    action?: string | null;
  } | null;
  guardPassed: boolean;
  before: SmTraceSnapshot;
  after: SmTraceSnapshot;
  effects: SmTraceEffect[];
  note?: string;
}

export interface SmTrace {
  $schema: 'stams.trace.v1';
  version: 1;
  machine: string;
  initial: SmTraceSnapshot;
  steps: SmTraceStep[];
}

export type SmConstraintKind = 'safety' | 'goal';

/** Constraint as declared in the model (read-only display in the Verify drawer). */
export interface SmConstraint {
  name: string;
  kind: SmConstraintKind;
  body: string;
}

/** Per-constraint outcome from server `VerifyModel` (stams.verification-result.v1). */
export interface SmConstraintResult {
  name: string;
  kind: SmConstraintKind;
  passed: boolean;
  status: 'proved' | 'counterexample' | 'unknown' | 'error';
  bound?: number;
  message?: string;
  counterexample?: SmTrace;
}

/** Server verification run result (stams.verification-result.v1). */
export interface SmVerificationResult {
  $schema: 'stams.verification-result.v1';
  version: 1;
  machine: string;
  bound?: number;
  engine?: string;
  trace?: SmTrace;
  results: SmConstraintResult[];
}
