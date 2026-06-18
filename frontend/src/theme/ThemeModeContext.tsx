import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme, type ThemeMode } from './buildTheme';

const DEFAULT_PRIMARY = '#2563EB';

interface ThemeModeContextValue {
  mode: ThemeMode;
  primary: string;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
  setPrimary: (c: string) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light', primary: DEFAULT_PRIMARY,
  setMode: () => {}, toggleMode: () => {}, setPrimary: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem('theme-mode') as ThemeMode) || 'light',
  );
  const [primary, setPrimaryState] = useState<string>(
    () => localStorage.getItem('theme-primary') || DEFAULT_PRIMARY,
  );

  useEffect(() => { localStorage.setItem('theme-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('theme-primary', primary); }, [primary]);

  const theme = useMemo(() => buildTheme(mode, primary), [mode, primary]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode, primary,
    setMode: setModeState,
    toggleMode: () => setModeState((m) => (m === 'light' ? 'dark' : 'light')),
    setPrimary: setPrimaryState,
  }), [mode, primary]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
