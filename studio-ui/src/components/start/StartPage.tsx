'use client';

import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HistoryIcon from '@mui/icons-material/History';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import WelcomeHeader from '@/components/start/WelcomeHeader';
import { useGmeClient } from '@/contexts/GmeClientContext';
import { createProjectFromSeed, listProjects } from '@/lib/gme-projects';
import { WORKSPACE_SEED } from '@/lib/project-seeds';
import { saveDoc } from '@/lib/sm-document';
import {
  STUDIO_PATH,
  clearWorkspace,
  getWorkspaceDocName,
  getWorkspaceProjectId,
  hasWorkspace,
  setWorkspace
} from '@/lib/workspace';

function docNameFromFile(filename: string): string {
  const base = filename.replace(/\.sm$/i, '').trim();
  const safe = base.replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '');
  return safe || WORKSPACE_SEED.defaultName;
}

function workspaceProjectName(): string {
  const time = Date.now().toString(36);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `stams_${time}_${suffix}`;
}

export default function StartPage() {
  const { client, state, error, reconnect } = useGmeClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [latestDocName, setLatestDocName] = useState<string | null>(null);

  useEffect(() => {
    if (!hasWorkspace()) {
      setLatestDocName(null);
      return;
    }

    // The stored project id lives in sessionStorage but the server is ephemeral
    // (fully in-memory backend). After a server restart, cached project ids are stale,
    // so verify the project still exists before offering "Return".
    if (state !== 'connected' || !client) {
      setLatestDocName(getWorkspaceDocName());
      return;
    }

    const storedId = getWorkspaceProjectId();
    let cancelled = false;
    void listProjects(client)
      .then((projects) => {
        if (cancelled) {
          return;
        }
        const stillExists = projects.some((project) => project._id === storedId);
        if (stillExists) {
          setLatestDocName(getWorkspaceDocName());
        } else {
          clearWorkspace();
          setLatestDocName(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLatestDocName(getWorkspaceDocName());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, state]);

  const openStudio = useCallback(
    (projectId: string, docName: string, text: string) => {
      setWorkspace(projectId, docName);
      saveDoc(text);
      router.push(STUDIO_PATH);
    },
    [router]
  );

  const handleNew = useCallback(async () => {
    if (!client) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const projectId = await createProjectFromSeed(
        client,
        workspaceProjectName(),
        WORKSPACE_SEED.seedName
      );
      openStudio(projectId, WORKSPACE_SEED.defaultName, '');
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Could not start workspace');
    } finally {
      setBusy(false);
    }
  }, [client, openStudio]);

  const handleOpenFile = useCallback(
    async (file: File) => {
      if (!client) {
        return;
      }
      setBusy(true);
      setActionError(null);
      try {
        const text = await file.text();
        const docName = docNameFromFile(file.name);
        const projectId = await createProjectFromSeed(
          client,
          workspaceProjectName(),
          WORKSPACE_SEED.seedName
        );
        openStudio(projectId, docName, text);
      } catch (openError) {
        setActionError(openError instanceof Error ? openError.message : 'Could not open file');
      } finally {
        setBusy(false);
      }
    },
    [client, openStudio]
  );

  if (state === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <WelcomeHeader />
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary">Connecting…</Typography>
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
            {error ?? 'Could not connect. Ensure `npm start` is running on port 8888.'}
          </Alert>
          <Button variant="contained" onClick={reconnect}>
            Retry connection
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <WelcomeHeader />

      <Stack spacing={3} sx={{ maxWidth: 480, mx: 'auto', py: 6, px: 3 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          One in-memory workspace per session. Save or share your work as a `.sm` file.
        </Typography>

        {actionError && <Alert severity="error">{actionError}</Alert>}

        {latestDocName && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<HistoryIcon />}
            disabled={busy}
            onClick={() => router.push(STUDIO_PATH)}
          >
            Return to {latestDocName}.sm
          </Button>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<NoteAddIcon />}
          disabled={busy}
          onClick={() => void handleNew()}
        >
          {busy ? 'Opening…' : 'New state machine'}
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<FolderOpenIcon />}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          Open `.sm` file…
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sm,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void handleOpenFile(file);
            }
          }}
        />
      </Stack>
    </Box>
  );
}
