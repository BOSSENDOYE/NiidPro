import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, Dialog,
  DialogContent, DialogTitle, Divider, GlobalStyles, Grid, IconButton,
  LinearProgress, List, ListItem, ListItemText,
  Skeleton, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Typography,
} from '@mui/material';
import {
  AssignmentLate, AssignmentReturn, BeachAccess, Business, CheckCircle, Close,
  EventAvailable, EventBusy, Groups, PersonAdd, PersonSearch, Print,
  QueryStats, Schedule, School, TrendingUp,
  WarningAmber, WorkHistory, Gavel, Work, Category, HowToReg,
} from '@mui/icons-material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import { leavesApi } from '../../api/leaves';
import type { LeaveEndingSoon } from '../../api/leaves';
import { justificationsApi } from '../../api/justifications';
import type { Justification } from '../../api/justifications';
import { trainingsApi } from '../../api/trainings';
import { recruitmentApi } from '../../api/recruitment';
import client from '../../api/client';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import type { DashboardStats, ExpiringContract, Leave, Training, RecruitmentRequest, PaginatedResponse } from '../../types';

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
      to: '/employees',
    },
    {
      label: 'Taux de presence',
      value: `${attendanceRate}%`,
      helper: `${present + late}/${total} agents pointes`,
      color: '#059669',
      bg: '#ECFDF5',
      icon: <EventAvailable />,
      to: '/attendances',
    },
    {
      label: 'Absence globale',
      value: `${absenceRate}%`,
      helper: `${absent} absent(s), ${onLeave} en conge`,
      color: '#DC2626',
      bg: '#FEF2F2',
      icon: <WarningAmber />,
      to: '/attendances',
    },
    {
      label: 'Congés & Absences',
      value: data.pending_leaves,
      helper: 'Congés et absences en attente',
      color: '#D97706',
      bg: '#FFFBEB',
      icon: <BeachAccess />,
      to: '/leaves',
    },
    {
      label: 'Justifications',
      value: data.pending_justifications,
      helper: 'Pieces ou motifs a verifier',
      color: '#7C3AED',
      bg: '#F5F3FF',
      icon: <AssignmentLate />,
      to: '/justifications',
    },
    {
      label: 'Contrats sensibles',
      value: data.expiring_contracts,
      helper: 'Expiration sous 30 jours',
      color: '#EA580C',
      bg: '#FFF7ED',
      icon: <WorkHistory />,
      to: '/contracts',
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
      to: '/attendances',
    },
  ];
}

function KpiCard({
  label, value, helper, icon, color, bg, to, onClick,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  icon: ReactNode;
  color: string;
  bg: string;
  to?: string;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const handleClick = onClick ?? (to ? () => navigate(to) : undefined);
  const content = (
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
  );

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
      {handleClick
        ? <CardActionArea onClick={handleClick} sx={{ height: '100%', borderRadius: '14px' }}>{content}</CardActionArea>
        : content}
    </Card>
  );
}

function daysLeftBadge(days: number): { label: string; bg: string; color: string } {
  if (days === 0) return { label: 'Expiré', bg: '#FEF2F2', color: '#DC2626' };
  if (days <= 7)  return { label: `${days}j`, bg: '#FEF2F2', color: '#DC2626' };
  if (days <= 20) return { label: `${days}j`, bg: '#FFF7ED', color: '#EA580C' };
  return { label: `${days}j`, bg: '#FFFBEB', color: '#D97706' };
}

