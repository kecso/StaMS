'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid2 as Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useGmeClient } from '@/contexts/GmeClientContext';
import { createProjectFromSeed } from '@/lib/gme-projects';
import { PROJECT_SEED_TEMPLATES, projectStudioPath, type ProjectSeedTemplate } from '@/lib/project-seeds';

type CreateProjectPanelProps = {
  takenNames: string[];
  onCreated: () => void;
};

export default function CreateProjectPanel({ takenNames, onCreated }: CreateProjectPanelProps) {
  const { client } = useGmeClient();
  const router = useRouter();
  const [selected, setSelected] = useState<ProjectSeedTemplate | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSeedDialog(seed: ProjectSeedTemplate) {
    setSelected(seed);
    setName(seed.defaultName);
    setError(null);
  }

  async function handleCreate() {
    if (!client || !selected) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name is required.');
      return;
    }
    if (takenNames.includes(trimmed)) {
      setError('A project with this name already exists.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const projectId = await createProjectFromSeed(client, trimmed, selected.seedName);
      onCreated();
      router.push(projectStudioPath({ _id: projectId, name: trimmed, owner: 'guest' }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create project');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Create a new project
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose a seed template. Project creation uses the WebGME client (WebSocket), not REST.
      </Typography>

      <Grid container spacing={2}>
        {PROJECT_SEED_TEMPLATES.map((seed) => (
          <Grid key={seed.id} size={{ xs: 12, sm: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderTop: 4,
                borderTopColor: seed.accent
              }}
            >
              <CardActionArea onClick={() => openSeedDialog(seed)} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {seed.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {seed.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Seed: {seed.seedName}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selected && (
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Typography variant="subtitle2">
            Creating from <strong>{selected.title}</strong>
          </Typography>
          <TextField
            label="Project name"
            size="small"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            sx={{ maxWidth: 360 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Button variant="contained" onClick={() => void handleCreate()} disabled={busy}>
              {busy ? 'Creating…' : 'Create project'}
            </Button>
            <Button sx={{ ml: 1 }} onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
