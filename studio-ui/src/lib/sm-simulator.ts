/**
 * Browser-side state-machine simulator.
 *
 * TypeScript port of the server modules `src/common/verification/expr-ast.js`
 * and `simulation-engine.js`. Same semantics so a trace grown here matches one
 * produced by the `SimulateMachine` plugin: entry runs on initialization, and a
 * transition fires exit → transition action → entry (entry/exit skipped on
 * self-transitions so a re-entry action doesn't clobber the transition effect).
 */

import type {
  BinaryOp,
  SmAction,
  SmExpr,
  SmGuard,
  SmStatement,
  SmTrace,
  SmTraceEffect,
  SmTraceSnapshot,
  SmTraceStep,
  SmValue,
  SmVerificationMachine,
  SmVerificationModel,
  SmVerificationState
} from '@/types/verification';

const BINARY_OPS = ['||', '&&', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/'];

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const peek = () => source[i];
  const advance = () => source[i++];

  while (i < source.length) {
    const ch = peek();
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = advance();
      let value = '';
      while (i < source.length && peek() !== quote) {
        value += advance();
      }
      if (peek() === quote) {
        advance();
      }
      tokens.push({ type: 'string', value });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < source.length && /[0-9.]/.test(peek())) {
        num += advance();
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(peek())) {
        ident += advance();
      }
      if (ident === 'true' || ident === 'false') {
        tokens.push({ type: 'bool', value: ident === 'true' });
      } else {
        tokens.push({ type: 'ident', value: ident });
      }
      continue;
    }
    const two = source.slice(i, i + 2);
    if (BINARY_OPS.includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/(),!<>'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character in expression: ${ch}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  expectEnd(): void {
    if (this.peek()) {
      throw new Error(`Unexpected token: ${JSON.stringify(this.peek())}`);
    }
  }

  parseExpression(): SmExpr {
    return this.parseOr();
  }

  private binaryLevel(next: () => SmExpr, ops: string[]): SmExpr {
    let left = next();
    let token = this.peek();
    while (token && token.type === 'op' && ops.includes(token.value)) {
      const op = this.advance().value as BinaryOp;
      left = { kind: 'binary', op, left, right: next() };
      token = this.peek();
    }
    return left;
  }

  private parseOr(): SmExpr {
    return this.binaryLevel(() => this.parseAnd(), ['||']);
  }

  private parseAnd(): SmExpr {
    return this.binaryLevel(() => this.parseEquality(), ['&&']);
  }

  private parseEquality(): SmExpr {
    return this.binaryLevel(() => this.parseRelational(), ['==', '!=']);
  }

  private parseRelational(): SmExpr {
    return this.binaryLevel(() => this.parseAdditive(), ['<', '<=', '>', '>=']);
  }

  private parseAdditive(): SmExpr {
    return this.binaryLevel(() => this.parseMultiplicative(), ['+', '-']);
  }

  private parseMultiplicative(): SmExpr {
    return this.binaryLevel(() => this.parseUnary(), ['*', '/']);
  }

  private parseUnary(): SmExpr {
    const token = this.peek();
    if (token && token.type === 'op' && (token.value === '!' || token.value === '-')) {
      this.advance();
      return { kind: 'unary', op: token.value, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): SmExpr {
    const token = this.peek();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    if (token.type === 'number') {
      this.advance();
      return { kind: 'number', value: token.value };
    }
    if (token.type === 'string') {
      this.advance();
      return { kind: 'string', value: token.value };
    }
    if (token.type === 'bool') {
      this.advance();
      return { kind: 'bool', value: token.value };
    }
    if (token.type === 'ident') {
      this.advance();
      const lookahead = this.peek();
      if (lookahead && lookahead.type === 'op' && lookahead.value === '(') {
        this.advance();
        const args: SmExpr[] = [];
        if (!(this.peek()?.type === 'op' && this.peek()?.value === ')')) {
          args.push(this.parseExpression());
          while (this.peek()?.type === 'op' && this.peek()?.value === ',') {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        if (this.peek()?.value !== ')') {
          throw new Error('Expected ) after function call');
        }
        this.advance();
        return { kind: 'call', name: token.value, args };
      }
      return { kind: 'var', name: token.value };
    }
    if (token.type === 'op' && token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      if (this.peek()?.value !== ')') {
        throw new Error('Expected )');
      }
      this.advance();
      return expr;
    }
    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
}

export function parseExprSource(source: string): SmExpr {
  const parser = new Parser(tokenize(source.trim()));
  const expr = parser.parseExpression();
  parser.expectEnd();
  return expr;
}

type BodyJson =
  | { version?: number; statements?: unknown[]; expr?: unknown }
  | null;

export function parseBodyJson(raw: unknown): BodyJson {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'object') {
    return raw as BodyJson;
  }
  try {
    return JSON.parse(String(raw)) as BodyJson;
  } catch {
    return null;
  }
}

function exprFrom(value: unknown): SmExpr {
  if (typeof value === 'string') {
    return parseExprSource(value);
  }
  return value as SmExpr;
}

export function bodyToStatements(body: unknown): SmStatement[] {
  const parsed = parseBodyJson(body);
  if (!parsed) {
    return [];
  }
  if (Array.isArray(parsed.statements)) {
    return parsed.statements.map((raw) => {
      const stmt = raw as { kind: string; target?: string; expr?: unknown };
      if (stmt.kind === 'assign') {
        return { kind: 'assign', target: stmt.target ?? '', expr: exprFrom(stmt.expr) };
      }
      return { kind: 'expr', expr: exprFrom(stmt.expr) };
    });
  }
  if (parsed.expr !== undefined) {
    return [{ kind: 'expr', expr: exprFrom(parsed.expr) }];
  }
  return [];
}

export function guardBodyToExpr(body: unknown): SmExpr {
  const parsed = parseBodyJson(body);
  if (parsed?.expr !== undefined) {
    return exprFrom(parsed.expr);
  }
  const statements = bodyToStatements(body);
  if (statements.length === 0) {
    return { kind: 'bool', value: true };
  }
  return statements[statements.length - 1].expr;
}

export function defaultInitForType(type: string): SmValue {
  switch (type) {
    case 'bool':
      return false;
    case 'string':
      return '';
    default:
      return 0;
  }
}

function coerceNumber(value: SmValue): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

type Env = Record<string, SmValue>;

export function evaluate(expr: SmExpr, env: Env): SmValue {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'bool':
      return expr.value;
    case 'var':
      return Object.prototype.hasOwnProperty.call(env, expr.name) ? env[expr.name] : null;
    case 'unary': {
      const arg = evaluate(expr.arg, env);
      return expr.op === '!' ? !arg : -coerceNumber(arg);
    }
    case 'binary': {
      const left = evaluate(expr.left, env);
      const right = evaluate(expr.right, env);
      switch (expr.op) {
        case '+':
          return typeof left === 'string' || typeof right === 'string'
            ? String(left) + String(right)
            : coerceNumber(left) + coerceNumber(right);
        case '-':
          return coerceNumber(left) - coerceNumber(right);
        case '*':
          return coerceNumber(left) * coerceNumber(right);
        case '/':
          return coerceNumber(left) / coerceNumber(right);
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '<':
          return coerceNumber(left) < coerceNumber(right);
        case '<=':
          return coerceNumber(left) <= coerceNumber(right);
        case '>':
          return coerceNumber(left) > coerceNumber(right);
        case '>=':
          return coerceNumber(left) >= coerceNumber(right);
        case '&&':
          return Boolean(left) && Boolean(right);
        case '||':
          return Boolean(left) || Boolean(right);
        default:
          throw new Error('Unknown binary operator');
      }
    }
    case 'call':
      throw new Error(`Function calls are not supported in simulation: ${expr.name}`);
    default:
      throw new Error('Unknown expression');
  }
}

function executeStatements(statements: SmStatement[], env: Env) {
  const assignments: { target: string; before: SmValue; after: SmValue }[] = [];
  for (const stmt of statements) {
    if (stmt.kind === 'assign') {
      const before = env[stmt.target] ?? null;
      const after = evaluate(stmt.expr, env);
      env[stmt.target] = after;
      assignments.push({ target: stmt.target, before, after });
    } else {
      evaluate(stmt.expr, env);
    }
  }
  return assignments;
}

/** Mutable simulation handle that grows a {@link SmTrace}. */
export class Simulation {
  private readonly machine: SmVerificationMachine;
  private stateName: string;
  private env: Env;
  readonly trace: SmTrace;

  constructor(model: SmVerificationModel, machineName?: string) {
    const machine = machineName
      ? model.machines.find((m) => m.name === machineName)
      : model.machines[0];
    if (!machine) {
      throw new Error(`Machine not found: ${machineName ?? '(first)'}`);
    }
    this.machine = machine;

    const initial = findInitialState(machine);
    if (!initial) {
      throw new Error(`Machine has no states: ${machine.name}`);
    }

    this.env = buildInitialEnv(machine);
    if (initial.entry) {
      runAction(machine, initial.entry, this.env);
    }
    this.stateName = initial.name;

    this.trace = {
      $schema: 'stams.trace.v1',
      version: 1,
      machine: machine.name,
      initial: snapshot(initial.name, this.env),
      steps: []
    };
  }

  getStateName(): string {
    return this.stateName;
  }

  getVariables(): Env {
    return { ...this.env };
  }

  getEnabledEvents(): string[] {
    const seen = new Set<string>();
    const enabled: string[] = [];
    for (const transition of this.machine.transitions) {
      if (transition.source === this.stateName && !seen.has(transition.event)) {
        seen.add(transition.event);
        enabled.push(transition.event);
      }
    }
    return enabled;
  }

  step(eventName: string): SmTraceStep {
    const before = snapshot(this.stateName, this.env);
    const candidates = this.machine.transitions.filter(
      (transition) => transition.source === this.stateName && transition.event === eventName
    );

    let chosen: SmVerificationMachine['transitions'][number] | null = null;
    for (const candidate of candidates) {
      if (guardPasses(this.machine, candidate.guard, this.env)) {
        chosen = candidate;
        break;
      }
    }

    if (!chosen) {
      const failedStep: SmTraceStep = {
        index: this.trace.steps.length,
        event: eventName,
        transition: null,
        guardPassed: false,
        before,
        after: before,
        effects: [],
        note: candidates.length === 0 ? 'No transition for event' : 'Guard rejected all transitions'
      };
      this.trace.steps.push(failedStep);
      return failedStep;
    }

    const effects: SmTraceEffect[] = [];
    const sourceState = stateByName(this.machine, this.stateName);
    const targetState = stateByName(this.machine, chosen.target);
    const selfTransition = chosen.source === chosen.target;

    if (sourceState?.exit && !selfTransition) {
      effects.push({
        phase: 'exit',
        action: sourceState.exit,
        assignments: runAction(this.machine, sourceState.exit, this.env)
      });
    }
    if (chosen.action) {
      effects.push({
        phase: 'transition',
        action: chosen.action,
        assignments: runAction(this.machine, chosen.action, this.env)
      });
    }

    this.stateName = chosen.target;

    if (targetState?.entry && !selfTransition) {
      effects.push({
        phase: 'entry',
        action: targetState.entry,
        assignments: runAction(this.machine, targetState.entry, this.env)
      });
    }

    const step: SmTraceStep = {
      index: this.trace.steps.length,
      event: eventName,
      transition: {
        id: chosen.id,
        source: chosen.source,
        target: chosen.target,
        guard: chosen.guard ?? null,
        action: chosen.action ?? null
      },
      guardPassed: true,
      before,
      after: snapshot(this.stateName, this.env),
      effects
    };
    this.trace.steps.push(step);
    return step;
  }
}

function snapshot(stateName: string, env: Env): SmTraceSnapshot {
  return { state: stateName, variables: { ...env } };
}

function findInitialState(machine: SmVerificationMachine): SmVerificationState | undefined {
  return machine.states.find((state) => state.isInitial) ?? machine.states[0];
}

function stateByName(machine: SmVerificationMachine, name: string): SmVerificationState | undefined {
  return machine.states.find((state) => state.name === name);
}

function buildInitialEnv(machine: SmVerificationMachine): Env {
  const env: Env = {};
  for (const variable of machine.variables) {
    env[variable.name] = variable.init
      ? evaluate(variable.init, env)
      : defaultInitForType(variable.type);
  }
  return env;
}

function runAction(machine: SmVerificationMachine, actionName: string | null | undefined, env: Env) {
  if (!actionName) {
    return [];
  }
  const action: SmAction | undefined = machine.actions[actionName];
  if (!action) {
    return [];
  }
  return executeStatements(action.statements, env);
}

function guardPasses(
  machine: SmVerificationMachine,
  guardName: string | null | undefined,
  env: Env
): boolean {
  if (!guardName) {
    return true;
  }
  const guard: SmGuard | undefined = machine.guards[guardName];
  if (!guard) {
    return true;
  }
  return Boolean(evaluate(guard.expr, env));
}
