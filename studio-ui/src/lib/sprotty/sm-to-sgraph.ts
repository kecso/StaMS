import type { EdgePlacement, SEdge, SGraph, SLabel, SModelElement, SNode } from 'sprotty-protocol';

import type {
  SmMachineGraph,
  SmStateNode,
  SmTransitionEdge
} from '@/types/sprotty-diagram';

import { SM_TYPES } from './diagram-container';

type SmEdgeLabel = SLabel & { edgePlacement: EdgePlacement };

function isState(element: SmMachineGraph['children'][number]): element is SmStateNode {
  return element.type === 'node:state';
}

function isTransition(
  element: SmMachineGraph['children'][number]
): element is SmTransitionEdge {
  return element.type === 'edge:transition';
}

/**
 * Unordered endpoint key, so A→B and B→A (and any extra parallel transitions)
 * land in the same group regardless of direction.
 */
function endpointKey(transition: SmTransitionEdge): string {
  return [transition.sourceId, transition.targetId].sort().join('::');
}

/**
 * Placement for a transition label, given its index within the group of
 * transitions that share the same endpoint pair.
 *
 * Relying on `side` alone is unreliable: ELK decides which parallel line sits
 * left vs right, so two direction-relative "left" labels can collapse onto the
 * same physical spot. Instead we stagger the labels ALONG the edge (distinct
 * `position` values) — different points on the routed line can't overlap — and
 * additionally alternate the side for extra separation.
 */
function transitionLabelPlacement(index: number, groupSize: number): EdgePlacement {
  // Single transition: keep it centered on its own line.
  const position =
    groupSize <= 1 ? 0.5 : 0.32 + (0.36 * index) / (groupSize - 1);
  return {
    rotate: false,
    side: index % 2 === 0 ? 'left' : 'right',
    position,
    offset: 9,
    moveMode: 'none'
  };
}

/** Elements to mark as "live" during trace replay (by model id). */
export type SmHighlight = {
  activeStateId?: string | null;
  activeTransitionId?: string | null;
};

/**
 * Translate our backend-derived {@link SmMachineGraph} into a Sprotty `SGraph`
 * schema. Positions/sizes are intentionally omitted — the ELK layout engine bound
 * in {@link createSmDiagramContainer} computes them after Sprotty measures the
 * label bounds.
 *
 * `highlight` adds `sm-state-active` / `sm-transition-active` css classes so the
 * simulation panel can light up the current state and the transition just taken.
 */
export function smGraphToSGraph(graph: SmMachineGraph, highlight?: SmHighlight): SGraph {
  const states = graph.children.filter(isState);
  const transitions = graph.children.filter(isTransition);
  const stateIds = new Set(states.map((state) => state.id));

  const children: SModelElement[] = [];

  for (const state of states) {
    const stateClasses = ['sm-state', `sm-state-${state.kind}`];
    if (highlight?.activeStateId === state.id) {
      stateClasses.push('sm-state-active');
    }
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
      cssClasses: stateClasses,
      children: [
        {
          type: SM_TYPES.stateLabel,
          id: `${state.id}__label`,
          text: state.name,
          cssClasses: ['sm-state-name']
        } as SLabel
      ]
    };
    children.push(node);
  }

  // ELK rejects edges that dangle off unknown nodes; skip defensively.
  const drawableTransitions = transitions.filter(
    (transition) => stateIds.has(transition.sourceId) && stateIds.has(transition.targetId)
  );

  // Group parallel transitions (same endpoint pair, either direction) so their
  // labels can be staggered instead of stacking at the shared midpoint.
  const groups = new Map<string, SmTransitionEdge[]>();
  for (const transition of drawableTransitions) {
    const key = endpointKey(transition);
    const group = groups.get(key);
    if (group) {
      group.push(transition);
    } else {
      groups.set(key, [transition]);
    }
  }

  for (const transition of drawableTransitions) {
    const group = groups.get(endpointKey(transition)) ?? [transition];
    const index = group.indexOf(transition);
    const placement = transitionLabelPlacement(index, group.length);

    const edge: SEdge = {
      type: SM_TYPES.transition,
      id: transition.id,
      sourceId: transition.sourceId,
      targetId: transition.targetId,
      cssClasses:
        highlight?.activeTransitionId === transition.id ? ['sm-transition-active'] : undefined,
      children: transition.event
        ? [
            {
              type: SM_TYPES.transitionLabel,
              id: `${transition.id}__event`,
              text: transition.event,
              edgePlacement: placement
            } as SmEdgeLabel
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
