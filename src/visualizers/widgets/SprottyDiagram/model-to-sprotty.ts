/**
 * WebGME Machine subtree → Sprotty view model.
 *
 * See `src/common/sprotty-diagram-model.ts` for the full contract consumed by
 * diagram decorators (state kinds, transition labels, machine selector).
 */

import type {
    GmeNodeSnapshot,
    SmCompartmentNode,
    SmDiagramElement,
    SmDiagramView,
    SmMachineGraph,
    SmMachineRef,
    SmStateNode,
    SmTransitionEdge
} from '../../../common/sprotty-diagram-model.js';

export type {
    GmeNodeSnapshot,
    SmCompartmentNode,
    SmDiagramElement,
    SmDiagramView,
    SmMachineGraph,
    SmMachineRef,
    SmStateNode,
    SmTransitionEdge
};

/** @deprecated Use SmMachineGraph — kept for existing widget code. */
export type SGraph = SmMachineGraph & { type?: 'graph' };

function stateKind(node: GmeNodeSnapshot): SmStateNode['kind'] {
    const isInitial = node.attributes?.isInitial === true || node.attributes?.isInitial === 'true';
    const isFinal = node.attributes?.isFinal === true || node.attributes?.isFinal === 'true';
    const hasSubstates = node.children.some((child) => child.metaType === 'State');
    if (isInitial && isFinal) {
        return 'normal';
    }
    if (isInitial) {
        return 'initial';
    }
    if (isFinal) {
        return 'final';
    }
    if (hasSubstates) {
        return 'composite';
    }
    return 'normal';
}

function transitionLabel(edge: SmTransitionEdge): string {
    const parts = [edge.event, edge.guard, edge.action].filter(Boolean);
    if (parts.length === 0) {
        return '';
    }
    let label = edge.event || '';
    if (edge.guard) {
        label += ' [' + edge.guard + ']';
    }
    if (edge.action) {
        label += ' {' + edge.action + '}';
    }
    return label;
}

function machineGraphFromSnapshot(machine: GmeNodeSnapshot): SmMachineGraph {
    const graph: SmMachineGraph = {
        machineId: machine.path,
        machineName: machine.name,
        children: []
    };

    const states = collectByType(machine, 'State');
    const transitions = collectByType(machine, 'Transition');

    states.forEach((state) => {
        const node: SmStateNode = {
            type: 'node:state',
            id: state.path,
            name: state.name,
            kind: stateKind(state)
        };
        graph.children.push(node);
    });

    transitions.forEach((transition) => {
        const edge: SmTransitionEdge = {
            type: 'edge:transition',
            id: transition.path,
            sourceId: transition.pointers.src || transition.pointers.source || '',
            targetId: transition.pointers.dst || transition.pointers.target || '',
            event: readPointerName(transition, 'event'),
            guard: readPointerName(transition, 'guard'),
            action: readPointerName(transition, 'action')
        };
        edge.label = transitionLabel(edge);
        graph.children.push(edge);
    });

    return graph;
}

function readPointerName(node: GmeNodeSnapshot, pointer: string): string | undefined {
    const targetPath = node.pointers[pointer];
    if (!targetPath) {
        return undefined;
    }
    const segments = targetPath.split('/');
    return segments[segments.length - 1] || targetPath;
}

/**
 * Build a full diagram view from one or more Machine snapshots.
 * Pass `activeMachineId` to select which machine graph is included.
 */
export function buildSmDiagramView(
    machines: GmeNodeSnapshot[],
    activeMachineId?: string
): SmDiagramView {
    const refs: SmMachineRef[] = machines.map((machine) => ({
        id: machine.path,
        name: machine.name
    }));
    const active = activeMachineId && machines.find((machine) => machine.path === activeMachineId)
        ? activeMachineId
        : refs[0]?.id ?? '';

    const activeMachine = machines.find((machine) => machine.path === active) ?? machines[0];

    return {
        machines: refs,
        activeMachineId: active,
        graph: activeMachine ? machineGraphFromSnapshot(activeMachine) : {
            machineId: '',
            machineName: '',
            children: []
        }
    };
}

/** @deprecated Use buildSmDiagramView or machineGraphFromSnapshot. */
export function modelToSprottyGraph(machine: GmeNodeSnapshot): SmMachineGraph & { type: 'graph'; id: string } {
    const graph = machineGraphFromSnapshot(machine);
    return {
        type: 'graph',
        id: 'root',
        ...graph
    };
}

function collectByType(node: GmeNodeSnapshot, typeName: string): GmeNodeSnapshot[] {
    const found: GmeNodeSnapshot[] = [];
    if (node.metaType === typeName) {
        found.push(node);
    }
    node.children.forEach((child) => found.push(...collectByType(child, typeName)));
    return found;
}
