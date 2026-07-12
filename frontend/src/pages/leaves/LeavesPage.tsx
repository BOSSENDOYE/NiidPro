import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, Checkbox,
  Autocomplete, Chip, Alert, CircularProgress, TablePagination,
} from '@mui/material';
import { Add, Search, Clear, CheckCircle, Cancel, Print, Description } from '@mui/icons-material';
import { leavesApi } from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import { documentsApi } from '../../api/documents';
import StatusChip from '../../components/common/StatusChip';
import LeavePlanningTab from '../../components/employees/LeavePlanningTab';
import LeaveBalanceTab from '../../components/employees/LeaveBalanceTab';
import LeaveParamsTab from './LeaveParamsTab';
import LeaveCarryoverTab from './LeaveCarryoverTab';
import JustificationsPage from '../justifications/JustificationsPage';
import { formatDate } from '../../utils/format';
import type { Leave, GeneratedDocument } from '../../types';

/* ─── Palette ─── */
const NAV  = '#0D2137';
const ACT  = '#E85D04';
const TH   = '#1A3A5C';

/* ─── Main ─── */
export default function LeavesPage() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* recherche globale */
  const [globalSearch, setGlobalSearch] = useState('');

  /* filtres avancés */
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [service,  setService]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [matricule, setMatricule]   = useState('');

  /* dialogs */
  const [newOpen,     setNewOpen]     = useState(false);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [validateOpen, setValidateOpen] = useState<{ leave: Leave; action: 'approve' | 'reject' } | null>(null);
  const [comment,     setComment]     = useState('');
  const [attestOpen,  setAttestOpen]  = useState(false);
  const [attestTemplate, setAttestTemplate] = useState('');
  const [lastGenerated, setLastGenerated]   = useState<GeneratedDocument | null>(null);

  /* form nouveau congé */
  const [formEmpId,    setFormEmpId]    = useState<number | null>(null);
  const [formTypeId,   setFormTypeId]   = useState('');
  const [formStart,    setFormStart]    = useState('');
  const [formEnd,      setFormEnd]      = useState('');
  const [formReason,   setFormReason]   = useState('');

  /* queries */
  const { data: allLeaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => r.data),
  });

  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.pending().then((r) => r.data),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaves', 'types'],
    queryFn: () => leavesApi.types().then((r) => r.data),
  });

  const { data: attestTemplates = [] } = useQuery({
    queryKey: ['documents', 'templates', 'attestation'],
    queryFn: () => documentsApi.listTemplates({ type: 'attestation' }).then((r) => r.data),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 1, '', 'all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => r.data),
  });
  const employees = employeesData?.data ?? [];

  /* mutations */
  const createMutation = useMutation({
    mutationFn: (d: Partial<Leave>) => leavesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setNewOpen(false); resetForm(); },
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
  };

  /* filtrage */
  const matchSearch = (l: Leave) => {
    if (!globalSearch) return true;
    const s = globalSearch.toLowerCase();
    const name = `${l.employee?.first_name ?? ''} ${l.employee?.last_name ?? ''}`.toLowerCase();
    const mat  = (l.employee?.employee_number ?? '').toLowerCase();
    const dept = (l.employee?.department?.name ?? '').toLowerCase();
    return name.includes(s) || mat.includes(s) || dept.includes(s);
  };

  const filtered = useMemo(() => {
    return allLeaves.filter((l) => {
      if (!matchSearch(l)) return false;
      if (dateFrom && l.start_date < dateFrom) return false;
      if (dateTo   && l.end_date   > dateTo)   return false;
      if (service  && l.employee?.department?.name?.toLowerCase().indexOf(service.toLowerCase()) === -1) return false;
      if (typeFilter && String(l.leave_type_id) !== typeFilter) return false;
      if (matricule && !(l.employee?.employee_number ?? '').toLowerCase().includes(matricule.toLowerCase())) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLeaves, globalSearch, dateFrom, dateTo, service, typeFilter, matricule]);

  const filteredPending = useMemo(
    () => pendingLeaves.filter(matchSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingLeaves, globalSearch],
  );

  const filteredHistory = useMemo(
    () => filtered.filter((l) => l.status !== 'pending'),
    [filtered],
  );

  const handleSearch = () => { /* filtrage réactif */ };
  const handleClear  = () => { setDateFrom(''); setDateTo(''); setService(''); setTypeFilter(''); setMatricule(''); };

  const selectedLeave = allLeaves.find((l) => l.id === selectedId) ?? null;

  /* ─── render tab content ─── */
  const renderContent = () => {
    if (tab === 3) return <LeavePlanningTab />;
    if (tab === 4) return <LeaveBalanceTab />;
    if (tab === 5) return <LeaveCarryoverTab />;
    if (tab === 6) return <LeaveParamsTab />;
    if (tab === 7) return <JustificationsPage />;

    const rows = tab === 1 ? filteredPending : tab === 2 ? filteredHistory : filtered;
    const paged = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    return (
      <Box>
        {/* ── Titre section ── */}
        <Box sx={{ bgcolor: TH, px: 2.5, py: 1.25, mb: 0 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {tab === 0 ? 'Gestion des demandes de congé' : tab === 1 ? 'Congés Validée' : 'Historique des congés'}
          </Typography>
        </Box>

        {/* ── Filtres (tab 0 et Historique) ── */}
        {tab !== 1 && (
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
              <TextField label="Service" size="small" value={service}
                onChange={e => setService(e.target.value)} sx={{ bgcolor: '#fff', width: 160 }} />
              <FormControl size="small" sx={{ bgcolor: '#fff', width: 200 }}>
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                  <MenuItem value="">Tous</MenuItem>
                  {leaveTypes.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Matricule" size="small" value={matricule}
                onChange={e => setMatricule(e.target.value)} sx={{ bgcolor: '#fff', width: 140 }} />
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

        {/* ── Boutons actions ── */}
        <Box sx={{
          display: 'flex', justifyContent: 'flex-end', gap: 1,
          px: 2, py: 1, bgcolor: '#F1F5F9', border: '1px solid #CBD5E1', borderTop: 'none',
        }}>
          {tab !== 2 && (
            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: '14px !important' }} />}
              onClick={() => setNewOpen(true)}
              sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90 }}>
              Nouveau
            </Button>
          )}
          <Button variant="outlined" size="small"
            disabled={!selectedId}
            onClick={() => setDetailOpen(true)}
            sx={{ borderRadius: '6px', fontSize: 12, fontWeight: 700, minWidth: 90, borderColor: TH, color: TH }}>
            Détails
          </Button>
          <Button
            variant="outlined"
            size="small"
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

        {/* ── Table ── */}
        <Box sx={{ border: '1px solid #CBD5E1', borderTop: 'none' }}>
          <Typography sx={{
            fontSize: 11, fontWeight: 700, color: '#fff', bgcolor: '#334155',
            px: 2, py: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Liste
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  <TableCell padding="checkbox" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                    <Checkbox size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </TableCell>
                  {['N°#','Matricule','Prénom et Nom','Service','Type Congé','Date Début','Date Fin','Nbr Jours','Statut','Actions'].map((h) => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', py: 1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}><Skeleton height={18} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 13 }}>
                          Aucune demande de congé
                        </TableCell>
                      </TableRow>
                    )
                  : paged.map((leave, idx) => (
                      <TableRow
                        key={leave.id}
                        hover
                        selected={selectedId === leave.id}
                        onClick={() => setSelectedId(leave.id === selectedId ? null : leave.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selectedId === leave.id ? '#EFF6FF' : idx % 2 === 0 ? '#fff' : '#F8FAFC',
                          '&:hover': { bgcolor: '#EFF6FF' },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selectedId === leave.id}
                            onChange={() => setSelectedId(leave.id === selectedId ? null : leave.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                          {leave.employee?.employee_number ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {leave.employee?.first_name} {leave.employee?.last_name}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {leave.employee?.department?.name ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <Chip
                            label={leave.leaveType?.name ?? '—'}
                            size="small"
                            sx={{
                              fontSize: 11, height: 20,
                              bgcolor: leave.leaveType?.color ? `${leave.leaveType.color}20` : '#EEF2FF',
                              color: leave.leaveType?.color ?? '#6366F1',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDate(leave.start_date)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDate(leave.end_date)}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', textAlign: 'center' }}>
                          {leave.days_count}
                        </TableCell>
                        <TableCell><StatusChip status={leave.status} /></TableCell>
                        <TableCell>
                          {leave.status === 'pending' && (
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="contained" color="success"
                                startIcon={<CheckCircle sx={{ fontSize: '12px !important' }} />}
                                onClick={(e) => { e.stopPropagation(); setValidateOpen({ leave, action: 'approve' }); }}
                                sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: '5px' }}>
                                Valider
                              </Button>
                              <Button size="small" variant="contained" color="error"
                                startIcon={<Cancel sx={{ fontSize: '12px !important' }} />}
                                onClick={(e) => { e.stopPropagation(); setValidateOpen({ leave, action: 'reject' }); }}
                                sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0, borderRadius: '5px' }}>
                                Refuser
                              </Button>
                            </Stack>
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
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
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

  return (
    <Box>
      {/* ══ En-tête nav ══ */}
      <Box sx={{ bgcolor: NAV, px: 3, py: 1.5, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
          Congés
        </Typography>
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Total',      count: allLeaves.length,                                         color: '#93C5FD' },
            { label: 'En attente', count: allLeaves.filter(l => l.status === 'pending').length,     color: '#FCD34D' },
            { label: 'Approuvés',  count: allLeaves.filter(l => l.status === 'approved').length,    color: '#6EE7B7' },
            { label: 'Refusés',    count: allLeaves.filter(l => l.status === 'rejected').length,    color: '#FCA5A5' },
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

      {/* ══ Onglets dynamiques ══ */}
      <Box sx={{ bgcolor: '#F1F5F9', px: 2.5, pt: 2, pb: 0, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: `2px solid ${NAV}` }}>
        {[
          {
            label: 'Demande',
            count: allLeaves.length,
            dot: false,
          },
          {
            label: 'Validée',
            count: pendingLeaves.length,
            dot: pendingLeaves.length > 0,
          },
          {
            label: 'Historique',
            count: filteredHistory.length,
            dot: false,
          },
          {
            label: 'Planning',
            count: null,
            dot: false,
          },
          {
            label: 'Solde',
            count: null,
            dot: false,
          },
          {
            label: 'Report',
            count: null,
            dot: false,
          },
          {
            label: 'Paramètres',
            count: null,
            dot: false,
          },
          {
            label: 'Justifications',
            count: null,
            dot: false,
          },
        ].map((cfg, i) => {
          const isActive = i === tab;
          return (
            <Box
              key={i}
              onClick={() => { setTab(i); setPage(0); }}
              sx={{
                px: 2, py: 1, cursor: 'pointer', borderRadius: '8px 8px 0 0',
                fontWeight: 700, fontSize: 13, userSelect: 'none',
                position: 'relative',
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
              {/* Point animé si demandes en attente */}
              {cfg.dot && !isActive && (
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

              {cfg.label}

              {/* Compteur */}
              {cfg.count !== null && (
                <Box sx={{
                  px: 0.9, py: 0, borderRadius: '10px', fontSize: 11, fontWeight: 800, lineHeight: '20px',
                  bgcolor: isActive
                    ? 'rgba(255,255,255,0.28)'
                    : cfg.dot ? '#EF4444' : '#E2E8F0',
                  color: isActive ? '#fff' : cfg.dot ? '#fff' : '#64748B',
                  minWidth: 20, textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  {cfg.count}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ══ Barre de recherche globale (masquée sur Report et Paramètres) ══ */}
      {tab !== 5 && tab !== 6 && tab !== 7 && <Box sx={{
        border: '1px solid #CBD5E1', borderTop: 'none',
        px: 2, py: 1, bgcolor: '#F8FAFC',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Search sx={{ fontSize: 16, color: '#94A3B8', flexShrink: 0 }} />
        <TextField
          size="small"
          placeholder="Rechercher par nom, matricule, service…"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 380, bgcolor: '#fff' }}
          InputProps={{ sx: { fontSize: 13 } }}
        />
        {globalSearch && (
          <Button
            size="small"
            startIcon={<Clear sx={{ fontSize: '13px !important' }} />}
            onClick={() => setGlobalSearch('')}
            sx={{ fontSize: 11, color: '#64748B', borderColor: '#CBD5E1', minWidth: 0, px: 1 }}
            variant="outlined"
          >
            Effacer
          </Button>
        )}
        {globalSearch && (
          <Typography sx={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
            {tab === 0 ? filtered.length : tab === 1 ? filteredPending.length : filteredHistory.length} résultat(s)
          </Typography>
        )}
      </Box>}

      {/* ══ Contenu ══ */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #CBD5E1', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {renderContent()}
      </Box>

      {/* ── Dialog : Nouveau congé ── */}
      <Dialog open={newOpen} onClose={() => { setNewOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15 }}>
          Nouvelle demande de congé
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
              onChange={(_, v) => setFormEmpId(v?.id ?? null)}
              renderInput={(p) => <TextField {...p} label="Agent" size="small" required />}
            />
            <FormControl size="small" fullWidth required>
              <InputLabel>Type de congé</InputLabel>
              <Select value={formTypeId} label="Type de congé" onChange={e => setFormTypeId(e.target.value)}>
                {leaveTypes.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Date début" type="date" size="small" fullWidth value={formStart}
                onChange={e => setFormStart(e.target.value)} InputLabelProps={{ shrink: true }} required />
              <TextField label="Date fin" type="date" size="small" fullWidth value={formEnd}
                onChange={e => setFormEnd(e.target.value)} InputLabelProps={{ shrink: true }} required />
            </Stack>
            <TextField label="Motif" multiline rows={3} size="small" fullWidth value={formReason}
              onChange={e => setFormReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setNewOpen(false); resetForm(); }}>Annuler</Button>
          <Button variant="contained"
            disabled={!formEmpId || !formTypeId || !formStart || !formEnd || createMutation.isPending}
            onClick={() => createMutation.mutate({
              employee_id: formEmpId!,
              leave_type_id: Number(formTypeId),
              start_date: formStart,
              end_date: formEnd,
              reason: formReason,
            })}
            sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' } }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Détails ── */}
      {selectedLeave && (
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15 }}>
            Détails du congé #{selectedLeave.id}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={1.5}>
              {[
                ['Agent',      `${selectedLeave.employee?.first_name} ${selectedLeave.employee?.last_name}`],
                ['Matricule',  selectedLeave.employee?.employee_number ?? '—'],
                ['Service',    selectedLeave.employee?.department?.name ?? '—'],
                ['Type',       selectedLeave.leaveType?.name ?? '—'],
                ['Date début', formatDate(selectedLeave.start_date)],
                ['Date fin',   formatDate(selectedLeave.end_date)],
                ['Nbr jours',  String(selectedLeave.days_count)],
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
          Imprimer une attestation de congé
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {selectedLeave && (
            <Box sx={{ bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px', p: 1.5, mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#9A3412' }}>
                {selectedLeave.employee?.first_name} {selectedLeave.employee?.last_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#C2410C', mt: 0.25 }}>
                {selectedLeave.employee?.employee_number} · {selectedLeave.employee?.department?.name ?? '—'}
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
              <Button
                variant="outlined"
                size="small"
                startIcon={<Print sx={{ fontSize: '13px !important' }} />}
                onClick={() => window.print()}
                sx={{ mt: 1.5, borderRadius: '6px', fontSize: 12, fontWeight: 700, borderColor: '#059669', color: '#059669' }}
              >
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
                  <Select
                    value={attestTemplate}
                    label="Modèle d'attestation"
                    onChange={(e) => setAttestTemplate(e.target.value)}
                  >
                    {attestTemplates.map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        <Stack>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.name}</Typography>
                          {t.description && (
                            <Typography sx={{ fontSize: 11, color: '#64748B' }}>{t.description}</Typography>
                          )}
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
            <Button
              variant="contained"
              disabled={!attestTemplate || generateMutation.isPending}
              startIcon={generateMutation.isPending
                ? <CircularProgress size={13} color="inherit" />
                : <Description sx={{ fontSize: '14px !important' }} />
              }
              onClick={() => generateMutation.mutate()}
              sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#C14D03' }, borderRadius: '6px', fontSize: 12, fontWeight: 700 }}
            >
              {generateMutation.isPending ? 'Génération…' : 'Générer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Valider / Refuser ── */}
      <Dialog open={Boolean(validateOpen)} onClose={() => { setValidateOpen(null); setComment(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: validateOpen?.action === 'approve' ? '#166534' : '#991B1B', color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {validateOpen?.action === 'approve' ? 'Approuver le congé' : 'Refuser le congé'}
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
            {validateOpen?.action === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