function ContractAlertsPanel({
  contracts, isLoading,
}: { contracts: ExpiringContract[]; isLoading: boolean }) {
  const navigate = useNavigate();

  if (!isLoading && contracts.length === 0) return null;

  const critical = contracts.filter((c) => c.days_left <= 7).length;

  return (
    <Card sx={{ borderRadius: '14px', border: '1.5px solid #FEE2E2' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#FEF2F2', color: '#DC2626' }}>
              <Gavel sx={{ fontSize: 18 }} />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                Alertes Contrats
              </Typography>
              <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                Contrats arrivant a echeance dans les 30 prochains jours
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {critical > 0 && (
              <Chip
                label={`${critical} critique${critical > 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 800 }}
              />
            )}
            <Chip
              label={`${contracts.length} contrat${contracts.length > 1 ? 's' : ''}`}
              size="small"
              sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 700 }}
            />
          </Stack>
        </Stack>

        {isLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 11.5, fontWeight: 800, color: '#64748B', borderBottom: '1.5px solid #E2E8F0', pb: 1 } }}>
                  <TableCell>Agent</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date fin</TableCell>
                  <TableCell align="center">Jours restants</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((c) => {
                  const badge = daysLeftBadge(c.days_left);
                  return (
                    <TableRow
                      key={c.contract_id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                      onClick={() => navigate('/contracts')}
                    >
                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {c.employee_name}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: '#475569' }}>
                        {c.department}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.contract_type}
                          size="small"
                          sx={{ fontSize: 11, fontWeight: 700, bgcolor: '#F1F5F9', color: '#334155' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: '#475569' }}>
                        {new Date(c.end_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            px: 1.25, py: 0.4, borderRadius: '20px',
                            bgcolor: badge.bg, color: badge.color,
                            fontSize: 12, fontWeight: 900, minWidth: 48,
                          }}
                        >
                          {badge.label}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ width: 32 }}>
                        {c.days_left <= 20 && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: badge.color }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dialog "Charge RH immédiate" — toutes les demandes à traiter
// ─────────────────────────────────────────────────────────────────────────────
function ChargeRHDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const ago = (d: string) => {
    const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    return h < 1 ? '<1h' : h < 24 ? `${h}h` : `${Math.floor(h / 24)}j`;
  };

  const { data: leaves = [], isLoading: ll } = useQuery<Leave[]>({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.pending().then(r => r.data as unknown as Leave[]),
    enabled: open,
  });

  const { data: justifs = [], isLoading: lj } = useQuery<Justification[]>({
    queryKey: ['justifications', 'pending'],
    queryFn: () => justificationsApi.pending().then(r => r.data as unknown as Justification[]),
    enabled: open,
  });

  const { data: trainings = [], isLoading: lt } = useQuery<Training[]>({
    queryKey: ['trainings', 'pending'],
    queryFn: () => trainingsApi.pending().then(r => r.data),
    enabled: open,
  });

  const { data: recruitRaw, isLoading: lr } = useQuery<PaginatedResponse<RecruitmentRequest>>({
    queryKey: ['recruitment', 'pending'],
    queryFn: () => recruitmentApi.pending().then(r => r.data),
    enabled: open,
  });
  const recruits = recruitRaw?.data ?? [];

  const { data: enrollRaw, isLoading: le } = useQuery<{ data?: { id: number; employee?: { first_name: string; last_name: string; employee_number: string }; created_at: string }[]; total?: number }>({
    queryKey: ['enrollments-pending', 'dialog'],
    queryFn: () => client.get('/enrollments', { params: { status: 'pending', per_page: 50 } }).then(r => r.data),
    enabled: open,
  });
  const enrolls = enrollRaw?.data ?? [];
  const enrollCount = enrollRaw?.total ?? enrolls.length;

  const { data: endingSoon = [], isLoading: les } = useQuery<LeaveEndingSoon[]>({
    queryKey: ['leaves', 'ending-soon'],
    queryFn:  () => leavesApi.endingSoon(3),
    enabled:  open,
  });

  const loading = ll || lj || lt || lr || le || les;

  const CATEGORIES = [
    { id: 0, label: 'Tout',              count: leaves.length + justifs.length + enrollCount + trainings.length + recruits.length + endingSoon.length, color: '#0F766E' },
    { id: 1, label: 'Congés',            count: leaves.length,     color: '#D97706', show: leaves.length > 0 },
    { id: 2, label: 'Justifications',    count: justifs.length,    color: '#7C3AED', show: justifs.length > 0 },
    { id: 3, label: 'Enrôlements',       count: enrollCount,       color: '#059669', show: enrollCount > 0 },
    { id: 4, label: 'Formations',        count: trainings.length,  color: '#8B5CF6', show: trainings.length > 0 },
    { id: 5, label: 'Recrutements',      count: recruits.length,   color: '#0284C7', show: recruits.length > 0 },
    { id: 6, label: 'Reprises',          count: endingSoon.length, color: '#DC2626', show: endingSoon.length > 0 },
  ].filter(c => c.id === 0 || c.show);

  const tabIndex = Math.min(tab, CATEGORIES.length - 1);
  const activeCategory = CATEGORIES[tabIndex];

  const SectionHeader = ({ icon, label, count, color, bg, path }: { icon: ReactNode; label: string; count: number; color: string; bg: string; path: string }) => (
    <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', flexGrow: 1 }}>{label}</Typography>
      <Box sx={{ px: 0.9, py: 0.2, borderRadius: '10px', bgcolor: bg }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, lineHeight: 1 }}>{count}</Typography>
      </Box>
      <Button size="small" onClick={() => { navigate(path); onClose(); }}
        sx={{ fontSize: 10.5, fontWeight: 700, color, textTransform: 'none', py: 0.25, px: 1, borderRadius: '7px', '&:hover': { bgcolor: bg } }}>
        Voir tout →
      </Button>
    </Box>
  );

  const ItemRow = ({ children, isLast = false }: { children: ReactNode; isLast?: boolean }) => (
    <Box>
      <Box sx={{ px: 2.5, py: 1.25, display: 'flex', gap: 1.5, alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 130ms' }}>
        {children}
      </Box>
      {!isLast && <Divider sx={{ borderColor: '#F8FAFC', mx: 2.5 }} />}
    </Box>
  );

  const showLeaves    = activeCategory.id === 0 || activeCategory.id === 1;
  const showJustifs   = activeCategory.id === 0 || activeCategory.id === 2;
  const showEnrolls   = activeCategory.id === 0 || activeCategory.id === 3;
  const showTrainings = activeCategory.id === 0 || activeCategory.id === 4;
  const showRecruits  = activeCategory.id === 0 || activeCategory.id === 5;
  const showReprises  = activeCategory.id === 0 || activeCategory.id === 6;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', maxHeight: '85vh' } }}>

      {/* ── En-tête ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, py: 2, background: 'linear-gradient(135deg,#0F172A 0%,#134E4A 60%,#0F766E 100%)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '11px', bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QueryStats sx={{ color: '#5EEAD4', fontSize: 22 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: '#F8FAFC', letterSpacing: '-0.3px' }}>
              Actions prioritaires
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
              Toutes les demandes en attente de traitement
            </Typography>
          </Box>
          {!loading && (
            <Box sx={{ px: 1.25, py: 0.4, borderRadius: '20px', background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {CATEGORIES[0].count}
              </Typography>
            </Box>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: '#64748B', borderRadius: '8px', '&:hover': { color: '#F8FAFC', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* ── Onglets ── */}
        <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, fontSize: 12, fontWeight: 700, textTransform: 'none', py: 0, px: 2 },
              '& .Mui-selected': { color: activeCategory.color },
              '& .MuiTabs-indicator': { bgcolor: activeCategory.color },
            }}
          >
            {CATEGORIES.map((c, i) => (
              <Tab key={c.id} value={i}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {c.label}
                    {c.count > 0 && (
                      <Box sx={{ px: 0.65, py: 0.1, borderRadius: '10px', bgcolor: i === tabIndex ? `${c.color}20` : '#F1F5F9' }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: i === tabIndex ? c.color : '#94A3B8', lineHeight: 1 }}>{c.count}</Typography>
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
      </DialogTitle>

      {/* ── Contenu ── */}
      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={200} /></Box>
        ) : CATEGORIES[0].count === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: '#10B981', mb: 1.5 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Aucune action en attente</Typography>
            <Typography sx={{ fontSize: 12.5, color: '#94A3B8', mt: 0.5 }}>Tout est à jour !</Typography>
          </Box>
        ) : (
          <Box>

            {/* ── Congés & Absences ── */}
            {showLeaves && leaves.length > 0 && (
              <Box>
                <SectionHeader icon={<BeachAccess sx={{ fontSize: 14, color: '#D97706' }} />} label="Congés & Absences" count={leaves.length} color="#D97706" bg="#FEF9C3" path="/leaves" />
                {leaves.map((l, i) => {
                  const emp = l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : `#${l.employee_id}`;
                  const typeColor = l.leaveType?.color ?? '#D97706';
                  const isAbs = l.leaveType?.category === 'absence';
                  const s = new Date(l.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  const e = new Date(l.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                  return (
                    <ItemRow key={l.id} isLast={i === leaves.length - 1}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${typeColor}18`, border: `1px solid ${typeColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isAbs ? <EventBusy sx={{ fontSize: 17, color: typeColor }} /> : <BeachAccess sx={{ fontSize: 17, color: typeColor }} />}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                          <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>il y a {ago(l.created_at)}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }} noWrap>
                          {l.leaveType?.name ?? 'Congé'} · {s} → {e} <Box component="span" sx={{ fontWeight: 700 }}>({l.days_count}j)</Box>
                        </Typography>
                      </Box>
                      <Box sx={{ px: 0.9, py: 0.25, borderRadius: '6px', bgcolor: '#FEF3C7', border: '1px solid #FDE68A', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#D97706', lineHeight: 1 }}>EN ATTENTE</Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/leaves'); onClose(); }}
                        sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.5, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#D97706,#B45309)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(217,119,6,.35)' } }}>
                        Traiter
                      </Button>
                    </ItemRow>
                  );
                })}
                {activeCategory.id === 0 && <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />}
              </Box>
            )}

            {/* ── Justifications ── */}
            {showJustifs && justifs.length > 0 && (
              <Box>
                <SectionHeader icon={<AssignmentLate sx={{ fontSize: 14, color: '#7C3AED' }} />} label="Justifications" count={justifs.length} color="#7C3AED" bg="#EDE9FE" path="/justifications" />
                {justifs.map((j, i) => {
                  const emp = j.employee ? `${j.employee.first_name} ${j.employee.last_name}` : `#${j.employee_id}`;
                  const d = new Date(j.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <ItemRow key={j.id} isLast={i === justifs.length - 1}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AssignmentLate sx={{ fontSize: 17, color: '#7C3AED' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                          <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>il y a {ago(j.created_at)}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }} noWrap>
                          {j.absence_type ?? 'Absence'} · {d}
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/justifications'); onClose(); }}
                        sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.5, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(124,58,237,.35)' } }}>
                        Traiter
                      </Button>
                    </ItemRow>
                  );
                })}
                {activeCategory.id === 0 && <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />}
              </Box>
            )}

            {/* ── Enrôlements ── */}
            {showEnrolls && enrollCount > 0 && (
              <Box>
                <SectionHeader icon={<HowToReg sx={{ fontSize: 14, color: '#059669' }} />} label="Enrôlements" count={enrollCount} color="#059669" bg="#ECFDF5" path="/employees" />
                {enrolls.slice(0, 8).map((en, i) => {
                  const emp = en.employee ? `${en.employee.first_name} ${en.employee.last_name}` : `Dossier #${en.id}`;
                  const num = en.employee?.employee_number ?? '—';
                  return (
                    <ItemRow key={en.id} isLast={i === Math.min(7, enrolls.length - 1)}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HowToReg sx={{ fontSize: 17, color: '#059669' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>Matricule : {num}</Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/employees'); onClose(); }}
                        sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.5, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(5,150,105,.35)' } }}>
                        Valider
                      </Button>
                    </ItemRow>
                  );
                })}
                {enrollCount > 8 && <Box sx={{ px: 2.5, pb: 1, textAlign: 'right' }}><Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>+{enrollCount - 8} autres</Typography></Box>}
                {activeCategory.id === 0 && <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />}
              </Box>
            )}

            {/* ── Formations ── */}
            {showTrainings && trainings.length > 0 && (
              <Box>
                <SectionHeader icon={<School sx={{ fontSize: 14, color: '#8B5CF6' }} />} label="Formations" count={trainings.length} color="#8B5CF6" bg="#EDE9FE" path="/trainings" />
                {trainings.map((tr, i) => (
                  <ItemRow key={tr.id} isLast={i === trainings.length - 1}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <School sx={{ fontSize: 17, color: '#8B5CF6' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{tr.title}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#475569' }} noWrap>
                        {tr.trainingType?.name ?? 'Formation'} · {tr.duration_days}j
                        {tr.desired_date && ` · souhaitée le ${new Date(tr.desired_date).toLocaleDateString('fr-FR')}`}
                      </Typography>
                    </Box>
                    <Button size="small" variant="contained" onClick={() => { navigate('/trainings'); onClose(); }}
                      sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.5, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(139,92,246,.35)' } }}>
                      Traiter
                    </Button>
                  </ItemRow>
                ))}
                {activeCategory.id === 0 && <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />}
              </Box>
            )}

            {/* ── Recrutements ── */}
            {showRecruits && recruits.length > 0 && (
              <Box>
                <SectionHeader icon={<PersonSearch sx={{ fontSize: 14, color: '#0284C7' }} />} label="Recrutements" count={recruits.length} color="#0284C7" bg="#E0F2FE" path="/recruitment" />
                {recruits.map((rq, i) => (
                  <ItemRow key={rq.id} isLast={i === recruits.length - 1}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#E0F2FE', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PersonSearch sx={{ fontSize: 17, color: '#0284C7' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{rq.position_title}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#475569' }} noWrap>
                        {rq.department?.name ?? '—'} · {rq.number_of_positions} poste{rq.number_of_positions > 1 ? 's' : ''} · {rq.contract_type}
                      </Typography>
                    </Box>
                    <Button size="small" variant="contained" onClick={() => { navigate('/recruitment'); onClose(); }}
                      sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.5, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#0284C7,#0369A1)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(2,132,199,.35)' } }}>
                      Traiter
                    </Button>
                  </ItemRow>
                ))}
                {activeCategory.id === 0 && endingSoon.length > 0 && <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />}
              </Box>
            )}

            {/* ── Reprises imminentes ── */}
            {showReprises && endingSoon.length > 0 && (
              <Box>
                <SectionHeader icon={<AssignmentReturn sx={{ fontSize: 14, color: '#DC2626' }} />} label="Reprises imminentes" count={endingSoon.length} color="#DC2626" bg="#FEF2F2" path="/leaves" />
                {endingSoon.map((l, i) => {
                  const emp        = l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : `#${l.employee_id}`;
                  const endFmt     = new Date(l.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                  const repriseFmt = new Date(new Date(l.end_date).getTime() + 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                  const urgency    = l.days_until_return === 0
                    ? { label: "Aujourd'hui", bg: '#FEF2F2', color: '#DC2626' }
                    : l.days_until_return === 1
                    ? { label: 'Demain',      bg: '#FFF7ED', color: '#EA580C' }
                    : { label: `J-${l.days_until_return}`,  bg: '#FFFBEB', color: '#D97706' };
                  return (
                    <ItemRow key={l.id} isLast={i === endingSoon.length - 1}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AssignmentReturn sx={{ fontSize: 17, color: '#DC2626' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{emp}</Typography>
                          <Box sx={{ px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: urgency.bg, flexShrink: 0 }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: urgency.color, lineHeight: 1 }}>{urgency.label}</Typography>
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: '#475569' }}>
                          {l.leaveType?.name ?? 'Congé'} · fin le {endFmt}
                        </Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                          Reprise prévue : {repriseFmt}
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => { navigate('/leaves'); onClose(); }}
                        sx={{ fontSize: 10.5, fontWeight: 700, py: 0.35, px: 1.25, borderRadius: '7px', minWidth: 'unset', background: 'linear-gradient(135deg,#DC2626,#B91C1C)', boxShadow: 'none', textTransform: 'none', '&:hover': { boxShadow: '0 4px 10px rgba(220,38,38,.35)' } }}>
                        Préparer
                      </Button>
                    </ItemRow>
                  );
                })}
              </Box>
            )}

          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [chargeOpen, setChargeOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: pendingEnrollData } = useQuery({
    queryKey: ['enrollments-pending-count'],
    queryFn: () => client.get('/enrollments', { params: { status: 'pending' } }).then(r => r.data),
    refetchInterval: 60_000,
  });
  const pendingEnrollCount: number = pendingEnrollData?.total ?? 0;

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
    <>
    <GlobalStyles styles={`
      @media print {
        @page { size: A3 landscape; margin: 1cm; }

        /* ── Forcer l'impression des couleurs ── */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* ── Masquer sidebar, topbar, bouton imprimer ── */
        body > * { visibility: hidden !important; }
        nav, header, .MuiDrawer-root, .MuiAppBar-root,
        #dashboard-print-btn { display: none !important; }

        /* ── Afficher uniquement le dashboard ── */
        #dashboard-print-area,
        #dashboard-print-area * { visibility: visible !important; }

        #dashboard-print-area {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          background: #fff !important;
          padding: 20px !important;
          box-sizing: border-box !important;
        }

        /* ── Mise en page des cartes et grilles ── */
        .MuiCard-root {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
        }

        .MuiGrid-item {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* ── Garder les couleurs des backgrounds ── */
        .MuiLinearProgress-root,
        .MuiChip-root,
        .MuiAvatar-root { print-color-adjust: exact !important; }

        /* ── Texte lisible ── */
        body { font-size: 11pt !important; }
        .MuiTypography-root { color: #0f172a !important; }
      }
    `} />
    <Box id="dashboard-print-area" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
          '@media print': {
            background: 'linear-gradient(135deg, #0F172A 0%, #164E63 52%, #0F766E 100%) !important',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            borderRadius: '12px',
          },
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

          <Stack direction={{ xs: 'row', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }} alignItems="center">
            {[
              { label: 'Présence', value: `${presenceRate}%`, color: '#34D399' },
              { label: 'A traiter', value: attentionItems, color: '#FBBF24' },
              { label: 'Présentiel', value: data?.today_attendance.present ?? '-', color: '#93C5FD' },
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
            <Button
              id="dashboard-print-btn"
              variant="outlined"
              size="small"
              startIcon={<Print sx={{ fontSize: '15px !important' }} />}
              onClick={() => window.print()}
              sx={{
                color: '#fff', borderColor: 'rgba(255,255,255,0.35)',
                fontWeight: 700, fontSize: 12, borderRadius: '10px',
                px: 2, py: 0.9, whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              Imprimer
            </Button>
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
                <KpiCard
                  {...item}
                  onClick={item.label === 'Charge RH immediate' ? () => setChargeOpen(true) : undefined}
                />
              </Grid>
            ))}

        {/* ── Enrôlements en attente ── */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Enrôlements en attente"
            value={isLoading ? '…' : pendingEnrollCount}
            helper={pendingEnrollCount > 0 ? 'Demandes à traiter' : 'Aucune demande en attente'}
            color="#002f59"
            bg="#EEF4FF"
            icon={<HowToReg />}
            to="/employees"
          />
        </Grid>
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
                    { label: 'Congés & Absences', value: data.pending_leaves, color: '#D97706', bg: '#FFFBEB' },
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

      {/* ── Répartition par Fonction & Catégorie ─────────────────────── */}
      {(isLoading || (data && (data.by_fonction?.length > 0 || data.by_categorie?.length > 0))) && (
        <Grid container spacing={2}>
          {/* Widget Fonctions */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.25 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 34, height: 34, bgcolor: '#FFF7ED', color: '#EA580C' }}>
                      <Work sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                        Effectifs par Fonction
                      </Typography>
                      <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                        Répartition des agents actifs par intitulé de poste
                      </Typography>
                    </Box>
                  </Stack>
                  {data && (
                    <Chip
                      label={`${data.by_fonction?.reduce((s, f) => s + f.count, 0) ?? 0} agents`}
                      size="small"
                      sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 800 }}
                    />
                  )}
                </Stack>

                {isLoading ? (
                  <Skeleton variant="rounded" height={280} />
                ) : data?.by_fonction?.length ? (
                  <Stack spacing={1.4}>
                    {(() => {
                      const top = data.by_fonction.slice(0, 10);
                      const maxCount = Math.max(...top.map(f => f.count), 1);
                      const COLORS = ['#002f59','#EA580C','#059669','#7C3AED','#0E7490','#DC2626','#D97706','#0284C7','#65A30D','#BE185D'];
                      return top.map((item, i) => {
                        const pct = Math.round((item.count / maxCount) * 100);
                        const color = COLORS[i % COLORS.length];
                        return (
                          <Box key={item.fonction}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                <Typography noWrap sx={{ fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
                                  {item.fonction.charAt(0) + item.fonction.slice(1).toLowerCase()}
                                </Typography>
                              </Stack>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                                <Typography sx={{ fontSize: 12, color: '#0F172A', fontWeight: 850, minWidth: 22, textAlign: 'right' }}>
                                  {item.count}
                                </Typography>
                                <Chip
                                  label={`${Math.round((item.count / (data.total_employees || 1)) * 100)}%`}
                                  size="small"
                                  sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: `${color}18`, color }}
                                />
                              </Box>
                            </Stack>
                            <LinearProgress
                              variant="determinate" value={pct}
                              sx={{ height: 7, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color } }}
                            />
                          </Box>
                        );
                      });
                    })()}
                    {data.by_fonction.length > 10 && (
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textAlign: 'right', mt: 0.5 }}>
                        + {data.by_fonction.length - 10} autre(s) fonction(s)
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                      Aucune donnée — importez le registre pour renseigner les fonctions
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Widget Catégories */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ borderRadius: '14px', height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.25 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar sx={{ width: 34, height: 34, bgcolor: '#F5F3FF', color: '#7C3AED' }}>
                      <Category sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>
                        Effectifs par Catégorie
                      </Typography>
                      <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                        Structure hiérarchique des agents
                      </Typography>
                    </Box>
                  </Stack>
                  {data && (
                    <Chip
                      label={`${data.by_categorie?.length ?? 0} catég.`}
                      size="small"
                      sx={{ bgcolor: '#F5F3FF', color: '#7C3AED', fontWeight: 800 }}
                    />
                  )}
                </Stack>

                {isLoading ? (
                  <Skeleton variant="rounded" height={280} />
                ) : data?.by_categorie?.length ? (
                  <Stack spacing={1.4}>
                    {(() => {
                      const items = data.by_categorie.slice(0, 12);
                      const maxCount = Math.max(...items.map(c => c.count), 1);
                      return items.map((item, i) => {
                        const pct = Math.round((item.count / maxCount) * 100);
                        const hue = (i * 37) % 360;
                        const color = `hsl(${hue},60%,38%)`;
                        return (
                          <Box key={item.categorie}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{
                                  width: 26, height: 26, borderRadius: '8px',
                                  bgcolor: `hsl(${hue},60%,93%)`, color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 900,
                                }}>
                                  {item.categorie}
                                </Box>
                              </Stack>
                              <Box sx={{ flex: 1, mx: 1.5 }}>
                                <LinearProgress
                                  variant="determinate" value={pct}
                                  sx={{ height: 7, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color } }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 60, justifyContent: 'flex-end' }}>
                                <Typography sx={{ fontSize: 13, color: '#0F172A', fontWeight: 850 }}>{item.count}</Typography>
                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>
                                  ({Math.round((item.count / (data.total_employees || 1)) * 100)}%)
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        );
                      });
                    })()}
                  </Stack>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>
                      Aucune donnée — importez le registre pour renseigner les catégories
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Panel Alertes Contrats ─────────────────────────────────────── */}
      <ContractAlertsPanel contracts={data?.expiring_contracts_list ?? []} isLoading={isLoading} />

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

    <ChargeRHDialog open={chargeOpen} onClose={() => setChargeOpen(false)} />
    </>
  );
}
