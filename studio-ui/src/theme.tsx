'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1f4b7a' },
    secondary: { main: '#3d8fd1' },
    background: { default: '#f3f6fa', paper: '#ffffff' }
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  }
});
