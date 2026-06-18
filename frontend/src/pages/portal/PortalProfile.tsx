import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, Stack, Avatar, Divider, CircularProgress, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Snackbar, Alert, IconButton,
} from '@mui/material';
import {
  Email, Phone, Business, Work, CalendarMonth, Description, Place, Edit,
  Cake, Public, Badge as BadgeIcon, AccountBalance, ChevronRight, WorkspacePremium, Close,
} from '@mui/icons-material';
import { meApi, type ProfileUpdate } from '../../api/me';

const NAVY = '#002f59';
const ORANGE = '#ff7631';

type Emp = Record<string, any>;

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.1 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: `${NAVY}0D`, color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>{value || '—'}</Typography>
      </Box>
    </Stack>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ borderRadius: '18px', p: 2.25, mb: 2, boxShadow: '0 4px 20px rgba(0,47,89,0.06)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</Typography>
        {action}
      </Stack>
      {children}
    </Card>
  );
}

function seniority(hire?: string): string {
  if (!hire) return '—';
  const y = (Date.now() - new Date(hire).getTime()) / (1000 * 3600 * 24 * 365.25);
  if (y < 1) return `${Math.round(y * 12)} mois`;
  return `${Math.floor(y)} an${Math.floor(y) > 1 ? 's' : ''}`;
}

