import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, FormControl, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, Avatar, CircularProgress, Alert, Tooltip, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  PlayArrow, Groups, Person, AccountTree, CheckCircle, Info,
  CalendarMonth, ChildCare, WorkspacePremium, Timelapse,
  Edit, ViewList, TableChart, Close, FlightTakeoff, FlightLand,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { leavesApi } from '../../api/leaves';
import { departmentsApi } from '../../api/departments';
import { employeesApi } from '../../api/employees';
import type { DetailPlanningConge } from '../../api/leaves';
import type { Department, Employee } from '../../types';

const NAV = '#0D2137';
const ACT = '#E85D04';

// ─── Statut réalisation config ────────────────────────────────────
const STATUT_CONFIG = {
  planifié:     { label: 'Planifié',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  confirmé:     { label: 'Confirmé',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  réalisé:      { label: 'Réalisé',        color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' },
  non_respecté: { label: 'Non respecté',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
} as const;

const STATUT_BAR_COLOR = {
  planifié:     '#3B82F6',
  confirmé:     '#059669',
  réalisé:      '#9CA3AF',
  non_respecté: '#EF4444',
} as const;

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ─── Carte solde ──────────────────────────────────────────────────
function BalanceCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
  return (
    <Box sx={{
      flex: 1, minWidth: 110, bgcolor: '#fff', border: `1.5px solid ${color}30`,
      borderRadius: '10px', p: 1.5, textAlign: 'center',
      boxShadow: `0 2px 8px ${color}15`,
    }}>
      <Box sx={{ color, mb: 0.5, '& svg': { fontSize: 20 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10.5, color: '#64748B', mt: 0.25, lineHeight: 1.3 }}>{label}</Typography>
    </Box>
  );
}

// ─── Chip statut réalisation ──────────────────────────────────────
function StatutChip({ statut }: { statut?: string | null }) {
  const cfg = STATUT_CONFIG[(statut ?? 'planifié') as keyof typeof STATUT_CONFIG] ?? STATUT_CONFIG.planifié;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        fontSize: 10, height: 18, fontWeight: 700,
        bgcolor: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    />
  );
}

// ─── Dialog édition des dates ─────────────────────────────────────
function DateEditDialog({
  planning, open, onClose, onSaved,
}: {
  planning: DetailPlanningConge | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const empName = planning?.employee
    ? `${planning.employee.first_name} ${planning.employee.last_name}`
    : '';

  const [depart,  setDepart]  = useState('');
  const [retour,  setRetour]  = useState('');
  const [jours,   setJours]   = useState('');
  const [statut,  setStatut]  = useState<string>('planifié');
  const [error,   setError]   = useState('');

  // Reset quand on ouvre
  const handleEnter = () => {
    setDepart(planning?.date_depart_prevu ?? '');
    setRetour(planning?.date_retour_prevu ?? '');
    setJours(String(planning?.nbre_jours_programme ?? ''));
    setStatut(planning?.statut_realisation ?? 'planifié');
    setError('');
  };

  // Auto-calc jours quand les dates changent
  const handleDepartChange = (v: string) => {
    setDepart(v);
    if (v && retour && dayjs(retour).isAfter(dayjs(v))) {
      setJours(String(dayjs(retour).diff(dayjs(v), 'day') + 1));
    }
  };
  const handleRetourChange = (v: string) => {
    setRetour(v);
    if (depart && v && dayjs(v).isAfter(dayjs(depart))) {
      setJours(String(dayjs(v).diff(dayjs(depart), 'day') + 1));
    }
  };

  const updateMut = useMutation({
    mutationFn: () => leavesApi.planningUpdateDates(planning!.id, {
      date_depart_prevu:    depart   || null,
      date_retour_prevu:    retour   || null,
      nbre_jours_programme: jours ? Number(jours) : null,
      statut_realisation:   statut,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-plannings'] });
      setError('');
      onSaved();
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Erreur lors de la sauvegarde.'),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      TransitionProps={{ onEnter: handleEnter }}
      slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#0D2137,#1E3A5F)', px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonth sx={{ color: '#93C5FD', fontSize: 18 }} />
          <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13.5 }}>
            Planifier les dates de congé
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#475569', '&:hover': { color: '#F1F5F9', bgcolor: 'rgba(255,255,255,0.1)' }, borderRadius: '8px' }}>
          <Close sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        {/* Identité agent */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, p: 1.25, bgcolor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, bgcolor: NAV }}>
            {planning?.employee?.first_name?.[0]}{planning?.employee?.last_name?.[0]}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{empName}</Typography>
            <Typography sx={{ fontSize: 11, color: '#64748B' }}>
              {planning?.employee?.employee_number} — {planning?.employee?.department?.name ?? '—'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', textAlign: 'right' }}>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>Solde total</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{planning?.nbre_jour_total_disponible ?? '—'}j</Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px', fontSize: 12 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Date départ */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FlightTakeoff sx={{ fontSize: 14, color: '#2563EB' }} /> Date de départ prévue
          </Typography>
          <TextField type="date" size="small" fullWidth value={depart}
            onChange={(e) => handleDepartChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ bgcolor: '#fff' }} />
        </Box>

        {/* Date retour */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FlightLand sx={{ fontSize: 14, color: '#059669' }} /> Date de retour prévue
          </Typography>
          <TextField type="date" size="small" fullWidth value={retour}
            inputProps={{ min: depart }}
            onChange={(e) => handleRetourChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ bgcolor: '#fff' }} />
        </Box>

        {/* Jours programmés */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.5 }}>
            Jours programmés (auto-calculé)
          </Typography>
          <TextField type="number" size="small" fullWidth value={jours}
            onChange={(e) => setJours(e.target.value)}
            inputProps={{ min: 1, max: 90, step: 0.5 }}
            sx={{ bgcolor: '#fff' }} />
        </Box>

        {/* Statut réalisation */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.5 }}>Statut de réalisation</Typography>
          <FormControl size="small" fullWidth sx={{ bgcolor: '#fff' }}>
            <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
              {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color }} />
                    {cfg.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: '8px', color: '#64748B', textTransform: 'none', fontSize: 12.5 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={updateMut.isPending}
          onClick={() => updateMut.mutate()}
          startIcon={updateMut.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckCircle sx={{ fontSize: 15 }} />}
          sx={{ borderRadius: '8px', bgcolor: ACT, '&:hover': { bgcolor: '#c94d00' }, textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Vue Gantt ────────────────────────────────────────────────────
const GANTT_TOTAL_W = 1440;
const GANTT_ROW_H   = 38;
const GANTT_LEFT_W  = 200;

function GanttView({ plannings, annee, onEdit }: {
  plannings: DetailPlanningConge[];
  annee: number;
  onEdit: (p: DetailPlanningConge) => void;
}) {
  const daysInYear = dayjs(`${annee}-12-31`).diff(dayjs(`${annee}-01-01`), 'day') + 1;
  const dayW = GANTT_TOTAL_W / daysInYear;

  const dayOfYear = (dateStr: string) =>
    dayjs(dateStr).diff(dayjs(`${annee}-01-01`), 'day');

  // Calcul de la position de chaque mois
  const monthMeta = MONTHS_FR.map((name, m) => {
    const firstDay = dayjs(`${annee}-${String(m + 1).padStart(2, '0')}-01`);
    const daysInMonth = firstDay.daysInMonth();
    const startDay = firstDay.diff(dayjs(`${annee}-01-01`), 'day');
    return { name, startDay, daysInMonth };
  });

  // Trier par date de départ ou par nom
  const sorted = useMemo(() => {
    return [...plannings]
      .sort((a, b) => {
        if (a.date_depart_prevu && b.date_depart_prevu) {
          return a.date_depart_prevu.localeCompare(b.date_depart_prevu);
        }
        if (a.date_depart_prevu) return -1;
        if (b.date_depart_prevu) return 1;
        const na = `${a.employee?.last_name ?? ''} ${a.employee?.first_name ?? ''}`;
        const nb = `${b.employee?.last_name ?? ''} ${b.employee?.first_name ?? ''}`;
        return na.localeCompare(nb);
      });
  }, [plannings]);

  const today = dayjs().format('YYYY-MM-DD');
  const todayDay = dayOfYear(today);

  return (
    <Box sx={{ display: 'flex', overflow: 'hidden', bgcolor: '#fff' }}>
      {/* ─── Colonne noms (fixe) ─── */}
      <Box sx={{ width: GANTT_LEFT_W, flexShrink: 0, borderRight: '2px solid #E2E8F0', zIndex: 2 }}>
        {/* Header */}
        <Box sx={{ height: 34, bgcolor: '#1E3A5F', display: 'flex', alignItems: 'center', px: 1.5 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Agent / Direction
          </Typography>
        </Box>
        {sorted.map((p, i) => (
          <Box key={p.id} sx={{
            height: GANTT_ROW_H,
            bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: 0.75, px: 1,
          }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 9, fontWeight: 700, bgcolor: '#1E3A5F', flexShrink: 0 }}>
              {p.employee?.first_name?.[0]}{p.employee?.last_name?.[0]}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }} noWrap>
                {p.employee?.first_name} {p.employee?.last_name}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: '#64748B', lineHeight: 1.2 }} noWrap>
                {p.employee?.department?.code ?? p.employee?.department?.name ?? '—'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ─── Timeline (scrollable) ─── */}
      <Box sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { height: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 } }}>
        <Box sx={{ width: GANTT_TOTAL_W, position: 'relative' }}>

          {/* Header mois */}
          <Box sx={{ display: 'flex', height: 34, bgcolor: '#1E3A5F', position: 'sticky', top: 0, zIndex: 1 }}>
            {monthMeta.map((m, i) => (
              <Box key={i} sx={{
                width: m.daysInMonth * dayW,
                flexShrink: 0,
                borderRight: i < 11 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                display: 'flex', alignItems: 'center', px: 0.75,
              }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#93C5FD', whiteSpace: 'nowrap' }}>
                  {m.name}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Ligne "Aujourd'hui" */}
          {todayDay >= 0 && todayDay < daysInYear && (
            <Box sx={{
              position: 'absolute', top: 34, bottom: 0,
              left: todayDay * dayW,
              width: 1.5, bgcolor: '#EF4444',
              opacity: 0.7, zIndex: 1,
              pointerEvents: 'none',
            }} />
          )}

          {/* Lignes agents */}
          {sorted.map((p, i) => {
            const hasDepart = !!p.date_depart_prevu;
            const hasRetour = !!p.date_retour_prevu;
            const barColor = STATUT_BAR_COLOR[(p.statut_realisation ?? 'planifié') as keyof typeof STATUT_BAR_COLOR];

            const startDay = hasDepart ? dayOfYear(p.date_depart_prevu!) : 0;
            const endDay   = hasRetour ? dayOfYear(p.date_retour_prevu!) : (hasDepart ? startDay + (p.nbre_jours_programme ?? 1) - 1 : 0);
            const barW     = hasDepart ? Math.max(4, (endDay - startDay + 1) * dayW) : 0;
            const barLeft  = hasDepart ? startDay * dayW : 0;

            return (
              <Box key={p.id} sx={{
                height: GANTT_ROW_H,
                bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC',
                borderBottom: '1px solid #F1F5F9',
                position: 'relative',
              }}>
                {/* Bandes mois alternées */}
                {monthMeta.map((m, mi) => (
                  <Box key={mi} sx={{
                    position: 'absolute',
                    left: m.startDay * dayW,
                    width: m.daysInMonth * dayW,
                    top: 0, bottom: 0,
                    bgcolor: mi % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                    borderRight: mi < 11 ? '1px solid #F1F5F9' : 'none',
                  }} />
                ))}

                {/* Barre planning */}
                {hasDepart && (
                  <Tooltip
                    title={
                      <Box sx={{ fontSize: 12 }}>
                        <Box sx={{ fontWeight: 700 }}>{p.employee?.first_name} {p.employee?.last_name}</Box>
                        <Box>Départ : {dayjs(p.date_depart_prevu).format('DD/MM/YYYY')}</Box>
                        {hasRetour && <Box>Retour : {dayjs(p.date_retour_prevu).format('DD/MM/YYYY')}</Box>}
                        <Box>Durée : {p.nbre_jours_programme ?? endDay - startDay + 1}j</Box>
                        <Box>Statut : {STATUT_CONFIG[(p.statut_realisation ?? 'planifié') as keyof typeof STATUT_CONFIG]?.label}</Box>
                      </Box>
                    }
                    arrow
                  >
                    <Box
                      onClick={() => onEdit(p)}
                      sx={{
                        position: 'absolute',
                        left: barLeft,
                        width: barW,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: 22,
                        borderRadius: '6px',
                        bgcolor: barColor,
                        opacity: 0.85,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', px: 0.75, overflow: 'hidden',
                        transition: 'opacity 0.15s, transform 0.15s',
                        '&:hover': { opacity: 1, transform: 'translateY(-50%) scaleY(1.1)' },
                        zIndex: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', lineHeight: 1 }} noWrap>
                        {p.nbre_jours_programme ?? endDay - startDay + 1}j
                      </Typography>
                    </Box>
                  </Tooltip>
                )}

                {/* Aucune date définie : ligne pointillée */}
                {!hasDepart && (
                  <Box sx={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: 8, right: 8, height: 1,
                    borderTop: '1px dashed #CBD5E1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{ fontSize: 9, color: '#94A3B8', bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', px: 0.75 }}>
                      Dates non définies
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Onglet planning congés ───────────────────────────────────────
export default function LeavePlanningTab() {
  const qc   = useQueryClient();
  const year = dayjs().year();

  // ── Génération ──
  const [critere,    setCritere]    = useState<'G' | 'E' | 'A'>('G');
  const [annee,      setAnnee]      = useState(year);
  const [dateGen,    setDateGen]    = useState(dayjs().format('YYYY-MM-DD'));
  const [dateLimite, setDateLimite] = useState(`${year}-10-31`);
  const [deptId,     setDeptId]     = useState<number | ''>('');
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [result,     setResult]     = useState<{ message: string; generated: number } | null>(null);
  const [error,      setError]      = useState<string>('');

  // ── Vue ──
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');

  // ── Édition dates ──
  const [editTarget, setEditTarget] = useState<DetailPlanningConge | null>(null);

  // ── Queries ──
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn:  () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: Department[] }).data ?? [])) as Department[];
    }),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn:  () => employeesApi.list({ per_page: 200 }).then((r) => {
      const d = r.data as unknown;
      return ((d as { data?: Employee[] }).data ?? []) as Employee[];
    }),
  });
  const employees = empData ?? [];

  const { data: planningsData, refetch: refetchPlannings, isLoading: loadingPlannings } = useQuery({
    queryKey: ['leave-plannings', annee],
    queryFn:  () => leavesApi.plannings({ annee }) as Promise<{ data: DetailPlanningConge[] }>,
  });
  const plannings: DetailPlanningConge[] = (planningsData as any)?.data ?? [];

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', annee],
    queryFn:  () => leavesApi.holidays(annee),
  });

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['leave-balance', employeeId],
    queryFn:  () => employeeId ? leavesApi.balance(Number(employeeId)) : null,
    enabled:  !!employeeId,
  });

  // ── Mutation génération ──
  const genMut = useMutation({
    mutationFn: () => leavesApi.generatePlanning({
      critere,
      annee,
      date_generation: dateGen,
      date_limite:     dateLimite,
      department_id:   critere === 'E' && deptId     ? Number(deptId)     : undefined,
      employee_id:     critere === 'A' && employeeId ? Number(employeeId) : undefined,
    }),
    onSuccess: (data) => {
      setResult({ message: data.message, generated: data.generated });
      setError('');
      refetchPlannings();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Erreur lors de la génération.');
    },
  });

  const critereLabel = { G: 'Toute l\'agence', E: 'Par direction', A: 'Par agent' };

  // Plannings avec dates planifiées (pour le badge Gantt)
  const withDates     = plannings.filter(p => p.date_depart_prevu);
  const withoutDates  = plannings.filter(p => !p.date_depart_prevu);

  return (
    <Box sx={{ p: 0 }}>

      {/* ── Section génération ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Génération du Planning de Congés Annuel
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5, mt: 0.2 }}>
          GENERATION_CONGE_ANNUEL — Article L220 Code du Travail Sénégal
        </Typography>
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>

          {/* Critère */}
          <Box sx={{ minWidth: 180 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Critère de génération
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {(['G', 'E', 'A'] as const).map((c) => (
                <Chip key={c} label={c} onClick={() => setCritere(c)}
                  icon={c === 'G' ? <Groups sx={{ fontSize: '14px !important' }} /> : c === 'E' ? <AccountTree sx={{ fontSize: '14px !important' }} /> : <Person sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    bgcolor:  critere === c ? NAV  : '#fff',
                    color:    critere === c ? '#fff' : NAV,
                    border: `1.5px solid ${critere === c ? NAV : '#CBD5E1'}`,
                    '&:hover': { bgcolor: critere === c ? NAV : '#EFF6FF' },
                  }} />
              ))}
            </Box>
            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mt: 0.5 }}>{critereLabel[critere]}</Typography>
          </Box>

          {/* Année */}
          <Box sx={{ minWidth: 100 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Année</Typography>
            <TextField type="number" size="small" value={annee}
              onChange={(e) => { setAnnee(Number(e.target.value)); setDateLimite(`${e.target.value}-10-31`); }}
              inputProps={{ min: 2020, max: 2050 }} sx={{ width: 100, bgcolor: '#fff' }} />
          </Box>

          {/* Date génération */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date génération</Typography>
            <TextField type="date" size="small" value={dateGen}
              onChange={(e) => setDateGen(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 160 }} />
          </Box>

          {/* Date limite */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Date limite{' '}
              <Tooltip title="Période légale : 1 mai – 31 octobre"><Info sx={{ fontSize: 12, color: '#94A3B8', verticalAlign: 'middle' }} /></Tooltip>
            </Typography>
            <TextField type="date" size="small" value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 160 }} />
          </Box>

          {/* Direction (critère E) */}
          {critere === 'E' && (
            <Box sx={{ minWidth: 220 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direction</Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                <Select value={deptId} onChange={(e) => setDeptId(e.target.value as number)} displayEmpty
                  renderValue={(v) => v ? departments.find((d) => d.id === v)?.name ?? String(v) : '— Choisir —'}>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.code ? `[${d.code}] ` : ''}{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Agent (critère A) */}
          {critere === 'A' && (
            <Box sx={{ minWidth: 300 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</Typography>
              <Autocomplete size="small" options={employees}
                filterOptions={(opts, { inputValue }) => {
                  const q = inputValue.trim();
                  if (q.length < 2) return [];
                  const ql = q.toLowerCase();
                  return opts.filter((e) =>
                    e.employee_number.toLowerCase().includes(ql) ||
                    e.first_name.toLowerCase().startsWith(ql)
                  );
                }}
                getOptionLabel={(e) => typeof e === 'string' ? e : `${e.employee_number} — ${e.first_name} ${e.last_name}`}
                value={employees.find((e) => e.id === employeeId) ?? null}
                onChange={(_, val) => setEmployeeId(val?.id ?? '')}
                noOptionsText="Tapez 2 caractères…"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Matricule ou prénom…" sx={{ bgcolor: '#fff', minWidth: 300 }}
                    InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }} />
                )}
                renderOption={(props, emp) => {
                  const { key, ...optProps } = props as typeof props & { key: React.Key };
                  const hue = (emp.first_name.charCodeAt(0) + emp.last_name.charCodeAt(0)) % 360;
                  return (
                    <Box key={key} component="li" {...optProps}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: '6px !important', px: '12px !important' }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, flexShrink: 0, bgcolor: `hsl(${hue},50%,44%)` }}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#1E3A5F' }}>{emp.employee_number}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#334155' }} noWrap>{emp.first_name} {emp.last_name}</Typography>
                      </Box>
                    </Box>
                  );
                }}
              />
            </Box>
          )}

          {/* Bouton générer */}
          <Button variant="contained"
            startIcon={genMut.isPending ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
            disabled={genMut.isPending || (critere === 'E' && !deptId) || (critere === 'A' && !employeeId)}
            onClick={() => genMut.mutate()}
            sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#c94d00' }, borderRadius: '8px', fontWeight: 700, fontSize: 13, px: 2.5, py: 1, boxShadow: `0 4px 14px ${ACT}40`, alignSelf: 'flex-end' }}>
            Générer
          </Button>
        </Box>

        {result && (
          <Alert severity="success" icon={<CheckCircle />} onClose={() => setResult(null)}
            sx={{ borderRadius: '8px', fontWeight: 600 }}>
            {result.message} ({result.generated} agent{result.generated > 1 ? 's' : ''})
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '8px' }}>{error}</Alert>
        )}
      </Box>

      {/* ── Solde agent (critère A) ── */}
      {critere === 'A' && employeeId && (
        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAV, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Solde — {employees.find((e) => e.id === employeeId)?.first_name} {employees.find((e) => e.id === employeeId)?.last_name}
          </Typography>
          {loadingBalance ? <CircularProgress size={24} /> : balance && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <BalanceCard label="Solde disponible"   value={balance.solde_disponible}      color="#059669" icon={<CheckCircle />} />
              <BalanceCard label="Jours acquis"        value={balance.acquis_periode}         color="#2563EB" icon={<Timelapse />} />
              <BalanceCard label="Sup. ancienneté"     value={balance.supplement_anciennete}  color="#7C3AED" icon={<WorkspacePremium />} />
              <BalanceCard label="Sup. enfants"        value={balance.supplement_enfant}      color="#EC4899" icon={<ChildCare />} />
              <BalanceCard label="Jours utilisés"      value={balance.jours_utilises}         color="#D97706" icon={<CalendarMonth />} />
              <BalanceCard label="Ancienneté (ans)"    value={balance.anciennete_years}       color="#64748B" icon={<Person />} />
            </Box>
          )}
        </Box>
      )}

      {/* ── Barre d'outils Vue ── */}
      <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)}>
          <ToggleButton value="table" sx={{ gap: 0.75, fontSize: 12, fontWeight: 600, textTransform: 'none', px: 2 }}>
            <ViewList sx={{ fontSize: 16 }} /> Tableau
          </ToggleButton>
          <ToggleButton value="gantt" sx={{ gap: 0.75, fontSize: 12, fontWeight: 600, textTransform: 'none', px: 2 }}>
            <TableChart sx={{ fontSize: 16 }} /> Calendrier Gantt
            {withDates.length > 0 && (
              <Box sx={{ ml: 0.5, px: 0.75, py: 0.1, borderRadius: '10px', bgcolor: '#EFF6FF' }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>{withDates.length}</Typography>
              </Box>
            )}
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        {/* Stats rapides */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
            <Box component="span" sx={{ fontWeight: 800, color: NAV }}>{plannings.length}</Box> planning{plannings.length > 1 ? 's' : ''}
            {withDates.length > 0 && (
              <> · <Box component="span" sx={{ fontWeight: 800, color: '#2563EB' }}>{withDates.length}</Box> planifié{withDates.length > 1 ? 's' : ''}</>
            )}
            {withoutDates.length > 0 && (
              <> · <Box component="span" sx={{ fontWeight: 800, color: '#F59E0B' }}>{withoutDates.length}</Box> sans dates</>
            )}
          </Typography>
        </Box>

        {viewMode === 'gantt' && withoutDates.length > 0 && (
          <Typography sx={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
            Cliquer sur une barre pour modifier les dates
          </Typography>
        )}
      </Box>

      {/* ── Contenu principal ── */}
      <Box sx={{ display: 'flex', gap: 0 }}>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>

          {/* ═══ VUE TABLEAU ═══ */}
          {viewMode === 'table' && (
            <>
              <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Plannings — {annee} ({plannings.length})
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Agent', 'Matricule', 'Dir.', 'Dispo', 'Total', 'Départ prévu', 'Retour prévu', 'Jours prog.', 'Statut réalisation', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ bgcolor: '#1E3A5F', color: '#fff', fontWeight: 700, fontSize: 10.5, py: 0.9, whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingPlannings ? (
                      <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                    ) : plannings.length === 0 ? (
                      <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', py: 5, color: '#94A3B8', fontSize: 13 }}>
                        Aucun planning généré pour {annee}. Cliquez sur "Générer".
                      </TableCell></TableRow>
                    ) : plannings.map((p, idx) => {
                      const hasDepart = !!p.date_depart_prevu;
                      // Départ imminent (≤14 jours)
                      const daysUntil = hasDepart
                        ? dayjs(p.date_depart_prevu!).diff(dayjs(), 'day')
                        : null;
                      const isImminent = daysUntil !== null && daysUntil >= 0 && daysUntil <= 14;

                      return (
                        <TableRow key={p.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#F8FAFC', '&:hover': { bgcolor: '#EFF6FF' } }}>
                          <TableCell sx={{ py: 0.75 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: 9, fontWeight: 700, bgcolor: '#1E3A5F' }}>
                                {p.employee?.first_name?.[0]}{p.employee?.last_name?.[0]}
                              </Avatar>
                              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }} noWrap>
                                {p.employee?.first_name} {p.employee?.last_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{p.employee?.employee_number}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{p.employee?.department?.code ?? p.employee?.department?.name ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: '#334155' }}>{p.nbre_jour_dispo}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: '#059669' }}>{p.nbre_jour_total_disponible}</TableCell>

                          {/* Date départ */}
                          <TableCell sx={{ py: 0.75 }}>
                            {hasDepart ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB' }}>
                                  {dayjs(p.date_depart_prevu!).format('DD/MM/YYYY')}
                                </Typography>
                                {isImminent && (
                                  <Box sx={{ px: 0.6, py: 0.15, borderRadius: '4px',
                                    bgcolor: daysUntil === 0 ? '#FEF2F2' : daysUntil <= 3 ? '#FFF7ED' : '#FFFBEB',
                                    border: `1px solid ${daysUntil === 0 ? '#FECACA' : daysUntil <= 3 ? '#FED7AA' : '#FDE68A'}`,
                                  }}>
                                    <Typography sx={{ fontSize: 9, fontWeight: 800,
                                      color: daysUntil === 0 ? '#DC2626' : daysUntil <= 3 ? '#EA580C' : '#D97706',
                                      lineHeight: 1 }}>
                                      {daysUntil === 0 ? "Auj." : daysUntil === 1 ? "Demain" : `J-${daysUntil}`}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>—</Typography>
                            )}
                          </TableCell>

                          {/* Date retour */}
                          <TableCell sx={{ fontSize: 11.5, fontWeight: p.date_retour_prevu ? 600 : 400, color: p.date_retour_prevu ? '#059669' : '#CBD5E1', fontStyle: p.date_retour_prevu ? 'normal' : 'italic' }}>
                            {p.date_retour_prevu ? dayjs(p.date_retour_prevu).format('DD/MM/YYYY') : '—'}
                          </TableCell>

                          {/* Jours programmés */}
                          <TableCell sx={{ textAlign: 'right' }}>
                            {p.nbre_jours_programme ? (
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>{p.nbre_jours_programme}j</Typography>
                            ) : <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>}
                          </TableCell>

                          {/* Statut réalisation */}
                          <TableCell>
                            <StatutChip statut={p.statut_realisation} />
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <Tooltip title="Planifier les dates de congé">
                              <IconButton size="small" onClick={() => setEditTarget(p)}
                                sx={{ color: '#2563EB', bgcolor: '#EFF6FF', borderRadius: '6px', width: 26, height: 26, '&:hover': { bgcolor: '#DBEAFE' } }}>
                                <Edit sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* ═══ VUE GANTT ═══ */}
          {viewMode === 'gantt' && (
            <>
              <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Calendrier Gantt — {annee}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5 }}>
                  {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: STATUT_BAR_COLOR[key as keyof typeof STATUT_BAR_COLOR] }} />
                      <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>{cfg.label}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 2, bgcolor: '#EF4444' }} />
                    <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>Aujourd'hui</Typography>
                  </Box>
                </Box>
              </Box>
              {loadingPlannings ? (
                <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={28} /></Box>
              ) : plannings.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>Aucun planning pour {annee}. Générez d'abord.</Typography>
                </Box>
              ) : (
                <GanttView plannings={plannings} annee={annee} onEdit={(p) => setEditTarget(p)} />
              )}
            </>
          )}
        </Box>

        {/* ─── Jours fériés ─── */}
        <Box sx={{ width: 220, flexShrink: 0, borderLeft: '1px solid #E2E8F0' }}>
          <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Jours fériés {annee}
            </Typography>
          </Box>
          <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
            {holidays.map((h, i) => (
              <Box key={i} sx={{
                display: 'flex', gap: 1, px: 1.5, py: 0.75,
                borderBottom: '1px solid #F1F5F9',
                bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC',
                '&:hover': { bgcolor: '#EFF6FF' },
              }}>
                <Box sx={{ width: 38, fontSize: 10, fontWeight: 700, color: '#fff', bgcolor: '#E31937', borderRadius: '5px', textAlign: 'center', py: 0.25, flexShrink: 0 }}>
                  {dayjs(h.date).format('DD/MM')}
                </Box>
                <Typography sx={{ fontSize: 11, color: '#334155', lineHeight: 1.3 }} noWrap>{h.libelle}</Typography>
              </Box>
            ))}
            {holidays.length === 0 && (
              <Typography sx={{ fontSize: 12, color: '#94A3B8', p: 2, textAlign: 'center' }}>Chargement…</Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Dialog édition dates ── */}
      <DateEditDialog
        planning={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['leave-plannings'] })}
      />
    </Box>
  );
}
