import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Box, Card, CardContent, Chip, Divider, Grid, LinearProgress,
  List, ListItem, ListItemText, Skeleton, Stack, Typography,
} from '@mui/material';
import {
  AssignmentLate, BeachAccess, Business, CalendarMonth, CheckCircle,
  EventAvailable, Groups, PersonAdd, QueryStats, Schedule, TrendingUp,
  WarningAmber, WorkHistory,
} from '@mui/icons-material';
import type { ReactNode } from 'react';
import { dashboardApi } from '../../api/dashboard';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import type { DashboardStats } from '../../types';

const activityIcon: Record<string, typeof PersonAdd> = {
  hire: PersonAdd,
  leave_approved: CheckCircle,
};

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function kpiData(data: DashboardStats) {
  const total = data.today_attendance.total;
  const present = data.today_attendance.present;
  const late = data.today_attendance.late;
  const absent = data.today_attendance.absent;
  const onLeave = data.today_attendance.on_leave;
  const attendanceRate = percent(present + late, total);
  const absenceRate = percent(absent + onLeave, total);
  const attentionItems = data.pending_leaves + data.pending_justifications + data.expiring_contracts;

  return [
    {
      label: 'Effectif actif',
      value: data.total_employees,
      helper: `${data.by_department.length} directions suivies`,
      color: '#2563EB',
      bg: '#EFF6FF',
      icon: <Groups />,
    },
    {
      label: 'Taux de presence',
      value: `${attendanceRate}%`,
      helper: `${present + late}/${total} agents pointes`,
      color: '#059669',
      bg: '#ECFDF5',
      icon: <EventAvailable />,
    },
    {
      label: 'Absence globale',
      value: `${absenceRate}%`,
      helper: `${absent} absent(s), ${onLeave} en conge`,
      color: '#DC2626',
      bg: '#FEF2F2',
      icon: <WarningAmber />,
    },
    {
      label: 'Conges a traiter',
      value: data.pending_leaves,
      helper: 'Demandes en attente',
      color: '#D97706',
      bg: '#FFFBEB',
      icon: <BeachAccess />,
    },
    {
      label: 'Justifications',
      value: data.pending_justifications,
      helper: 'Pieces ou motifs a verifier',
      color: '#7C3AED',
      bg: '#F5F3FF',
      icon: <AssignmentLate />,
    },
    {
      label: 'Contrats sensibles',
      value: data.expiring_contracts,
      helper: 'Expiration sous 30 jours',
      color: '#EA580C',
      bg: '#FFF7ED',
      icon: <WorkHistory />,
    },
    {
      label: 'Charge RH immediate',
      value: attentionItems,
      helper: 'Actions prioritaires',
      color: '#0F766E',
      bg: '#F0FDFA',
      icon: <QueryStats />,
    },
    {
      label: 'Retards du jour',
      value: late,
      helper: `${percent(late, total)}% de l'effectif`,
      color: '#BE123C',
      bg: '#FFF1F2',
      icon: <Schedule />,
    },
  ];
}

