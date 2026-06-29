'use client';

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import type {
  SmDiagramView,
  SmMachineGraph,
  SmStateNode,
  SmTransitionEdge
} from '@/types/sprotty-diagram';

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
};

function activeGraph(view: SmDiagramView): SmMachineGraph | null {
  return view.graphsByMachineId[view.activeMachineId] ?? null;
}

export default function SmDiagram({ view, onMachineChange }: SmDiagramProps) {
  const graph = view ? activeGraph(view) : null;

  const { stateCount, edgeCount } = useMemo(() => {
    if (!graph) {
      return { stateCount: 0, edgeCount: 0 };
    }
    return {
      stateCount: graph.children.filter(
        (child): child is SmStateNode => child.type === 'node:state'
      ).length,
      edgeCount: graph.children.filter(
        (child): child is SmTransitionEdge => child.type === 'edge:transition'
      ).length
    };
  }, [graph]);

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
        <Typography variant="caption" color="text.secondary">
          {stateCount} state{stateCount === 1 ? '' : 's'} · {edgeCount} transition
          {edgeCount === 1 ? '' : 's'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {graph && stateCount > 0 ? (
          <SprottyCanvas graph={graph} />
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No states yet. Edit valid `.sm` text and wait for model sync.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
