import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel,
  Autocomplete, Chip, Alert, CircularProgress, TablePagination, Tooltip,
  LinearProgress, Divider, RadioGroup, Radio,
} from '@mui/material';
import {
  Add, Search, Clear, CheckCircle, Cancel, Print, Description,
  BeachAccess, EventBusy,
} from '@mui/icons-material';
import { leavesApi, leaveTypesApi } from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import { documentsApi } from '../../api/documents';
import { organisationUnitApi } from '../../api/organisationUnits';
import type { OrgUnit } from '../../api/organisationUnits';
import StatusChip from '../../components/common/StatusChip';
import LeavePlanningTab from '../../components/employees/LeavePlanningTab';
import LeaveBalanceTab from '../../components/employees/LeaveBalanceTab';
import LeaveParamsTab from './LeaveParamsTab';
import LeaveCarryoverTab from './LeaveCarryoverTab';
import LeavePostponementTab from './LeavePostponementTab';
import JustificationsPage from '../justifications/JustificationsPage';
import AbsenceParamsTab from './AbsenceParamsTab';
import AbsenceWorkflowDialog from './AbsenceWorkflowDialog';
import { formatDate } from '../../utils/format';
import type { Leave, GeneratedDocument } from '../../types';

/* ─── Palette ─── */
const NAV = '#0D2137';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

/* ─── Sub-tabs per section ─── */
const CONGE_TABS   = ['Demande', 'En attente', 'Historique', 'Planning', 'Solde', 'Report', 'Paramètres', 'Justification'] as const;
const ABSENCE_TABS = ['Demande', 'En attente', 'Historique', 'Justification', 'Paramètres'] as const;

