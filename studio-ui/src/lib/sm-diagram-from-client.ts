/**
 * Build the diagram view model directly from the WebGME client cache.
 *
 * Called from the territory `onComplete` handler (see `gme-territory.ts`) once the
 * nodes are downloaded into the territory. No network here — every `client.getNode`
 * reads an already-cached node.
 *
 * ## Project structure we rely on
 *
 *   <root>                       (path '')
 *   ├── FCO                      (path '/1')
 *   ├── META folder              (holds every meta-type node; ignored here)
 *   └── Machine*                 (the machines we visualize — direct root children)
 *       ├── Variable* / Event* / Action* / Guard* / Constraint*
 *       ├── State*
 *       └── Transition*            (flat siblings; src/dst point at source/target states)
 *
 * Discovery is flat: iterate the root's direct children for `Machine` nodes, then
 * iterate each machine's direct children and classify by meta type. No recursion.
 *
 * ## Output: `SmDiagramView` (see types/sprotty-diagram.ts)
 *
 *   {
 *     machines: [ { id, name } ],          // every machine, for the selector
 *     activeMachineId: string,             // selector pointer
 *     graphsByMachineId: {
 *       [machineId]: {
 *         machineId: string,
 *         machineName: string,
 *         children: [                      // states + transitions, flat list
 *           { type: 'node:state', id, name, kind: 'normal'|'initial'|'final',
 *             entry?, run?, exit? },
 *           { type: 'edge:transition', id, sourceId, targetId,
 *             event?, guard?, action?, label? }
 *         ]
 *       }
 *     }
 *   }
 *
 * `id`s are WebGME node paths. `sourceId`/`targetId` are the `src`/`dst` pointer
 * target paths and match the `id` of the corresponding state node. Names on
 * `entry`/`run`/`exit`/`event`/`guard`/`action` are the referenced node's `name`.
 */

import type { GmeClient, GmeClientNode } from '@/types/gme-global';
import type {
  SmDiagramElement,
  SmDiagramView,
  SmMachineGraph,
  SmStateNode,
  SmTransitionEdge
} from '@/types/sprotty-diagram';

/** WebGME project root (CONSTANTS.PROJECT_ROOT_ID). `/1` is the FCO, unused here. */
export const PROJECT_ROOT = '';

/** Toggle verbose diagram-build logging (browser console). */
const DEBUG = true;

function log(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[SmDiagram]', ...args);
  }
}

type StaMsMetaPaths = Partial<
  Record<'Machine' | 'State' | 'Transition', string>
>;

/** Meta-type node paths from `getAllMetaNodes` — used with `isInstanceOf`. */
function metaTypePaths(client: GmeClient): StaMsMetaPaths {
  const paths: StaMsMetaPaths = {};
  const all = client.getAllMetaNodes?.(true);
  if (!all || typeof all !== 'object') {
    return paths;
  }
  for (const [path, metaNode] of Object.entries(all)) {
    const name = metaNode.getAttribute('name');
    if (name === 'Machine' || name === 'State' || name === 'Transition') {
      paths[name] = path;
    }
  }
  return paths;
}

function isType(client: GmeClient, node: GmeClientNode, meta: StaMsMetaPaths, type: keyof StaMsMetaPaths): boolean {
  const metaPath = meta[type];
  return Boolean(metaPath && node.isInstanceOf?.(metaPath));
}

/** Direct children of a node, resolved to loaded client nodes. */
function childNodes(client: GmeClient, node: GmeClientNode): GmeClientNode[] {
  const children: GmeClientNode[] = [];
  for (const childPath of node.getChildrenIds()) {
    const child = client.getNode(childPath);
    if (child) {
      children.push(child);
    } else {
      log('child not loaded yet:', childPath, '(under', node.getId() + ')');
    }
  }
  return children;
}

/**
 * Read the loaded project and produce the diagram view model.
 * Requires an active territory subscription on `rootPath`.
 */
