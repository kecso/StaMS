'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import StudioLayout from '@/components/StudioLayout';
import SmEditor from '@/components/editor/SmEditor';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { selectProject } from '@/lib/gme-projects';
import { EXAMPLE_SM, loadDoc, saveDoc } from '@/lib/sm-document';
import { validateSm } from '@/lib/sm-language';
import {
  syncModelFromText,
  type ModelSyncStatus
} from '@/lib/sm-model-sync';
import { getWorkspaceDocName, getWorkspaceProjectId } from '@/lib/workspace';

type WorkspaceState = 'idle' | 'opening' | 'open' | 'error';

const MODEL_SYNC_DEBOUNCE_MS = 600;

export default function StudioPage() {
  const router = useRouter();
  const docName = getWorkspaceDocName();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const { client, state } = useGmeClient();
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>('idle');
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [textValid, setTextValid] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ModelSyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = getWorkspaceProjectId();
    if (!id) {
      router.replace('/');
      return;
    }
    setProjectId(id);
    setText(loadDoc() ?? '');
  }, [router]);

  const handleChange = useCallback((next: string) => {
    setText(next);
    saveDoc(next);
  }, []);

  const handleValidationChange = useCallback((validState: { valid: boolean }) => {
    setTextValid(validState.valid);
  }, []);

  useEffect(() => {
    if (tab !== 0) {
      const diagnostics = validateSm(text);
      setTextValid(!diagnostics.some((d) => d.severity === 'error'));
    }
  }, [text, tab]);

  useEffect(() => {
    if (!projectId || !text.trim() || !textValid) {
      setSyncStatus('skipped');
      setSyncMessage(
        !text.trim() ? 'Waiting for document text' : 'Fix validation errors before model sync'
      );
      return;
    }

    setSyncStatus('pending');
    setSyncMessage('Waiting for edits to settle…');

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!client || workspaceState !== 'open') {
        if (!cancelled) {
          setSyncStatus('skipped');
          setSyncMessage('Waiting for model backend');
        }
        return;
      }
      void syncModelFromText(client, text).then((result) => {
        if (!cancelled) {
          setSyncStatus(result.status);
          setSyncMessage(result.message ?? null);
        }
      });
    }, MODEL_SYNC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text, textValid, projectId, client, workspaceState]);

  const insertExample = useCallback(() => {
    setText(EXAMPLE_SM);
    saveDoc(EXAMPLE_SM);
  }, []);

  useEffect(() => {
    if (!client || state !== 'connected' || !projectId) {
      return;
    }
    let cancelled = false;
    setWorkspaceState('opening');
    setWorkspaceError(null);
    void selectProject(client, projectId)
      .then(() => {
        if (!cancelled) setWorkspaceState('open');
      })
      .catch((err) => {
        if (!cancelled) {
          setWorkspaceError(err instanceof Error ? err.message : 'Could not load workspace');
          setWorkspaceState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, state, projectId]);

  const breadcrumbs = useMemo(
    () => [{ label: 'Home', href: '/' }, { label: docName }],
    [docName]
  );

  if (!projectId) {
    return null;
  }

  const connectionChip = (() => {
    if (state !== 'connected') {
      return <Chip size="small" color="warning" label="Connecting…" />;
    }
    if (workspaceState === 'opening') {
      return <Chip size="small" color="info" label="Loading…" />;
    }
    if (workspaceState === 'error') {
      return <Chip size="small" color="error" label="Backend unavailable" />;
    }
    if (workspaceState === 'open') {
      return <Chip size="small" color="success" label="Ready" />;
    }
    return <Chip size="small" variant="outlined" label="Idle" />;
  })();

  const modelSyncChip = (() => {
    switch (syncStatus) {
      case 'pending':
        return <Chip size="small" color="info" variant="outlined" label="Sync pending…" />;
      case 'synced':
        return <Chip size="small" color="success" variant="outlined" label="Model synced" />;
      case 'skipped':
        return <Chip size="small" variant="outlined" label="Sync paused" />;
      case 'error':
        return <Chip size="small" color="error" variant="outlined" label="Sync failed" />;
      default:
        return <Chip size="small" variant="outlined" label="Sync idle" />;
    }
  })();

  return (
    <StudioLayout breadcrumbs={breadcrumbs}>
      <Stack spacing={2} sx={{ height: 'calc(100vh - 160px)' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {docName}.sm
          </Typography>
          {connectionChip}
          {modelSyncChip}
          <Box sx={{ flex: 1 }} />
          {text.trim().length === 0 && (
            <Button size="small" variant="outlined" onClick={insertExample}>
              Insert turnstile example
            </Button>
          )}
        </Stack>

        {workspaceState === 'error' && (
          <Alert severity="warning">
            {workspaceError ?? 'Could not connect the model backend.'} The text editor still works
            locally; diagram and model sync need the backend.
          </Alert>
        )}

        {syncMessage && syncStatus !== 'idle' && (
          <Typography variant="caption" color="text.secondary">
            {syncMessage}
          </Typography>
        )}

        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="Text (.sm)" />
          <Tab label="Diagram" />
          <Tab label="Object Tree" />
        </Tabs>

        <Paper
          variant="outlined"
          sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {tab === 0 && (
            <SmEditor
              value={text}
              onChange={handleChange}
              onValidationChange={handleValidationChange}
            />
          )}

          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                State diagram
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The diagram will be projected from the parsed `.sm` model via Sprotty + ELK.
              </Typography>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                The model tree (Machine / State / Transition …) will appear here once the text is
                synced into the structural model.
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </StudioLayout>
  );
}
