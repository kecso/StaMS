/**
 * Read Constraint nodes for a machine from the WebGME client cache (same source
 * as the diagram and verification model builders).
 */

import type { GmeClient, GmeClientNode } from '@/types/gme-global';
import type { SmConstraint, SmConstraintKind } from '@/types/verification';

type MetaName = 'Machine' | 'Constraint';

type MetaPaths = Partial<Record<MetaName, string>>;

function metaPaths(client: GmeClient): MetaPaths {
  const paths: MetaPaths = {};
  const all = client.getAllMetaNodes?.(true);
  if (!all || typeof all !== 'object') {
    return paths;
  }
  for (const [path, metaNode] of Object.entries(all)) {
    const name = metaNode.getAttribute('name');
    if (name === 'Machine' || name === 'Constraint') {
      paths[name] = path;
    }
  }
  return paths;
}

function isType(node: GmeClientNode, meta: MetaPaths, type: MetaName): boolean {
  const metaId = meta[type];
  return Boolean(metaId && node.isInstanceOf?.(metaId));
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

function constraintKind(node: GmeClientNode): SmConstraintKind {
  const kind = node.getAttribute('kind');
  return kind === 'goal' ? 'goal' : 'safety';
}

function constraintBody(node: GmeClientNode): string {
  const body = node.getAttribute('body');
  if (typeof body === 'string') {
    return body;
  }
  return '';
}

/**
 * List constraints declared on a machine (by GME node id). Returns `null` when
 * the machine is not loaded in the client cache yet.
 */
export function buildConstraintsFromClient(
  client: GmeClient,
  machineId: string
): SmConstraint[] | null {
  const machine = client.getNode(machineId);
  if (!machine) {
    return null;
  }
  const meta = metaPaths(client);
  const constraints: SmConstraint[] = [];
  for (const child of childNodes(client, machine)) {
    if (!isType(child, meta, 'Constraint')) {
      continue;
    }
    constraints.push({
      name: nodeName(child),
      kind: constraintKind(child),
      body: constraintBody(child)
    });
  }
  return constraints;
}