export function buildSmDiagramFromClient(
  client: GmeClient,
  activeMachineId?: string,
  rootPath: string = PROJECT_ROOT
): SmDiagramView {
  const root = client.getNode(rootPath);
  if (!root) {
    log('no root node at', JSON.stringify(rootPath), '— territory not loaded yet');
    return emptyView();
  }

  const meta = metaTypePaths(client);
  log('meta paths:', meta);
  log('commit:', client.getActiveCommitHash?.());

  // Machines are direct children of the project root (siblings of FCO / META).
  const machineNodes = childNodes(client, root).filter((node) => isType(client, node, meta, 'Machine'));

  const machines = machineNodes.map((machine) => ({
    id: machine.getId(),
    name: nodeName(machine)
  }));
  log('machines under root:', machines);

  const graphsByMachineId = Object.fromEntries(
    machineNodes.map((machine) => [machine.getId(), machineGraph(client, machine, meta)])
  );

  const active =
    activeMachineId && machines.some((machine) => machine.id === activeMachineId)
      ? activeMachineId
      : machines[0]?.id ?? '';

  log(
    'active machine:',
    JSON.stringify(active),
    '→',
    graphsByMachineId[active]?.children.length ?? 0,
    'elements'
  );

  return {
    machines,
    activeMachineId: active,
    graphsByMachineId
  };
}

/**
 * Collect a single machine's direct children: states, transitions, etc.
 * Transitions are machine-level siblings (src/dst pointers name the endpoints).
 */
function machineGraph(client: GmeClient, machine: GmeClientNode, meta: StaMsMetaPaths): SmMachineGraph {
  const children: SmDiagramElement[] = [];

  for (const child of childNodes(client, machine)) {
    if (isType(client, child, meta, 'State')) {
      children.push(stateNode(client, child));
    } else if (isType(client, child, meta, 'Transition')) {
      children.push(transitionEdge(client, child));
    }
    // Variable / Event / Action / Guard / Constraint: not drawn (yet).
  }

  return {
    machineId: machine.getId(),
    machineName: nodeName(machine),
    children
  };
}

function stateNode(client: GmeClient, node: GmeClientNode): SmStateNode {
  const isInitial = attrBool(node, 'isInitial');
  const isFinal = attrBool(node, 'isFinal');
  let kind: SmStateNode['kind'] = 'normal';
  if (isInitial && !isFinal) {
    kind = 'initial';
  } else if (isFinal && !isInitial) {
    kind = 'final';
  }

  return {
    type: 'node:state',
    id: node.getId(),
    name: nodeName(node),
    kind,
    entry: pointerLabel(client, node, 'entry'),
    run: pointerLabel(client, node, 'run'),
    exit: pointerLabel(client, node, 'exit')
  };
}

function transitionEdge(client: GmeClient, node: GmeClientNode): SmTransitionEdge {
  const edge: SmTransitionEdge = {
    type: 'edge:transition',
    id: node.getId(),
    sourceId: node.getPointerId?.('src') ?? '',
    targetId: node.getPointerId?.('dst') ?? '',
    event: pointerLabel(client, node, 'event'),
    guard: pointerLabel(client, node, 'guard'),
    action: pointerLabel(client, node, 'action')
  };
  edge.label = transitionLabel(edge);
  log('transition', edge.id, 'src=', edge.sourceId, 'dst=', edge.targetId, 'label=', edge.label);
  return edge;
}

function transitionLabel(edge: SmTransitionEdge): string {
  if (!edge.event && !edge.guard && !edge.action) {
    return '';
  }
  let label = edge.event ?? '';
  if (edge.guard) {
    label += ` [${edge.guard}]`;
  }
  if (edge.action) {
    label += ` {${edge.action}}`;
  }
  return label;
}

function pointerLabel(client: GmeClient, node: GmeClientNode, pointer: string): string | undefined {
  const targetPath = node.getPointerId?.(pointer);
  if (!targetPath) {
    return undefined;
  }
  const target = client.getNode(targetPath);
  if (target) {
    const name = target.getAttribute('name');
    if (typeof name === 'string' && name.length > 0) {
      return name;
    }
  }
  const segments = targetPath.split('/');
  return segments[segments.length - 1] || targetPath;
}

function nodeName(node: GmeClientNode): string {
  const name = node.getAttribute('name');
  return typeof name === 'string' && name.length > 0 ? name : node.getId();
}

function attrBool(node: GmeClientNode, name: string): boolean {
  const value = node.getAttribute(name);
  return value === true || value === 'true';
}

export const EMPTY_DIAGRAM_VIEW: SmDiagramView = {
  machines: [],
  activeMachineId: '',
  graphsByMachineId: {}
};

function emptyView(): SmDiagramView {
  return EMPTY_DIAGRAM_VIEW;
}
