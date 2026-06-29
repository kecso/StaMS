/**
 * Sprotty diagram view model for StaMS state machines.
 *
 * This is the contract between WebGME structural nodes (after TextToModel sync)
 * and the diagram visualizer. The visualizer receives an `SmDiagramView` payload:
 *
 * - `machines` — selector entries (one `.sm` file may declare several machines).
 * - `activeMachineId` — selector pointer to the rendered machine.
 * - `graphsByMachineId` — cached flat nodes/edges for every machine.
 *
 * Decorator mapping (visualizer responsibility):
 *
 * | Element type        | Suggested decoration                                      |
 * |---------------------|-----------------------------------------------------------|
 * | node:state initial  | double border or filled green circle marker               |
 * | node:state final    | bullseye / double-ring border                             |
 * | edge:transition     | arrow; label = event [/ guard] {action}                    |
 *
 * Layout: ELK runs in the studio-ui Sprotty integration (`studio-ui/src/lib/sprotty/`).
 * Persisted manual layout can later attach to WebGME State registry attributes and flow
 * back into `position` here.
 */

/** Root payload passed to the diagram widget / React diagram panel. */
export interface SmDiagramView {
    machines: SmMachineRef[];
    activeMachineId: string;
    graphsByMachineId: Record<string, SmMachineGraph>;
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

export type SmDiagramElement = SmStateNode | SmTransitionEdge;

/** State node (normal, initial, or final). */
export interface SmStateNode {
    type: 'node:state';
    /** WebGME path or stable key. */
    id: string;
    name: string;
    kind: 'normal' | 'initial' | 'final';
    /** Referenced action names (resolved labels for decorators). */
    entry?: string;
    run?: string;
    exit?: string;
    /** Filled by ELK layout or persisted registry layout. */
    position?: { x: number; y: number };
    size?: { width: number; height: number };
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

/** Minimal WebGME subtree snapshot for diagram adapters (client or server). */
export interface GmeNodeSnapshot {
    path: string;
    metaType: string | null;
    name: string;
    children: GmeNodeSnapshot[];
    pointers: Record<string, string | null>;
    attributes?: Record<string, string | boolean | number>;
}
