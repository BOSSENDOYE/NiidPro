import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Chip, Tabs, Tab, Tooltip, IconButton,
} from '@mui/material';
import {
  Add, Search, Clear, CheckCircle, Cancel, School,
  Assessment, TableChart, Info, Edit, Delete, Settings,
  Event, PlayArrow, DoneAll, Inventory2, HelpOutline,
} from '@mui/icons-material';
import { trainingsApi } from '../../api/trainings';
import StatusChip from '../../components/common/StatusChip';
import TrainingParticipantsTab from '../../components/trainings/TrainingParticipantsTab';
import TrainingAttendanceTab from '../../components/trainings/TrainingAttendanceTab';
import TrainingEvaluationTab from '../../components/trainings/TrainingEvaluationTab';
import TrainingDocumentsTab from '../../components/trainings/TrainingDocumentsTab';
import TrainingStatsTab from '../../components/trainings/TrainingStatsTab';
import TrainingSettingsTab from '../../components/trainings/TrainingSettingsTab';
import { formatDate } from '../../utils/format';
import { useCompany } from '../../hooks/useCompany';
import type { Training } from '../../types';

/* ─── Palette ─── */
const NAV = '#0D2137';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

/* ─── NavTab ─── */
function NavTab({
  label, icon, active, onClick, badge,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: '6px',
        px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
        fontWeight: 700, fontSize: 13, userSelect: 'none',
        bgcolor:      active ? ACT : '#fff',
        color:        active ? '#fff' : TH,
        border:       `1.5px solid ${active ? ACT : '#93C5FD'}`,
        borderBottom: 'none',
        boxShadow:    active ? '0 -2px 8px rgba(232,93,4,0.25)' : 'none',
        transition:   'all 0.15s',
        '&:hover':    { bgcolor: active ? ACT : '#EFF6FF' },
        whiteSpace: 'nowrap',
      }}
    >
      <Box sx={{ '& svg': { fontSize: 15 } }}>{icon}</Box>
      {label}
      {badge !== undefined && badge > 0 && (
        <Box sx={{
          px: 0.9, borderRadius: '10px', fontSize: 11, fontWeight: 800,
          lineHeight: '20px', minWidth: 20, textAlign: 'center',
          bgcolor: active ? 'rgba(255,255,255,0.28)' : '#E2E8F0',
          color:   active ? '#fff' : '#64748B',
        }}>
          {badge}
        </Box>
      )}
    </Box>
  );
}

/* ─── Tabs config ─── */
const TABS = [
  { label: 'Gestion des demandes', icon: <School fontSize="small" /> },
  { label: 'En attente de validation', icon: <Assessment fontSize="small" /> },
  { label: 'Tableaux de bord', icon: <TableChart fontSize="small" /> },
  { label: 'Paramétrage', icon: <Settings fontSize="small" /> },
];

