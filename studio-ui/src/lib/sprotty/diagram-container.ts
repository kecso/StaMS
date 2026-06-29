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
  loadDefaultModules
} from 'sprotty';
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
      // Give transition labels their own gap. HEAD (near the arrowhead) instead
      // of CENTER so that mirror transitions (A→B and B→A) don't stack their
      // labels at the same midpoint.
      'elk.spacing.edgeLabel': '8',
      'elk.edgeLabels.placement': 'HEAD'
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
  // Exclude the editing modules: this is a read-only, model-generated diagram.
  // edgeEditModule switches edges into edit mode on selection and adds
  // routing-point handles whose views we never register — that produced the
  // "missing view" fallbacks when clicking a connection. moveModule is kept on
  // purpose: it binds the LocationPostprocessor that positions every element.
  loadDefaultModules(container, {
    exclude: [edgeEditModule, labelEditModule, labelEditUiModule]
  });
  container.load(elkLayoutModule, diagramModule);
  container.bind(ElkFactory).toConstantValue(elkFactory);
  container.bind(TYPES.IModelLayoutEngine).toService(ElkLayoutEngine);
  return container;
}
