'use client';

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import ProjectCard from '@/components/ProjectCard';
import StudioLayout from '@/components/StudioLayout';
import { createProject, listProjects, type WebGmeProject } from '@/lib/webgme-client';

export default function HomePage() {
  const [projects, setProjects] = useState<WebGmeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!newName.trim()) {
      return;
    }
    setError(null);
    try {
      await createProject(newName.trim());
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }

  return (
    <StudioLayout breadcrumbs={[{ label: 'Projects' }]}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            State Machine Studio
          </Typography>
          <Typography color="text.secondary">
            Select a WebGME project or create one from the StateMachine seed. The studio UI replaces
            the stock WebGME front-end while keeping the same server, plugins, and visualizer architecture.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="New project name"
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => void handleCreate()}>
            Create project
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : projects.length === 0 ? (
          <Alert severity="info">
            No projects yet. Start the WebGME server (`npm start`), ensure MongoDB is running, then create a
            project or import the StateMachine seed.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid key={project._id} size={{ xs: 12, lg: 6 }}>
                <ProjectCard project={project} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </StudioLayout>
  );
}
