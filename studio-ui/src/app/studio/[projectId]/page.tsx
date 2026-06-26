'use client';

import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import StudioLayout from '@/components/StudioLayout';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { selectProject } from '@/lib/gme-projects';

const exampleDsl = `machine Turnstile {
  events { coin push }
  actions { unlock() lock() alarm() }
  initial state Locked {
    on coin -> Unlocked / unlock()
    on push -> Locked / alarm()
  }
  state Unlocked {
    on push -> Locked / lock()
    on coin -> Unlocked
  }
}`;

export default function StudioPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = decodeURIComponent(params.projectId);
  const initialTab = searchParams.get('panel') === 'diagram' ? 1 : 0;
  const [tab, setTab] = useState(initialTab);
  const { client, state } = useGmeClient();
  const [projectState, setProjectState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || state !== 'connected') {
      return;
    }

    let cancelled = false;
    setProjectState('loading');
    setProjectError(null);

    void selectProject(client, projectId)
      .then(() => {
        if (!cancelled) {
          setProjectState('ready');
        }
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

  if (state !== 'connected' || projectState === 'loading') {
    return (
      <StudioLayout breadcrumbs={breadcrumbs}>
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary">
            Opening project via <code>gmeClient.selectProject()</code>…
          </Typography>
        </Stack>
      </StudioLayout>
    );
  }

  if (projectState === 'error') {
    return (
      <StudioLayout breadcrumbs={breadcrumbs}>
        <Alert severity="error">{projectError ?? 'Failed to open project'}</Alert>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout breadcrumbs={breadcrumbs}>
      <Stack spacing={2} sx={{ height: 'calc(100vh - 160px)' }}>
        <Alert severity="info">
          Project <strong>{projectId}</strong> is open on the WebGME WebSocket connection. Wire territory
          events here to drive Monaco and Sprotty — visualizer logic lives in{' '}
          <code>src/visualizers/</code> and <code>build/workers/</code>.
        </Alert>

        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="DSL Editor" />
          <Tab label="State Diagram" />
          <Tab label="Object Tree" />
        </Tabs>

        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: tab === 2 ? '280px 1fr' : '1fr', gap: 2 }}>
          {tab === 2 && (
            <Paper variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Model tree
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Project / File / Machine / State / Transition nodes will appear here once a territory is
                registered on the open GME client.
              </Typography>
            </Paper>
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: tab === 1 ? '#fafbfc' : '#1e1e1e',
              color: tab === 1 ? 'text.primary' : '#d4d4d4'
            }}
          >
            {tab === 0 && (
              <Box component="pre" sx={{ m: 0, p: 2, fontFamily: 'Consolas, monospace', fontSize: 13, flex: 1 }}>
                {exampleDsl}
              </Box>
            )}
            {tab === 1 && (
              <Box sx={{ flex: 1, p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sprotty diagram placeholder
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ELK layout + Sprotty rendering will mount here for the active Machine node.
                </Typography>
              </Box>
            )}
            {tab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Select a node in the tree to open the DSL editor or diagram.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>
    </StudioLayout>
  );
}
