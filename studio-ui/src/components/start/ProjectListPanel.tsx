'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography
} from '@mui/material';
import Link from 'next/link';

import type { GmeProjectRecord } from '@/lib/gme-projects';
import { STUDIO_PATH } from '@/lib/workspace';

type ProjectListPanelProps = {
  projects: GmeProjectRecord[] | null;
};

export default function ProjectListPanel({ projects }: ProjectListPanelProps) {
  if (projects === null) {
    return (
      <Box sx={{ mt: 2 }}>
        <LinearProgress />
        <LinearProgress color="secondary" sx={{ mt: 1 }} />
        <LinearProgress sx={{ mt: 1 }} />
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No state machines yet. Create one to get started.
      </Typography>
    );
  }

  return (
    <List disablePadding sx={{ mt: 1 }}>
      {projects.map((project) => (
        <ListItemButton
          key={project._id}
          component={Link}
          href={STUDIO_PATH}
          prefetch={false}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            mb: 1
          }}
        >
          <ListItemText
            primary={project.name}
            secondary={project.info?.kind ?? 'State machine'}
          />
          <Chip
            size="small"
            label={project.info?.kind ?? 'StaMS'}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <ChevronRightIcon color="action" fontSize="small" />
        </ListItemButton>
      ))}
    </List>
  );
}
