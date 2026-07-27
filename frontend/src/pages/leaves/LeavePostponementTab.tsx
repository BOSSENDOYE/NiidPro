import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Paper, Skeleton, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add, CheckCircle, Cancel, ExpandMore, ExpandLess,
  EventRepeat, Close, Delete, AccessTime,
} from '@mui/icons-material';
import { postponementApi, leavesApi, type LeavePostponement } from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';

const NAV = '#0D2137';
const ACT = '#E85D04';

const STEPS = [
  { key: 'n1', label: 'Avis Directeur' },
  { key: 'n2', label: 'Chef DRH' },
  { key: 'n3', label: 'DAF' },
  { key: 'n4', label: 'SG' },
  { key: 'n5', label: 'DG' },
] as const;

// ── Couleur chip par statut ───────────────────────────────────────────────────
function stepColor(status: string) {
  if (status === 'approved') return { bg: '#DCFCE7', color: '#166534' };
  if (status === 'rejected') return { bg: '#FEE2E2', color: '#991B1B' };
  return { bg: '#FEF9C3', color: '#854D0E' }; // pending
}

function globalChip(status: string) {
  if (status === 'approved') return { label: 'Approuvé',  bg: '#DCFCE7', color: '#166534' };
  if (status === 'rejected') return { label: 'Rejeté',    bg: '#FEE2E2', color: '#991B1B' };
  return { label: 'En cours', bg: '#FEF9C3', color: '#854D0E' };
}

