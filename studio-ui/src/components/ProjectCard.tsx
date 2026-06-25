'use client';

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CodeIcon from '@mui/icons-material/Code';
import HubIcon from '@mui/icons-material/Hub';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid2 as Grid,
  Typography
} from '@mui/material';
import Link from 'next/link';

import type { WebGmeProject } from '@/lib/webgme-client';

const toolCards = [
  {
    title: 'DSL Editor',
    description: 'Monaco + Langium LSP for .sm state machine text',
    icon: <CodeIcon fontSize="large" color="primary" />,
    hrefSuffix: ''
  },
  {
    title: 'State Diagram',
    description: 'Sprotty + ELK auto-layout (read-only view)',
    icon: <HubIcon fontSize="large" color="secondary" />,
    hrefSuffix: '?panel=diagram'
  },
  {
    title: 'Model Tree',
    description: 'Browse File, Machine, State, and Transition nodes',
    icon: <AccountTreeIcon fontSize="large" color="action" />,
    hrefSuffix: '?panel=tree'
  }
];

export default function ProjectCard({ project }: { project: WebGmeProject }) {
  const encoded = encodeURIComponent(project._id);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {project.owner}
        </Typography>
        <Typography variant="h6" gutterBottom>
          {project.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {project.info?.kind || 'project'}
        </Typography>
        <Grid container spacing={1}>
          {toolCards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined">
                <CardActionArea component={Link} href={`/studio/${encoded}${card.hrefSuffix}`}>
                  <CardContent sx={{ minHeight: 120 }}>
                    <Box sx={{ mb: 1 }}>{card.icon}</Box>
                    <Typography variant="subtitle2">{card.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
