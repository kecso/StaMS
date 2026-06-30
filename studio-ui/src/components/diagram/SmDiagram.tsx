'use client';

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SimulationPanel from '@/components/diagram/SimulationPanel';
import { Simulation } from '@/lib/sm-simulator';
import type { SmHighlight } from '@/lib/sprotty/sm-to-sgraph';
import type { SmDiagramView, SmMachineGraph, SmStateNode } from '@/types/sprotty-diagram';
import type { SmTraceStep, SmValue, SmVerificationModel } from '@/types/verification';

// Sprotty depends on the DOM, inversify and reflect-metadata, so the canvas is
// loaded client-side only (the studio is statically exported).
const SprottyCanvas = dynamic(() => import('./SprottyCanvas'), {
  ssr: false,
  loading: () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary">
        Loading diagram…
      </Typography>
    </Box>
  )
});

type SmDiagramProps = {
  view: SmDiagramView | null;
  onMachineChange?: (machineId: string) => void;
  /** Builds the executable model for the in-browser simulator (needs the GME client). */
  getVerificationModel?: (machineId: string) => SmVerificationModel | null;
};

function activeGraph(view: SmDiagramView): SmMachineGraph | null {
  return view.graphsByMachineId[view.activeMachineId] ?? null;
}

type SimSnapshot = {
  current: string;
  variables: Record<string, SmValue>;
  enabled: string[];
  steps: SmTraceStep[];
};

export default function SmDiagram({ view, onMachineChange, getVerificationModel }: SmDiagramProps) {
  const graph = view ? activeGraph(view) : null;
  const hasStates = graph?.children.some((child) => child.type === 'node:state') ?? false;
  const activeMachineId = view?.activeMachineId ?? '';

  const [simOpen, setSimOpen] = useState(false);
  const [simSnapshot, setSimSnapshot] = useState<SimSnapshot | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const simRef = useRef<Simulation | null>(null);

  const readSimulation = useCallback(() => {
    const sim = simRef.current;
    if (!sim) {
      setSimSnapshot(null);
      return;
    }
    setSimSnapshot({
      current: sim.getStateName(),
      variables: sim.getVariables(),
      enabled: sim.getEnabledEvents(),
      steps: [...sim.trace.steps]
    });
  }, []);

  const buildSimulation = useCallback(() => {
    if (!getVerificationModel || !activeMachineId) {
      simRef.current = null;
      setSimSnapshot(null);
      return;
    }
    try {
      const model = getVerificationModel(activeMachineId);
      if (!model || model.machines.length === 0) {
        simRef.current = null;
        setSimSnapshot(null);
        setSimError('Model not available yet — sync the text first.');
        return;
      }
      simRef.current = new Simulation(model);
      setSimError(null);
      readSimulation();
    } catch (err) {
      simRef.current = null;
      setSimSnapshot(null);
      setSimError(err instanceof Error ? err.message : 'Could not build simulation');
    }
  }, [getVerificationModel, activeMachineId, readSimulation]);

  // (Re)build the simulation when the panel opens, the machine changes, or the
  // model is rebuilt after a commit (graph identity changes).
  useEffect(() => {
    if (!simOpen) {
      simRef.current = null;
      return;
    }
    buildSimulation();
  }, [simOpen, activeMachineId, graph, buildSimulation]);

  const handleStep = useCallback(
    (event: string) => {
      if (!simRef.current) {
        return;
      }
      simRef.current.step(event);
      readSimulation();
    },
    [readSimulation]
  );

  const stateIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const child of graph?.children ?? []) {
      if (child.type === 'node:state') {
        map.set((child as SmStateNode).name, child.id);
      }
    }
    return map;
  }, [graph]);

  const highlight = useMemo<SmHighlight | undefined>(() => {
    if (!simOpen || !simSnapshot || !graph) {
      return undefined;
    }
    const activeStateId = stateIdByName.get(simSnapshot.current) ?? null;
    const lastStep = simSnapshot.steps[simSnapshot.steps.length - 1];
    let activeTransitionId: string | null = null;
    if (lastStep?.transition) {
      const sourceId = stateIdByName.get(lastStep.transition.source);
      const targetId = stateIdByName.get(lastStep.transition.target);
      const edge = graph.children.find(
        (child) =>
          child.type === 'edge:transition' &&
          child.sourceId === sourceId &&
          child.targetId === targetId &&
          (child.event ?? '') === lastStep.event
      );
      activeTransitionId = edge?.id ?? null;
    }
    return { activeStateId, activeTransitionId };
  }, [simOpen, simSnapshot, graph, stateIdByName]);

  if (!view) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Waiting for model backend…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: 2,
          pt: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        {view.machines.length > 1 ? (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="sm-machine-select">Machine</InputLabel>
            <Select
              labelId="sm-machine-select"
              label="Machine"
              value={view.activeMachineId}
              onChange={(event) => onMachineChange?.(String(event.target.value))}
            >
              {view.machines.map((machine) => (
                <MenuItem key={machine.id} value={machine.id}>
                  {machine.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {graph?.machineName || 'Machine'}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {getVerificationModel && hasStates && (
          <Button
            size="small"
            variant={simOpen ? 'contained' : 'outlined'}
            startIcon={<PlayArrowIcon />}
            onClick={() => setSimOpen((open) => !open)}
          >
            {simOpen ? 'Stop simulation' : 'Simulate'}
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {graph && hasStates ? (
            <SprottyCanvas graph={graph} highlight={highlight} />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No states yet. Edit valid `.sm` text and wait for model sync.
              </Typography>
            </Box>
          )}
        </Box>
        {simOpen && (
          <SimulationPanel
            machineName={graph?.machineName || 'Machine'}
            currentState={simSnapshot?.current ?? ''}
            variables={simSnapshot?.variables ?? {}}
            enabledEvents={simSnapshot?.enabled ?? []}
            steps={simSnapshot?.steps ?? []}
            error={simError}
            onStep={handleStep}
            onReset={buildSimulation}
          />
        )}
      </Box>
    </Box>
  );
}
