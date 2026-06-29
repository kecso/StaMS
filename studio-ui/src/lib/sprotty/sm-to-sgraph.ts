import type { SEdge, SGraph, SLabel, SModelElement, SNode } from 'sprotty-protocol';

import type {
  SmMachineGraph,
  SmStateNode,
  SmTransitionEdge
} from '@/types/sprotty-diagram';

import { SM_TYPES } from './diagram-container';

function isState(element: SmMachineGraph['children'][number]): element is SmStateNode {
  return element.type === 'node:state';
}

function isTransition(
  element: SmMachineGraph['children'][number]
): element is SmTransitionEdge {
  return element.type === 'edge:transition';
}

/**
 * Translate our backend-derived {@link SmMachineGraph} into a Sprotty `SGraph`
 * schema. Positions/sizes are intentionally omitted — the ELK layout engine bound
 * in {@link createSmDiagramContainer} computes them after Sprotty measures the
 * label bounds.
 */
export function smGraphToSGraph(graph: SmMachineGraph): SGraph {
  const states = graph.children.filter(isState);
  const transitions = graph.children.filter(isTransition);
  const stateIds = new Set(states.map((state) => state.id));

  const children: SModelElement[] = [];

  for (const state of states) {
    const node: SNode = {
      type: SM_TYPES.state,
      id: state.id,
      layout: 'stack',
      layoutOptions: {
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        hAlign: 'center',
        vAlign: 'center'
      },
      cssClasses: ['sm-state', `sm-state-${state.kind}`],
      children: [
        {
          type: SM_TYPES.stateLabel,
          id: `${state.id}__label`,
          text: state.name
        } as SLabel
      ]
    };
    children.push(node);
  }

  for (const transition of transitions) {
    // ELK rejects edges that dangle off unknown nodes; skip defensively.
    if (!stateIds.has(transition.sourceId) || !stateIds.has(transition.targetId)) {
      continue;
    }

    const edge: SEdge = {
      type: SM_TYPES.transition,
      id: transition.id,
      sourceId: transition.sourceId,
      targetId: transition.targetId,
      children: transition.label
        ? [
            {
              type: SM_TYPES.transitionLabel,
              id: `${transition.id}__label`,
              text: transition.label
            } as SLabel
          ]
        : []
    };
    children.push(edge);
  }

  return {
    type: SM_TYPES.graph,
    id: graph.machineId || 'sm-graph',
    children
  };
}
