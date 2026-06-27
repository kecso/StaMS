/**
 * Sprotty diagram view contract (mirrors src/common/sprotty-diagram-model.ts).
 *
 * The React diagram panel and WebGME Sprotty visualizer should consume the same
 * `SmDiagramView` shape so decorators stay consistent.
 */

export interface SmDiagramView {
  machines: SmMachineRef[];
  activeMachineId: string;
  graph: SmMachineGraph;
}

export interface SmMachineRef {
  id: string;
  name: string;
}

export interface SmMachineGraph {
  machineId: string;
  machineName: string;
  children: SmDiagramElement[];
}

export type SmDiagramElement = SmStateNode | SmTransitionEdge | SmCompartmentNode;

export interface SmStateNode {
  type: 'node:state';
  id: string;
  name: string;
  kind: 'normal' | 'initial' | 'final' | 'composite';
  parentStateId?: string;
  entry?: string;
  run?: string;
  exit?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  children?: SmDiagramElement[];
}

export interface SmTransitionEdge {
  type: 'edge:transition';
  id: string;
  sourceId: string;
  targetId: string;
  event?: string;
  guard?: string;
  action?: string;
  label?: string;
  routingPoints?: Array<{ x: number; y: number }>;
}

export interface SmCompartmentNode {
  type: 'node:compartment';
  id: string;
  parentStateId: string;
  bounds?: { x: number; y: number; width: number; height: number };
  children: SmDiagramElement[];
}
