import 'reflect-metadata';

import { Container, ContainerModule } from 'inversify';
import {
  ConsoleLogger,
  LocalModelSource,
  LogLevel,
  PolylineEdgeView,
  RectangularNodeView,
  SEdgeImpl,
  SGraphImpl,
  SGraphView,
  SLabelImpl,
  SLabelView,
  SNodeImpl,
  TYPES,
  configureModelElement,
  configureViewerOptions,
  edgeEditModule,
  labelEditModule,
  labelEditUiModule,
  loadDefaultModules,
  moveModule
} from 'sprotty';
import { LocationPostprocessor } from 'sprotty/lib/features/move/move';
import { ElkFactory, ElkLayoutEngine, elkLayoutModule } from 'sprotty-elk';
import ElkConstructor from 'elkjs/lib/elk.bundled.js';

/** The DOM id that Sprotty renders the diagram SVG into. */
export const SPROTTY_DIV_ID = 'sprotty-sm';

/**
 * Model element type ids. The substring before `:` is the ELK "basic type"
 * (graph / node / edge / label) that {@link ElkLayoutEngine} keys off of.
 */
export const SM_TYPES = {
  graph: 'graph',
  state: 'node:state',
  stateLabel: 'label:state',
  transition: 'edge:transition',
  transitionLabel: 'label:edge'
} as const;

/** Positions nodes from ELK layout without enabling drag-to-move. */
const layoutPositionModule = new ContainerModule((bind) => {
  bind(LocationPostprocessor).toSelf().inSingletonScope();
  bind(TYPES.IVNodePostprocessor).toService(LocationPostprocessor);
  bind(TYPES.HiddenVNodePostprocessor).toService(LocationPostprocessor);
});

/**
 * Bundled ELK runs the layout in the main thread (no worker URL wiring needed,
 * which keeps the Next.js static export simple). Layered top-down layout suits a
 * flat state machine; ELK also routes the edges (incl. self-loops) for us.
 */
const elkFactory: ElkFactory = () =>
  new ElkConstructor({
    defaultLayoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'POLYLINE',
      // Spread states apart so transitions have room to breathe.
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '80',
      'elk.spacing.edgeNode': '40',
      'elk.spacing.edgeEdge': '28',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      // Self-loops: enlarge them well past the node border (default looks like a
      // tiny circle hugging the box) and distribute them around the node.
      'elk.spacing.nodeSelfLoop': '60',
      'elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
      // Reserve spacing around edge labels during layout. Final label placement
      // (offset to one side of the line so mirror transitions don't overlap) is
      // handled by Sprotty's edgePlacement in sm-to-sgraph.ts, not by ELK.
      'elk.spacing.edgeLabel': '8'
    }
  });

/**
 * Build a fresh Sprotty DI container for the state-machine diagram. ELK is bound as
 * the model layout engine, so {@link LocalModelSource.setModel} lays the graph out
 * automatically before rendering.
 */
export function createSmDiagramContainer(): Container {
  const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    bind(TYPES.ModelSource).to(LocalModelSource).inSingletonScope();

    const context = { bind, unbind, isBound, rebind };
    configureModelElement(context, SM_TYPES.graph, SGraphImpl, SGraphView);
    configureModelElement(context, SM_TYPES.state, SNodeImpl, RectangularNodeView);
    configureModelElement(context, SM_TYPES.stateLabel, SLabelImpl, SLabelView);
    configureModelElement(context, SM_TYPES.transition, SEdgeImpl, PolylineEdgeView);
    configureModelElement(context, SM_TYPES.transitionLabel, SLabelImpl, SLabelView);

    configureViewerOptions(context, {
      baseDiv: SPROTTY_DIV_ID,
      // Sprotty measures label/node bounds via a hidden render pass; ELK then
      // consumes those sizes for the macro layout.
      needsClientLayout: true,
      needsServerLayout: false
    });
  });

  const container = new Container();
  // Read-only diagram: no edge edit handles, no label edit UI, no node dragging.
  // moveModule is excluded because it wires MoveMouseListener (states become
  // draggable while edge routing points stay fixed). We still need
  // LocationPostprocessor so ELK-computed positions are applied to the SVG.
  loadDefaultModules(container, {
    exclude: [edgeEditModule, labelEditModule, labelEditUiModule, moveModule]
  });
  container.load(elkLayoutModule, layoutPositionModule, diagramModule);
  container.bind(ElkFactory).toConstantValue(elkFactory);
  container.bind(TYPES.IModelLayoutEngine).toService(ElkLayoutEngine);
  return container;
}
