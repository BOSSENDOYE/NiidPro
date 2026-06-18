import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Typography, TextField, Button, Stack, Grid, MenuItem,
  CircularProgress, Alert, Snackbar, InputAdornment,
} from '@mui/material';
import { Save, Email, Send } from '@mui/icons-material';
import { mailSettingsApi, type MailSettingsPayload } from '../../../api/mailSettings';
import SectionCard from '../SectionCard';

const EMPTY: MailSettingsPayload = {
  mailer: 'smtp', host: '', port: 587, username: '', password: '',
  encryption: 'tls', from_address: '', from_name: '',
};

export default function MailingTab() {
  const [form, setForm] = useState<MailSettingsPayload>(EMPTY);
  const [hasPassword, setHasPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [testTo, setTestTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mail-settings'],
    queryFn: () => mailSettingsApi.get().then((r) => r.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        mailer: data.mailer ?? 'smtp', host: data.host ?? '', port: data.port ?? 587,
        username: data.username ?? '', password: '', encryption: data.encryption ?? 'tls',
        from_address: data.from_address ?? '', from_name: data.from_name ?? '',
      });
      setHasPassword(data.has_password);
    }
  }, [data]);

  const set = (k: keyof MailSettingsPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () => mailSettingsApi.update(form).then((r) => r.data),
    onSuccess: () => { setToast('Paramètres de messagerie enregistrés'); setError(null); },
    onError: () => setError("Échec de l'enregistrement."),
  });

  const testMut = useMutation({
    mutationFn: () => mailSettingsApi.test(testTo).then((r) => r.data),
    onSuccess: (r) => { setToast(r.message); setError(null); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message ?? "Échec de l'envoi du test."),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Stack spacing={2.5}>
      <SectionCard icon={<Email sx={{ fontSize: 20 }} />} title="Paramètres de messagerie (SMTP)"
        subtitle="Serveur d'envoi des emails de la plateforme">
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField label="Serveur SMTP (host)" fullWidth size="small" value={form.host ?? ''} onChange={set('host')}
              placeholder="smtp.gmail.com" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Port" type="number" fullWidth size="small" value={form.port ?? ''} onChange={set('port')} placeholder="587" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Nom d'utilisateur" fullWidth size="small" value={form.username ?? ''} onChange={set('username')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Mot de passe" type="password" fullWidth size="small" value={form.password ?? ''} onChange={set('password')}
              placeholder={hasPassword ? '•••••••• (inchangé)' : ''}
              helperText={hasPassword ? 'Laissez vide pour conserver le mot de passe actuel' : undefined} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Chiffrement" select fullWidth size="small" value={form.encryption ?? 'tls'} onChange={set('encryption')}>
              <MenuItem value="tls">TLS</MenuItem>
              <MenuItem value="ssl">SSL</MenuItem>
              <MenuItem value="none">Aucun</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email expéditeur" fullWidth size="small" value={form.from_address ?? ''} onChange={set('from_address')}
              placeholder="no-reply@entreprise.sn" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Nom de l'expéditeur" fullWidth size="small" value={form.from_name ?? ''} onChange={set('from_name')} />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="contained" startIcon={saveMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, px: 3 }}>
            Enregistrer
          </Button>
        </Box>
      </SectionCard>

      <SectionCard icon={<Send sx={{ fontSize: 20 }} />} title="Tester la configuration"
        subtitle="Envoyez un email de test pour vérifier vos paramètres">
        <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <TextField label="Adresse de destination" type="email" size="small" value={testTo} onChange={(e) => setTestTo(e.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
          <Button variant="outlined" startIcon={testMut.isPending ? <CircularProgress size={16} /> : <Send />}
            onClick={() => testMut.mutate()} disabled={testMut.isPending || !testTo}
            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, py: '7px' }}>
            Envoyer un test
          </Button>
        </Stack>
      </SectionCard>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ borderRadius: '10px' }}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
