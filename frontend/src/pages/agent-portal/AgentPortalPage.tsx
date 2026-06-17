import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, Avatar, Button,
  Stack, LinearProgress, Skeleton, Chip,
} from '@mui/material';
import {
  BeachAccess, EventAvailable, Assignment, Download, Add,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { leavesApi } from '../../api/leaves';
import { attendancesApi } from '../../api/attendances';
import StatusChip from '../../components/common/StatusChip';
import { formatDate } from '../../utils/format';
import { useNavigate } from 'react-router-dom';

export default function AgentPortalPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: leaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
    select: (data: unknown[]) =>
      user?.employee?.id
        ? (data as import('../../types').Leave[]).filter((l) => l.employee_id === user.employee!.id)
        : (data as import('../../types').Leave[]),
  });

  const { data: todayAtt } = useQuery({
    queryKey: ['attendances', 'today', 'mine'],
    queryFn: () => attendancesApi.today().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
    select: (data: unknown[]) =>
      user?.employee?.id
        ? (data as import('../../types').Attendance[]).find((a) => a.employee_id === user.employee!.id) ?? null
        : (data as import('../../types').Attendance[])[0] ?? null,
  });

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const pendingLeaves = leaves?.filter((l) => l.status === 'pending').length ?? 0;
  const totalLeaveDays = leaves?.filter((l) => l.status === 'approved').reduce((s, l) => s + l.days_count, 0) ?? 0;
  const remainingDays = (user?.employee?.annual_leave_days ?? 30) - totalLeaveDays;

  const recentLeaves = leaves?.slice(0, 5) ?? [];

  return (
    <Box>
      {/* Welcome banner */}
      <Box sx={{
        p: 3, mb: 3, borderRadius: '16px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)',
        display: 'flex', alignItems: 'center', gap: 2.5,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
          right: -80, top: -80,
        }} />
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
          fontSize: 20, fontWeight: 800,
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          {initials}
        </Avatar>
        <Box sx={{ zIndex: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            {user?.employee?.position?.title ?? 'Espace agent'} · {user?.employee?.department?.name}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', zIndex: 1, display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/leaves')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              borderRadius: '10px', fontSize: 13,
            }}
          >
            Demander un congé
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        {/* Leave balance */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BeachAccess sx={{ fontSize: 18, color: '#2563EB' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                  Solde de congés
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: 52, fontWeight: 800, color: '#2563EB', letterSpacing: '-2px', lineHeight: 1 }}>
                  {remainingDays}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748B' }}>
                  jours restants sur {user?.employee?.annual_leave_days ?? 30}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={((user?.employee?.annual_leave_days ?? 30) - remainingDays) / (user?.employee?.annual_leave_days ?? 30) * 100}
                sx={{
                  height: 8, borderRadius: 4,
                  bgcolor: '#EFF6FF',
                  '& .MuiLinearProgress-bar': { bgcolor: '#2563EB' },
                  mb: 2,
                }}
              />

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>Jours pris</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{totalLeaveDays}j</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>En attente</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>{pendingLeaves} demande(s)</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's attendance */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventAvailable sx={{ fontSize: 18, color: '#059669' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                  Pointage du jour
                </Typography>
              </Box>

              <Box sx={{
                p: 2.5, borderRadius: '12px',
                bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
                textAlign: 'center',
              }}>
                <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 1 }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Typography>
                {todayAtt
                  ? <StatusChip status={todayAtt.status} size="medium" />
                  : <Chip label="Non pointé" size="small" sx={{ bgcolor: '#F1F5F9', color: '#94A3B8', fontWeight: 700 }} />
                }
              </Box>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>Arrivée</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {todayAtt?.check_in ? todayAtt.check_in.slice(0, 5) : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>Départ</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {todayAtt?.check_out ? todayAtt.check_out.slice(0, 5) : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13, color: '#64748B' }}>Temps travaillé</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                    {todayAtt?.worked_minutes
                      ? `${Math.floor(todayAtt.worked_minutes / 60)}h${String(todayAtt.worked_minutes % 60).padStart(2, '0')}`
                      : '—'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 3 }}>
                Actions rapides
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { label: 'Mes bulletins de paie', icon: <Assignment sx={{ fontSize: 18 }} />, color: '#7C3AED', bg: '#F5F3FF', action: () => navigate('/payroll') },
                  { label: 'Télécharger mon contrat', icon: <Download sx={{ fontSize: 18 }} />, color: '#2563EB', bg: '#EFF6FF', action: () => {} },
                  { label: 'Historique des congés', icon: <BeachAccess sx={{ fontSize: 18 }} />, color: '#059669', bg: '#ECFDF5', action: () => navigate('/leaves') },
                ].map((item) => (
                  <Box
                    key={item.label}
                    onClick={item.action}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      p: 1.5, borderRadius: '10px', cursor: 'pointer',
                      border: '1px solid #F1F5F9',
                      '&:hover': { bgcolor: '#F8FAFC', borderColor: '#E2E8F0' },
                      transition: 'all 150ms',
                    }}
                  >
                    <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                      {item.icon}
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent leave requests */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 2.5 }}>
                Mes dernières demandes de congé
              </Typography>
              {loadingLeaves ? (
                <Skeleton height={120} />
              ) : recentLeaves.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>Aucune demande de congé</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {recentLeaves.map((leave) => (
                    <Box key={leave.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      p: 2, borderRadius: '10px', border: '1px solid #F1F5F9',
                      flexWrap: 'wrap',
                    }}>
                      <Box sx={{
                        px: 1.5, py: 0.5, borderRadius: '6px',
                        bgcolor: leave.leaveType?.color ? `${leave.leaveType.color}20` : '#EFF6FF',
                        color: leave.leaveType?.color ?? '#2563EB',
                      }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                          {leave.leaveType?.name ?? 'Congé'}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 13, color: '#64748B', flexGrow: 1 }}>
                        Du {formatDate(leave.start_date)} au {formatDate(leave.end_date)} — {leave.days_count}j
                      </Typography>
                      <StatusChip status={leave.status} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
