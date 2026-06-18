import {
  Box, Typography, Stack, Grid, Paper, TextField,
} from '@mui/material';
import { LightMode, DarkMode, Palette, Check } from '@mui/icons-material';
import { useThemeMode } from '../../../theme/ThemeModeContext';
import SectionCard from '../SectionCard';

const PRESETS = [
  { name: 'Bleu', color: '#2563EB' },
  { name: 'Navy ANASER', color: '#002f59' },
  { name: 'Orange', color: '#ff7631' },
  { name: 'Indigo', color: '#4F46E5' },
  { name: 'Violet', color: '#7C3AED' },
  { name: 'Émeraude', color: '#059669' },
  { name: 'Rouge', color: '#DC2626' },
  { name: 'Cyan', color: '#0891B2' },
];

export default function PreferencesTab() {
  const { mode, primary, setMode, setPrimary } = useThemeMode();

  return (
    <Stack spacing={2.5}>
      {/* Apparence */}
      <SectionCard icon={mode === 'dark' ? <DarkMode sx={{ fontSize: 20 }} /> : <LightMode sx={{ fontSize: 20 }} />}
        title="Apparence" subtitle="Choisissez le thème clair ou sombre">
        <Grid container spacing={2}>
          {([
            { key: 'light', label: 'Clair', icon: <LightMode />, bg: '#FFFFFF', fg: '#0F172A', sub: '#F1F5F9' },
            { key: 'dark', label: 'Sombre', icon: <DarkMode />, bg: '#0B1120', fg: '#E5E7EB', sub: '#1F2937' },
          ] as const).map((opt) => {
            const active = mode === opt.key;
            return (
              <Grid item xs={6} sm={4} key={opt.key}>
                <Paper onClick={() => setMode(opt.key)} elevation={0}
                  sx={{
                    cursor: 'pointer', borderRadius: '14px', overflow: 'hidden',
                    border: '2px solid', borderColor: active ? 'primary.main' : 'divider',
                    transition: 'all .2s', position: 'relative',
                    '&:hover': { borderColor: 'primary.light' },
                  }}>
                  <Box sx={{ bgcolor: opt.bg, p: 2, height: 90, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ width: 36, height: 8, borderRadius: 2, bgcolor: primary }} />
                    <Box sx={{ width: '70%', height: 6, borderRadius: 2, bgcolor: opt.sub }} />
                    <Box sx={{ width: '50%', height: 6, borderRadius: 2, bgcolor: opt.sub }} />
                  </Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ px: 1.5, py: 1, bgcolor: 'background.paper' }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box sx={{ color: active ? 'primary.main' : 'text.secondary', display: 'flex' }}>{opt.icon}</Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</Typography>
                    </Stack>
                    {active && <Check sx={{ fontSize: 18, color: 'primary.main' }} />}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </SectionCard>

      {/* Couleur d'accent */}
      <SectionCard icon={<Palette sx={{ fontSize: 20 }} />} title="Couleur du système"
        subtitle="Couleur principale appliquée aux boutons, liens et éléments actifs">
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {PRESETS.map((p) => {
              const active = primary.toLowerCase() === p.color.toLowerCase();
              return (
                <Box key={p.color} onClick={() => setPrimary(p.color)}
                  sx={{
                    width: 52, height: 52, borderRadius: '14px', bgcolor: p.color, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active ? `0 0 0 3px #fff, 0 0 0 5px ${p.color}` : '0 2px 8px rgba(0,0,0,0.12)',
                    transition: 'transform .15s', '&:hover': { transform: 'translateY(-2px)' },
                  }}>
                  {active && <Check sx={{ color: '#fff', fontSize: 22 }} />}
                </Box>
              );
            })}
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>Personnalisée :</Typography>
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)}
              style={{ width: 46, height: 38, border: 'none', borderRadius: 10, background: 'none', cursor: 'pointer' }} />
            <TextField size="small" value={primary} onChange={(e) => setPrimary(e.target.value)} sx={{ width: 130 }} />
          </Stack>

          <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
            Vos préférences d'affichage sont enregistrées sur cet appareil.
          </Typography>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
