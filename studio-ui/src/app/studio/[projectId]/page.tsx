'use client';

import {
  Alert,
  Box,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import StudioLayout from '@/components/StudioLayout';

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

  const breadcrumbs = useMemo(
    () => [{ label: 'Projects', href: '/' }, { label: projectId }],
    [projectId]
  );

  return (
    <StudioLayout breadcrumbs={breadcrumbs}>
      <Stack spacing={2} sx={{ height: 'calc(100vh - 160px)' }}>
        <Alert severity="info">
          React studio shell (bootstrap). Wire GME client territory events here to drive Monaco and Sprotty
          panels — visualizer logic lives in <code>src/visualizers/</code> and <code>build/workers/</code>.
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
                Project / File / Machine / State / Transition nodes will appear here once the GME client is
                connected.
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
