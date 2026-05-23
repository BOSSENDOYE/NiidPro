import { useQuery } from '@tanstack/react-query';
import {
  Grid, Card, CardContent, Typography, Box, Avatar, Chip,
  List, ListItem, ListItemText, Divider, LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  People, BeachAccess, Assignment, EventAvailable,
  TrendingUp, PersonAdd, CheckCircle,
} from '@mui/icons-material';
import { dashboardApi } from '../../api/dashboard';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';

const activityIcon: Record<string, typeof PersonAdd> = {
  hire: PersonAdd,
  leave_approved: CheckCircle,
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const statCards = data
    ? [
        {
          label: "Employés actifs", value: data.total_employees, icon: <People />,
          color: '#6366F1', bg: '#EEF2FF',
        },
        {
          label: "Présents aujourd'hui",
          value: `${data.today_attendance.present}/${data.today_attendance.total}`,
          icon: <EventAvailable />, color: '#10B981', bg: '#ECFDF5',
        },
        {
          label: 'Congés en attente', value: data.pending_leaves,
          icon: <BeachAccess />, color: '#F59E0B', bg: '#FFFBEB',
        },
        {
          label: 'Contrats expirants', value: data.expiring_contracts,
          icon: <Assignment />, color: '#EF4444', bg: '#FEF2F2',
        },
      ]
    : [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Bonjour, {user?.name?.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatDate(new Date().toISOString(), 'dddd D MMMM YYYY')} · Vue d'ensemble RH
        </Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} lg={3} key={i}>
                <Card><CardContent><Skeleton height={80} /></CardContent></Card>
              </Grid>
            ))
          : statCards.map((s) => (
              <Grid item xs={12} sm={6} lg={3} key={s.label}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: s.bg, color: s.color, width: 52, height: 52 }}>
                      {s.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700} color={s.color}>
                        {s.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      <Grid container spacing={2}>
        {/* Attendance breakdown */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Pointage du jour
              </Typography>
              {isLoading ? (
                <Skeleton height={160} />
              ) : data ? (
                <Box>
                  {[
                    { label: 'Présents', value: data.today_attendance.present, color: '#10B981' },
                    { label: 'En retard', value: data.today_attendance.late, color: '#F59E0B' },
                    { label: 'En congé', value: data.today_attendance.on_leave, color: '#6366F1' },
                    { label: 'Absents', value: data.today_attendance.absent, color: '#EF4444' },
                  ].map((row) => (
                    <Box key={row.label} mb={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.value}/{data.today_attendance.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.today_attendance.total ? (row.value / data.today_attendance.total) * 100 : 0}
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 4 },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* By department */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Effectifs par direction
              </Typography>
              {isLoading ? (
                <Skeleton height={160} />
              ) : data?.by_department.map((dept) => (
                <Box key={dept.id} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: dept.color, mr: 1.5, flexShrink: 0,
                  }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }} color="text.secondary">
                    {dept.name}
                  </Typography>
                  <Chip label={dept.count} size="small" sx={{ fontWeight: 600 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent activity */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>Activité récente</Typography>
              </Box>
              {isLoading ? (
                <Skeleton height={160} />
              ) : data?.recent_activity.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Aucune activité récente</Typography>
              ) : (
                <List disablePadding>
                  {data?.recent_activity.slice(0, 6).map((item, i) => {
                    const Icon = activityIcon[item.type] ?? TrendingUp;
                    return (
                      <Box key={i}>
                        <ListItem disablePadding alignItems="flex-start" sx={{ py: 0.75 }}>
                          <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: '#EEF2FF', mt: 0.25 }}>
                            <Icon sx={{ fontSize: 14, color: '#6366F1' }} />
                          </Avatar>
                          <ListItemText
                            primary={item.message}
                            secondary={formatDate(item.date)}
                            primaryTypographyProps={{ fontSize: 12, fontWeight: 500 }}
                            secondaryTypographyProps={{ fontSize: 11 }}
                          />
                        </ListItem>
                        {i < (data?.recent_activity.length ?? 0) - 1 && <Divider />}
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
