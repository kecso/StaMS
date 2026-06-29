'use client';

import type { Container } from 'inversify';
import { useEffect, useRef } from 'react';
import { TYPES, type LocalModelSource } from 'sprotty';

import type { SmMachineGraph } from '@/types/sprotty-diagram';

import 'sprotty/css/sprotty.css';
import './sprotty-sm.css';

import {
  SPROTTY_DIV_ID,
  createSmDiagramContainer
} from '@/lib/sprotty/diagram-container';
import { smGraphToSGraph } from '@/lib/sprotty/sm-to-sgraph';

type SprottyCanvasProps = {
  graph: SmMachineGraph;
};

/**
 * Mounts a Sprotty diagram (laid out by ELK) for a single state machine. This
 * component is loaded client-side only (see {@link SmDiagram}) because Sprotty
 * relies on the DOM, inversify, and `reflect-metadata`.
 */
export default function SprottyCanvas({ graph }: SprottyCanvasProps) {
  const containerRef = useRef<Container | null>(null);
  const modelSourceRef = useRef<LocalModelSource | null>(null);

  useEffect(() => {
    const container = createSmDiagramContainer();
    containerRef.current = container;
    modelSourceRef.current = container.get<LocalModelSource>(TYPES.ModelSource);

    return () => {
      const host = document.getElementById(SPROTTY_DIV_ID);
      if (host) {
        host.innerHTML = '';
      }
      container.unbindAll();
      containerRef.current = null;
      modelSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const modelSource = modelSourceRef.current;
    if (!modelSource) {
      return;
    }
    void modelSource.setModel(smGraphToSGraph(graph));
  }, [graph]);

  return (
    <>
      {/* Arrowhead marker referenced by `.sprotty-edge > path { marker-end }`. */}
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
        </defs>
      </svg>
      <div id={SPROTTY_DIV_ID} style={{ width: '100%', height: '100%' }} />
    </>
  );
}
