import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, LinearProgress,
  Skeleton, Divider,
} from '@mui/material';
import { People, TrendingUp, TrendingDown } from '@mui/icons-material';
import { dashboardApi } from '../../api/dashboard';
import { employeesApi } from '../../api/employees';
import { leavesApi } from '../../api/leaves';
import PageHeader from '../../components/common/PageHeader';
import { formatSalary } from '../../utils/format';

function StatCard({ label, value, sub, color, bg, icon }: {
  label: string; value: React.ReactNode; sub?: string;
  color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            {icon}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>{value}</Typography>
        <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>{label}</Typography>
        {sub && <Typography sx={{ fontSize: 11, color, mt: 0.5, fontWeight: 600 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{value}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={max ? (value / max) * 100 : 0}
        sx={{
          height: 8, borderRadius: 4,
          bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
}

export default function SocialReportPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  });

  const { data: empData, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ per_page: 100 }).then((r) => r.data),
  });

  const { data: leaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const employees = empData?.data ?? [];
  const isLoading = loadingStats || loadingEmp;

  // Computed stats
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive').length;
  const avgSalary = employees.length
    ? employees.reduce((s, e) => s + (e.base_salary ?? 0), 0) / employees.length
    : 0;

  const approvedLeaves = leaves?.filter((l) => l.status === 'approved').length ?? 0;
  const pendingLeaves = leaves?.filter((l) => l.status === 'pending').length ?? 0;

  const departments = stats?.by_department ?? [];
  const maxDeptCount = Math.max(...departments.map((d) => d.count), 1);

  return (
    <Box>
      <PageHeader title="Bilan social" subtitle="Vue d'ensemble des indicateurs RH" />

      {/* KPI row */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Effectif total"
            value={isLoading ? <Skeleton width={60} /> : stats?.total_employees ?? 0}
            sub={`${activeCount} actifs`}
            color="#2563EB" bg="#EFF6FF"
            icon={<People sx={{ fontSize: 20 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Salaire moyen"
            value={isLoading ? <Skeleton width={80} /> : formatSalary(avgSalary)}
            color="#059669" bg="#ECFDF5"
            icon={<TrendingUp sx={{ fontSize: 20 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Congés accordés"
            value={isLoading ? <Skeleton width={40} /> : approvedLeaves}
            sub={`${pendingLeaves} en attente`}
            color="#7C3AED" bg="#F5F3FF"
            icon={<TrendingUp sx={{ fontSize: 20 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Départs (inactifs)"
            value={isLoading ? <Skeleton width={40} /> : inactiveCount}
            color="#DC2626" bg="#FEF2F2"
            icon={<TrendingDown sx={{ fontSize: 20 }} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Répartition par direction */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5 }}>
                Répartition par direction
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 3 }}>
                Effectifs par département
              </Typography>
              {isLoading ? <Skeleton height={200} /> : (
                departments.length === 0 ? (
                  <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Aucune donnée</Typography>
                ) : departments.map((d) => (
                  <BarRow key={d.id} label={d.name} value={d.count} max={maxDeptCount} color={d.color ?? '#2563EB'} />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statuts employés */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5 }}>
                Statuts des agents
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 3 }}>
                Distribution par statut contractuel
              </Typography>
              {isLoading ? <Skeleton height={200} /> : (
                <Box>
                  {[
                    { label: 'Actifs', value: activeCount, color: '#059669' },
                    { label: 'Inactifs', value: inactiveCount, color: '#64748B' },
                    { label: 'Suspendus', value: employees.filter((e) => e.status === 'suspended').length, color: '#DC2626' },
                  ].map((row) => (
                    <BarRow key={row.label} label={row.label} value={row.value} max={employees.length || 1} color={row.color} />
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, color: '#64748B' }}>Total</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{employees.length}</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Congés par type */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5 }}>
                Congés par statut
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 3 }}>
                Répartition des demandes de congés
              </Typography>
              {[
                { label: 'Approuvés', value: approvedLeaves, color: '#059669' },
                { label: 'En attente', value: pendingLeaves, color: '#D97706' },
                { label: 'Refusés', value: leaves?.filter((l) => l.status === 'rejected').length ?? 0, color: '#DC2626' },
                { label: 'Annulés', value: leaves?.filter((l) => l.status === 'cancelled').length ?? 0, color: '#64748B' },
              ].map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={leaves?.length || 1} color={row.color} />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Présence aujourd'hui */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', mb: 0.5 }}>
                Présence du jour
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 3 }}>
                Indicateurs de présence en temps réel
              </Typography>
              {isLoading ? <Skeleton height={150} /> : stats ? (
                <Box>
                  {[
                    { label: 'Présents', value: stats.today_attendance.present, color: '#059669' },
                    { label: 'En retard', value: stats.today_attendance.late, color: '#D97706' },
                    { label: 'En congé', value: stats.today_attendance.on_leave, color: '#2563EB' },
                    { label: 'Absents', value: stats.today_attendance.absent, color: '#DC2626' },
                  ].map((row) => (
                    <BarRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      max={stats.today_attendance.total || 1}
                      color={row.color}
                    />
                  ))}
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
