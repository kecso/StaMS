'use client';

import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import type { SmTraceStep, SmValue } from '@/types/verification';

type SimulationPanelProps = {
  machineName: string;
  currentState: string;
  variables: Record<string, SmValue>;
  enabledEvents: string[];
  steps: SmTraceStep[];
  error: string | null;
  onStep: (event: string) => void;
  onReset: () => void;
};

function formatValue(value: SmValue): string {
  if (value === null) {
    return '∅';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

export default function SimulationPanel({
  machineName,
  currentState,
  variables,
  enabledEvents,
  steps,
  error,
  onStep,
  onReset
}: SimulationPanelProps) {
  const variableNames = Object.keys(variables);

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          Simulate · {machineName}
        </Typography>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={onReset}>
          Reset
        </Button>
      </Box>
      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Current state
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <Chip label={currentState || '—'} color="success" size="small" />
        </Box>
      </Box>

      {error && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Fire event
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
          {enabledEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No outgoing events from this state.
            </Typography>
          ) : (
            enabledEvents.map((event) => (
              <Button
                key={event}
                size="small"
                variant="outlined"
                onClick={() => onStep(event)}
              >
                {event}
              </Button>
            ))
          )}
        </Stack>
      </Box>

      {variableNames.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Variables
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {variableNames.map((name) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatValue(variables[name])}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </>
      )}

      <Divider />
      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          Trace ({steps.length})
        </Typography>
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          {steps.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Fire an event to grow the trace.
            </Typography>
          ) : (
            steps.map((step) => (
              <Box
                key={step.index}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  bgcolor: step.guardPassed ? 'action.hover' : 'transparent',
                  border: 1,
                  borderColor: step.guardPassed ? 'transparent' : 'warning.light'
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {step.index + 1}. {step.before.state}
                  {' '}
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    —{step.event}→
                  </Box>
                  {' '}
                  {step.after.state}
                </Typography>
                {!step.guardPassed && (
                  <Typography variant="caption" color="warning.main">
                    {step.note ?? 'blocked'}
                  </Typography>
                )}
              </Box>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}
