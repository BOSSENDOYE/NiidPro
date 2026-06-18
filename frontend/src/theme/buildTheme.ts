import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

/** Construit le thème MUI en fonction du mode (clair/sombre) et de la couleur principale. */
export function buildTheme(mode: ThemeMode, primary: string): Theme {
  const isDark = mode === 'dark';

  const bgDefault   = isDark ? '#0B1120' : '#F1F5F9';
  const bgPaper     = isDark ? '#111827' : '#FFFFFF';
  const textPrimary = isDark ? '#E5E7EB' : '#0F172A';
  const textSecond  = isDark ? '#94A3B8' : '#64748B';
  const divider     = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const fieldBg     = isDark ? '#1F2937' : '#FFFFFF';
  const tableHeadBg = isDark ? '#1F2937' : '#F8FAFC';
  const hoverBg     = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';
  const darker      = `color-mix(in srgb, ${primary}, #000 22%)`;

  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: '#7C3AED' },
      success: { main: '#059669' },
      warning: { main: '#D97706' },
      error: { main: '#DC2626' },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecond },
      divider,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.5px' },
      h5: { fontWeight: 700, letterSpacing: '-0.3px' },
      h6: { fontWeight: 600, letterSpacing: '-0.1px' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
      caption: { lineHeight: 1.5 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: bgDefault } },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primary} 0%, ${darker} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${darker} 0%, ${darker} 100%)` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
            border: `1px solid ${divider}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600, backgroundColor: tableHeadBg, color: textSecond,
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
              borderBottom: `1px solid ${divider}`, padding: '10px 16px',
            },
          },
        },
      },
      MuiTableCell: { styleOverrides: { root: { borderColor: divider, padding: '12px 16px' } } },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: hoverBg }, '&:last-child td, &:last-child th': { border: 0 } },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8, backgroundColor: fieldBg,
              '& fieldset': { borderColor: divider },
              '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' },
              '&.Mui-focused fieldset': { borderColor: primary, borderWidth: 1.5 },
            },
            '& .MuiInputLabel-root': { color: textSecond },
            '& .MuiInputLabel-root.Mui-focused': { color: primary },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500, borderRadius: 6, fontSize: 12 }, sizeSmall: { height: 22, fontSize: 11 } },
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, fontSize: 13, minHeight: 40 } } },
      MuiTabs: { styleOverrides: { indicator: { height: 2, borderRadius: 1 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: '#0F172A', fontSize: 12, borderRadius: 6, padding: '6px 10px' } },
      },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4 }, bar: { borderRadius: 4 } } },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 700 } } },
    },
  });
}
