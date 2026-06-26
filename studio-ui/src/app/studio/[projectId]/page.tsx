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
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import StudioLayout from '@/components/StudioLayout';
import SmEditor from '@/components/editor/SmEditor';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { selectProject } from '@/lib/gme-projects';
import { EXAMPLE_SM, loadDoc, saveDoc } from '@/lib/sm-document';

type ProjectState = 'idle' | 'opening' | 'open' | 'error';

export default function StudioPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = decodeURIComponent(params.projectId);
  const initialTab = searchParams.get('panel') === 'diagram' ? 1 : 0;

  const [tab, setTab] = useState(initialTab);
  const { client, state } = useGmeClient();
  const [projectState, setProjectState] = useState<ProjectState>('idle');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [text, setText] = useState('');

  // Load the document for this project (interim: localStorage).
  useEffect(() => {
    setText(loadDoc(projectId) ?? '');
  }, [projectId]);

  const handleChange = useCallback(
    (next: string) => {
      setText(next);
      saveDoc(projectId, next);
    },
    [projectId]
  );

  const insertExample = useCallback(() => {
    setText(EXAMPLE_SM);
    saveDoc(projectId, EXAMPLE_SM);
  }, [projectId]);

  // Open the project on the WebGME connection in the background (non-blocking).
  useEffect(() => {
    if (!client || state !== 'connected') {
      return;
    }
    let cancelled = false;
    setProjectState('opening');
    setProjectError(null);
    void selectProject(client, projectId)
      .then(() => {
        if (!cancelled) setProjectState('open');
      })
      .catch((err) => {
        if (!cancelled) {
          setProjectError(err instanceof Error ? err.message : 'Failed to open project');
          setProjectState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, state, projectId]);

  const breadcrumbs = useMemo(
    () => [{ label: 'Projects', href: '/' }, { label: projectId }],
    [projectId]
  );

  const connectionChip = (() => {
    if (state !== 'connected') {
      return <Chip size="small" color="warning" label="Connecting to WebGME…" />;
    }
    if (projectState === 'opening') {
      return <Chip size="small" color="info" label="Opening project…" />;
    }
    if (projectState === 'error') {
      return <Chip size="small" color="error" label="Project open failed" />;
    }
    if (projectState === 'open') {
      return <Chip size="small" color="success" label="Project open" />;
    }
    return <Chip size="small" variant="outlined" label="Idle" />;
  })();

  return (
    <StudioLayout breadcrumbs={breadcrumbs}>
      <Stack spacing={2} sx={{ height: 'calc(100vh - 160px)' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {projectId}.sm
          </Typography>
          {connectionChip}
          <Box sx={{ flex: 1 }} />
          {text.trim().length === 0 && (
            <Button size="small" variant="outlined" onClick={insertExample}>
              Insert turnstile example
            </Button>
          )}
        </Stack>

        {projectState === 'error' && (
          <Alert severity="warning">
            {projectError ?? 'Could not open the project on WebGME.'} The text editor below still works
            (saved locally); WebGME model sync will attach once the metamodel seed is in place.
          </Alert>
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
          {tab === 0 && <SmEditor value={text} onChange={handleChange} />}

          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                State diagram (derived view)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The diagram will be projected from the parsed `.sm` model. This is the next step after
                the text editor; it will render states and transitions read-only via Sprotty + ELK.
              </Typography>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                The model tree (Machine / State / Transition …) will appear here once the `.sm` text is
                synced into WebGME nodes.
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </StudioLayout>
  );
}
