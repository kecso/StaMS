'use client';

import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import CreateProjectPanel from '@/components/start/CreateProjectPanel';
import ProjectListPanel from '@/components/start/ProjectListPanel';
import WelcomeHeader from '@/components/start/WelcomeHeader';
import { useGmeClient } from '@/contexts/GmeClientContext';
import {
  filterStaMsProjects,
  listProjects,
  sortProjectsByModified,
  type GmeProjectRecord
} from '@/lib/gme-projects';

export default function StartPage() {
  const { client, state, error, reconnect } = useGmeClient();
  const [projects, setProjects] = useState<GmeProjectRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    if (!client) {
      return;
    }
    setLoadError(null);
    setProjects(null);
    try {
      const allProjects = await listProjects(client);
      setProjects(sortProjectsByModified(filterStaMsProjects(allProjects)));
    } catch (refreshError) {
      setLoadError(
        refreshError instanceof Error ? refreshError.message : 'Failed to load projects'
      );
      setProjects([]);
    }
  }, [client]);

  useEffect(() => {
    if (state === 'connected' && client) {
      void refreshProjects();
    }
  }, [state, client, refreshProjects]);

  if (state === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <WelcomeHeader />
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary">Connecting to WebGME over WebSocket…</Typography>
        </Stack>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <WelcomeHeader />
        <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', py: 6, px: 3 }}>
          <Alert severity="error">
            {error ?? 'Could not connect to WebGME. Ensure MongoDB is running and `npm start` launched the API on port 8888.'}
          </Alert>
          <Button variant="contained" onClick={reconnect}>
            Retry connection
          </Button>
        </Stack>
      </Box>
    );
  }

  const takenNames = (projects ?? [])
    .filter((project) => project.owner === 'guest')
    .map((project) => project.name);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <WelcomeHeader />

      <Box sx={{ px: { xs: 2, md: 3 }, py: 3, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void refreshProjects()}
          >
            Refresh projects
          </Button>
        </Stack>

        {loadError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <CreateProjectPanel takenNames={takenNames} onCreated={() => void refreshProjects()} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h6">State machines</Typography>
            <Typography variant="body2" color="text.secondary">
              Existing state machine projects available to the guest user.
            </Typography>
            <ProjectListPanel projects={projects} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
