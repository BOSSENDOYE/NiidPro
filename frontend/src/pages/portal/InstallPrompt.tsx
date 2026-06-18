import { useEffect, useState } from 'react';
import { Box, Typography, Button, Stack, IconButton } from '@mui/material';
import { InstallMobile, Close } from '@mui/icons-material';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('pwa-install-dismissed') === '1');

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || hidden) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <Box sx={{
      borderRadius: '16px', p: 2, mb: 2.5, position: 'relative',
      background: 'linear-gradient(135deg, #ff7631 0%, #ff5e3a 100%)', color: '#fff',
      boxShadow: '0 10px 26px rgba(255,118,49,0.4)',
    }}>
      <IconButton size="small" onClick={() => { setHidden(true); sessionStorage.setItem('pwa-install-dismissed', '1'); }}
        sx={{ position: 'absolute', top: 6, right: 6, color: 'rgba(255,255,255,0.85)' }}>
        <Close fontSize="small" />
      </IconButton>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <InstallMobile sx={{ fontSize: 34 }} />
        <Box sx={{ flexGrow: 1, pr: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Installer l'application</Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Accédez à votre espace agent depuis l'écran d'accueil.</Typography>
        </Box>
        <Button onClick={install} variant="contained"
          sx={{ bgcolor: '#fff', color: '#ff5e3a', fontWeight: 800, borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#FFF4EE' } }}>
          Installer
        </Button>
      </Stack>
    </Box>
  );
}
