'use client';

import MenuBookIcon from '@mui/icons-material/MenuBook';
import {
  AppBar,
  Box,
  Breadcrumbs,
  Button,
  Link as MuiLink,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import type { SmExample } from '@/lib/sm-examples';

export type Breadcrumb = { label: string; href?: string };

export type StudioViewTab = 'text' | 'diagram';

export default function StudioLayout({
  breadcrumbs,
  viewTab,
  onViewTabChange,
  examples,
  onAppendExample,
  onClearDocument,
  statusBar,
  children
}: {
  breadcrumbs: Breadcrumb[];
  viewTab: StudioViewTab;
  onViewTabChange: (tab: StudioViewTab) => void;
  examples: SmExample[];
  onAppendExample: (example: SmExample) => void;
  onClearDocument: () => void;
  statusBar?: ReactNode;
  children: ReactNode;
}) {
  const [examplesAnchor, setExamplesAnchor] = useState<null | HTMLElement>(null);
  const examplesOpen = Boolean(examplesAnchor);

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
    >
      <AppBar position="static" elevation={0} sx={{ flexShrink: 0, bgcolor: 'primary.main' }}>
        <Toolbar variant="dense" sx={{ gap: 1, minHeight: 48 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mr: 1, flexShrink: 0 }}>
            StaMS
          </Typography>
          <Breadcrumbs sx={{ color: 'common.white', flexShrink: 0 }}>
            {breadcrumbs.map((crumb, index) =>
              crumb.href ? (
                <MuiLink
                  key={index}
                  component={Link}
                  href={crumb.href}
                  prefetch={false}
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
          <Box sx={{ flex: 1 }} />
          <Button
            color="inherit"
            size="small"
            startIcon={<MenuBookIcon />}
            onClick={(event) => setExamplesAnchor(event.currentTarget)}
          >
            Examples
          </Button>
          <Button color="inherit" size="small" onClick={onClearDocument}>
            Clear
          </Button>
        </Toolbar>
        <Box
          sx={{
            borderTop: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            display: 'flex',
            justifyContent: 'center',
            bgcolor: 'primary.dark'
          }}
        >
          <Tabs
            value={viewTab}
            onChange={(_, value: StudioViewTab) => onViewTabChange(value)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ minHeight: 40 }}
          >
            <Tab label="Text (.sm)" value="text" sx={{ minHeight: 40, py: 0.5 }} />
            <Tab label="Diagram" value="diagram" sx={{ minHeight: 40, py: 0.5 }} />
          </Tabs>
        </Box>
      </AppBar>

      {statusBar && (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 3 },
            py: 0.75,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          {statusBar}
        </Box>
      )}

      <Menu
        anchorEl={examplesAnchor}
        open={examplesOpen}
        onClose={() => setExamplesAnchor(null)}
        slotProps={{ paper: { sx: { maxWidth: 360 } } }}
      >
        {examples.map((example) => (
          <MenuItem
            key={example.id}
            onClick={() => {
              onAppendExample(example);
              setExamplesAnchor(null);
            }}
          >
            <ListItemText
              primary={example.title}
              secondary={example.description}
              secondaryTypographyProps={{ sx: { whiteSpace: 'normal' } }}
            />
          </MenuItem>
        ))}
      </Menu>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, sm: 3 },
          py: 1.5
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
