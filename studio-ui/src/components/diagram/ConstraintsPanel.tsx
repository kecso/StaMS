'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import StopIcon from '@mui/icons-material/Stop';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { runVerifyModel } from '@/lib/gme-plugins';
import { fetchVerificationSettings } from '@/lib/stams-component-settings';
import { readVerificationResult } from '@/lib/sm-verification-result';
import type { GmeClient } from '@/types/gme-global';
import type { SmConstraint, SmTrace, SmVerificationResult } from '@/types/verification';

type ConstraintsPanelProps = {
  client: GmeClient | null;
  machineName: string;
  constraints: SmConstraint[];
  onReplayTrace?: (trace: SmTrace | null, stepIndex: number) => void;
};

function kindColor(kind: SmConstraint['kind']): 'default' | 'primary' | 'secondary' {
  return kind === 'goal' ? 'secondary' : 'default';
}

function statusChip(result: SmVerificationResult['results'][number]) {
  if (result.status === 'proved' && result.passed) {
    return <Chip label="Proved" size="small" color="success" />;
  }
  if (result.status === 'counterexample' && !result.passed) {
    return <Chip label="Failed" size="small" color="error" />;
  }
  if (result.status === 'proved' && result.kind === 'goal') {
    return <Chip label="Witness" size="small" color="success" />;
  }
  return <Chip label={result.status} size="small" variant="outlined" />;
}

export default function ConstraintsPanel({
  client,
  machineName,
  constraints,
  onReplayTrace
}: ConstraintsPanelProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmVerificationResult | null>(null);
  const [replay, setReplay] = useState<{ trace: SmTrace; stepIndex: number } | null>(null);
  const [deployment, setDeployment] = useState<{ maxDepth?: number; engine?: string } | null>(null);

  useEffect(() => {
    void fetchVerificationSettings().then((settings) => {
      setDeployment({ maxDepth: settings.maxDepth, engine: settings.engine });
    });
  }, []);

  const handleRun = useCallback(async () => {
    if (!client) {
      setError('Model backend is not ready.');
      return;
    }
    setRunning(true);
    setError(null);
    setReplay(null);
    onReplayTrace?.(null, -1);
    try {
      const pluginResult = await runVerifyModel(client, machineName);
      if (!pluginResult.success) {
        const msg =
          pluginResult.messages?.map((m) => m.message).join(' ') ||
          pluginResult.error ||
          'Verification plugin failed.';
        throw new Error(msg);
      }
      const doc = readVerificationResult(client);
      if (!doc) {
        throw new Error('Verification finished but no result was found in the project registry.');
      }
      setResult(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, [client, machineName, onReplayTrace]);

  const startReplay = useCallback(
    (trace: SmTrace) => {
      const next = { trace, stepIndex: -1 };
      setReplay(next);
      onReplayTrace?.(trace, -1);
    },
    [onReplayTrace]
  );

  const stopReplay = useCallback(() => {
    setReplay(null);
    onReplayTrace?.(null, -1);
  }, [onReplayTrace]);

  const stepReplay = useCallback(
    (delta: number) => {
      if (!replay) {
        return;
      }
      const max = replay.trace.steps.length - 1;
      const nextIndex = Math.max(-1, Math.min(max, replay.stepIndex + delta));
      const next = { trace: replay.trace, stepIndex: nextIndex };
      setReplay(next);
      onReplayTrace?.(next.trace, nextIndex);
    },
    [replay, onReplayTrace]
  );

  return (
    <Box sx={{ bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Verify · {machineName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Safety and goal constraints from the model. Evaluation runs on the server
          {deployment
            ? ` (bound ${deployment.maxDepth ?? '—'}, engine ${deployment.engine ?? '—'}).`
            : '.'}
        </Typography>
      </Box>
      <Divider />

      <Box sx={{ p: 2 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={running ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserIcon />}
          disabled={!client || running || constraints.length === 0}
          fullWidth
          onClick={() => void handleRun()}
        >
          {running ? 'Running…' : 'Run verification'}
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {result && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Bound {result.bound ?? '—'} steps · engine {result.engine ?? deployment?.engine ?? '—'}
          </Typography>
        )}
      </Box>

      {replay && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Trace replay ({replay.stepIndex + 2}/{replay.trace.steps.length + 1})
            </Typography>
            <IconButton size="small" onClick={() => stepReplay(-1)} disabled={replay.stepIndex <= -1}>
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => stepReplay(1)}
              disabled={replay.stepIndex >= replay.trace.steps.length - 1}
            >
              <SkipNextIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={stopReplay}>
              <StopIcon fontSize="small" />
            </IconButton>
          </Box>
        </>
      )}

      {result && result.results.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Results ({result.results.length})
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {result.results.map((item) => (
                <Box
                  key={item.name}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'action.hover'
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                      {item.name}
                    </Typography>
                    {statusChip(item)}
                    <Chip label={item.kind} size="small" variant="outlined" />
                  </Stack>
                  {item.message && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {item.message}
                    </Typography>
                  )}
                  {item.counterexample && (
                    <Tooltip
                      title={
                        item.kind === 'goal'
                          ? 'Replay witness trace on diagram'
                          : 'Highlight counterexample on diagram'
                      }
                    >
                      <Button
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        sx={{ mt: 0.75 }}
                        onClick={() => startReplay(item.counterexample!)}
                      >
                        {item.kind === 'goal' ? 'Play witness' : 'Play trace'}
                        {item.counterexample.steps.length > 0
                          ? ` (${item.counterexample.steps.length})`
                          : ''}
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </>
      )}

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Constraints ({constraints.length})
        </Typography>
        {constraints.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No constraints in this machine. Add a{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              constraints {'{ ... }'}
            </Box>{' '}
            block in the `.sm` file and sync the model.
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {constraints.map((constraint) => (
              <Box
                key={constraint.name}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'action.hover'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                    {constraint.name}
                  </Typography>
                  <Chip
                    label={constraint.kind}
                    size="small"
                    color={kindColor(constraint.kind)}
                    variant="outlined"
                  />
                </Stack>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'text.secondary'
                  }}
                >
                  {constraint.body || '(empty body)'}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
