import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardActionArea, Stack, Chip, Avatar } from '@mui/material';
import {
  Fingerprint, BeachAccess, Assignment, Description, CheckCircle, Schedule,
} from '@mui/icons-material';
import { meApi } from '../../api/me';
import { useAuthStore } from '../../store/auth.store';
import InstallPrompt from './InstallPrompt';

function StatCard({ icon, color, label, value, sub, onClick }: {
  icon: React.ReactNode; color: string; label: string; value: string; sub?: string; onClick: () => void;
}) {
  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: `${color}1A`, color, width: 44, height: 44, borderRadius: '12px' }}>{icon}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }} noWrap>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>{sub}</Typography>}
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export default function PortalHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] ?? 'Agent';

  const { data: att } = useQuery({ queryKey: ['me', 'attendances'], queryFn: () => meApi.attendances().then((r) => r.data) });
  const { data: tasks } = useQuery({ queryKey: ['me', 'tasks'], queryFn: () => meApi.tasks().then((r) => r.data) });
  const { data: leaves } = useQuery({ queryKey: ['me', 'leaves'], queryFn: () => meApi.leaves().then((r) => r.data) });

  const today = att?.today;
  const pointageState = today?.check_out ? 'Journée terminée'
    : today?.check_in ? 'Présent (arrivée pointée)'
    : 'Pas encore pointé';

  const todoCount = tasks?.filter((t) => t.status === 'todo' || t.status === 'in_progress').length ?? 0;
  const pendingLeaves = leaves?.filter((l) => l.status === 'pending').length ?? 0;
  const nextLeave = leaves?.find((l) => l.status === 'approved' && new Date(l.start_date) >= new Date());

  return (
    <Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Bonjour {firstName} 👋</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </Typography>

      <InstallPrompt />

      {/* Bandeau pointage */}
      <Card sx={{ borderRadius: '18px', mb: 2.5, background: 'linear-gradient(135deg,#002f59,#014a8f)', color: '#fff' }}>
        <CardActionArea onClick={() => navigate('/portail/pointage')} sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 52, height: 52 }}>
              <Fingerprint sx={{ fontSize: 28 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Pointage du jour</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{pointageState}</Typography>
              {today?.check_in && (
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip size="small" icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#fff !important' }} />}
                    label={`Arrivée ${new Date(today.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11 }} />
                  {today.check_out && (
                    <Chip size="small" icon={<Schedule sx={{ fontSize: '13px !important', color: '#fff !important' }} />}
                      label={`Départ ${new Date(today.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                      sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11 }} />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </CardActionArea>
      </Card>

      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <StatCard icon={<Assignment />} color="#2563EB" label="Mes tâches" value={`${todoCount}`} sub="à faire" onClick={() => navigate('/portail/taches')} />
        </Grid>
        <Grid item xs={6}>
          <StatCard icon={<BeachAccess />} color="#ff7631" label="Demandes congé" value={`${pendingLeaves}`} sub="en attente" onClick={() => navigate('/portail/conges')} />
        </Grid>
        <Grid item xs={6}>
          <StatCard icon={<BeachAccess />} color="#059669" label="Prochain congé"
            value={nextLeave ? new Date(nextLeave.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
            sub={nextLeave ? 'approuvé' : 'aucun'} onClick={() => navigate('/portail/conges')} />
        </Grid>
        <Grid item xs={6}>
          <StatCard icon={<Description />} color="#7C3AED" label="Mes documents" value="Voir" sub="attestations…" onClick={() => navigate('/portail/documents')} />
        </Grid>
      </Grid>
    </Box>
  );
}
