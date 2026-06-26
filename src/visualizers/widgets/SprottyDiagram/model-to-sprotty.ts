/**
 * WebGME Machine node → Sprotty graph (design doc §9.3).
 */

export interface SLabel {
    type: 'label';
    text: string;
}

export interface SStateNode {
    type: 'node:state';
    id: string;
    children: SLabel[];
}

export interface STransitionEdge {
    type: 'edge:transition';
    id: string;
    sourceId: string;
    targetId: string;
}

export interface SGraph {
    type: 'graph';
    id: string;
    children: Array<SStateNode | STransitionEdge>;
}

export interface GmeNodeSnapshot {
    path: string;
    metaType: string | null;
    name: string;
    children: GmeNodeSnapshot[];
    pointers: Record<string, string | null>;
}

export function modelToSprottyGraph(machine: GmeNodeSnapshot): SGraph {
    const graph: SGraph = {type: 'graph', id: 'root', children: []};
    const states = collectByType(machine, 'State');
    const transitions = collectByType(machine, 'Transition');

    states.forEach((state) => {
        graph.children.push({
            type: 'node:state',
            id: state.path,
            children: [{type: 'label', text: state.name}]
        });
    });

    transitions.forEach((transition) => {
        graph.children.push({
            type: 'edge:transition',
            id: transition.path,
            sourceId: transition.pointers.src || transition.pointers.source || '',
            targetId: transition.pointers.dst || transition.pointers.target || ''
        });
    });

    return graph;
}

function collectByType(node: GmeNodeSnapshot, typeName: string): GmeNodeSnapshot[] {
    const found: GmeNodeSnapshot[] = [];
    if (node.metaType === typeName) {
        found.push(node);
    }
    node.children.forEach((child) => found.push(...collectByType(child, typeName)));
    return found;
}