// ── Formulaire de création ────────────────────────────────────────────────────
interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function FormDialog({ open, onClose, onCreated }: FormDialogProps) {
  const qc = useQueryClient();

  const [empId,            setEmpId]            = useState<number | null>(null);
  const [leaveId,          setLeaveId]          = useState<number | null>(null);
  const [dateDepartInit,   setDateDepartInit]   = useState('');
  const [dateRetourInit,   setDateRetourInit]   = useState('');
  const [dateDepartEffec,  setDateDepartEffec]  = useState('');
  const [dateRetourEffec,  setDateRetourEffec]  = useState('');
  const [motif,            setMotif]            = useState('');
  const [error,            setError]            = useState<string | null>(null);

  // Jours de report calculé automatiquement
  const joursReport = useMemo(() => {
    if (!dateDepartInit || !dateDepartEffec) return 0;
    const diff = Math.round(
      (new Date(dateDepartEffec).getTime() - new Date(dateDepartInit).getTime()) / 86400000
    );
    return diff > 0 ? diff : 0;
  }, [dateDepartInit, dateDepartEffec]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r =>
      Array.isArray(r.data) ? r.data : (r.data as { data: typeof r.data }).data ?? []
    ),
  });

  // Congés de l'agent sélectionné (pour pré-remplir les dates)
  const { data: empLeaves = [] } = useQuery({
    queryKey: ['employee-leaves', empId],
    queryFn: () => leavesApi.list({ employee_id: empId!, per_page: 100 })
      .then(r => Array.isArray(r.data) ? r.data : (r.data as { data: typeof r.data }).data ?? []),
    enabled: !!empId,
  });

  const createMut = useMutation({
    mutationFn: () => postponementApi.create({
      employee_id:          empId!,
      leave_id:             leaveId ?? undefined,
      date_depart_initial:  dateDepartInit,
      date_retour_initial:  dateRetourInit,
      date_depart_effectif: dateDepartEffec,
      date_retour_effectif: dateRetourEffec,
      motif,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-postponements'] });
      onCreated();
      handleClose();
    },
    onError: (e: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const msg = e.response?.data?.message;
      const errs = e.response?.data?.errors;
      setError(msg ?? (errs ? Object.values(errs).flat().join(' ') : 'Erreur lors de la création.'));
    },
  });

  const handleClose = () => {
    setEmpId(null); setLeaveId(null);
    setDateDepartInit(''); setDateRetourInit('');
    setDateDepartEffec(''); setDateRetourEffec('');
    setMotif(''); setError(null);
    onClose();
  };

  // Pré-remplir depuis un congé sélectionné
  const handleLeaveSelect = (id: number | null) => {
    setLeaveId(id);
    if (!id) return;
    const leave = empLeaves.find((l: { id: number; start_date: string; end_date: string }) => l.id === id);
    if (leave) {
      setDateDepartInit(leave.start_date?.slice(0, 10) ?? '');
      setDateRetourInit(leave.end_date?.slice(0, 10) ?? '');
    }
  };

  const valid = !!empId && !!dateDepartInit && !!dateRetourInit && !!dateDepartEffec && !!dateRetourEffec && !!motif && joursReport > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: NAV, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EventRepeat sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
            Demande de report de date de jouissance
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: '#fff' }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

        {/* Agent */}
        <Autocomplete
          options={employees as { id: number; first_name: string; last_name: string; employee_number: string }[]}
          getOptionLabel={e => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
          value={(employees as { id: number; first_name: string; last_name: string; employee_number: string }[]).find(e => e.id === empId) ?? null}
          onChange={(_, v) => { setEmpId(v?.id ?? null); setLeaveId(null); }}
          renderInput={p => <TextField {...p} label="Agent *" size="small" />}
          sx={{ mb: 2 }}
        />

        {/* Congé d'origine (optionnel) */}
        {empId && (
          <TextField
            select fullWidth size="small" label="Congé d'origine (optionnel)"
            value={leaveId ?? ''}
            onChange={e => handleLeaveSelect(e.target.value ? Number(e.target.value) : null)}
            SelectProps={{ native: true }}
            sx={{ mb: 2.5 }}
          >
            <option value="">— Aucun congé lié —</option>
            {(empLeaves as { id: number; start_date: string; end_date: string; leaveType?: { name: string } }[]).map(l => (
              <option key={l.id} value={l.id}>
                {l.leaveType?.name ?? 'Congé'} : {l.start_date?.slice(0,10)} → {l.end_date?.slice(0,10)}
              </option>
            ))}
          </TextField>
        )}

        <Divider sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, color: '#64748B' }}>Dates initiales prévues</Typography>
        </Divider>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField fullWidth size="small" type="date" label="Départ initial *"
            InputLabelProps={{ shrink: true }}
            value={dateDepartInit}
            onChange={e => setDateDepartInit(e.target.value)} />
          <TextField fullWidth size="small" type="date" label="Retour initial *"
            InputLabelProps={{ shrink: true }}
            value={dateRetourInit}
            onChange={e => setDateRetourInit(e.target.value)} />
        </Stack>

        <Divider sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, color: '#64748B' }}>Nouvelles dates effectives</Typography>
        </Divider>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField fullWidth size="small" type="date" label="Départ effectif *"
            InputLabelProps={{ shrink: true }}
            value={dateDepartEffec}
            onChange={e => setDateDepartEffec(e.target.value)} />
          <TextField fullWidth size="small" type="date" label="Retour effectif *"
            InputLabelProps={{ shrink: true }}
            value={dateRetourEffec}
            onChange={e => setDateRetourEffec(e.target.value)} />
        </Stack>

        {/* Jours de report */}
        {joursReport > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFF7ED', borderRadius: 1, border: '1px solid #FED7AA' }}>
            <Typography sx={{ fontSize: 13, color: ACT, fontWeight: 700 }}>
              Nombre de jours de report : {joursReport} jour{joursReport > 1 ? 's' : ''}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth multiline minRows={2} size="small" label="Motif du report *"
          value={motif}
          onChange={e => setMotif(e.target.value)}
          sx={{ mb: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} size="small" sx={{ color: '#64748B' }}>Annuler</Button>
        <Button
          variant="contained" size="small"
          disabled={!valid || createMut.isPending}
          startIcon={createMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Add />}
          onClick={() => createMut.mutate()}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#1a3a5c' } }}
        >
          Soumettre la demande
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog d'approbation ──────────────────────────────────────────────────────
interface ApproveDialogProps {
  postponement: LeavePostponement | null;
  step: number | null;
  action: 'approved' | 'rejected' | null;
  onClose: () => void;
  onDone: (updated: LeavePostponement) => void;
}

function ApproveDialog({ postponement, step, action, onClose, onDone }: ApproveDialogProps) {
  const [comment, setComment] = useState('');
  const [error,   setError]   = useState<string | null>(null);

  const approveMut = useMutation({
    mutationFn: () => postponementApi.approve(postponement!.id, {
      step: step!, status: action!, comment: comment || undefined,
    }),
    onSuccess: (data) => { onDone(data); setComment(''); setError(null); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message ?? 'Erreur.'),
  });

  if (!postponement || !step || !action) return null;

  const stepLabel = STEPS[step - 1]?.label ?? '';
  const isReject  = action === 'rejected';

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: isReject ? '#991B1B' : NAV, color: '#fff', py: 1.5, fontSize: 14 }}>
        {isReject ? `Rejeter — ${stepLabel}` : `Approuver — ${stepLabel}`}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <TextField
          fullWidth multiline minRows={2} size="small"
          label={isReject ? 'Motif du rejet *' : 'Commentaire (optionnel)'}
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} size="small" sx={{ color: '#64748B' }}>Annuler</Button>
        <Button
          variant="contained" size="small"
          disabled={(isReject && !comment) || approveMut.isPending}
          startIcon={approveMut.isPending ? <CircularProgress size={14} color="inherit" /> : (isReject ? <Cancel /> : <CheckCircle />)}
          onClick={() => approveMut.mutate()}
          sx={{ bgcolor: isReject ? '#DC2626' : '#16A34A', '&:hover': { bgcolor: isReject ? '#b91c1c' : '#15803d' } }}
        >
          {isReject ? 'Rejeter' : 'Approuver'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Ligne expandable avec workflow ────────────────────────────────────────────
interface RowProps {
  row: LeavePostponement;
  onApprove: (row: LeavePostponement, step: number, action: 'approved' | 'rejected') => void;
  onDelete:  (row: LeavePostponement) => void;
  onUpdate:  (row: LeavePostponement) => void;
}

function PostponementRow({ row, onApprove, onDelete }: RowProps) {
  const [open, setOpen] = useState(false);
  const chip = globalChip(row.status);

  return (
    <>
      <TableRow
        hover sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
        onClick={() => setOpen(o => !o)}
      >
        <TableCell sx={{ width: 36, pl: 1 }}>
          {open ? <ExpandLess sx={{ fontSize: 18, color: '#94A3B8' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#94A3B8' }} />}
        </TableCell>
        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>
          {row.employee?.employee_number ?? '—'}
        </TableCell>
        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
          {row.employee?.first_name} {row.employee?.last_name}
        </TableCell>
        <TableCell sx={{ fontSize: 12, color: '#475569' }}>
          {row.employee?.department?.name ?? '—'}
        </TableCell>
        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatDate(row.date_depart_initial)} → {formatDate(row.date_retour_initial)}
        </TableCell>
        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {formatDate(row.date_depart_effectif)} → {formatDate(row.date_retour_effectif)}
        </TableCell>
        <TableCell align="center">
          <Chip
            label={`${row.jours_report} j`} size="small"
            sx={{ fontSize: 12, fontWeight: 800, bgcolor: '#FFF7ED', color: ACT }}
          />
        </TableCell>
        <TableCell align="center">
          {/* Mini workflow */}
          <Stack direction="row" spacing={0.5} justifyContent="center">
            {STEPS.map((s, i) => {
              const st = row[`${s.key}_status` as keyof LeavePostponement] as string;
              const c  = stepColor(st);
              return (
                <Tooltip key={s.key} title={`${s.label}: ${st}`}>
                  <Box sx={{
                    width: 20, height: 20, borderRadius: '50%',
                    bgcolor: c.bg, border: `1.5px solid ${c.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color: c.color,
                  }}>
                    {i + 1}
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
        </TableCell>
        <TableCell align="center">
          <Chip label={chip.label} size="small"
            sx={{ fontSize: 11, fontWeight: 700, bgcolor: chip.bg, color: chip.color }} />
        </TableCell>
        <TableCell align="center" onClick={e => e.stopPropagation()}>
          {row.status === 'pending' && (
            <Tooltip title="Supprimer">
              <IconButton size="small" onClick={() => onDelete(row)} sx={{ color: '#EF4444' }}>
                <Delete sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      {/* Détail expandable */}
      <TableRow>
        <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ px: 3, py: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                {/* Infos + Motif */}
                <Box flex={1}>
                  {/* Nombre de jours */}
                  <Box sx={{ mb: 1.5, p: 1.2, bgcolor: '#FFF7ED', borderRadius: 1, border: '1px solid #FED7AA', display: 'inline-block' }}>
                    <Typography sx={{ fontSize: 13, color: ACT, fontWeight: 800 }}>
                      Nombre de jours de report : {row.jours_report} jour{row.jours_report > 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase' }}>
                    Motif du report
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#0F172A' }}>{row.motif}</Typography>
                  {row.submitted_at && (
                    <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 1 }}>
                      Soumis le {formatDate(row.submitted_at)}
                    </Typography>
                  )}
                </Box>

                {/* Workflow détaillé */}
                <Box flex={2}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 1, textTransform: 'uppercase' }}>
                    Suivi de validation
                  </Typography>
                  <Stack spacing={0.75}>
                    {STEPS.map((s, i) => {
                      const step    = i + 1;
                      const status  = row[`${s.key}_status` as keyof LeavePostponement] as string;
                      const at      = row[`${s.key}_at` as keyof LeavePostponement] as string | null;
                      const comment = row[`${s.key}_comment` as keyof LeavePostponement] as string | null;
                      const c       = stepColor(status);
                      const isCurrent = row.current_step === step;

                      return (
                        <Stack key={s.key} direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            bgcolor: c.bg, border: `2px solid ${c.color}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: c.color,
                          }}>
                            {step}
                          </Box>
                          <Box flex={1}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.label}</Typography>
                              <Chip label={status === 'approved' ? 'Approuvé' : status === 'rejected' ? 'Rejeté' : 'En attente'}
                                size="small"
                                sx={{ fontSize: 10, fontWeight: 700, bgcolor: c.bg, color: c.color }} />
                              {at && <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(at)}</Typography>}
                            </Stack>
                            {comment && (
                              <Typography sx={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                                {comment}
                              </Typography>
                            )}
                          </Box>
                          {/* Boutons d'approbation si c'est l'étape courante */}
                          {isCurrent && row.status === 'pending' && (
                            <Stack direction="row" spacing={0.75}>
                              <Button
                                size="small" variant="contained"
                                startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                                onClick={e => { e.stopPropagation(); onApprove(row, step, 'approved'); }}
                                sx={{ fontSize: 11, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803d' }, px: 1.5, py: 0.5, minWidth: 0 }}
                              >
                                Approuver
                              </Button>
                              <Button
                                size="small" variant="contained"
                                startIcon={<Cancel sx={{ fontSize: 14 }} />}
                                onClick={e => { e.stopPropagation(); onApprove(row, step, 'rejected'); }}
                                sx={{ fontSize: 11, bgcolor: '#DC2626', '&:hover': { bgcolor: '#b91c1c' }, px: 1.5, py: 0.5, minWidth: 0 }}
                              >
                                Rejeter
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function LeavePostponementTab() {
  const qc = useQueryClient();

  const [formOpen,    setFormOpen]    = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [approveTarget, setApproveTarget] = useState<{
    row: LeavePostponement; step: number; action: 'approved' | 'rejected';
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leave-postponements', statusFilter],
    queryFn: () => postponementApi.list(statusFilter ? { status: statusFilter } : {}),
  });

  const rows: LeavePostponement[] = data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: number) => postponementApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-postponements'] }),
  });

  const handleUpdated = (updated: LeavePostponement) => {
    qc.setQueryData<{ data: LeavePostponement[] }>(
      ['leave-postponements', statusFilter],
      (old) => old
        ? { ...old, data: old.data.map(r => r.id === updated.id ? updated : r) }
        : old
    );
    setApproveTarget(null);
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* ── En-tête ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <EventRepeat sx={{ color: '#fff', fontSize: 20 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                Demande de report de date de jouissance de congé
              </Typography>
              <Typography sx={{ color: '#93C5FD', fontSize: 11.5 }}>
                Demande de décalage des dates de départ/retour d'un congé planifié — workflow 5 niveaux
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained" size="small"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
            sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#c44b02' }, borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            Nouvelle demande
          </Button>
        </Stack>
      </Box>

      {/* ── Filtres ── */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select size="small" label="Statut" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ width: 170 }}
          >
            <option value="">Tous</option>
            <option value="pending">En cours</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </TextField>
          <Button size="small" variant="outlined" onClick={() => refetch()}
            sx={{ borderColor: NAV, color: NAV, height: 40 }}>
            Actualiser
          </Button>
          <Typography sx={{ fontSize: 13, color: '#64748B', ml: 'auto !important' }}>
            {rows.length} demande{rows.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Box>

      {/* ── Tableau ── */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {isLoading ? (
          <Skeleton variant="rounded" height={300} />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  <TableCell sx={{ width: 36 }} />
                  {['Matricule', 'Agent', 'Direction', 'Dates initiales', 'Nouvelles dates',
                    'Jours report', 'Workflow', 'Statut', 'Action'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1.2, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: 13 }}>
                      <Stack alignItems="center" spacing={1}>
                        <AccessTime sx={{ fontSize: 36, color: '#CBD5E1' }} />
                        <span>Aucune demande de report trouvée</span>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <PostponementRow
                      key={row.id}
                      row={row}
                      onApprove={(r, step, action) => setApproveTarget({ row: r, step, action })}
                      onDelete={r => { if (window.confirm('Supprimer cette demande ?')) deleteMut.mutate(r.id); }}
                      onUpdate={handleUpdated}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ── Dialogs ── */}
      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} onCreated={() => refetch()} />

      <ApproveDialog
        postponement={approveTarget?.row ?? null}
        step={approveTarget?.step ?? null}
        action={approveTarget?.action ?? null}
        onClose={() => setApproveTarget(null)}
        onDone={handleUpdated}
      />
    </Box>
  );
}
