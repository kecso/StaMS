import type {
  SmDiagramElement,
  SmMachineGraph,
  SmStateNode,
  SmTransitionEdge
} from '@/types/sprotty-diagram';

/** Structured hover/readout for diagram elements (extensible for guard bodies, etc.). */
export type SmDiagramDetail = {
  elementId: string;
  kind: 'state' | 'transition';
  title: string;
  lines: SmDiagramDetailLine[];
};

export type SmDiagramDetailLine = {
  label: string;
  value: string;
  emphasis?: 'event' | 'guard' | 'action' | 'behavior';
};

const SPROTTY_ID_PREFIX = 'sprotty-sm_';

function isState(element: SmDiagramElement): element is SmStateNode {
  return element.type === 'node:state';
}

function isTransition(element: SmDiagramElement): element is SmTransitionEdge {
  return element.type === 'edge:transition';
}

/** Map a Sprotty DOM id (`sprotty-sm_<modelId>`) back to a model element id. */
export function modelIdFromDomTarget(target: EventTarget | null): string | null {
  let node = target instanceof Element ? target : null;
  while (node) {
    if (node.id?.startsWith(SPROTTY_ID_PREFIX)) {
      return node.id.slice(SPROTTY_ID_PREFIX.length);
    }
    node = node.parentElement;
  }
  return null;
}

function normalizeLookupId(modelId: string): { stateId?: string; transitionId?: string } {
  if (modelId.endsWith('__label') || modelId.endsWith('__name')) {
    return { stateId: modelId.replace(/__(label|name)$/, '') };
  }
  if (modelId.endsWith('__entry') || modelId.endsWith('__run') || modelId.endsWith('__exit')) {
    return { stateId: modelId.replace(/__(entry|run|exit)$/, '') };
  }
  if (
    modelId.endsWith('__event') ||
    modelId.endsWith('__guard') ||
    modelId.endsWith('__action')
  ) {
    return { transitionId: modelId.replace(/__(event|guard|action)$/, '') };
  }
  return { stateId: modelId, transitionId: modelId };
}

export function lookupDiagramDetail(
  graph: SmMachineGraph,
  rawModelId: string
): SmDiagramDetail | null {
  const { stateId, transitionId } = normalizeLookupId(rawModelId);

  if (stateId) {
    const state = graph.children.find(
      (child): child is SmStateNode => child.type === 'node:state' && child.id === stateId
    );
    if (state) {
      return stateDetail(state);
    }
  }

  if (transitionId) {
    const transition = graph.children.find(
      (child): child is SmTransitionEdge =>
        child.type === 'edge:transition' && child.id === transitionId
    );
    if (transition) {
      return transitionDetail(graph, transition);
    }
  }

  return null;
}

/** Placeholder shown in the detail card when a state action is not defined. */
const NO_ACTION = 'noop';

function stateDetail(state: SmStateNode): SmDiagramDetail {
  const lines: SmDiagramDetailLine[] = [
    { label: 'Kind', value: state.kind },
    { label: 'Entry', value: state.entry ?? NO_ACTION, emphasis: state.entry ? 'action' : undefined },
    { label: 'Run', value: state.run ?? NO_ACTION, emphasis: state.run ? 'action' : undefined },
    { label: 'Exit', value: state.exit ?? NO_ACTION, emphasis: state.exit ? 'action' : undefined }
  ];
  return {
    elementId: state.id,
    kind: 'state',
    title: state.name,
    lines
  };
}

function transitionDetail(graph: SmMachineGraph, edge: SmTransitionEdge): SmDiagramDetail {
  const source = graph.children.find(
    (child): child is SmStateNode => child.type === 'node:state' && child.id === edge.sourceId
  );
  const target = graph.children.find(
    (child): child is SmStateNode => child.type === 'node:state' && child.id === edge.targetId
  );

  const lines: SmDiagramDetailLine[] = [
    {
      label: 'From',
      value: source?.name ?? edge.sourceId
    },
    {
      label: 'To',
      value: target?.name ?? edge.targetId
    }
  ];

  if (edge.event) {
    lines.push({ label: 'Event', value: edge.event, emphasis: 'event' });
  }
  if (edge.guard) {
    lines.push({ label: 'Guard', value: edge.guard, emphasis: 'guard' });
  }
  if (edge.action) {
    lines.push({ label: 'Action', value: edge.action, emphasis: 'action' });
  }

  return {
    elementId: edge.id,
    kind: 'transition',
    title: edge.event ? `on ${edge.event}` : 'Transition',
    lines
  };
}
