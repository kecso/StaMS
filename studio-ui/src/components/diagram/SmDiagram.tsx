'use client';

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ConstraintsPanel from '@/components/diagram/ConstraintsPanel';
import DiagramSideDrawer, { type DiagramDrawerMode } from '@/components/diagram/DiagramSideDrawer';
import SimulationPanel from '@/components/diagram/SimulationPanel';
import { Simulation } from '@/lib/sm-simulator';
import type { SmHighlight } from '@/lib/sprotty/sm-to-sgraph';
import type { SmDiagramView, SmMachineGraph, SmStateNode } from '@/types/sprotty-diagram';
import type { SmConstraint, SmTrace, SmTraceStep, SmValue, SmVerificationModel } from '@/types/verification';
import type { GmeClient } from '@/types/gme-global';

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
  client?: GmeClient | null;
  /** Builds the executable model for the in-browser simulator (needs the GME client). */
  getVerificationModel?: (machineId: string) => SmVerificationModel | null;
  /** Lists constraints declared on a machine (read-only, for the Verify drawer). */
  getConstraints?: (machineId: string) => SmConstraint[] | null;
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

export default function SmDiagram({
  view,
  onMachineChange,
  client,
  getVerificationModel,
  getConstraints
}: SmDiagramProps) {
  const graph = view ? activeGraph(view) : null;
  const hasStates = graph?.children.some((child) => child.type === 'node:state') ?? false;
  const activeMachineId = view?.activeMachineId ?? '';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DiagramDrawerMode>('simulate');
  const [simSnapshot, setSimSnapshot] = useState<SimSnapshot | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [verifyReplay, setVerifyReplay] = useState<{ trace: SmTrace; stepIndex: number } | null>(
    null
  );
  const simRef = useRef<Simulation | null>(null);

  const simOpen = drawerOpen && drawerMode === 'simulate';

  const constraints = useMemo(() => {
    if (!getConstraints || !activeMachineId) {
      return [];
    }
    return getConstraints(activeMachineId) ?? [];
  }, [getConstraints, activeMachineId, graph]);

  const openDrawer = useCallback((mode: DiagramDrawerMode) => {
    setDrawerMode(mode);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setVerifyReplay(null);
  }, []);

  const handleReplayTrace = useCallback((trace: SmTrace | null, stepIndex: number) => {
    if (!trace) {
      setVerifyReplay(null);
      return;
    }
    setVerifyReplay({ trace, stepIndex });
  }, []);

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
    if (!graph) {
      return undefined;
    }

    if (drawerOpen && drawerMode === 'verify' && verifyReplay) {
      const { trace, stepIndex } = verifyReplay;
      const stateName =
        stepIndex < 0
          ? trace.initial.state
          : (trace.steps[stepIndex]?.after.state ?? trace.initial.state);
      const activeStateId = stateIdByName.get(stateName) ?? null;
      let activeTransitionId: string | null = null;
      if (stepIndex >= 0) {
        const step = trace.steps[stepIndex];
        if (step?.transition) {
          const sourceId = stateIdByName.get(step.transition.source);
          const targetId = stateIdByName.get(step.transition.target);
          const edge = graph.children.find(
            (child) =>
              child.type === 'edge:transition' &&
              child.sourceId === sourceId &&
              child.targetId === targetId &&
              (child.event ?? '') === step.event
          );
          activeTransitionId = edge?.id ?? null;
        }
      }
      return { activeStateId, activeTransitionId };
    }

    if (!simOpen || !simSnapshot) {
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
  }, [simOpen, simSnapshot, graph, stateIdByName, drawerOpen, drawerMode, verifyReplay]);

  const layoutEpoch = drawerOpen ? 1 : 0;

  if (!view) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Waiting for model backend…
        </Typography>
      </Box>
    );
  }

  const canUseTools = Boolean(getVerificationModel && hasStates);

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
                  <ListItemText
                    primary={machine.name}
                    secondary={machine.description}
                    secondaryTypographyProps={{ sx: { whiteSpace: 'normal' } }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {graph?.machineName || 'Machine'}
            </Typography>
            {graph?.machineDescription && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {graph.machineDescription}
              </Typography>
            )}
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {canUseTools && (
          <>
            <Button
              size="small"
              variant={drawerOpen && drawerMode === 'simulate' ? 'contained' : 'outlined'}
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                if (drawerOpen && drawerMode === 'simulate') {
                  closeDrawer();
                } else {
                  openDrawer('simulate');
                }
              }}
            >
              Simulate
            </Button>
            {getConstraints && (
              <Button
                size="small"
                variant={drawerOpen && drawerMode === 'verify' ? 'contained' : 'outlined'}
                startIcon={<VerifiedUserIcon />}
                onClick={() => {
                  if (drawerOpen && drawerMode === 'verify') {
                    closeDrawer();
                  } else {
                    openDrawer('verify');
                  }
                }}
              >
                Verify
              </Button>
            )}
          </>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {graph && hasStates ? (
            <SprottyCanvas graph={graph} highlight={highlight} layoutEpoch={layoutEpoch} />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No states yet. Edit valid `.sm` text and wait for model sync.
              </Typography>
            </Box>
          )}
        </Box>
        <DiagramSideDrawer
          open={drawerOpen}
          mode={drawerMode}
          onModeChange={setDrawerMode}
          onClose={closeDrawer}
        >
          {drawerMode === 'simulate' ? (
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
          ) : (
            <ConstraintsPanel
              client={client ?? null}
              machineName={graph?.machineName || 'Machine'}
              constraints={constraints}
              onReplayTrace={handleReplayTrace}
            />
          )}
        </DiagramSideDrawer>
      </Box>
    </Box>
  );
}
