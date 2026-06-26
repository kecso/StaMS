'use client';

import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useGmeClient } from '@/contexts/GmeClientContext';
import { createProjectFromSeed } from '@/lib/gme-projects';
import { STATE_MACHINE_SEED, projectStudioPath } from '@/lib/project-seeds';

type CreateProjectPanelProps = {
  takenNames: string[];
  onCreated: () => void;
};

export default function CreateProjectPanel({ takenNames, onCreated }: CreateProjectPanelProps) {
  const { client } = useGmeClient();
  const router = useRouter();
  const [name, setName] = useState(STATE_MACHINE_SEED.defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!client) {
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
      const projectId = await createProjectFromSeed(client, trimmed, STATE_MACHINE_SEED.seedName);
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
        Create a state machine
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Start from the StaMS base seed and open the editor immediately.
      </Typography>

      <Stack spacing={2} sx={{ mt: 3, maxWidth: 440 }}>
        <TextField
          label="State machine name"
          size="small"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          disabled={busy}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Box>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={busy}>
            {busy ? 'Creating...' : 'Create state machine'}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Uses file seed: {STATE_MACHINE_SEED.seedName}
        </Typography>
      </Stack>
    </Box>
  );
}