/* ─── Status config ─── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: '#D97706', bg: '#FFFBEB' },
  needs_info: { label: 'Compléments demandés', color: '#7C3AED', bg: '#F5F3FF' },
  approved: { label: 'Approuvée', color: '#059669', bg: '#ECFDF5' },
  rejected: { label: 'Rejetée', color: '#DC2626', bg: '#FEF2F2' },
  planned: { label: 'Programmée', color: '#0284C7', bg: '#F0F9FF' },
  in_progress: { label: 'En cours', color: '#8B5CF6', bg: '#F5F3FF' },
  completed: { label: 'Réalisée', color: '#10B981', bg: '#ECFDF5' },
  archived: { label: 'Archivée', color: '#64748B', bg: '#F1F5F9' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: '#64748B' },
  medium: { label: 'Moyenne', color: '#D97706' },
  high: { label: 'Haute', color: '#DC2626' },
};

/* ─── Main ─── */
export default function TrainingsPage() {
  const qc = useQueryClient();
  const { name: companyName } = useCompany();
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* recherche globale */
  const [globalSearch, setGlobalSearch] = useState('');

  /* filtres avancés */
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  /* dialogs */
  const [newOpen, setNewOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0); // 0: Infos, 1: Participants, 2: Présences, 3: Évaluations
  const [validateOpen, setValidateOpen] = useState<{ training: Training; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [editTarget, setEditTarget] = useState<Training | null>(null);

  /* workflow dialogs */
  const [infoOpen, setInfoOpen] = useState<Training | null>(null);
  const [infoText, setInfoText] = useState('');
  const [planOpen, setPlanOpen] = useState<Training | null>(null);
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [planLocation, setPlanLocation] = useState('');
  const [completeOpen, setCompleteOpen] = useState<Training | null>(null);
  const [compReport, setCompReport] = useState('');
  const [compReco, setCompReco] = useState('');
  const [compScore, setCompScore] = useState('');
  const [compCost, setCompCost] = useState('');

  /* form nouveau formation */
  const [formTitle, setFormTitle] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formIsInternal, setFormIsInternal] = useState(true);
  const [formProviderId, setFormProviderId] = useState<number | null>(null);
  const [formObjectives, setFormObjectives] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formParticipants, setFormParticipants] = useState<number>(0);
  const [formDesiredDate, setFormDesiredDate] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEstimatedCost, setFormEstimatedCost] = useState('');
  const [formFundingSource, setFormFundingSource] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');

  /* queries */
  const { data: allTrainings = [], isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: () => trainingsApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Training[];
    }),
  });

  const { data: pendingTrainings = [] } = useQuery({
    queryKey: ['trainings', 'pending'],
    queryFn: () => trainingsApi.pending().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Training[];
    }),
  });

  const { data: trainingTypes = [] } = useQuery({
    queryKey: ['trainings', 'types'],
    queryFn: () => trainingsApi.types().then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['trainings', 'providers'],
    queryFn: () => trainingsApi.providers().then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['trainings', 'budgets'],
    queryFn: () => trainingsApi.budgets().then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  /* mutations */
  const createMutation = useMutation({
    mutationFn: (d: Partial<Training>) => trainingsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      setNewOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: Partial<Training>) => trainingsApi.update(editTarget!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      setNewOpen(false);
      setEditTarget(null);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => trainingsApi.approve(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['trainings', 'pending'] });
      setValidateOpen(null);
      setComment('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => trainingsApi.reject(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['trainings', 'pending'] });
      setValidateOpen(null);
      setComment('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => trainingsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['trainings'] });
    qc.invalidateQueries({ queryKey: ['trainings', 'pending'] });
  };

  const requestInfoMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => trainingsApi.requestInfo(id, text),
    onSuccess: () => { invalidateAll(); setInfoOpen(null); setInfoText(''); },
  });

  const planMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { start_date: string; end_date: string; location?: string } }) =>
      trainingsApi.plan(id, data),
    onSuccess: () => { invalidateAll(); setPlanOpen(null); setPlanStart(''); setPlanEnd(''); setPlanLocation(''); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string; report?: string; recommendations?: string; overall_score?: number; actual_cost?: number } }) =>
      trainingsApi.setStatus(id, data),
    onSuccess: () => {
      invalidateAll();
      setCompleteOpen(null);
      setCompReport(''); setCompReco(''); setCompScore(''); setCompCost('');
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormTypeId('');
    setFormIsInternal(true);
    setFormProviderId(null);
    setFormObjectives('');
    setFormJustification('');
    setFormParticipants(0);
    setFormDesiredDate('');
    setFormDuration('');
    setFormLocation('');
    setFormEstimatedCost('');
    setFormFundingSource('');
    setFormPriority('medium');
    setEditTarget(null);
  };

  /* filtrage */
  const matchSearch = (t: Training) => {
    if (!globalSearch) return true;
    const s = globalSearch.toLowerCase();
    return t.title.toLowerCase().includes(s) || (t.objectives ?? '').toLowerCase().includes(s);
  };

  const filtered = useMemo(() => {
    return allTrainings.filter((t) => {
      if (!matchSearch(t)) return false;
      if (dateFrom && (t.desired_date ?? '') < dateFrom) return false;
      if (dateTo && (t.desired_date ?? '') > dateTo) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (typeFilter && t.training_type_id !== Number(typeFilter)) return false;
      return true;
    });
  }, [allTrainings, globalSearch, dateFrom, dateTo, statusFilter, priorityFilter, typeFilter]);

  const filteredPending = useMemo(
    () => pendingTrainings.filter(matchSearch),
    [pendingTrainings, globalSearch]
  );

  const handleSearch = () => { /* filtrage réactif */ };
  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
    setPriorityFilter('');
    setTypeFilter('');
  };

  const selectedTraining = allTrainings.find((t) => t.id === selectedId) ?? null;

  /* ─── render tab content ─── */
  const renderContent = () => {
    if (tab === 2) {
      return <TrainingStatsTab budgets={budgets} />;
    }

    if (tab === 3) {
      return <TrainingSettingsTab />;
    }

    const rows = tab === 1 ? filteredPending : filtered;

    return (
      <Box>
        {/* ── Titre section ── */}
        <Box sx={{ bgcolor: TH, px: 2.5, py: 1.25, mb: 0 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {tab === 0 ? 'Gestion des demandes de formation' : 'Formations en attente de validation'}
          </Typography>
        </Box>

        {/* ── Filtres ── */}
        {tab === 0 && (
          <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none', p: 2, bgcolor: '#F8FAFC' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chercher
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
              <TextField label="Titre" size="small" value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)} sx={{ bgcolor: '#fff', width: 180 }} />
              <TextField label="De" type="date" size="small" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }}
                sx={{ bgcolor: '#fff', width: 155 }} />
              <TextField label="À" type="date" size="small" value={dateTo}
                onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }}
                sx={{ bgcolor: '#fff', width: 155 }} />
              <FormControl size="small" sx={{ bgcolor: '#fff', width: 150 }}>
                <InputLabel>Statut</InputLabel>
                <Select value={statusFilter} label="Statut" onChange={e => setStatusFilter(e.target.value)}>
                  <MenuItem value="">Tous</MenuItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ bgcolor: '#fff', width: 150 }}>
                <InputLabel>Priorité</InputLabel>
                <Select value={priorityFilter} label="Priorité" onChange={e => setPriorityFilter(e.target.value)}>
                  <MenuItem value="">Tous</MenuItem>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" size="small" startIcon={<Search sx={{ fontSize: '14px !important' }} />}
                onClick={handleSearch}
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
        )}

        {/* ── Bouton nouveau ── */}
        <Box sx={{ border: '1px solid #CBD5E1', borderTop: tab === 0 ? 'none' : undefined, p: 1.5, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: '16px !important' }} />}
            onClick={() => { resetForm(); setNewOpen(true); }}
            sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#C04A02' }, borderRadius: '6px', fontSize: 12, fontWeight: 700 }}>
            Nouvelle formation
          </Button>
        </Box>

        {/* ── Tableau ── */}
        <TableContainer sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F1F5F9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Titre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Durée</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Participants</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Priorité</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3, color: '#64748B' }}>
                    Aucune formation
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((training) => (
                  <TableRow key={training.id} hover sx={{ '&:hover': { bgcolor: 'rgba(30,58,95,0.05)' } }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{training.title}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>
                      {training.trainingType?.name || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B' }}>
                      {formatDate(training.desired_date)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                      {training.duration_days}j
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                      {training.participants_count}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      <Chip
                        label={PRIORITY_CONFIG[training.priority]?.label ?? training.priority}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          color: PRIORITY_CONFIG[training.priority]?.color ?? '#64748B',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      <Chip
                        label={STATUS_CONFIG[training.status]?.label ?? training.status}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          color: STATUS_CONFIG[training.status]?.color ?? '#64748B',
                          bgcolor: STATUS_CONFIG[training.status]?.bg ?? '#F1F5F9',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Détails">
                          <IconButton size="small" onClick={() => {
                            setSelectedId(training.id);
                            setDetailOpen(true);
                          }} sx={{ color: ACT }}>
                            <Info sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {tab === 1 && (
                          <>
                            <Tooltip title="Approuver">
                              <IconButton size="small" onClick={() => setValidateOpen({ training, action: 'approve' })}
                                sx={{ color: '#059669' }}>
                                <CheckCircle sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Demander des compléments">
                              <IconButton size="small" onClick={() => { setInfoOpen(training); setInfoText(''); }}
                                sx={{ color: TH }}>
                                <HelpOutline sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Rejeter">
                              <IconButton size="small" onClick={() => setValidateOpen({ training, action: 'reject' })}
                                sx={{ color: '#DC2626' }}>
                                <Cancel sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {tab === 0 && (
                          <>
                            {training.status === 'approved' && (
                              <Tooltip title="Planifier">
                                <IconButton size="small" onClick={() => {
                                  setPlanOpen(training);
                                  setPlanStart(training.start_date ?? training.desired_date ?? '');
                                  setPlanEnd(training.end_date ?? '');
                                  setPlanLocation(training.location ?? '');
                                }} sx={{ color: '#0284C7' }}>
                                  <Event sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {training.status === 'planned' && (
                              <Tooltip title="Démarrer la formation">
                                <IconButton size="small" onClick={() => statusMutation.mutate({ id: training.id, data: { status: 'in_progress' } })}
                                  sx={{ color: '#8B5CF6' }}>
                                  <PlayArrow sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {training.status === 'in_progress' && (
                              <Tooltip title="Clôturer (rapport & évaluation)">
                                <IconButton size="small" onClick={() => {
                                  setCompleteOpen(training);
                                  setCompCost(String(training.actual_cost ?? training.estimated_cost ?? ''));
                                }} sx={{ color: '#10B981' }}>
                                  <DoneAll sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {training.status === 'completed' && (
                              <Tooltip title="Archiver">
                                <IconButton size="small" onClick={() => statusMutation.mutate({ id: training.id, data: { status: 'archived' } })}
                                  sx={{ color: '#64748B' }}>
                                  <Inventory2 sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Modifier">
                              <IconButton size="small" onClick={() => {
                                setEditTarget(training);
                                setFormTitle(training.title);
                                setFormTypeId(String(training.training_type_id));
                                setFormIsInternal(training.is_internal);
                                setFormProviderId(training.provider_id ?? null);
                                setFormObjectives(training.objectives);
                                setFormJustification(training.justification);
                                setFormParticipants(training.participants_count);
                                setFormDesiredDate(training.desired_date ?? '');
                                setFormDuration(String(training.duration_days));
                                setFormLocation(training.location ?? '');
                                setFormEstimatedCost(String(training.estimated_cost ?? ''));
                                setFormFundingSource(training.funding_source ?? '');
                                setFormPriority(training.priority);
                                setNewOpen(true);
                              }} sx={{ color: ACT }}>
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton size="small" onClick={() => {
                                if (confirm('Êtes-vous sûr ?')) deleteMutation.mutate(training.id);
                              }} sx={{ color: '#DC2626' }}>
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box>
      {/* ══ En-tête ══ */}
      <Box sx={{ bgcolor: NAV, px: 3, py: 1.5, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>Gestion des Formations</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, mt: 0.1 }}>Demandes, validations et suivi · {companyName}</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Total',       count: allTrainings.length,                                         color: '#93C5FD' },
            { label: 'En attente',  count: pendingTrainings.length,                                     color: '#FCD34D' },
            { label: 'Approuvées',  count: allTrainings.filter((t) => t.status === 'approved').length,  color: '#6EE7B7' },
            { label: 'Réalisées',   count: allTrainings.filter((t) => t.status === 'completed').length, color: '#C4B5FD' },
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

      {/* ══ Onglets ══ */}
      <Box sx={{ bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: `2px solid ${NAV}` }}>
        {TABS.map((t, i) => (
          <NavTab key={i} label={t.label} icon={t.icon} active={tab === i} onClick={() => setTab(i)} />
        ))}
      </Box>

      {/* ══ Contenu ══ */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {renderContent()}
      </Box>

      {/* ────── DIALOG CRÉATION/MODIFICATION ────── */}
      <Dialog open={newOpen} onClose={() => { setNewOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>
          {editTarget ? 'Modifier la formation' : 'Nouvelle formation'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <TextField label="Titre *" fullWidth size="small" value={formTitle}
              onChange={e => setFormTitle(e.target.value)} />
            <FormControl fullWidth size="small">
              <InputLabel>Type *</InputLabel>
              <Select value={formTypeId} label="Type *" onChange={e => setFormTypeId(e.target.value)}>
                {trainingTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Interne ?</InputLabel>
              <Select value={formIsInternal ? 'true' : 'false'} label="Interne ?"
                onChange={e => setFormIsInternal(e.target.value === 'true')}>
                <MenuItem value="true">Interne</MenuItem>
                <MenuItem value="false">Externe</MenuItem>
              </Select>
            </FormControl>
            {!formIsInternal && (
              <FormControl fullWidth size="small">
                <InputLabel>Organisme</InputLabel>
                <Select value={formProviderId ?? ''} label="Organisme"
                  onChange={e => setFormProviderId(e.target.value ? Number(e.target.value) : null)}>
                  <MenuItem value="">Aucun</MenuItem>
                  {providers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField label="Objectifs *" fullWidth multiline rows={2} size="small" value={formObjectives}
              onChange={e => setFormObjectives(e.target.value)} />
            <TextField label="Justification *" fullWidth multiline rows={2} size="small" value={formJustification}
              onChange={e => setFormJustification(e.target.value)} />
            <TextField label="Nombre de participants *" type="number" fullWidth size="small" value={formParticipants}
              onChange={e => setFormParticipants(Number(e.target.value))} />
            <TextField label="Date souhaitée *" type="date" fullWidth size="small" value={formDesiredDate}
              onChange={e => setFormDesiredDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Durée (jours) *" type="number" fullWidth size="small" value={formDuration}
              onChange={e => setFormDuration(e.target.value)} />
            <TextField label="Lieu" fullWidth size="small" value={formLocation}
              onChange={e => setFormLocation(e.target.value)} />
            <TextField label="Coût estimé" type="number" fullWidth size="small" value={formEstimatedCost}
              onChange={e => setFormEstimatedCost(e.target.value)} />
            <TextField label="Source de financement" fullWidth size="small" value={formFundingSource}
              onChange={e => setFormFundingSource(e.target.value)} />
            <FormControl fullWidth size="small">
              <InputLabel>Priorité</InputLabel>
              <Select value={formPriority} label="Priorité" onChange={e => setFormPriority(e.target.value as any)}>
                <MenuItem value="low">Basse</MenuItem>
                <MenuItem value="medium">Moyenne</MenuItem>
                <MenuItem value="high">Haute</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setNewOpen(false); resetForm(); }}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: ACT }}
            onClick={() => {
              if (editTarget) {
                updateMutation.mutate({
                  title: formTitle,
                  training_type_id: Number(formTypeId),
                  is_internal: formIsInternal,
                  provider_id: formProviderId,
                  objectives: formObjectives,
                  justification: formJustification,
                  participants_count: formParticipants,
                  desired_date: formDesiredDate,
                  duration_days: Number(formDuration),
                  location: formLocation,
                  estimated_cost: formEstimatedCost ? Number(formEstimatedCost) : null,
                  funding_source: formFundingSource,
                  priority: formPriority,
                });
              } else {
                createMutation.mutate({
                  title: formTitle,
                  training_type_id: Number(formTypeId),
                  is_internal: formIsInternal,
                  provider_id: formProviderId,
                  objectives: formObjectives,
                  justification: formJustification,
                  participants_count: formParticipants,
                  desired_date: formDesiredDate,
                  duration_days: Number(formDuration),
                  location: formLocation,
                  estimated_cost: formEstimatedCost ? Number(formEstimatedCost) : null,
                  funding_source: formFundingSource,
                  priority: formPriority,
                });
              }
            }}>
            {editTarget ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────── DIALOG VALIDATION ────── */}
      <Dialog open={!!validateOpen} onClose={() => setValidateOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>
          {validateOpen?.action === 'approve' ? 'Approuver' : 'Rejeter'} la formation
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <TextField label="Commentaire" fullWidth multiline rows={3} size="small" value={comment}
            onChange={e => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setValidateOpen(null)}>Annuler</Button>
          <Button variant="contained"
            sx={{ bgcolor: validateOpen?.action === 'approve' ? '#059669' : '#DC2626' }}
            onClick={() => {
              if (!validateOpen) return;
              if (validateOpen.action === 'approve') {
                approveMutation.mutate({ id: validateOpen.training.id, comment });
              } else {
                rejectMutation.mutate({ id: validateOpen.training.id, comment });
              }
            }}>
            {validateOpen?.action === 'approve' ? 'Approuver' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────── DIALOG DÉTAILS (avec onglets) ────── */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setDetailTab(0); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>
          {selectedTraining ? `Formation: ${selectedTraining.title}` : 'Détails'}
        </DialogTitle>
        
        {/* ── Onglets ── */}
        <Box sx={{ bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <Tabs 
            value={detailTab} 
            onChange={(_, v) => setDetailTab(v)}
            sx={{
              '& .MuiTab-root': { fontSize: 12, fontWeight: 700, textTransform: 'none' },
              '& .MuiTabs-indicator': { bgcolor: TH, height: 3 },
            }}
          >
            <Tab label="Informations" />
            <Tab label="Participants" />
            <Tab label="Présences" />
            <Tab label="Évaluations" />
            <Tab label="Documents" />
          </Tabs>
        </Box>

        <DialogContent>
          {detailTab === 0 && selectedTraining && (
            <Stack spacing={2} sx={{ pt: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Titre</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{selectedTraining.title}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Type</Typography>
                <Typography sx={{ fontSize: 13, color: '#0F172A' }}>{selectedTraining.trainingType?.name ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Objectifs</Typography>
                <Typography sx={{ fontSize: 12, color: '#0F172A' }}>{selectedTraining.objectives}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Justification</Typography>
                <Typography sx={{ fontSize: 12, color: '#0F172A' }}>{selectedTraining.justification}</Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Dates</Typography>
                  <Typography sx={{ fontSize: 12, color: '#0F172A' }}>
                    {formatDate(selectedTraining.start_date)} à {formatDate(selectedTraining.end_date)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Durée</Typography>
                  <Typography sx={{ fontSize: 12, color: '#0F172A' }}>
                    {selectedTraining.duration_days} jour(s)
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Coût estimé</Typography>
                  <Typography sx={{ fontSize: 12, color: '#0F172A' }}>
                    {selectedTraining.estimated_cost ? new Intl.NumberFormat('fr-FR').format(selectedTraining.estimated_cost) + ' FCFA' : '—'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5 }}>Statut</Typography>
                  <StatusChip status={selectedTraining.status} />
                </Box>
              </Stack>
            </Stack>
          )}

          {detailTab === 1 && selectedTraining && (
            <TrainingParticipantsTab 
              training={selectedTraining} 
              refreshTraining={() => {
                // Refresh the selected training data
                if (selectedId) {
                  qc.invalidateQueries({ queryKey: ['trainings'] });
                }
              }}
            />
          )}

          {detailTab === 2 && selectedTraining && (
            <TrainingAttendanceTab 
              training={selectedTraining}
              refreshTraining={() => {
                if (selectedId) {
                  qc.invalidateQueries({ queryKey: ['trainings'] });
                }
              }}
            />
          )}

          {detailTab === 3 && selectedTraining && (
            <TrainingEvaluationTab training={selectedTraining} />
          )}

          {detailTab === 4 && selectedTraining && (
            <TrainingDocumentsTab training={selectedTraining} />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDetailOpen(false); setDetailTab(0); }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* ────── DIALOG : Demander des compléments ────── */}
      <Dialog open={!!infoOpen} onClose={() => setInfoOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>Demander des compléments d'information</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <TextField label="Informations demandées *" fullWidth multiline rows={4} size="small"
            value={infoText} onChange={(e) => setInfoText(e.target.value)}
            placeholder="Précisez les éléments à compléter par le demandeur…" />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInfoOpen(null)}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: TH }}
            disabled={!infoText.trim() || requestInfoMutation.isPending}
            onClick={() => infoOpen && requestInfoMutation.mutate({ id: infoOpen.id, text: infoText })}>
            Envoyer la demande
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────── DIALOG : Planification ────── */}
      <Dialog open={!!planOpen} onClose={() => setPlanOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>Planifier la formation</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="Date de début *" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={planStart} onChange={(e) => setPlanStart(e.target.value)} />
              <TextField label="Date de fin *" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} />
            </Stack>
            <TextField label="Lieu" fullWidth size="small"
              value={planLocation} onChange={(e) => setPlanLocation(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPlanOpen(null)}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: '#0284C7' }}
            disabled={!planStart || !planEnd || planMutation.isPending}
            onClick={() => planOpen && planMutation.mutate({ id: planOpen.id, data: { start_date: planStart, end_date: planEnd, location: planLocation } })}>
            Planifier
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────── DIALOG : Clôture (rapport, évaluation, recommandations) ────── */}
      <Dialog open={!!completeOpen} onClose={() => setCompleteOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700 }}>Clôturer la formation</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <TextField label="Rapport de formation" fullWidth multiline rows={3} size="small"
              value={compReport} onChange={(e) => setCompReport(e.target.value)} />
            <TextField label="Recommandations futures" fullWidth multiline rows={2} size="small"
              value={compReco} onChange={(e) => setCompReco(e.target.value)} />
            <Stack direction="row" spacing={2}>
              <TextField label="Évaluation globale (/100)" type="number" fullWidth size="small"
                value={compScore} onChange={(e) => setCompScore(e.target.value)} />
              <TextField label="Coût réel (F)" type="number" fullWidth size="small"
                value={compCost} onChange={(e) => setCompCost(e.target.value)} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCompleteOpen(null)}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: '#10B981' }}
            disabled={statusMutation.isPending}
            onClick={() => completeOpen && statusMutation.mutate({
              id: completeOpen.id,
              data: {
                status: 'completed',
                report: compReport || undefined,
                recommendations: compReco || undefined,
                overall_score: compScore ? Number(compScore) : undefined,
                actual_cost: compCost ? Number(compCost) : undefined,
              },
            })}>
            Clôturer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
