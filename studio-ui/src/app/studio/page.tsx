'use client';

import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SmDiagram from '@/components/diagram/SmDiagram';
import StudioLayout, { type StudioViewTab } from '@/components/StudioLayout';
import SmEditor from '@/components/editor/SmEditor';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { closeProject, selectProject } from '@/lib/gme-projects';
import { subscribeProjectTerritory } from '@/lib/gme-territory';
import { buildSmDiagramFromClient, EMPTY_DIAGRAM_VIEW, PROJECT_ROOT } from '@/lib/sm-diagram-from-client';
import { buildConstraintsFromClient } from '@/lib/sm-constraints-from-client';
import { buildVerificationModelFromClient } from '@/lib/sm-verification-from-client';
import { loadDoc, saveDoc } from '@/lib/sm-document';
import { downloadSmFile } from '@/lib/sm-export';
import { SM_EXAMPLES, appendExampleText, getExampleById, type SmExample } from '@/lib/sm-examples';
import { countDiagnostics, useSmValidation } from '@/lib/sm-parse';
import {
  clearSyncedModel,
  syncModelFromText,
  type ModelSyncStatus
} from '@/lib/sm-model-sync';
import type { SmDiagramView } from '@/types/sprotty-diagram';
import { clearWorkspace, getWorkspaceDocName, getWorkspaceProjectId } from '@/lib/workspace';

type WorkspaceState = 'idle' | 'opening' | 'open' | 'error';

const MODEL_SYNC_DEBOUNCE_MS = 600;

export default function StudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docName = getWorkspaceDocName();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<StudioViewTab>('text');
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

  useEffect(() => {
    if (searchParams.get('tab') === 'diagram') {
      setViewTab('diagram');
    }
    const exampleParam = searchParams.get('example');
    if (exampleParam) {
      const example = getExampleById(exampleParam);
      if (example) {
        setText((current) => {
          const next = appendExampleText(current, example.text);
          saveDoc(next);
          return next;
        });
      }
    }
  }, [searchParams]);

  const handleChange = useCallback((next: string) => {
    setText(next);
    saveDoc(next);
  }, []);

  const handleAppendExample = useCallback((example: SmExample) => {
    setText((current) => {
      const next = appendExampleText(current, example.text);
      saveDoc(next);
      return next;
    });
  }, []);

  const handleSaveDocument = useCallback(() => {
    saveDoc(text);
    downloadSmFile(text, docName);
  }, [text, docName]);

  const handleClearDocument = useCallback(() => {
    setText('');
    saveDoc('');
    setActiveMachineId(undefined);
    setDiagramView(EMPTY_DIAGRAM_VIEW);
    setSyncStatus('pending');
    setSyncMessage('Clearing model…');

    if (!client || workspaceState !== 'open') {
      setSyncStatus('skipped');
      setSyncMessage('Document cleared');
      return;
    }

    void clearSyncedModel(client).then((result) => {
      setSyncStatus(result.status);
      setSyncMessage(result.message ?? null);
      if (result.status === 'synced') {
        setDiagramView(buildSmDiagramFromClient(client, undefined));
      }
    });
  }, [client, workspaceState]);

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
        void closeProject(client).catch(() => undefined);
        clearWorkspace();
        setWorkspaceError(err instanceof Error ? err.message : 'Could not load workspace');
        setWorkspaceState('error');
        router.replace('/');
      });
    return () => {
      cancelled = true;
    };
  }, [client, state, projectId, router]);

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

  const handleMachineChange = useCallback((machineId: string) => {
    setActiveMachineId(machineId);
    setDiagramView((view) => (view ? { ...view, activeMachineId: machineId } : view));
  }, []);

  const getVerificationModel = useCallback(
    (machineId: string) => {
      if (!client || workspaceState !== 'open') {
        return null;
      }
      return buildVerificationModelFromClient(client, machineId);
    },
    [client, workspaceState]
  );

  const getConstraints = useCallback(
    (machineId: string) => {
      if (!client || workspaceState !== 'open') {
        return null;
      }
      return buildConstraintsFromClient(client, machineId);
    },
    [client, workspaceState]
  );

  const breadcrumbs = useMemo(
    () => [{ label: 'Home', href: '/' }, { label: docName }],
    [docName]
  );

  if (!projectId) {
    return null;
  }

  const statusBar = (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      {state !== 'connected' ? (
        <Chip size="small" color="warning" variant="outlined" label="Connecting…" />
      ) : workspaceState === 'opening' ? (
        <Chip size="small" variant="outlined" label="Loading…" />
      ) : workspaceState === 'open' ? (
        <Chip size="small" color="success" variant="outlined" label="Ready" />
      ) : null}
      {validation.loading ? (
        <Chip size="small" variant="outlined" label="Checking…" />
      ) : countDiagnostics(validation.diagnostics).errors > 0 ? (
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={`${countDiagnostics(validation.diagnostics).errors} error(s)`}
        />
      ) : (
        <Chip size="small" color="success" variant="outlined" label="Valid" />
      )}
      {syncStatus === 'synced' && (
        <Chip size="small" color="info" variant="outlined" label="Synced" />
      )}
      {syncStatus === 'pending' && (
        <Chip size="small" variant="outlined" label="Syncing…" />
      )}
      {syncMessage && syncStatus !== 'idle' && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          {syncMessage}
        </Typography>
      )}
    </Stack>
  );

  return (
    <StudioLayout
      breadcrumbs={breadcrumbs}
      viewTab={viewTab}
      onViewTabChange={setViewTab}
      examples={SM_EXAMPLES}
      onAppendExample={handleAppendExample}
      onClearDocument={handleClearDocument}
      onSaveDocument={handleSaveDocument}
      statusBar={statusBar}
    >
      <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {workspaceState === 'error' && (
          <Alert severity="warning" sx={{ flexShrink: 0 }}>
            {workspaceError ?? 'Could not connect the model backend.'}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {viewTab === 'text' ? (
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <SmEditor value={text} onChange={handleChange} diagnostics={validation.diagnostics} />
            </Box>
          ) : (
            <SmDiagram
              view={diagramView}
              onMachineChange={handleMachineChange}
              client={client}
              getVerificationModel={getVerificationModel}
              getConstraints={getConstraints}
            />
          )}
        </Paper>
      </Stack>
    </StudioLayout>
  );
}
