'use client';

import type { Container } from 'inversify';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TYPES, type IActionDispatcher, type LocalModelSource } from 'sprotty';
import { FitToScreenAction } from 'sprotty-protocol';

import DiagramHoverCard from '@/components/diagram/DiagramHoverCard';
import type { SmDiagramDetail } from '@/lib/sm-diagram-details';
import { lookupDiagramDetail, modelIdFromDomTarget } from '@/lib/sm-diagram-details';
import type { SmMachineGraph } from '@/types/sprotty-diagram';

import 'sprotty/css/sprotty.css';
import './sprotty-sm.css';

import {
  SPROTTY_DIV_ID,
  createSmDiagramContainer
} from '@/lib/sprotty/diagram-container';
import { applySmHighlight } from '@/lib/sprotty/sm-highlight-dom';
import { smGraphToSGraph, type SmHighlight } from '@/lib/sprotty/sm-to-sgraph';

type SprottyCanvasProps = {
  graph: SmMachineGraph;
  highlight?: SmHighlight;
  /** Changes when the side drawer opens/closes so the canvas can re-fit. */
  layoutEpoch?: number;
};

type HoverState = {
  x: number;
  y: number;
  detail: SmDiagramDetail;
};

/**
 * Mounts a Sprotty diagram (laid out by ELK) for a single state machine. This
 * component is loaded client-side only (see {@link SmDiagram}) because Sprotty
 * relies on the DOM, inversify, and `reflect-metadata`.
 */
export default function SprottyCanvas({ graph, highlight, layoutEpoch = 0 }: SprottyCanvasProps) {
  const containerRef = useRef<Container | null>(null);
  const modelSourceRef = useRef<LocalModelSource | null>(null);
  const actionDispatcherRef = useRef<IActionDispatcher | null>(null);
  const graphRef = useRef(graph);
  const lastFittedGraphRef = useRef<SmMachineGraph | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  graphRef.current = graph;

  const fitToScreen = useCallback(() => {
    if (!actionDispatcherRef.current || !lastFittedGraphRef.current) {
      return;
    }
    void actionDispatcherRef.current.dispatch(
      FitToScreenAction.create([], { padding: 40, maxZoom: 1, animate: false })
    );
  }, []);

  useEffect(() => {
    const container = createSmDiagramContainer();
    containerRef.current = container;
    modelSourceRef.current = container.get<LocalModelSource>(TYPES.ModelSource);
    actionDispatcherRef.current = container.get<IActionDispatcher>(TYPES.IActionDispatcher);

    return () => {
      const host = document.getElementById(SPROTTY_DIV_ID);
      if (host) {
        host.innerHTML = '';
      }
      container.unbindAll();
      containerRef.current = null;
      modelSourceRef.current = null;
      actionDispatcherRef.current = null;
    };
  }, []);

  useEffect(() => {
    const modelSource = modelSourceRef.current;
    if (!modelSource) {
      return;
    }
    const graphChanged = lastFittedGraphRef.current !== graph;
    let cancelled = false;

    const applyHighlight = () => {
      if (!cancelled) {
        applySmHighlight(highlight);
      }
    };

    if (graphChanged) {
      void modelSource.setModel(smGraphToSGraph(graph)).then(() => {
        if (cancelled) {
          return;
        }
        lastFittedGraphRef.current = graph;
        applyHighlight();
        // ELK lays the graph out from the top-left origin, so without this the
        // states hug the left edge. Fitting to the whole model (empty id list ⇒
        // all elements) centers it; maxZoom keeps small machines at natural size.
        void actionDispatcherRef.current?.dispatch(
          FitToScreenAction.create([], { padding: 40, maxZoom: 1, animate: false })
        );
      });
    } else {
      applyHighlight();
    }

    return () => {
      cancelled = true;
    };
  }, [graph, highlight]);

  // Re-center when the diagram column resizes (e.g. side drawer opens).
  useEffect(() => {
    const host = document.getElementById(SPROTTY_DIV_ID);
    const observeTarget = host?.parentElement;
    if (!observeTarget) {
      return;
    }
    const observer = new ResizeObserver(() => {
      fitToScreen();
    });
    observer.observe(observeTarget);
    return () => observer.disconnect();
  }, [fitToScreen, graph]);

  useEffect(() => {
    const timer = window.setTimeout(fitToScreen, 220);
    return () => window.clearTimeout(timer);
  }, [layoutEpoch, fitToScreen]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const modelId = modelIdFromDomTarget(event.target);
    if (!modelId) {
      setHover(null);
      return;
    }
    const detail = lookupDiagramDetail(graphRef.current, modelId);
    if (!detail) {
      setHover(null);
      return;
    }
    setHover({ x: event.clientX, y: event.clientY, detail });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHover(null);
  }, []);

  useEffect(() => {
    const host = document.getElementById(SPROTTY_DIV_ID);
    if (!host) {
      return;
    }
    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [handlePointerMove, handlePointerLeave, graph]);

  return (
  <>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <marker
            id="sm-arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#b0c4de" />
          </marker>
          <marker
            id="sm-arrowhead-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#7CFC9A" />
          </marker>
        </defs>
      </svg>
      <div id={SPROTTY_DIV_ID} style={{ width: '100%', height: '100%' }} />
      {hover && <DiagramHoverCard detail={hover.detail} x={hover.x} y={hover.y} />}
    </>
  );
}
