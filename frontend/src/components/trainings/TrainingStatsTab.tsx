import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Grid, Card, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress, CircularProgress, Chip,
} from '@mui/material';
import {
  School, CheckCircle, Assessment, HourglassEmpty, AttachMoney, Groups,
} from '@mui/icons-material';
import { trainingsApi } from '../../api/trainings';
import type { TrainingBudget } from '../../types';

const NAV = '#0D2137';
const ACT = '#8B5CF6';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function KpiCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string | number; color: string; bg: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 130, bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color, '& svg': { fontSize: 20 } }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 13, fontWeight: 800, color: NAV, mb: 1.5, mt: 1 }}>{children}</Typography>;
}

export default function TrainingStatsTab({ budgets }: { budgets: TrainingBudget[] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['trainings', 'statistics', year],
    queryFn: () => trainingsApi.statistics(year).then((r) => r.data),
  });

  if (isLoading || !stats) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  const k = stats.kpis;

  return (
    <Box sx={{ p: 2.5 }}>
      {/* ── Sélecteur année ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: NAV }}>Tableau de bord — Formations</Typography>
        <TextField select size="small" label="Année" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 120 }}>
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Stack>

      {/* ── KPIs ── */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <KpiCard icon={<School />}        label="Total formations" value={k.total}             color={ACT}       bg="#F5F3FF" />
        <KpiCard icon={<HourglassEmpty />} label="En attente"       value={k.pending}           color="#D97706"   bg="#FFFBEB" />
        <KpiCard icon={<Assessment />}    label="Planifiées"       value={k.planned}           color="#0284C7"   bg="#F0F9FF" />
        <KpiCard icon={<CheckCircle />}   label="Réalisées"        value={k.completed}         color="#10B981"   bg="#ECFDF5" />
        <KpiCard icon={<AttachMoney />}   label="Coût total"       value={`${fmt(k.total_cost)} F`} color="#DC2626" bg="#FEF2F2" />
        <KpiCard icon={<Groups />}        label="Taux participation" value={`${stats.participation_rate}%`} color="#7C3AED" bg="#F5F3FF" />
      </Stack>

      <Grid container spacing={2}>
        {/* ── Budgets ── */}
        <Grid item xs={12} md={6}>
          <SectionTitle>Budget consommé par service</SectionTitle>
          <Stack spacing={1.5}>
            {budgets.length === 0 && <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Aucun budget défini</Typography>}
            {budgets.map((b) => {
              const pct = b.amount > 0 ? Math.min(100, ((b.consumed_amount ?? 0) / b.amount) * 100) : 0;
              return (
                <Card key={b.id} sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAV }}>{b.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>{fmt(b.consumed_amount ?? 0)} / {fmt(b.amount)} F</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: pct > 90 ? '#DC2626' : ACT } }} />
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* ── Formations par type ── */}
        <Grid item xs={12} md={6}>
          <SectionTitle>Formations par type</SectionTitle>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow><TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell><TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Nombre</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {stats.by_type.length === 0 ? (
                  <TableRow><TableCell colSpan={2} sx={{ textAlign: 'center', py: 2, color: '#94A3B8' }}>—</TableCell></TableRow>
                ) : stats.by_type.map((t) => (
                  <TableRow key={t.type}><TableCell sx={{ fontSize: 12 }}>{t.type}</TableCell><TableCell sx={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{t.count}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* ── Formations par service ── */}
        <Grid item xs={12} md={6}>
          <SectionTitle>Formations par service</SectionTitle>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Réalisées</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Coût</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.by_service.length === 0 ? (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, color: '#94A3B8' }}>—</TableCell></TableRow>
                ) : stats.by_service.map((s) => (
                  <TableRow key={s.service}>
                    <TableCell sx={{ fontSize: 12 }}>{s.service}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{s.count}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{s.completed}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{fmt(s.cost)} F</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* ── Statistiques annuelles ── */}
        <Grid item xs={12} md={6}>
          <SectionTitle>Statistiques annuelles</SectionTitle>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Année</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Réalisées</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'right' }}>Coût</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.by_year.length === 0 ? (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, color: '#94A3B8' }}>—</TableCell></TableRow>
                ) : stats.by_year.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{y.year}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{y.total}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{y.completed}</TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'right' }}>{fmt(y.cost)} F</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* ── Formations par agent ── */}
        <Grid item xs={12}>
          <SectionTitle>Formations par agent</SectionTitle>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Formations</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Présences</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.by_employee.length === 0 ? (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, color: '#94A3B8' }}>Aucune participation</TableCell></TableRow>
                ) : stats.by_employee.map((e) => (
                  <TableRow key={e.employee_id}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{e.name}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{e.department}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}><Chip label={e.trainings} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#F5F3FF', color: ACT }} /></TableCell>
                    <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{e.present}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
