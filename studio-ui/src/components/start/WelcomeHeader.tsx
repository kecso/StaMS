'use client';

import { Box, Typography } from '@mui/material';

export default function WelcomeHeader() {
  return (
    <Box
      sx={{
        bgcolor: '#1a2332',
        color: 'common.white',
        py: 5,
        px: 3,
        textAlign: 'center'
      }}
    >
      <Typography
        variant="overline"
        sx={{ letterSpacing: 3, color: 'rgba(255,255,255,0.65)' }}
      >
        State Machine Studio
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
        Create and edit state machines
      </Typography>
      <Typography variant="body1" sx={{ mt: 1.5, color: 'rgba(255,255,255,0.78)', maxWidth: 720, mx: 'auto' }}>
        StaMS keeps the WebGME project model underneath, but the studio is focused on one task:
        creating state machines and editing their textual and diagram views.
      </Typography>
    </Box>
  );
}
