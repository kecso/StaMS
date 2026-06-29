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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SmDiagram from '@/components/diagram/SmDiagram';
import StudioLayout from '@/components/StudioLayout';
import SmEditor from '@/components/editor/SmEditor';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { closeProject, selectProject } from '@/lib/gme-projects';
import { subscribeProjectTerritory } from '@/lib/gme-territory';
import { buildSmDiagramFromClient, PROJECT_ROOT } from '@/lib/sm-diagram-from-client';
import { EXAMPLE_SM, loadDoc, saveDoc } from '@/lib/sm-document';
import { countDiagnostics, useSmValidation } from '@/lib/sm-parse';
import {
  syncModelFromText,
  type ModelSyncStatus
} from '@/lib/sm-model-sync';
import type { SmDiagramView } from '@/types/sprotty-diagram';
import { clearWorkspace, getWorkspaceDocName, getWorkspaceProjectId } from '@/lib/workspace';

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
  const validation = useSmValidation(text);
  const textValid = validation.valid;
  const [syncStatus, setSyncStatus] = useState<ModelSyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [diagramView, setDiagramView] = useState<SmDiagramView | null>(null);
  const [activeMachineId, setActiveMachineId] = useState<string | undefined>();
  const activeMachineIdRef = useRef<string | undefined>(undefined);

  activeMachineIdRef.current = activeMachineId;

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
          // TextToModel commits on the server; the client picks up the new hash via
          // NEW_COMMIT_STATE → territory reload → rebuild (see diagram effect).
          if (result.status === 'synced') {
            // eslint-disable-next-line no-console
            console.log('[SmSync] TextToModel ok, client commit:', client.getActiveCommitHash?.());
          }
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
        if (cancelled) {
          return;
        }
        // The project is gone (e.g. server restarted — model storage is in-memory
        // and the embedded mongo is ephemeral). Stop the client from watching the
        // dead project (otherwise it keeps re-joining the missing room on every
        // reconnect, spamming "no such project" on the server), clear the stale
        // workspace, and return to the start page.
        void closeProject(client).catch(() => undefined);
        clearWorkspace();
        setWorkspaceError(err instanceof Error ? err.message : 'Could not load workspace');
        setWorkspaceState('error');
        router.replace('/');
      });
    return () => {
      cancelled = true;
    };
  }, [client, state, projectId]);

  useEffect(() => {
    if (!client || workspaceState !== 'open') {
      setDiagramView(null);
      return;
    }

    const rebuild = () => {
      setDiagramView(buildSmDiagramFromClient(client, activeMachineIdRef.current));
    };

    const subscription = subscribeProjectTerritory(client, PROJECT_ROOT, rebuild);

    const commitEvent = client.CONSTANTS?.NEW_COMMIT_STATE ?? 'NEW_COMMIT_STATE';
    client.addEventListener?.(commitEvent, rebuild);

    return () => {
      subscription.release();
      client.removeEventListener?.(commitEvent, rebuild);
    };
  }, [client, workspaceState]);

  const handleMachineChange = useCallback(
    (machineId: string) => {
      setActiveMachineId(machineId);
      setDiagramView((view) => (view ? { ...view, activeMachineId: machineId } : view));
    },
    []
  );

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

  const validationChip = (() => {
    if (validation.loading) {
      return <Chip size="small" color="info" variant="outlined" label="Checking…" />;
    }
    const { errors, warnings } = countDiagnostics(validation.diagnostics);
    if (errors > 0) {
      const detail = warnings > 0 ? ` (${warnings} warning${warnings === 1 ? '' : 's'})` : '';
      return (
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={`${errors} error${errors === 1 ? '' : 's'}${detail}`}
        />
      );
    }
    if (warnings > 0) {
      return (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`${warnings} warning${warnings === 1 ? '' : 's'}`}
        />
      );
    }
    const sourceHint = validation.source === 'local' ? ' (offline rules)' : '';
    return <Chip size="small" color="success" variant="outlined" label={`Valid${sourceHint}`} />;
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
          {validationChip}
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
        </Tabs>

        <Paper
          variant="outlined"
          sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {tab === 0 && (
            <SmEditor value={text} onChange={handleChange} diagnostics={validation.diagnostics} />
          )}

          {tab === 1 && (
            <SmDiagram view={diagramView} onMachineChange={handleMachineChange} />
          )}
        </Paper>
      </Stack>
    </StudioLayout>
  );
}
