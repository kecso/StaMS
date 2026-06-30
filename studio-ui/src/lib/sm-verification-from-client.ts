/**
 * Build a `stams.verification-model.v1` document straight from the WebGME client
 * cache — the same node source the diagram uses, so the in-browser simulator can
 * run without a server round-trip.
 *
 * Action/Guard bodies and Variable init expressions are read from the `body` /
 * `initExpr` attributes that `TextToModel` serializes (JSON). When those are
 * absent (older commit), guards default to `true` and actions to no-ops, so the
 * simulation still walks the state graph — it just won't mutate variables.
 */

import type { GmeClient, GmeClientNode } from '@/types/gme-global';
import { bodyToStatements, guardBodyToExpr, parseBodyJson, parseExprSource } from '@/lib/sm-simulator';
import type {
  SmExpr,
  SmVerificationMachine,
  SmVerificationModel,
  SmVerificationState,
  SmVerificationTransition
} from '@/types/verification';

type MetaName =
  | 'Machine'
  | 'Variable'
  | 'Event'
  | 'Action'
  | 'Guard'
  | 'Constraint'
  | 'State'
  | 'Transition';

type MetaPaths = Partial<Record<MetaName, string>>;

const META_NAMES: MetaName[] = [
  'Machine',
  'Variable',
  'Event',
  'Action',
  'Guard',
  'Constraint',
  'State',
  'Transition'
];

function metaPaths(client: GmeClient): MetaPaths {
  const paths: MetaPaths = {};
  const all = client.getAllMetaNodes?.(true);
  if (!all || typeof all !== 'object') {
    return paths;
  }
  for (const [path, metaNode] of Object.entries(all)) {
    const name = metaNode.getAttribute('name');
    if (typeof name === 'string' && (META_NAMES as string[]).includes(name)) {
      paths[name as MetaName] = path;
    }
  }
  return paths;
}

function isType(node: GmeClientNode, meta: MetaPaths, type: MetaName): boolean {
  const metaPath = meta[type];
  return Boolean(metaPath && node.isInstanceOf?.(metaPath));
}

function childNodes(client: GmeClient, node: GmeClientNode): GmeClientNode[] {
  const children: GmeClientNode[] = [];
  for (const childPath of node.getChildrenIds()) {
    const child = client.getNode(childPath);
    if (child) {
      children.push(child);
    }
  }
  return children;
}

function nodeName(node: GmeClientNode): string {
  const name = node.getAttribute('name');
  return typeof name === 'string' && name.length > 0 ? name : node.getId();
}

function attrBool(node: GmeClientNode, name: string): boolean {
  const value = node.getAttribute(name);
  return value === true || value === 'true';
}

function pointerName(client: GmeClient, node: GmeClientNode, pointer: string): string | null {
  const targetPath = node.getPointerId?.(pointer);
  if (!targetPath) {
    return null;
  }
  const target = client.getNode(targetPath);
  return target ? nodeName(target) : null;
}

function variableInitExpr(node: GmeClientNode): SmExpr | undefined {
  const raw = node.getAttribute('initExpr');
  if (!raw) {
    return undefined;
  }
  const parsed = parseBodyJson(raw);
  if (parsed?.expr !== undefined) {
    return typeof parsed.expr === 'string' ? parseExprSource(parsed.expr) : (parsed.expr as SmExpr);
  }
  return undefined;
}

function buildMachine(client: GmeClient, machine: GmeClientNode, meta: MetaPaths): SmVerificationMachine {
  const result: SmVerificationMachine = {
    name: nodeName(machine),
    variables: [],
    events: [],
    actions: {},
    guards: {},
    states: [],
    transitions: []
  };

  const stateNodes: GmeClientNode[] = [];
  const transitionNodes: GmeClientNode[] = [];

  for (const child of childNodes(client, machine)) {
    if (isType(child, meta, 'Variable')) {
      const init = variableInitExpr(child);
      const type = (child.getAttribute('type') as SmVerificationMachine['variables'][number]['type']) || 'int';
      result.variables.push(init ? { name: nodeName(child), type, init } : { name: nodeName(child), type });
    } else if (isType(child, meta, 'Event')) {
      result.events.push(nodeName(child));
    } else if (isType(child, meta, 'Action')) {
      result.actions[nodeName(child)] = { statements: bodyToStatements(child.getAttribute('body')) };
    } else if (isType(child, meta, 'Guard')) {
      result.guards[nodeName(child)] = { expr: guardBodyToExpr(child.getAttribute('body')) };
    } else if (isType(child, meta, 'State')) {
      stateNodes.push(child);
    } else if (isType(child, meta, 'Transition')) {
      transitionNodes.push(child);
    }
  }

  result.states = stateNodes.map((node): SmVerificationState => ({
    name: nodeName(node),
    isInitial: attrBool(node, 'isInitial'),
    isFinal: attrBool(node, 'isFinal'),
    entry: pointerName(client, node, 'entry'),
    run: pointerName(client, node, 'run'),
    exit: pointerName(client, node, 'exit')
  }));

  for (const node of transitionNodes) {
    const source = pointerName(client, node, 'src');
    const target = pointerName(client, node, 'dst');
    const event = pointerName(client, node, 'event');
    if (!source || !target || !event) {
      continue;
    }
    const transition: SmVerificationTransition = {
      id: `${source}:${event}:${target}`,
      source,
      target,
      event,
      guard: pointerName(client, node, 'guard'),
      action: pointerName(client, node, 'action')
    };
    result.transitions.push(transition);
  }

  return result;
}

/**
 * Build the verification model for a single machine (by GME node id) from the
 * loaded client cache. Returns `null` when the machine node isn't loaded yet.
 */
export function buildVerificationModelFromClient(
  client: GmeClient,
  machineId: string
): SmVerificationModel | null {
  const machine = client.getNode(machineId);
  if (!machine) {
    return null;
  }
  const meta = metaPaths(client);
  return {
    $schema: 'stams.verification-model.v1',
    version: 1,
    machines: [buildMachine(client, machine, meta)]
  };
}