export default function PortalProfile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [form, setForm] = useState<ProfileUpdate>({});
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['me', 'profile'], queryFn: () => meApi.profile().then((r) => r.data) });
  const e = (data ?? {}) as Emp;

  useEffect(() => {
    if (data) {
      setForm({
        personal_email: e.personal_email ?? '', phone_personal: e.phone_personal ?? '',
        phone_professional: e.phone_professional ?? '', address: e.address ?? '',
        city: e.city ?? '', postal_code: e.postal_code ?? '', country: e.country ?? '',
        birth_place: e.birth_place ?? '', nationality: e.nationality ?? '',
        bank_account: e.bank_account ?? '', national_id: e.national_id ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => meApi.updateProfile(form),
    onMutate: () => setError(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me', 'profile'] }); setEditOpen(false); setToast(true); },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat()[0] : (err.response?.data?.message ?? 'Échec de la mise à jour.'));
    },
  });

  const set = (k: keyof ProfileUpdate) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  if (isLoading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  const fullName = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();
  const initials = `${e.first_name?.[0] ?? ''}${e.last_name?.[0] ?? ''}`.toUpperCase();
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  return (
    <Box>
      {/* ── HERO ── */}
      <Box sx={{
        position: 'relative', borderRadius: '24px', overflow: 'hidden', mb: 2.5,
        background: `linear-gradient(140deg, ${NAVY} 0%, #013b73 70%, #014a8f 100%)`,
        p: 3, pt: 3.5, color: '#fff', textAlign: 'center',
        boxShadow: '0 16px 40px rgba(0,47,89,0.3)',
      }}>
        <Box sx={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', top: -80, right: -50, border: '1px solid rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', bottom: -60, left: -30, background: `radial-gradient(circle, ${ORANGE}40 0%, transparent 70%)` }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'inline-block', borderRadius: '50%', p: '3px', background: `linear-gradient(135deg, ${ORANGE}, #ffb088)`, mb: 1.5 }}>
            <Avatar src={e.photo_url ?? undefined}
              sx={{ width: 92, height: 92, fontSize: 32, fontWeight: 800, bgcolor: '#fff', color: NAVY, border: '3px solid #fff' }}>
              {initials}
            </Avatar>
          </Box>
          <Typography sx={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.4px' }}>{fullName}</Typography>
          <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>{e.position?.title ?? '—'}</Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" icon={<BadgeIcon sx={{ fontSize: '14px !important', color: '#fff !important' }} />} label={e.employee_number}
              sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700, backdropFilter: 'blur(4px)' }} />
            <Chip size="small" label={e.status === 'active' ? 'En activité' : e.status}
              sx={{ bgcolor: ORANGE, color: '#fff', fontWeight: 700 }} />
          </Stack>
        </Box>
      </Box>

      {/* ── Stats rapides ── */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { icon: <WorkspacePremium />, label: 'Ancienneté', value: seniority(e.hire_date), color: '#2563EB' },
          { icon: <CalendarMonth />, label: 'Congés/an', value: `${e.annual_leave_days ?? 0} j`, color: ORANGE },
          { icon: <Business />, label: 'Service', value: e.department?.code ?? '—', color: '#059669' },
        ].map((s) => (
          <Grid item xs={4} key={s.label}>
            <Card sx={{ borderRadius: '16px', p: 1.5, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,47,89,0.05)' }}>
              <Avatar variant="rounded" sx={{ bgcolor: `${s.color}1A`, color: s.color, width: 38, height: 38, mx: 'auto', mb: 0.75, borderRadius: '11px' }}>{s.icon}</Avatar>
              <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bouton modifier */}
      <Button fullWidth variant="contained" startIcon={<Edit />} onClick={() => { setError(null); setEditOpen(true); }}
        sx={{ borderRadius: '14px', fontWeight: 800, py: 1.3, mb: 2.5, bgcolor: ORANGE, boxShadow: `0 8px 22px ${ORANGE}55`, '&:hover': { bgcolor: '#ff5e3a' } }}>
        Modifier mes informations
      </Button>

      {/* ── Coordonnées (modifiable) ── */}
      <Section title="Coordonnées">
        <InfoRow icon={<Email sx={{ fontSize: 18 }} />} label="Email professionnel" value={e.professional_email} />
        <Divider />
        <InfoRow icon={<Email sx={{ fontSize: 18 }} />} label="Email personnel" value={e.personal_email} />
        <Divider />
        <InfoRow icon={<Phone sx={{ fontSize: 18 }} />} label="Téléphone professionnel" value={e.phone_professional} />
        <Divider />
        <InfoRow icon={<Phone sx={{ fontSize: 18 }} />} label="Téléphone personnel" value={e.phone_personal} />
        <Divider />
        <InfoRow icon={<Place sx={{ fontSize: 18 }} />} label="Adresse"
          value={[e.address, [e.postal_code, e.city].filter(Boolean).join(' '), e.country].filter(Boolean).join(', ')} />
      </Section>

      {/* ── État civil ── */}
      <Section title="État civil">
        <InfoRow icon={<Cake sx={{ fontSize: 18 }} />} label="Date de naissance" value={fmtDate(e.birth_date)} />
        <Divider />
        <InfoRow icon={<Place sx={{ fontSize: 18 }} />} label="Lieu de naissance" value={e.birth_place} />
        <Divider />
        <InfoRow icon={<Public sx={{ fontSize: 18 }} />} label="Nationalité" value={e.nationality} />
        <Divider />
        <InfoRow icon={<BadgeIcon sx={{ fontSize: 18 }} />} label="Pièce d'identité" value={e.national_id} />
      </Section>

      {/* ── Affectation (lecture seule) ── */}
      <Section title="Affectation">
        <InfoRow icon={<Business sx={{ fontSize: 18 }} />} label="Direction / Service" value={e.department?.name} />
        <Divider />
        <InfoRow icon={<Work sx={{ fontSize: 18 }} />} label="Poste" value={e.position?.title} />
        <Divider />
        <InfoRow icon={<CalendarMonth sx={{ fontSize: 18 }} />} label="Date d'embauche" value={fmtDate(e.hire_date)} />
        <Divider />
        <InfoRow icon={<AccountBalance sx={{ fontSize: 18 }} />} label="Coordonnées bancaires" value={e.bank_account} />
      </Section>

      {/* Lien documents */}
      <Card sx={{ borderRadius: '16px', mb: 1 }}>
        <Button fullWidth onClick={() => navigate('/portail/documents')}
          sx={{ justifyContent: 'space-between', textTransform: 'none', p: 2, color: 'text.primary' }} endIcon={<ChevronRight />}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar variant="rounded" sx={{ bgcolor: '#F3E8FF', color: '#7C3AED', width: 34, height: 34, borderRadius: '10px' }}><Description sx={{ fontSize: 18 }} /></Avatar>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Mes documents</Typography>
          </Stack>
        </Button>
      </Card>

      {/* ── Dialog édition ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          Modifier mes informations
          <IconButton size="small" onClick={() => setEditOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Coordonnées</Typography>
            <Grid container spacing={1.75}>
              <Grid item xs={12} sm={6}><TextField label="Email personnel" type="email" fullWidth size="small" value={form.personal_email ?? ''} onChange={set('personal_email')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Tél. professionnel" fullWidth size="small" value={form.phone_professional ?? ''} onChange={set('phone_professional')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Tél. personnel" fullWidth size="small" value={form.phone_personal ?? ''} onChange={set('phone_personal')} /></Grid>
              <Grid item xs={12}><TextField label="Adresse" fullWidth size="small" value={form.address ?? ''} onChange={set('address')} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Code postal" fullWidth size="small" value={form.postal_code ?? ''} onChange={set('postal_code')} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Ville" fullWidth size="small" value={form.city ?? ''} onChange={set('city')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Pays" fullWidth size="small" value={form.country ?? ''} onChange={set('country')} /></Grid>
            </Grid>

            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', pt: 1 }}>État civil & banque</Typography>
            <Grid container spacing={1.75}>
              <Grid item xs={12} sm={6}><TextField label="Lieu de naissance" fullWidth size="small" value={form.birth_place ?? ''} onChange={set('birth_place')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Nationalité" fullWidth size="small" value={form.nationality ?? ''} onChange={set('nationality')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Pièce d'identité" fullWidth size="small" value={form.national_id ?? ''} onChange={set('national_id')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Coordonnées bancaires" fullWidth size="small" value={form.bank_account ?? ''} onChange={set('bank_account')} /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Edit />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '11px', bgcolor: NAVY, '&:hover': { bgcolor: '#013b73' } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast} autoHideDuration={3000} onClose={() => setToast(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ borderRadius: '10px' }}>Informations mises à jour</Alert>
      </Snackbar>
    </Box>
  );
}
