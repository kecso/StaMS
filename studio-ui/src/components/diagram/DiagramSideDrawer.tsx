'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Drawer,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';

export const DIAGRAM_DRAWER_WIDTH = 320;

export type DiagramDrawerMode = 'simulate' | 'verify';

type DiagramSideDrawerProps = {
  open: boolean;
  mode: DiagramDrawerMode;
  onModeChange: (mode: DiagramDrawerMode) => void;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Persistent right drawer for diagram tools (simulation, verification). Sits in
 * the diagram flex row so the canvas shrinks and stays centered in the remaining
 * width.
 */
export default function DiagramSideDrawer({
  open,
  mode,
  onModeChange,
  onClose,
  children
}: DiagramSideDrawerProps) {
  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: open ? DIAGRAM_DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
          }),
        '& .MuiDrawer-paper': {
          width: DIAGRAM_DRAWER_WIDTH,
          position: 'relative',
          height: '100%',
          boxSizing: 'border-box',
          borderLeft: 1,
          borderColor: 'divider'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            pr: 0.5
          }}
        >
          <Tabs
            value={mode}
            onChange={(_event, value: DiagramDrawerMode) => onModeChange(value)}
            sx={{ flex: 1, minHeight: 48 }}
          >
            <Tab label="Simulate" value="simulate" sx={{ minHeight: 48 }} />
            <Tab label="Verify" value="verify" sx={{ minHeight: 48 }} />
          </Tabs>
          <IconButton size="small" onClick={onClose} aria-label="Close panel">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Box>
    </Drawer>
  );
}