function KpiCard({
  label, value, helper, icon, color, bg,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  icon: ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: '14px',
        borderColor: '#E8EDF2',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 34px rgba(15,23,42,0.10)' },
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: '10px', bgcolor: bg, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '& svg': { fontSize: 21 },
            }}
          >
            {icon}
          </Box>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, mt: 0.75 }} />
        </Stack>
        <Typography sx={{ fontSize: 28, fontWeight: 850, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.6px' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: '#475569', fontWeight: 700, mt: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: '#94A3B8', mt: 0.5, lineHeight: 1.35 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon apres-midi' : 'Bonsoir';
  const firstName = user?.name?.split(' ')[0] ?? '';
  const total = data?.today_attendance.total ?? 0;
  const presenceRate = data ? percent(data.today_attendance.present + data.today_attendance.late, total) : 0;
  const attentionItems = data
    ? data.pending_leaves + data.pending_justifications + data.expiring_contracts
    : 0;
  const topDepartments = data?.by_department
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) ?? [];
  const maxDeptCount = Math.max(...topDepartments.map((d) => d.count), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box
        sx={{
          borderRadius: '16px',
          p: { xs: 2.25, md: 3 },
          color: '#F8FAFC',
          background: 'linear-gradient(135deg, #0F172A 0%, #164E63 52%, #0F766E 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 18px 44px rgba(15,23,42,0.18)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute', inset: 0,
            background:
              'radial-gradient(ellipse at 78% 30%, rgba(45,212,191,0.24) 0%, transparent 42%)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative', display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 850, letterSpacing: '-0.6px', lineHeight: 1.15 }}>
              {greeting}, {firstName}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#BAE6FD', mt: 0.75, maxWidth: 620 }}>
              Pilotage RH en temps reel: presence, alertes administratives, contrats et repartition des effectifs.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'row', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
            {[
              { label: 'Presence', value: `${presenceRate}%`, color: '#34D399' },
              { label: 'A traiter', value: attentionItems, color: '#FBBF24' },
              { label: 'Actifs', value: data?.total_employees ?? '-', color: '#93C5FD' },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  minWidth: 118, px: 1.75, py: 1.25, borderRadius: '12px',
                  bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Typography sx={{ fontSize: 22, fontWeight: 850, lineHeight: 1, color: item.color }}>
                  {item.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#CBD5E1', mt: 0.65 }}>{item.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card sx={{ borderRadius: '14px' }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Skeleton variant="rounded" width={42} height={42} sx={{ mb: 2 }} />
                    <Skeleton width="48%" height={34} />
                    <Skeleton width="80%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : data && kpiData(data).map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.label}>
                <KpiCard {...item} />
              </Grid>
            ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%', borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.25 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                    Pointage du jour
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                    Lecture operationnelle des presences
                  </Typography>
                </Box>
                <Chip label="Live" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 800 }} />
              </Stack>

              {isLoading ? (
                <Skeleton variant="rounded" height={245} />
              ) : data ? (
                <Stack spacing={2}>
                  {[
                    { label: 'Presents', value: data.today_attendance.present, color: '#059669' },
                    { label: 'En retard', value: data.today_attendance.late, color: '#D97706' },
                    { label: 'En conge', value: data.today_attendance.on_leave, color: '#2563EB' },
                    { label: 'Absents', value: data.today_attendance.absent, color: '#DC2626' },
                  ].map((row) => {
                    const pct = percent(row.value, data.today_attendance.total);
                    return (
                      <Box key={row.label}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.85 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: row.color }} />
                            <Typography sx={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>{row.label}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 12.5, color: '#64748B', fontWeight: 700 }}>
                            {row.value} agents / {pct}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 8, borderRadius: 4, bgcolor: '#EEF2F7',
                            '& .MuiLinearProgress-bar': { bgcolor: row.color },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2.25 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#EFF6FF', color: '#2563EB' }}>
                  <Business sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                    Effectifs par direction
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                    Top directions actives
                  </Typography>
                </Box>
              </Stack>

              {isLoading ? (
                <Skeleton variant="rounded" height={245} />
              ) : (
                <Stack spacing={1.55}>
                  {topDepartments.map((dept) => {
                    const pct = Math.round((dept.count / maxDeptCount) * 100);
                    return (
                      <Box key={dept.id}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.7 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: dept.color ?? '#2563EB', flexShrink: 0 }} />
                            <Typography noWrap sx={{ fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                              {dept.name}
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 12, color: '#0F172A', fontWeight: 850 }}>{dept.count}</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 7, borderRadius: 4, bgcolor: '#F1F5F9',
                            '& .MuiLinearProgress-bar': { bgcolor: dept.color ?? '#2563EB' },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%', borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: '#FFF7ED', color: '#EA580C' }}>
                  <WarningAmber sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                    Priorites RH
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                    Points a suivre
                  </Typography>
                </Box>
              </Stack>

              {isLoading ? (
                <Skeleton variant="rounded" height={245} />
              ) : data ? (
                <Stack spacing={1.25}>
                  {[
                    { label: 'Conges en attente', value: data.pending_leaves, color: '#D97706', bg: '#FFFBEB' },
                    { label: 'Justifications ouvertes', value: data.pending_justifications, color: '#7C3AED', bg: '#F5F3FF' },
                    { label: 'Contrats a renouveler', value: data.expiring_contracts, color: '#DC2626', bg: '#FEF2F2' },
                    { label: 'Retards aujourd hui', value: data.today_attendance.late, color: '#0E7490', bg: '#ECFEFF' },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.35, borderRadius: '10px', bgcolor: item.bg,
                        border: `1px solid ${item.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: 12.5, color: '#334155', fontWeight: 700, lineHeight: 1.25 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontSize: 18, color: item.color, fontWeight: 900, lineHeight: 1 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: '14px' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar sx={{ width: 34, height: 34, bgcolor: '#F0FDFA', color: '#0F766E' }}>
                <TrendingUp sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>Activite recente</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>Derniers mouvements RH detectes</Typography>
              </Box>
            </Stack>
            <Chip label="Mise a jour 60s" size="small" sx={{ bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700 }} />
          </Stack>
          <Divider sx={{ mb: 0.5 }} />

          {isLoading ? (
            <Skeleton variant="rounded" height={150} sx={{ mt: 2 }} />
          ) : !data?.recent_activity.length ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Aucune activite recente</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {data.recent_activity.slice(0, 7).map((item, i) => {
                const Icon = activityIcon[item.type] ?? TrendingUp;
                return (
                  <Box key={`${item.type}-${i}`}>
                    <ListItem disablePadding alignItems="flex-start" sx={{ py: 1.15 }}>
                      <Avatar sx={{ width: 30, height: 30, mr: 1.5, bgcolor: '#EFF6FF', color: '#2563EB', mt: 0.1 }}>
                        <Icon sx={{ fontSize: 15 }} />
                      </Avatar>
                      <ListItemText
                        primary={item.message}
                        secondary={formatDate(item.date)}
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: '#334155', lineHeight: 1.35 }}
                        secondaryTypographyProps={{ fontSize: 11.5, color: '#94A3B8', mt: 0.2 }}
                      />
                    </ListItem>
                    {i < Math.min(data.recent_activity.length, 7) - 1 && <Divider sx={{ borderColor: '#F1F5F9' }} />}
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
