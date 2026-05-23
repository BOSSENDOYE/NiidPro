import { useQuery } from '@tanstack/react-query';
import {
  Grid, Card, CardContent, Typography, Box, Avatar,
  List, ListItem, ListItemText, Divider, LinearProgress,
  Skeleton, Chip,
} from '@mui/material';
import {
  People, BeachAccess, Assignment, EventAvailable,
  TrendingUp, PersonAdd, CheckCircle, ArrowUpward,
} from '@mui/icons-material';
import { dashboardApi } from '../../api/dashboard';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const activityIcon: Record<string, typeof PersonAdd> = {
  hire: PersonAdd,
  leave_approved: CheckCircle,
};

const statCards = (data: {
  total_employees: number;
  today_attendance: { present: number; late: number; on_leave: number; absent: number; total: number };
  pending_leaves: number;
  expiring_contracts: number;
}) => [
  {
    label: 'Employés actifs',
    value: data.total_employees,
    icon: <People sx={{ fontSize: 22 }} />,
    color: '#2563EB',
    bg: '#EFF6FF',
    trend: '+2 ce mois',
    trendUp: true,
  },
  {
    label: "Présents aujourd'hui",
    value: `${data.today_attendance.present}/${data.today_attendance.total}`,
    icon: <EventAvailable sx={{ fontSize: 22 }} />,
    color: '#059669',
    bg: '#ECFDF5',
    trend: `${data.today_attendance.late} en retard`,
    trendUp: false,
  },
  {
    label: 'Congés en attente',
    value: data.pending_leaves,
    icon: <BeachAccess sx={{ fontSize: 22 }} />,
    color: '#D97706',
    bg: '#FFFBEB',
    trend: 'À traiter',
    trendUp: false,
  },
  {
    label: 'Contrats expirants',
    value: data.expiring_contracts,
    icon: <Assignment sx={{ fontSize: 22 }} />,
    color: '#DC2626',
    bg: '#FEF2F2',
    trend: '< 30 jours',
    trendUp: false,
  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const cards = data ? statCards(data) : [];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', mb: 0.5 }}>
          {greeting}, {firstName} 👋
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#64748B' }}>
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}Vue d'ensemble RH
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} xl={3} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : cards.map((s) => (
              <Grid item xs={12} sm={6} xl={3} key={s.label}>
                <Card sx={{
                  transition: 'transform 150ms, box-shadow 150ms',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        bgcolor: s.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: s.color,
                      }}>
                        {s.icon}
                      </Box>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.25, borderRadius: '6px',
                        bgcolor: s.trendUp ? '#ECFDF5' : '#F8FAFC',
                      }}>
                        {s.trendUp && <ArrowUpward sx={{ fontSize: 12, color: '#059669' }} />}
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: s.trendUp ? '#059669' : '#64748B' }}>
                          {s.trend}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px', lineHeight: 1 }}>
                      {s.value}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.75 }}>
                      {s.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Bottom row */}
      <Grid container spacing={2.5}>
        {/* Attendance breakdown */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                    Pointage du jour
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94A3B8', mt: 0.25 }}>
                    {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Typography>
                </Box>
                <Chip
                  label="En cours"
                  size="small"
                  sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600, fontSize: 11 }}
                />
              </Box>

              {isLoading ? (
                <Skeleton height={160} />
              ) : data ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[
                    { label: 'Présents', value: data.today_attendance.present, color: '#059669', bg: '#ECFDF5' },
                    { label: 'En retard', value: data.today_attendance.late, color: '#D97706', bg: '#FFFBEB' },
                    { label: 'En congé', value: data.today_attendance.on_leave, color: '#2563EB', bg: '#EFF6FF' },
                    { label: 'Absents', value: data.today_attendance.absent, color: '#DC2626', bg: '#FEF2F2' },
                  ].map((row) => {
                    const pct = data.today_attendance.total
                      ? Math.round((row.value / data.today_attendance.total) * 100)
                      : 0;
                    return (
                      <Box key={row.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color }} />
                            <Typography sx={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                              {row.label}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                              {row.value}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                              ({pct}%)
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6, borderRadius: 3,
                            bgcolor: '#F1F5F9',
                            '& .MuiLinearProgress-bar': { bgcolor: row.color },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* By department */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5 }}>
                Effectifs par direction
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 3 }}>
                Répartition des agents
              </Typography>
              {isLoading ? (
                <Skeleton height={160} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data?.by_department.map((dept) => (
                    <Box key={dept.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        bgcolor: dept.color ? `${dept.color}20` : '#EFF6FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dept.color ?? '#2563EB' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, color: '#475569', flexGrow: 1, fontWeight: 500 }}>
                        {dept.name}
                      </Typography>
                      <Box sx={{
                        px: 1.5, py: 0.25, borderRadius: '6px',
                        bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
                      }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                          {dept.count}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent activity */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Box sx={{
                  width: 30, height: 30, borderRadius: '8px',
                  bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp sx={{ fontSize: 16, color: '#2563EB' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                  Activité récente
                </Typography>
              </Box>

              {isLoading ? (
                <Skeleton height={160} />
              ) : !data?.recent_activity.length ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>
                    Aucune activité récente
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {data.recent_activity.slice(0, 6).map((item, i) => {
                    const Icon = activityIcon[item.type] ?? TrendingUp;
                    return (
                      <Box key={i}>
                        <ListItem disablePadding alignItems="flex-start" sx={{ py: 1 }}>
                          <Avatar sx={{
                            width: 28, height: 28, mr: 1.5,
                            bgcolor: '#EFF6FF', mt: 0.25, flexShrink: 0,
                          }}>
                            <Icon sx={{ fontSize: 13, color: '#2563EB' }} />
                          </Avatar>
                          <ListItemText
                            primary={item.message}
                            secondary={formatDate(item.date)}
                            primaryTypographyProps={{ fontSize: 12, fontWeight: 500, color: '#334155', lineHeight: 1.4 }}
                            secondaryTypographyProps={{ fontSize: 11, color: '#94A3B8', mt: 0.25 }}
                          />
                        </ListItem>
                        {i < data.recent_activity.length - 1 && (
                          <Divider sx={{ borderColor: '#F1F5F9' }} />
                        )}
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