export default function LeavesPage() {
  const qc = useQueryClient();

  /* ── Section principale ── */
  const [mainTab,     setMainTab]     = useState<'conge' | 'absence'>('absence');
  const [congeSubTab, setCongeSubTab] = useState(0);
  const [absSubTab,   setAbsSubTab]   = useState(0);

  const subTab    = mainTab === 'conge' ? congeSubTab : absSubTab;
  const tabLabels = mainTab === 'conge' ? CONGE_TABS  : ABSENCE_TABS;

  const setSubTab = (v: number) => {
    if (mainTab === 'conge') setCongeSubTab(v);
    else setAbsSubTab(v);
    setPage(0);
    setSelectedId(null);
  };

  const switchMainTab = (t: 'conge' | 'absence') => {
    setMainTab(t);
    setPage(0);
    setSelectedId(null);
    setGlobalSearch('');
  };

  /* ── Pagination ── */
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ── Filtres ── */
  const [globalSearch, setGlobalSearch] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [directionId,  setDirectionId]  = useState<number | ''>('');
  const [divisionId,   setDivisionId]   = useState<number | ''>('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [matricule,    setMatricule]    = useState('');

  /* ── Dialogs ── */
  const [newOpen,        setNewOpen]        = useState(false);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [validateOpen,   setValidateOpen]   = useState<{ leave: Leave; action: 'approve' | 'reject' } | null>(null);
  const [comment,        setComment]        = useState('');
  const [attestOpen,     setAttestOpen]     = useState(false);
  const [attestTemplate, setAttestTemplate] = useState('');
  const [lastGenerated,  setLastGenerated]  = useState<GeneratedDocument | null>(null);
  const [workflowOpen,   setWorkflowOpen]   = useState<Leave | null>(null);

  /* ── Form nouveau ── */
  const [formEmpId,  setFormEmpId]  = useState<number | null>(null);
  const [formTypeId, setFormTypeId] = useState('');
  const [formStart,  setFormStart]  = useState('');
  const [formEnd,    setFormEnd]    = useState('');
  const [formReason, setFormReason] = useState('');
  /* ── Champs spécifiques absences ── */
  const [formDuration,       setFormDuration]       = useState<string>('');
  const [formDecisionRef,    setFormDecisionRef]    = useState('');
  const [formDecisionAvenir, setFormDecisionAvenir] = useState(false);
  const [absCalcMode,        setAbsCalcMode]        = useState<'dates' | 'duration'>('dates');
  const [formTypeAutreDesc,  setFormTypeAutreDesc]  = useState('');
  const [formAbsImputation,  setFormAbsImputation]  = useState<'absence_quota' | 'conge_quota' | 'none' | ''>('');
  const [isCreatingType,     setIsCreatingType]     = useState(false);
  const [createError,        setCreateError]        = useState<string | null>(null);

  /* ── Queries ── */
  const { data: allConges = [], isLoading: congesLoading } = useQuery({
    queryKey: ['leaves', 'conge'],
    queryFn: () => leavesApi.list({ category: 'conge', per_page: 500 }).then(r => r.data),
  });

  const { data: allAbsences = [], isLoading: absLoading } = useQuery({
    queryKey: ['leaves', 'absence'],
    queryFn: () => leavesApi.list({ category: 'absence', per_page: 500 }).then(r => r.data),
  });

  const leaves    = mainTab === 'conge' ? allConges   : allAbsences;
  const isLoading = mainTab === 'conge' ? congesLoading : absLoading;

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaves', 'types'],
    queryFn: () => leavesApi.types().then(r => r.data),
  });

  const { data: attestTemplates = [] } = useQuery({
    queryKey: ['documents', 'templates', 'attestation'],
    queryFn: () => documentsApi.listTemplates({ type: 'attestation' }).then(r => r.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then(r => r.data),
  });
  const employees = employeesData?.data ?? [];

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['organisation-units'],
    queryFn: () => organisationUnitApi.list().then(r => r.data),
  });

  const directions = useMemo(() => {
    const govIds = new Set(orgUnits.filter(u => u.type === 'gouvernance').map(u => u.id));
    return orgUnits.filter(u => u.parent_id === null || govIds.has(u.parent_id));
  }, [orgUnits]);

  const divisions = useMemo(
    () => directionId ? orgUnits.filter(u => u.parent_id === directionId) : [],
    [orgUnits, directionId],
  );

  const selectedOrgIds = useMemo((): Set<number> => {
    if (!directionId) return new Set();
    const result = new Set<number>();
    const queue  = [directionId as number];
    while (queue.length) {
      const id = queue.shift()!;
      result.add(id);
      orgUnits.filter(u => u.parent_id === id).forEach(u => queue.push(u.id));
    }
    return result;
  }, [orgUnits, directionId]);

  /* ── Types filtrés pour la section courante ── */
  const sectionLeaveTypes = useMemo(
    () => mainTab === 'absence'
      ? leaveTypes.filter(t => t.category === 'absence')
      : leaveTypes.filter(t => t.category !== 'absence'),
    [leaveTypes, mainTab],
  );

  /* ── Solde absences de l'agent sélectionné (année en cours) ── */
  const { data: absenceYearBalance } = useQuery({
    queryKey: ['leaves', 'absence', 'year-balance', formEmpId, new Date().getFullYear()],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const r = await leavesApi.list({
        category: 'absence', employee_id: formEmpId!, from: `${year}-01-01`, per_page: 500,
      });
      const used = r.data
        .filter(l => !['rejected', 'cancelled'].includes(l.status))
        .reduce((s, l) => s + (l.days_count ?? 0), 0);
      return { used, remaining: Math.max(0, 15 - used) };
    },
    enabled: !!formEmpId && mainTab === 'absence' && newOpen,
    staleTime: 30_000,
  });

  /* ── Calcul durée depuis dates (absence) ── */
  const { data: calcDaysResult, isFetching: calcDaysLoading } = useQuery({
    queryKey: ['calc-days-abs', formStart, formEnd],
    queryFn: () => leavesApi.calculateDays(formStart, formEnd, false),
    enabled: mainTab === 'absence' && absCalcMode === 'dates' && !!formStart && !!formEnd && newOpen,
    staleTime: Infinity,
  });

  /* ── Calcul date fin depuis durée + début (absence) ── */
  const { data: calcEndResult, isFetching: calcEndLoading } = useQuery({
    queryKey: ['calc-end-abs', formStart, formDuration],
    queryFn: () => leavesApi.calculateEndDate(formStart, Number(formDuration)),
    enabled: mainTab === 'absence' && absCalcMode === 'duration' && !!formStart && Number(formDuration) > 0 && newOpen,
    staleTime: Infinity,
  });

  /* ── Calcul durée depuis dates (congé, avec règle vendredi) ── */
  const { data: calcCongeDaysResult, isFetching: calcCongeDaysLoading } = useQuery({
    queryKey: ['calc-days-conge', formStart, formEnd],
    queryFn: () => leavesApi.calculateDays(formStart, formEnd, true),
    enabled: mainTab === 'conge' && absCalcMode === 'dates' && !!formStart && !!formEnd && newOpen,
    staleTime: Infinity,
  });

  /* ── Calcul date fin depuis durée + début (congé) ── */
  const { data: calcCongeEndResult, isFetching: calcCongeEndLoading } = useQuery({
    queryKey: ['calc-end-conge', formStart, formDuration],
    queryFn: () => leavesApi.calculateEndDate(formStart, Number(formDuration)),
    enabled: mainTab === 'conge' && absCalcMode === 'duration' && !!formStart && Number(formDuration) > 0 && newOpen,
    staleTime: Infinity,
  });

  /* ── Solde congés de l'agent sélectionné ── */
  const { data: congeBalance } = useQuery({
    queryKey: ['leaves', 'balance', formEmpId],
    queryFn: () => leavesApi.balance(formEmpId!),
    enabled: !!formEmpId && mainTab === 'conge' && newOpen,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (calcDaysResult && mainTab === 'absence' && absCalcMode === 'dates') setFormDuration(String(calcDaysResult.working_days));
  }, [calcDaysResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (calcEndResult && mainTab === 'absence' && absCalcMode === 'duration') setFormEnd(calcEndResult.end_date);
  }, [calcEndResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (calcCongeDaysResult && mainTab === 'conge' && absCalcMode === 'dates') setFormDuration(String(calcCongeDaysResult.working_days));
  }, [calcCongeDaysResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (calcCongeEndResult && mainTab === 'conge' && absCalcMode === 'duration') setFormEnd(calcCongeEndResult.end_date);
  }, [calcCongeEndResult]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-remplir durée depuis le type d'absence sélectionné */
  useEffect(() => {
    if (mainTab !== 'absence' || !formTypeId) return;
    const selectedType = sectionLeaveTypes.find(t => String(t.id) === formTypeId);
    if (selectedType?.max_days_per_year) {
      setFormDuration(String(selectedType.max_days_per_year));
      setAbsCalcMode('duration');
      setFormEnd(''); // réinitialise la date fin pour qu'elle soit recalculée
    }
  }, [formTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Détection jour vendredi pour la règle congé */
  const isStartFriday = formStart
    ? new Date(formStart + 'T12:00').getDay() === 5
    : false;

  /* ── Soumission (gère la création lazy du type "Autre") ── */
  const handleSubmit = async () => {
    setCreateError(null);

    // Vérification solde congés
    if (mainTab === 'conge' && congeBalance && formDuration) {
      if (Number(formDuration) > congeBalance.solde_disponible) {
        setCreateError(
          `Solde insuffisant. ${congeBalance.solde_disponible} jour(s) disponible(s) — ${formDuration} jour(s) demandé(s).`
        );
        return;
      }
    }

    let typeId = Number(formTypeId);

    if (formTypeId === 'autre') {
      let autreType = leaveTypes.find(t => t.code === 'ABS_AUTRE');
      if (!autreType) {
        setIsCreatingType(true);
        try {
          const res = await leaveTypesApi.create({
            name: 'Autre', code: 'ABS_AUTRE', category: 'absence',
            color: '#94A3B8', is_active: true, paid: true, requires_justification: false,
          });
          autreType = res.data;
          qc.invalidateQueries({ queryKey: ['leaves', 'types'] });
        } finally {
          setIsCreatingType(false);
        }
      }
      typeId = autreType!.id;
    }

    createMutation.mutate({
      employee_id:   formEmpId!,
      leave_type_id: typeId,
      start_date:    formStart,
      end_date:      formEnd,
      reason: formTypeId === 'autre' && formTypeAutreDesc.trim()
        ? `[${formTypeAutreDesc.trim()}] ${formReason}`.trim()
        : formReason,
      ...(mainTab === 'absence' && {
        leave_decision_ref:    formDecisionRef || null,
        leave_decision_avenir: formDecisionAvenir,
        ...(formTypeId === 'autre' && formAbsImputation && {
          abs_imputation: formAbsImputation,
        }),
      }),
    });
  };

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: (d: Partial<Leave>) => leavesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setNewOpen(false); resetForm(); },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
          ?.response?.data?.message
        ?? 'Une erreur est survenue. Vérifiez les informations saisies.';
      setCreateError(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.approve(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setValidateOpen(null); setComment(''); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.reject(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setValidateOpen(null); setComment(''); },
  });

  const generateMutation = useMutation({
    mutationFn: () => documentsApi.generate(Number(attestTemplate), [selectedLeave!.employee_id]),
    onSuccess: (r) => {
      setLastGenerated((r.data as { documents?: GeneratedDocument[] }).documents?.[0] ?? null);
      qc.invalidateQueries({ queryKey: ['documents', 'generated'] });
    },
  });

  const resetForm = () => {
    setFormEmpId(null); setFormTypeId(''); setFormStart(''); setFormEnd(''); setFormReason('');
    setFormDuration(''); setFormDecisionRef(''); setFormDecisionAvenir(false); setAbsCalcMode('dates');
    setFormTypeAutreDesc(''); setFormAbsImputation(''); setCreateError(null);
  };

  /* ── Filtrage ── */
  const matchSearch = (l: Leave) => {
    if (!globalSearch) return true;
    const s   = globalSearch.toLowerCase();
    const name = `${l.employee?.first_name ?? ''} ${l.employee?.last_name ?? ''}`.toLowerCase();
    const mat  = (l.employee?.employee_number ?? '').toLowerCase();
    const svc  = (l.employee?.organisation_unit?.name ?? l.employee?.department?.name ?? '').toLowerCase();
    return name.includes(s) || mat.includes(s) || svc.includes(s);
  };

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      if (!matchSearch(l)) return false;
      if (dateFrom && l.start_date < dateFrom) return false;
      if (dateTo   && l.end_date   > dateTo)   return false;
      if (divisionId) {
        if (l.employee?.organisation_unit_id !== divisionId) return false;
      } else if (directionId) {
        const uid = l.employee?.organisation_unit_id;
        if (!uid || !selectedOrgIds.has(uid)) return false;
      }
      if (typeFilter && String(l.leave_type_id) !== typeFilter) return false;
      if (matricule && !(l.employee?.employee_number ?? '').toLowerCase().includes(matricule.toLowerCase())) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves, globalSearch, dateFrom, dateTo, directionId, divisionId, selectedOrgIds, typeFilter, matricule]);

  const pendingFiltered = useMemo(() => filtered.filter(l => l.status === 'pending'), [filtered]);
  const historyFiltered = useMemo(() => filtered.filter(l => l.status !== 'pending'), [filtered]);

  const isTableTab = subTab <= 2;
  const rows  = subTab === 0 ? filtered : subTab === 1 ? pendingFiltered : historyFiltered;
  const paged = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const selectedLeave = leaves.find(l => l.id === selectedId) ?? null;

  const handleClear = () => {
    setDateFrom(''); setDateTo('');
    setDirectionId(''); setDivisionId('');
    setTypeFilter(''); setMatricule('');
  };

  /* ─── Contenu onglet ─── */
  const renderContent = () => {
    /* Onglets spéciaux Congés */
    if (mainTab === 'conge') {
      if (congeSubTab === 3) return <LeavePlanningTab />;
      if (congeSubTab === 4) return <LeaveBalanceTab />;
      if (congeSubTab === 5) return <LeavePostponementTab />;
      if (congeSubTab === 6) return <LeaveParamsTab />;
      if (congeSubTab === 7) return <JustificationsPage />;
    }
    /* Onglets spéciaux Absences */
    if (mainTab === 'absence' && absSubTab === 3) return <JustificationsPage />;
    if (mainTab === 'absence' && absSubTab === 4) return <AbsenceParamsTab />;

    /* ── Vue tableau ── */
    const sectionTitle =
      subTab === 0 ? `Gestion des ${mainTab === 'conge' ? 'congés' : 'absences'}`
      : subTab === 1 ? 'En attente de validation'
      : 'Historique';

    return (
      <Box>
        {/* Titre section */}
        <Box sx={{ bgcolor: TH, px: 2.5, py: 1.25 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{sectionTitle}</Typography>
        </Box>

        {/* Filtres avancés */}
        <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', p: 2, bgcolor: '#F8FAFC' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chercher
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
            <TextField label="De" type="date" size="small" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 155 }} />
            <TextField label="À" type="date" size="small" value={dateTo}
              onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 155 }} />
            <FormControl size="small" sx={{ bgcolor: '#fff', width: 190 }}>
              <InputLabel>Direction / Entité</InputLabel>
              <Select value={directionId} label="Direction / Entité"
                onChange={e => { setDirectionId(e.target.value as number | ''); setDivisionId(''); }}>
                <MenuItem value="">Toutes</MenuItem>
                {directions.map(d => <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ bgcolor: '#fff', width: 190 }} disabled={!directionId}>
              <InputLabel>Division / Service</InputLabel>
              <Select value={divisionId} label="Division / Service"
                onChange={e => setDivisionId(e.target.value as number | '')}>
                <MenuItem value="">Tous</MenuItem>
                {divisions.map(d => <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ bgcolor: '#fff', width: 190 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                <MenuItem value="">Tous</MenuItem>
                {sectionLeaveTypes.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Matricule" size="small" value={matricule}
              onChange={e => setMatricule(e.target.value)} sx={{ bgcolor: '#fff', width: 140 }} />
            <Button variant="contained" size="small" startIcon={<Search sx={{ fontSize: '14px !important' }} />}
              sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '6px', fontSize: 12, fontWeight: 700 }}>
              Chercher
            </Button>
            <Button variant="outlined" size="small" startIcon={<Clear sx={{ fontSize: '14px !important' }} />}
              onClick={handleClear}
              sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 600, borderColor: '#CBD5E1', color: '#64748B' }}>
              Effacer
            </Button>
          </Stack>
        </Box>

        {/* Boutons actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, py: 1, bgcolor: '#F1F5F9', border: '1px solid #CBD5E1', borderTop: 'none' }}>
          {subTab !== 2 && (
            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: '14px !important' }} />}
              onClick={() => setNewOpen(true)}
              sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90 }}>
              Nouveau
            </Button>
          )}
          <Button variant="outlined" size="small" disabled={!selectedId}
            onClick={() => setDetailOpen(true)}
            sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90, borderColor: TH, color: TH }}>
            Détails
          </Button>
          <Button variant="outlined" size="small"
            startIcon={<Print sx={{ fontSize: '14px !important' }} />}
            disabled={!selectedId || selectedLeave?.status !== 'approved'}
            onClick={() => { setLastGenerated(null); setAttestTemplate(''); setAttestOpen(true); }}
            sx={{
              borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90,
              borderColor: ACT, color: ACT,
              '&:hover': { bgcolor: '#FFF7F0', borderColor: ACT },
              '&.Mui-disabled': { borderColor: '#E2E8F0', color: '#CBD5E1' },
            }}>
            Imprimer Attestation
          </Button>
        </Box>

        {/* Table */}
        <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', bgcolor: '#334155', px: 2, py: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Liste
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  <TableCell padding="checkbox" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                    <Checkbox size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </TableCell>
                  {['N°#', 'Matricule', 'Prénom et Nom', 'Service', 'Type', 'Date Début', 'Date Fin', 'Nbr Jours', 'Statut', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', py: 1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j}><Skeleton height={18} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 13 }}>
                          Aucune demande
                        </TableCell>
                      </TableRow>
                    )
                  : paged.map((leave, idx) => (
                      <TableRow key={leave.id} hover selected={selectedId === leave.id}
                        onClick={() => setSelectedId(leave.id === selectedId ? null : leave.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selectedId === leave.id ? '#EFF6FF' : idx % 2 === 0 ? '#fff' : '#F8FAFC',
                          '&:hover': { bgcolor: '#EFF6FF' },
                        }}>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selectedId === leave.id}
                            onChange={() => setSelectedId(leave.id === selectedId ? null : leave.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{page * rowsPerPage + idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{leave.employee?.employee_number ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{leave.employee?.first_name} {leave.employee?.last_name}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {leave.employee?.organisation_unit?.name ?? leave.employee?.department?.name ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <Chip label={leave.leaveType?.name ?? '—'} size="small"
                            sx={{
                              fontSize: 11, height: 20,
                              bgcolor: leave.leaveType?.color ? `${leave.leaveType.color}20` : '#EEF2FF',
                              color:   leave.leaveType?.color ?? '#6366F1',
                              fontWeight: 600,
                            }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDate(leave.start_date)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDate(leave.end_date)}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', textAlign: 'center' }}>
                          {leave.days_count}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <StatusChip status={leave.status} />
                            {/* Indicateur d'étape pour toutes les demandes en attente */}
                            {leave.status === 'pending' && (
                              <Chip
                                label={`Étape ${(leave.abs_approval_level ?? 0) + 1}`}
                                size="small"
                                sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E' }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {/* Toutes les demandes en attente passent par le workflow */}
                          {leave.status === 'pending' && (
                            <Button size="small" variant="contained"
                              startIcon={<CheckCircle sx={{ fontSize: '12px !important' }} />}
                              onClick={e => { e.stopPropagation(); setWorkflowOpen(leave); }}
                              sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: '5px', bgcolor: '#0D2137', '&:hover': { bgcolor: '#1A3A5C' } }}>
                              Traiter
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Lignes :"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
            sx={{
              borderTop: '1px solid #CBD5E1',
              '& .MuiTablePagination-toolbar': { fontSize: 12 },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
            }}
          />
        </Box>
      </Box>
    );
  };

  /* ─── Compteurs section ─── */
  const pendingConges   = allConges.filter(l => l.status === 'pending').length;
  const pendingAbsences = allAbsences.filter(l => l.status === 'pending').length;

  return (
    <Box>
      {/* ══ En-tête ══ */}
      <Box sx={{ bgcolor: NAV, borderRadius: '12px 12px 0 0' }}>
        {/* Tabs principaux Absences / Congés */}
        <Box sx={{ px: 3, pt: 1.5, display: 'flex', gap: 0.5 }}>
          {([
            ['absence', 'Absences',  EventBusy,    pendingAbsences],
            ['conge',   'Congés',    BeachAccess,  pendingConges],
          ] as const).map(([key, label, Icon, pendingCount]) => {
            const active = mainTab === key;
            return (
              <Box key={key}
                onClick={() => switchMainTab(key)}
                sx={{
                  px: 2.5, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
                  bgcolor: active ? 'rgba(255,255,255,0.13)' : 'transparent',
                  color:   active ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  borderBottom: active ? `3px solid ${ACT}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <Icon sx={{ fontSize: 16 }} />
                {label}
                {pendingCount > 0 && !active && (
                  <Box sx={{
                    px: 0.8, lineHeight: '18px', bgcolor: '#EF4444',
                    borderRadius: '10px', fontSize: 11, fontWeight: 800,
                    color: '#fff', minWidth: 18, textAlign: 'center',
                  }}>
                    {pendingCount}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Titre + stats */}
        <Box sx={{ px: 3, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
            {mainTab === 'conge' ? 'Gestion des Congés' : 'Gestion des Absences'}
          </Typography>
          <Stack direction="row" spacing={2}>
            {[
              { label: 'Total',      count: leaves.length,                                      color: '#93C5FD' },
              { label: 'En attente', count: leaves.filter(l => l.status === 'pending').length,  color: '#FCD34D' },
              { label: 'Approuvés',  count: leaves.filter(l => l.status === 'approved').length, color: '#6EE7B7' },
              { label: 'Refusés',    count: leaves.filter(l => l.status === 'rejected').length, color: '#FCA5A5' },
            ].map(({ label, count, color }) => (
              <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</Typography>
                <Box sx={{ px: 1, py: 0.1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.12)', minWidth: 24, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color }}>{count}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* ══ Sous-onglets ══ */}
      <Box sx={{ bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: `2px solid ${NAV}` }}>
        {tabLabels.map((label, i) => {
          const isActive = i === subTab;
          const count    = i === 0 ? filtered.length
                         : i === 1 ? pendingFiltered.length
                         : i === 2 ? historyFiltered.length
                         : null;
          const dot = i === 1 && pendingFiltered.length > 0;

          return (
            <Box key={i}
              onClick={() => setSubTab(i)}
              sx={{
                px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
                fontWeight: 700, fontSize: 13, userSelect: 'none', position: 'relative',
                bgcolor:      isActive ? ACT : '#fff',
                color:        isActive ? '#fff' : TH,
                border:       `1.5px solid ${isActive ? ACT : '#93C5FD'}`,
                borderBottom: 'none',
                boxShadow:    isActive ? '0 -2px 8px rgba(232,93,4,0.25)' : 'none',
                transition:   'all 0.15s',
                '&:hover':    { bgcolor: isActive ? ACT : '#EFF6FF' },
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {dot && !isActive && (
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0,
                  boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%,100%': { transform: 'scale(1)', opacity: 1 },
                    '50%':     { transform: 'scale(1.4)', opacity: 0.6 },
                  },
                }} />
              )}
              {label}
              {count !== null && (
                <Box sx={{
                  px: 0.9, py: 0, borderRadius: '10px', fontSize: 11, fontWeight: 800, lineHeight: '20px',
                  bgcolor: isActive ? 'rgba(255,255,255,0.28)' : dot ? '#EF4444' : '#E2E8F0',
                  color:   isActive ? '#fff' : dot ? '#fff' : '#64748B',
                  minWidth: 20, textAlign: 'center', transition: 'all 0.2s',
                }}>
                  {count}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ══ Barre recherche globale (uniquement sur onglets table) ══ */}
      {isTableTab && (
        <Box sx={{
          border: '1px solid #CBD5E1', borderTop: 'none',
          px: 2, py: 1, bgcolor: '#F8FAFC',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Search sx={{ fontSize: 16, color: '#94A3B8', flexShrink: 0 }} />
          <TextField size="small"
            placeholder="Rechercher par nom, matricule, service…"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 380, bgcolor: '#fff' }}
            InputProps={{ sx: { fontSize: 13 } }}
          />
          {globalSearch && (
            <>
              <Button size="small" variant="outlined"
                startIcon={<Clear sx={{ fontSize: '13px !important' }} />}
                onClick={() => setGlobalSearch('')}
                sx={{ fontSize: 11, color: '#64748B', borderColor: '#CBD5E1', minWidth: 0, px: 1 }}>
                Effacer
              </Button>
              <Typography sx={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
                {rows.length} résultat(s)
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* ══ Contenu ══ */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {renderContent()}
      </Box>

      {/* ── Dialog : Nouveau ── */}
      <Dialog open={newOpen} onClose={() => { setNewOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15, py: 1.75, display: 'flex', alignItems: 'center', gap: 1 }}>
          {mainTab === 'absence'
            ? <EventBusy sx={{ fontSize: 18, opacity: 0.85 }} />
            : <BeachAccess sx={{ fontSize: 18, opacity: 0.85 }} />}
          Nouvelle demande — {mainTab === 'conge' ? 'Congé' : 'Absence'}
        </DialogTitle>

        <DialogContent sx={{ pt: '20px !important' }}>
          <Stack spacing={2.5}>

            {/* Erreur API */}
            {createError && (
              <Alert severity="error" onClose={() => setCreateError(null)} sx={{ fontSize: 12 }}>
                {createError}
              </Alert>
            )}

            {/* ── Agent ── */}
            <Box>
              <Autocomplete
                options={employees}
                getOptionLabel={e => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
                onChange={(_, v) => setFormEmpId(v?.id ?? null)}
                renderInput={p => <TextField {...p} label="Agent" size="small" required />}
              />
              {/* Solde congés (uniquement section Congés) */}
              {mainTab === 'conge' && formEmpId && congeBalance && (() => {
                const { solde_disponible, total_brut, jours_utilises, supplement_enfant, supplement_anciennete,
                        solde_reporte, expire_annee, report_expire } = congeBalance;
                const ok  = solde_disponible > 0;
                const pct = total_brut > 0 ? Math.min(100, (jours_utilises / total_brut) * 100) : 0;
                return (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: '8px' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: ok ? '#065F46' : '#991B1B' }}>
                        Solde congés {new Date().getFullYear()}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        {supplement_enfant > 0 && (
                          <Chip label={`+${supplement_enfant}j enfant(s)`} size="small"
                            sx={{ fontSize: 10, height: 18, bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700 }} />
                        )}
                        {supplement_anciennete > 0 && (
                          <Chip label={`+${supplement_anciennete}j ancienneté`} size="small"
                            sx={{ fontSize: 10, height: 18, bgcolor: '#EDE9FE', color: '#5B21B6', fontWeight: 700 }} />
                        )}
                        {(solde_reporte ?? 0) > 0 && !report_expire && (
                          <Chip
                            label={`${solde_reporte}j reporté${expire_annee ? ` (exp. ${expire_annee})` : ''}`}
                            size="small"
                            sx={{ fontSize: 10, height: 18, bgcolor: '#FFF7ED', color: '#C2410C', fontWeight: 700 }}
                          />
                        )}
                        <Chip label={`${jours_utilises}j / ${total_brut}j`} size="small"
                          sx={{ fontSize: 11, height: 20, bgcolor: ok ? '#D1FAE5' : '#FEE2E2', color: ok ? '#065F46' : '#991B1B', fontWeight: 700 }} />
                        <Chip label={`${solde_disponible}j restants`} size="small"
                          sx={{ fontSize: 11, height: 20, bgcolor: ok ? '#059669' : '#DC2626', color: '#fff', fontWeight: 700 }} />
                      </Stack>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: ok ? '#BBF7D0' : '#FECACA',
                        '& .MuiLinearProgress-bar': { bgcolor: ok ? '#059669' : '#DC2626', borderRadius: 3 } }} />
                  </Box>
                );
              })()}

              {/* Solde absences (uniquement section Absences) */}
              {mainTab === 'absence' && formEmpId && absenceYearBalance && (() => {
                const pct = Math.min(100, (absenceYearBalance.used / 15) * 100);
                const ok  = absenceYearBalance.remaining > 0;
                return (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: '8px' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: ok ? '#065F46' : '#991B1B' }}>
                        Absences {new Date().getFullYear()}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`${absenceYearBalance.used}j / 15j`} size="small"
                          sx={{ fontSize: 11, height: 20, bgcolor: ok ? '#D1FAE5' : '#FEE2E2', color: ok ? '#065F46' : '#991B1B', fontWeight: 700 }} />
                        <Chip label={`${absenceYearBalance.remaining}j restants`} size="small"
                          sx={{ fontSize: 11, height: 20, bgcolor: ok ? '#059669' : '#DC2626', color: '#fff', fontWeight: 700 }} />
                      </Stack>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: ok ? '#BBF7D0' : '#FECACA',
                        '& .MuiLinearProgress-bar': { bgcolor: ok ? '#059669' : '#DC2626', borderRadius: 3 } }} />
                  </Box>
                );
              })()}
            </Box>

            {/* ── Type ── */}
            <FormControl size="small" fullWidth required>
              <InputLabel>Type {mainTab === 'conge' ? 'de congé' : "d'absence"}</InputLabel>
              <Select value={formTypeId} label={`Type ${mainTab === 'conge' ? 'de congé' : "d'absence"}`}
                onChange={e => { setFormTypeId(e.target.value); setFormTypeAutreDesc(''); setFormAbsImputation(''); }}>
                {sectionLeaveTypes.filter(t => t.code !== 'ABS_AUTRE').map(t => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                ))}
                {mainTab === 'absence' && [
                  <Divider key="div" />,
                  <MenuItem key="autre" value="autre" sx={{ fontStyle: 'italic', color: '#64748B' }}>
                    Autre (préciser)
                  </MenuItem>,
                ]}
              </Select>
            </FormControl>

            {/* Champ description pour "Autre" */}
            {mainTab === 'absence' && formTypeId === 'autre' && (
              <TextField
                label="Précisez le type d'absence"
                size="small" fullWidth required autoFocus
                value={formTypeAutreDesc}
                onChange={e => setFormTypeAutreDesc(e.target.value)}
                placeholder="Ex : Accident de travail, Maladie professionnelle…"
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* Imputation pour "Autre" : le RH choisit sur quel quota déduire */}
            {mainTab === 'absence' && formTypeId === 'autre' && (
              <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#334155', px: 2, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Imputer sur *
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC' }}>
                  <RadioGroup
                    row
                    value={formAbsImputation}
                    onChange={e => setFormAbsImputation(e.target.value as 'absence_quota' | 'conge_quota' | 'none')}
                  >
                    <FormControlLabel
                      value="absence_quota"
                      control={<Radio size="small" sx={{ color: TH, '&.Mui-checked': { color: TH } }} />}
                      label={
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          Absences autorisées (15 j/an)
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      value="conge_quota"
                      control={<Radio size="small" sx={{ color: TH, '&.Mui-checked': { color: TH } }} />}
                      label={
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          Solde de congés
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      value="none"
                      control={<Radio size="small" sx={{ color: TH, '&.Mui-checked': { color: TH } }} />}
                      label={
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                          Aucune imputation
                        </Typography>
                      }
                    />
                  </RadioGroup>
                  {!formAbsImputation && (
                    <Typography sx={{ fontSize: 11, color: '#EF4444', mt: 0.5 }}>
                      Veuillez préciser le mode d'imputation
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* ── Dates et durée ── */}
            {mainTab === 'absence' ? (
              <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: TH, px: 2, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Durée de l'absence
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                  <Stack spacing={1.5}>
                    {/* Dates */}
                    <Stack direction="row" spacing={1.5}>
                      <TextField label="Date début" type="date" size="small" fullWidth
                        value={formStart}
                        onChange={e => {
                          setFormStart(e.target.value);
                          if (absCalcMode !== 'duration') {
                            setAbsCalcMode('dates');
                            setFormDuration('');
                          }
                        }}
                        inputProps={{ min: new Date().toISOString().split('T')[0] }}
                        InputLabelProps={{ shrink: true }} required />
                      <TextField label="Date fin" type="date" size="small" fullWidth
                        value={formEnd}
                        onChange={e => { setFormEnd(e.target.value); setAbsCalcMode('dates'); }}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ readOnly: absCalcMode === 'duration' && !!formDuration }}
                        required />
                    </Stack>

                    {/* Durée */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Durée (jours ouvrables)" type="number" size="small" sx={{ flex: 1 }}
                        value={formDuration}
                        onChange={e => { setFormDuration(e.target.value); setAbsCalcMode('duration'); }}
                        InputProps={{
                          inputProps: { min: 1, max: 15, step: 1 },
                          endAdornment: (calcDaysLoading || calcEndLoading)
                            ? <CircularProgress size={14} sx={{ mr: 0.5 }} />
                            : null,
                        }}
                        helperText={
                          absCalcMode === 'duration'
                            ? 'Calcule la date de fin automatiquement'
                            : 'Calculé à partir des dates saisies'
                        }
                        FormHelperTextProps={{ sx: { fontSize: 10, mt: 0.25 } }}
                      />
                      {/* Raccourcis rapides */}
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        {[1, 2, 3, 5].map(d => (
                          <Tooltip key={d} title={`${d} jour${d > 1 ? 's' : ''}`} placement="top">
                            <Box
                              onClick={() => { setFormDuration(String(d)); setAbsCalcMode('duration'); }}
                              sx={{
                                px: 1.25, py: 0.6, borderRadius: '6px', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, userSelect: 'none',
                                bgcolor: formDuration === String(d) ? TH : '#E2E8F0',
                                color:   formDuration === String(d) ? '#fff' : '#475569',
                                border:  `1px solid ${formDuration === String(d) ? TH : '#CBD5E1'}`,
                                '&:hover': { bgcolor: formDuration === String(d) ? TH : '#CBD5E1' },
                                transition: 'all 0.15s',
                              }}
                            >
                              {d}j
                            </Box>
                          </Tooltip>
                        ))}
                      </Stack>
                    </Stack>

                    {/* Info récapitulatif */}
                    {formStart && formEnd && formDuration && (
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 12, color: '#1E40AF' }}>
                          Du <strong>{new Date(formStart).toLocaleDateString('fr-FR')}</strong>{' '}
                          au <strong>{new Date(formEnd).toLocaleDateString('fr-FR')}</strong>{' '}
                          = <strong>{formDuration} jour(s) ouvrable(s)</strong>
                          {' '}(samedis inclus, dimanches et jours fériés exclus)
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Box>
            ) : (
              /* ── Formulaire congé avec calcul bidirectionnel ── */
              <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: TH, px: 2, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Durée du congé
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                  <Stack spacing={1.5}>
                    {/* Dates */}
                    <Stack direction="row" spacing={1.5}>
                      <TextField label="Date début" type="date" size="small" fullWidth
                        value={formStart}
                        onChange={e => {
                          setFormStart(e.target.value);
                          if (absCalcMode !== 'duration') {
                            setAbsCalcMode('dates');
                            setFormDuration('');
                          }
                        }}
                        inputProps={{ min: new Date().toISOString().split('T')[0] }}
                        InputLabelProps={{ shrink: true }} required />
                      <TextField label="Date fin" type="date" size="small" fullWidth
                        value={formEnd}
                        onChange={e => { setFormEnd(e.target.value); setAbsCalcMode('dates'); }}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ readOnly: absCalcMode === 'duration' && !!formDuration }}
                        required />
                    </Stack>

                    {/* Avertissement vendredi */}
                    {isStartFriday && (
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px' }}>
                        <Typography sx={{ fontSize: 12, color: '#92400E' }}>
                          ⚠ Le <strong>{new Date(formStart + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> est un vendredi.
                          Conformément à la règle, le congé débutera le <strong>lundi suivant</strong>.
                        </Typography>
                      </Box>
                    )}

                    {/* Durée */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Durée (jours ouvrables)" type="number" size="small" sx={{ flex: 1 }}
                        value={formDuration}
                        onChange={e => { setFormDuration(e.target.value); setAbsCalcMode('duration'); }}
                        InputProps={{
                          inputProps: { min: 1, step: 1 },
                          endAdornment: (calcCongeDaysLoading || calcCongeEndLoading)
                            ? <CircularProgress size={14} sx={{ mr: 0.5 }} />
                            : null,
                        }}
                        helperText={
                          absCalcMode === 'duration'
                            ? 'Calcule la date de fin automatiquement'
                            : 'Calculé à partir des dates saisies'
                        }
                        FormHelperTextProps={{ sx: { fontSize: 10, mt: 0.25 } }}
                      />
                      {/* Raccourcis rapides */}
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        {[1, 5, 10, 15].map(d => (
                          <Tooltip key={d} title={`${d} jour${d > 1 ? 's' : ''}`} placement="top">
                            <Box
                              onClick={() => { setFormDuration(String(d)); setAbsCalcMode('duration'); }}
                              sx={{
                                px: 1.25, py: 0.6, borderRadius: '6px', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, userSelect: 'none',
                                bgcolor: formDuration === String(d) ? TH : '#E2E8F0',
                                color:   formDuration === String(d) ? '#fff' : '#475569',
                                border:  `1px solid ${formDuration === String(d) ? TH : '#CBD5E1'}`,
                                '&:hover': { bgcolor: formDuration === String(d) ? TH : '#CBD5E1' },
                                transition: 'all 0.15s',
                              }}>
                              {d}j
                            </Box>
                          </Tooltip>
                        ))}
                      </Stack>
                    </Stack>

                    {/* Récapitulatif */}
                    {formStart && formEnd && formDuration && (
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 12, color: '#1E40AF' }}>
                          Du <strong>{new Date(formStart + 'T12:00').toLocaleDateString('fr-FR')}</strong>{' '}
                          au <strong>{new Date(formEnd + 'T12:00').toLocaleDateString('fr-FR')}</strong>{' '}
                          = <strong>{formDuration} jour(s) ouvré(s)</strong>
                          {isStartFriday && ' (départ effectif lundi)'}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}

            {/* ── Décision de congé (absence uniquement) ── */}
            {mainTab === 'absence' && (
              <Box sx={{ border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: '#334155', px: 2, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Faire valoir sur décision de congé
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <TextField
                      label="N° de la décision" size="small" sx={{ flex: 1 }}
                      value={formDecisionRef}
                      onChange={e => setFormDecisionRef(e.target.value)}
                      disabled={formDecisionAvenir}
                      placeholder="ex : DC-2026-042"
                      InputLabelProps={{ shrink: true }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formDecisionAvenir}
                          onChange={e => {
                            setFormDecisionAvenir(e.target.checked);
                            if (e.target.checked) setFormDecisionRef('');
                          }}
                          size="small"
                          sx={{ color: TH, '&.Mui-checked': { color: TH }, p: 0.5 }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                          Ou à venir
                        </Typography>
                      }
                      sx={{ m: 0, mt: 0.5, alignItems: 'center', gap: 0.5 }}
                    />
                  </Stack>
                </Box>
              </Box>
            )}

            {/* ── Motif ── */}
            <TextField
              label={mainTab === 'absence' ? 'Motif détaillé' : 'Motif'}
              multiline rows={3} size="small" fullWidth
              value={formReason}
              onChange={e => setFormReason(e.target.value)}
              required={mainTab === 'absence'}
              placeholder={mainTab === 'absence' ? "Décrivez le motif détaillé de l'absence…" : ''}
            />

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
          {/* Message champ manquant */}
          {(() => {
            if (!formEmpId) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Sélectionnez un agent</Typography>;
            if (!formTypeId) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Sélectionnez un type {mainTab === 'conge' ? 'de congé' : "d'absence"}</Typography>;
            if (!formStart) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Saisissez la date de début</Typography>;
            if (!formEnd) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#F97316' }}>Calcul de la date de fin en cours…</Typography>;
            if (mainTab === 'conge' && congeBalance && formDuration && Number(formDuration) > congeBalance.solde_disponible)
              return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Solde insuffisant — {congeBalance.solde_disponible}j disponible(s)</Typography>;
            if (mainTab === 'absence' && !formReason.trim()) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Le motif détaillé est requis</Typography>;
            if (mainTab === 'absence' && formTypeId === 'autre' && !formTypeAutreDesc.trim()) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Précisez le type d'absence</Typography>;
            if (mainTab === 'absence' && formTypeId === 'autre' && !formAbsImputation) return <Typography sx={{ flex: '1 1 100%', fontSize: 11, color: '#EF4444' }}>Sélectionnez le mode d'imputation</Typography>;
            return null;
          })()}
          <Button onClick={() => { setNewOpen(false); resetForm(); }} sx={{ color: '#64748B' }}>
            Annuler
          </Button>
          <Button variant="contained"
            disabled={
              !formEmpId || !formTypeId || !formStart || !formEnd
              || createMutation.isPending || isCreatingType
              || (mainTab === 'absence' && !formReason.trim())
              || (mainTab === 'absence' && formTypeId === 'autre' && !formTypeAutreDesc.trim())
              || (mainTab === 'absence' && formTypeId === 'autre' && !formAbsImputation)
              || (mainTab === 'conge' && !!congeBalance && !!formDuration && Number(formDuration) > congeBalance.solde_disponible)
            }
            startIcon={(createMutation.isPending || isCreatingType) ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={handleSubmit}
            sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, minWidth: 120 }}>
            {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Détails ── */}
      {selectedLeave && (
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15 }}>
            Détails — {selectedLeave.leaveType?.name ?? 'Demande'} #{selectedLeave.id}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={1.5}>
              {[
                ['Agent',      `${selectedLeave.employee?.first_name} ${selectedLeave.employee?.last_name}`],
                ['Matricule',  selectedLeave.employee?.employee_number ?? '—'],
                ['Service',    selectedLeave.employee?.organisation_unit?.name ?? selectedLeave.employee?.department?.name ?? '—'],
                ['Type',       selectedLeave.leaveType?.name ?? '—'],
                ['Date début', formatDate(selectedLeave.start_date)],
                ['Date fin',   formatDate(selectedLeave.end_date)],
                ['Nbr jours',  `${selectedLeave.days_count} jour(s) ouvré(s)`],
                ...(selectedLeave.leaveType?.category === 'absence' ? [
                  ['Décision congé', selectedLeave.leave_decision_avenir
                    ? 'À venir'
                    : (selectedLeave.leave_decision_ref ?? '—')],
                ] : []),
                ['Motif',      selectedLeave.reason ?? '—'],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" spacing={2}>
                  <Typography sx={{ minWidth: 110, fontWeight: 700, fontSize: 13, color: '#475569' }}>{k} :</Typography>
                  <Typography sx={{ fontSize: 13 }}>{v}</Typography>
                </Stack>
              ))}
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ minWidth: 110, fontWeight: 700, fontSize: 13, color: '#475569' }}>Statut :</Typography>
                <StatusChip status={selectedLeave.status} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
            {selectedLeave.status === 'pending' && (
              <>
                <Button variant="contained" color="success"
                  onClick={() => { setDetailOpen(false); setValidateOpen({ leave: selectedLeave, action: 'approve' }); }}>
                  Approuver
                </Button>
                <Button variant="contained" color="error"
                  onClick={() => { setDetailOpen(false); setValidateOpen({ leave: selectedLeave, action: 'reject' }); }}>
                  Refuser
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* ── Dialog : Imprimer Attestation ── */}
      <Dialog open={attestOpen} onClose={() => { setAttestOpen(false); setLastGenerated(null); setAttestTemplate(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: ACT, color: '#fff', fontWeight: 700, fontSize: 15 }}>
          Imprimer une attestation
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {selectedLeave && (
            <Box sx={{ bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', p: 1.5, mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#9A3412' }}>
                {selectedLeave.employee?.first_name} {selectedLeave.employee?.last_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#C2410C', mt: 0.25 }}>
                {selectedLeave.employee?.employee_number} · {selectedLeave.employee?.organisation_unit?.name ?? selectedLeave.employee?.department?.name ?? '—'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.5 }}>
                {formatDate(selectedLeave.start_date)} → {formatDate(selectedLeave.end_date)} · {selectedLeave.days_count} jour(s)
              </Typography>
            </Box>
          )}

          {lastGenerated ? (
            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>Attestation générée</Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1}>
                  <Typography sx={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: '#475569' }}>Référence :</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>{lastGenerated.reference}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Typography sx={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: '#475569' }}>Généré le :</Typography>
                  <Typography sx={{ fontSize: 12 }}>{formatDate(lastGenerated.created_at)}</Typography>
                </Stack>
              </Stack>
              <Button variant="outlined" size="small"
                startIcon={<Print sx={{ fontSize: '13px !important' }} />}
                onClick={() => window.print()}
                sx={{ mt: 1.5, borderRadius: '6px', fontSize: 12, fontWeight: 700, borderColor: '#059669', color: '#059669' }}>
                Imprimer / Télécharger
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {attestTemplates.length === 0 ? (
                <Alert severity="warning" sx={{ fontSize: 12 }}>
                  Aucun modèle d'attestation disponible. Créez-en un dans la section Documents.
                </Alert>
              ) : (
                <FormControl size="small" fullWidth required>
                  <InputLabel>Modèle d'attestation</InputLabel>
                  <Select value={attestTemplate} label="Modèle d'attestation"
                    onChange={e => setAttestTemplate(e.target.value)}>
                    {attestTemplates.map(t => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        <Stack>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.name}</Typography>
                          {t.description && <Typography sx={{ fontSize: 11, color: '#64748B' }}>{t.description}</Typography>}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setAttestOpen(false); setLastGenerated(null); setAttestTemplate(''); }}>
            {lastGenerated ? 'Fermer' : 'Annuler'}
          </Button>
          {!lastGenerated && (
            <Button variant="contained"
              disabled={!attestTemplate || generateMutation.isPending}
              startIcon={generateMutation.isPending
                ? <CircularProgress size={13} color="inherit" />
                : <Description sx={{ fontSize: '14px !important' }} />}
              onClick={() => generateMutation.mutate()}
              sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#C14D03' }, borderRadius: '6px', fontSize: 12, fontWeight: 700 }}>
              {generateMutation.isPending ? 'Génération…' : 'Générer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Workflow 5 niveaux (absences) ── */}
      {workflowOpen && (
        <AbsenceWorkflowDialog
          leave={workflowOpen}
          onClose={() => setWorkflowOpen(null)}
          onPrintAttestation={() => {
            setSelectedId(workflowOpen.id);
            setLastGenerated(null);
            setAttestTemplate('');
            setAttestOpen(true);
          }}
        />
      )}

      {/* ── Dialog : Valider / Refuser ── */}
      <Dialog open={Boolean(validateOpen)} onClose={() => { setValidateOpen(null); setComment(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          bgcolor: validateOpen?.action === 'approve' ? '#166534' : '#991B1B',
          color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {validateOpen?.action === 'approve' ? 'Approuver la demande' : 'Refuser la demande'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: '#475569', mb: 2 }}>
            {validateOpen?.leave.employee?.first_name} {validateOpen?.leave.employee?.last_name} —{' '}
            {formatDate(validateOpen?.leave.start_date)} au {formatDate(validateOpen?.leave.end_date)}
            {' '}({validateOpen?.leave.days_count} jour(s))
          </Typography>
          <TextField label="Commentaire (optionnel)" fullWidth multiline rows={3}
            value={comment} onChange={e => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setValidateOpen(null); setComment(''); }}>Annuler</Button>
          <Button variant="contained"
            color={validateOpen?.action === 'approve' ? 'success' : 'error'}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            onClick={() => {
              if (!validateOpen) return;
              if (validateOpen.action === 'approve') approveMutation.mutate({ id: validateOpen.leave.id, comment });
              else rejectMutation.mutate({ id: validateOpen.leave.id, comment });
            }}>
            {validateOpen?.action === 'approve' ? "Confirmer l'approbation" : 'Confirmer le refus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
