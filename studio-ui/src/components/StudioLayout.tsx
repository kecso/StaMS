'use client';

import {
  AppBar,
  Box,
  Breadcrumbs,
  Container,
  Link as MuiLink,
  Toolbar,
  Typography
} from '@mui/material';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type Breadcrumb = { label: string; href?: string };

export default function StudioLayout({
  breadcrumbs,
  children
}: {
  breadcrumbs: Breadcrumb[];
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 3 }}>
            StaMS
          </Typography>
          <Breadcrumbs sx={{ color: 'common.white' }}>
            {breadcrumbs.map((crumb, index) =>
              crumb.href ? (
                <MuiLink
                  key={index}
                  component={Link}
                  href={crumb.href}
                  underline="hover"
                  color="inherit"
                >
                  {crumb.label}
                </MuiLink>
              ) : (
                <Typography key={index} color="inherit">
                  {crumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ py: 1, textAlign: 'center', color: 'text.secondary', fontSize: 12 }}>
        State Machine Studio
      </Box>
    </Box>
  );
}
