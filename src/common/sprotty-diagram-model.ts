/**
 * Sprotty diagram view model for StaMS state machines.
 *
 * This is the contract between WebGME structural nodes (after TextToModel sync)
 * and the diagram visualizer. The visualizer receives an `SmDiagramView` payload:
 *
 * - `machines` — selector entries (one `.sm` file may declare several machines).
 * - `activeMachineId` — which machine is rendered in the main canvas.
 * - `graph` — nodes/edges for that machine only.
 *
 * Decorator mapping (visualizer responsibility):
 *
 * | Element type        | Suggested decoration                                      |
 * |---------------------|-----------------------------------------------------------|
 * | node:state initial  | double border or filled green circle marker               |
 * | node:state final    | bullseye / double-ring border                             |
 * | node:state composite| rounded group rect containing child states                  |
 * | edge:transition     | arrow; label = event [/ guard] {action}                    |
 *
 * Layout: ELK worker receives `graph` and returns position hints on each element
 * (`position`, `size`). Persisted manual layout can later attach to WebGME State
 * registry attributes and flow back into `position` here.
 */

/** Root payload passed to the diagram widget / React diagram panel. */
export interface SmDiagramView {
    machines: SmMachineRef[];
    activeMachineId: string;
    graph: SmMachineGraph;
}

/** Entry for the machine selector (corner dropdown or separate screen). */
export interface SmMachineRef {
    /** Stable id — prefer WebGME node path, e.g. `/1/2`. */
    id: string;
    name: string;
}

/** One machine's diagram content. */
export interface SmMachineGraph {
    machineId: string;
    machineName: string;
    children: SmDiagramElement[];
}

export type SmDiagramElement = SmStateNode | SmTransitionEdge | SmCompartmentNode;

export interface SmDiagramBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** State node (normal, initial, final, or composite parent). */
export interface SmStateNode {
    type: 'node:state';
    /** WebGME path or stable key. */
    id: string;
    name: string;
    kind: 'normal' | 'initial' | 'final' | 'composite';
    /** Parent state id when nested inside a composite state. */
    parentStateId?: string;
  /** Referenced action names (resolved labels for decorators). */
    entry?: string;
    run?: string;
    exit?: string;
    /** Filled by ELK layout or persisted registry layout. */
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    children?: SmDiagramElement[];
}

/** Directed edge for a transition. */
export interface SmTransitionEdge {
    type: 'edge:transition';
    id: string;
    sourceId: string;
    targetId: string;
    event?: string;
    guard?: string;
    action?: string;
    /** Pre-built label for simple renderers; visualizer may compose from parts instead. */
    label?: string;
    /** Optional routing points after layout. */
    routingPoints?: Array<{ x: number; y: number }>;
}

/**
 * Optional grouping rect for a composite state's interior.
 * Use when child states should be visually contained separately from transitions.
 */
export interface SmCompartmentNode {
    type: 'node:compartment';
    id: string;
    parentStateId: string;
    bounds?: SmDiagramBounds;
    children: SmDiagramElement[];
}

/** Minimal WebGME subtree input for projection (used by model-to-sprotty). */
export interface GmeNodeSnapshot {
    path: string;
    metaType: string | null;
    name: string;
    children: GmeNodeSnapshot[];
    pointers: Record<string, string | null>;
    attributes?: Record<string, string | boolean | number>;
}
