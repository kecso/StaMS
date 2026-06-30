'use client';

import { Paper, Stack, Typography } from '@mui/material';

import type { SmDiagramDetail } from '@/lib/sm-diagram-details';

type DiagramHoverCardProps = {
  detail: SmDiagramDetail;
  x: number;
  y: number;
};

const EMPHASIS_COLOR: Record<NonNullable<SmDiagramDetail['lines'][number]['emphasis']>, string> = {
  event: '#90caf9',
  guard: '#ffb74d',
  action: '#81c784',
  behavior: '#ce93d8'
};

export default function DiagramHoverCard({ detail, x, y }: DiagramHoverCardProps) {
  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        left: x + 14,
        top: y + 14,
        zIndex: 1400,
        pointerEvents: 'none',
        px: 1.5,
        py: 1,
        maxWidth: 280,
        bgcolor: 'rgba(20, 28, 38, 0.94)',
        color: 'common.white',
        border: '1px solid rgba(255,255,255,0.12)'
      }}
    >
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
        {detail.kind}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {detail.title}
      </Typography>
      <Stack spacing={0.35}>
        {detail.lines.map((line) => (
          <Typography
            key={`${line.label}-${line.value}`}
            variant="caption"
            component="div"
            sx={{
              color: line.emphasis ? EMPHASIS_COLOR[line.emphasis] : 'rgba(255,255,255,0.82)'
            }}
          >
            <BoxLabel>{line.label}</BoxLabel>
            {line.value}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}

function BoxLabel({ children }: { children: string }) {
  return (
    <Typography
      component="span"
      variant="caption"
      sx={{ color: 'rgba(255,255,255,0.55)', mr: 0.75 }}
    >
      {children}:
    </Typography>
  );
}
