import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Divider,
} from '@mui/material';
import { SwapHoriz, Add, CheckCircle, ArrowForward } from '@mui/icons-material';
import { carriereApi } from '../../../api/carrieres';
import type { MobiliteInterne } from '../../../api/carrieres';
import { employeesApi } from '../../../api/employees';
import type { Employee } from '../../../types';
import AgentAutocomplete from '../../../components/common/AgentAutocomplete';
import { departmentsApi } from '../../../api/departments';

const TYPE_LABELS: Record<string, string> = {
  fonctionnelle:    'Fonctionnelle',
  geographique:     'Géographique',
  organisationnelle:'Organisationnelle',
};

const TYPE_COLORS: Record<string, string> = {
  fonctionnelle:    '#2563EB',
  geographique:     '#059669',
  organisationnelle:'#7C3AED',
};

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_etude:   { label: 'En étude',     color: '#D97706', bg: '#FFFBEB' },
  soumise_sg: { label: 'Soumise SG',   color: '#2563EB', bg: '#EFF6FF' },
  approuvee:  { label: 'Approuvée',    color: '#059669', bg: '#F0FDF4' },
  refusee:    { label: 'Refusée',      color: '#DC2626', bg: '#FEF2F2' },
};

export default function MobiliteTab() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openAction, setOpenAction] = useState<MobiliteInterne | null>(null);
  const [form, setForm] = useState<Partial<MobiliteInterne>>({
    type_mobilite: 'fonctionnelle', initiateur: 'agent',
    date_demande: new Date().toISOString().split('T')[0],
  });
  const [actionForm, setActionForm] = useState<Record<string, string>>({ action: 'soumettre_sg' });
  const [err, setErr] = useState<string | null>(null);

  const { data: mobilites = [], isLoading } = useQuery({
    queryKey: ['carrieres-mobilites'],
    queryFn: () => carriereApi.getMobilites().then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : (d as { data?: unknown[] }).data ?? [];
    }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => carriereApi.createMobilite(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-mobilites'] });
      setOpenCreate(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const actionMut = useMutation({
    mutationFn: () => carriereApi.validerMobilite(
      openAction!.id,
      actionForm.action,
      actionForm.date_prise_effet,
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-mobilites'] });
      setOpenAction(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const enCours  = mobilites.filter(m => !['approuvee', 'refusee'].includes(m.statut));
  const archives = mobilites.filter(m => ['approuvee', 'refusee'].includes(m.statut));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {enCours.length} demande(s) en cours · {archives.filter(m => m.statut === 'approuvee').length} mobilité(s) approuvée(s)
        </Typography>
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setForm({ type_mobilite: 'fonctionnelle', initiateur: 'agent', date_demande: new Date().toISOString().split('T')[0] }); setErr(null); setOpenCreate(true); }}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouvelle demande
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* En cours */}
          {enCours.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>EN COURS</Typography>
              <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Mouvement</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Préavis</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enCours.map(m => {
                      const s = STATUT_LABELS[m.statut];
                      return (
                        <TableRow key={m.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#E0E7FF', color: '#4338CA' }}>
                                {m.employee?.first_name?.[0]}{m.employee?.last_name?.[0]}
                              </Avatar>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                {m.employee?.first_name} {m.employee?.last_name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={TYPE_LABELS[m.type_mobilite]} size="small"
                              sx={{ fontSize: 11, fontWeight: 700,
                                bgcolor: TYPE_COLORS[m.type_mobilite] + '15',
                                color: TYPE_COLORS[m.type_mobilite] }} />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography sx={{ fontSize: 12 }}>{m.department_avant?.name ?? '—'}</Typography>
                              <ArrowForward sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{m.department_apres?.name ?? '—'}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={s.label} size="small"
                              sx={{ fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {m.date_preavis_30j ? new Date(m.date_preavis_30j).toLocaleDateString('fr-FR') : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined"
                              onClick={() => { setOpenAction(m); setActionForm({ action: 'soumettre_sg' }); setErr(null); }}
                              sx={{ textTransform: 'none', fontSize: 11, borderRadius: '8px' }}>
                              Traiter
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Historique */}
          {archives.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>HISTORIQUE</Typography>
              <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Mouvement</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Décision</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Prise d'effet</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {archives.map(m => {
                      const s = STATUT_LABELS[m.statut];
                      return (
                        <TableRow key={m.id} hover>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                            {m.employee?.first_name} {m.employee?.last_name}
                          </TableCell>
                          <TableCell>
                            <Chip label={TYPE_LABELS[m.type_mobilite]} size="small"
                              sx={{ fontSize: 11, bgcolor: TYPE_COLORS[m.type_mobilite] + '15', color: TYPE_COLORS[m.type_mobilite] }} />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography sx={{ fontSize: 12 }}>{m.department_avant?.name ?? '—'}</Typography>
                              <ArrowForward sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{m.department_apres?.name ?? '—'}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={s.label} size="small"
                              sx={{ fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {m.date_prise_effet ? new Date(m.date_prise_effet).toLocaleDateString('fr-FR') : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {mobilites.length === 0 && (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 5 }}>
              Aucune demande de mobilité enregistrée.
            </Typography>
          )}
        </>
      )}

      {/* Dialog créer demande */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz sx={{ color: '#2563EB' }} /> Nouvelle demande de mobilité
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {err && <Alert severity="error" sx={{ borderRadius: '10px' }}>{err}</Alert>}
            <AgentAutocomplete
              employees={employees as Employee[]}
              value={(employees as Employee[]).find(e => e.id === form.employee_id) ?? null}
              onChange={(emp) => set('employee_id', emp?.id ?? 0)}
              label="Agent *"
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth size="small" label="Type *"
                  value={form.type_mobilite ?? 'fonctionnelle'} onChange={e => set('type_mobilite', e.target.value)}>
                  <MenuItem value="fonctionnelle">Fonctionnelle</MenuItem>
                  <MenuItem value="geographique">Géographique</MenuItem>
                  <MenuItem value="organisationnelle">Organisationnelle</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth size="small" label="Initiateur *"
                  value={form.initiateur ?? 'agent'} onChange={e => set('initiateur', e.target.value)}>
                  <MenuItem value="agent">Agent</MenuItem>
                  <MenuItem value="hierarchie">Hiérarchie</MenuItem>
                  <MenuItem value="direction">Direction</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Divider><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Affectation cible</Typography></Divider>
            <TextField select fullWidth size="small" label="Direction / Service cible"
              value={form.department_apres_id ?? ''} onChange={e => set('department_apres_id', Number(e.target.value))}>
              {(departments as { id: number; name: string }[]).map(d => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" label="Date de la demande *" type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date_demande ?? ''} onChange={e => set('date_demande', e.target.value)} />
            <TextField fullWidth size="small" label="Motif" multiline rows={2}
              value={form.motif ?? ''} onChange={e => set('motif', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.employee_id || !form.date_demande}
            startIcon={createMut.isPending ? <CircularProgress size={15} color="inherit" /> : <CheckCircle />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog traitement */}
      <Dialog open={!!openAction} onClose={() => setOpenAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15 }}>Traiter la demande</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {err && <Alert severity="error" sx={{ borderRadius: '10px' }}>{err}</Alert>}
            <TextField select fullWidth size="small" label="Action"
              value={actionForm.action} onChange={e => setActionForm(f => ({ ...f, action: e.target.value }))}>
              <MenuItem value="soumettre_sg">Soumettre au Secrétaire Général</MenuItem>
              <MenuItem value="approuver">Approuver (DG)</MenuItem>
              <MenuItem value="refuser">Refuser (DG)</MenuItem>
            </TextField>
            {actionForm.action === 'approuver' && (
              <TextField fullWidth size="small" label="Date de prise d'effet" type="date"
                InputLabelProps={{ shrink: true }}
                value={actionForm.date_prise_effet ?? ''}
                onChange={e => setActionForm(f => ({ ...f, date_prise_effet: e.target.value }))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAction(null)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => actionMut.mutate()} disabled={actionMut.isPending}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
