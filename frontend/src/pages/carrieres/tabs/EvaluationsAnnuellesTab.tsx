import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Tooltip, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  LinearProgress, Divider,
} from '@mui/material';
import { Add, Star, CheckCircle, Edit, Assessment } from '@mui/icons-material';
import { carriereApi, APPRECIATION_COLORS, CATEGORIE_LABELS } from '../../../api/carrieres';
import type { EvaluationAnnuelle, AppreciationAnnuelle } from '../../../api/carrieres';
import { employeesApi } from '../../../api/employees';
import type { Employee } from '../../../types';
import AgentAutocomplete from '../../../components/common/AgentAutocomplete';

const APPRECIATION_LABELS: Record<AppreciationAnnuelle, string> = {
  excellent:    'Excellent',
  satisfaisant: 'Satisfaisant',
  passable:     'Passable',
  insuffisant:  'Insuffisant',
};

const DOMAINES = [
  { key: 'note_resultats',     label: 'Résultats & objectifs' },
  { key: 'note_competences',   label: 'Compétences techniques' },
  { key: 'note_comportement',  label: 'Comportement & valeurs' },
  { key: 'note_developpement', label: 'Développement personnel' },
] as const;

function NoteBar({ value }: { value: number | null }) {
  if (value === null) return <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>;
  const pct = (value / 4) * 100;
  const color = value >= 3.5 ? '#059669' : value >= 2.5 ? '#2563EB' : value >= 1.5 ? '#D97706' : '#DC2626';
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <LinearProgress variant="determinate" value={pct}
        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
      <Typography sx={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>{value}/4</Typography>
    </Stack>
  );
}

const ANNEE_COURANTE = new Date().getFullYear();

export default function EvaluationsAnnuellesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filtreAnnee, setFiltreAnnee] = useState<number>(ANNEE_COURANTE - 1);
  const [form, setForm] = useState<Partial<EvaluationAnnuelle>>({ annee: ANNEE_COURANTE, statut: 'brouillon' });
  const [err, setErr] = useState<string | null>(null);

  const { data: evals = [], isLoading } = useQuery({
    queryKey: ['carrieres-evaluations', filtreAnnee],
    queryFn: () => carriereApi.getEvaluations({ annee: filtreAnnee }).then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : (d as { data?: unknown[] }).data ?? [];
    }),
  });

  const saveMut = useMutation({
    mutationFn: () => editingId
      ? carriereApi.updateEvaluation(editingId, form)
      : carriereApi.createEvaluation(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-evaluations'] });
      setOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur lors de la sauvegarde.'),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ annee: filtreAnnee, statut: 'brouillon' });
    setErr(null);
    setOpen(true);
  };

  const openEdit = (ev: EvaluationAnnuelle) => {
    setEditingId(ev.id);
    setForm(ev);
    setErr(null);
    setOpen(true);
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const stats = {
    total: evals.length,
    validees: evals.filter(e => e.statut === 'validee').length,
    excellent: evals.filter(e => e.appreciation === 'excellent').length,
    passable: evals.filter(e => e.appreciation === 'passable' || e.appreciation === 'insuffisant').length,
  };

  return (
    <Box>
      {/* En-tête + filtres */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField select size="small" value={filtreAnnee}
            onChange={e => setFiltreAnnee(Number(e.target.value))}
            sx={{ minWidth: 110 }}>
            {[ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2].map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {stats.total} évaluation(s) · {stats.validees} validée(s)
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouvelle évaluation
        </Button>
      </Stack>

      {/* Cartes résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', value: stats.total, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Validées', value: stats.validees, color: '#059669', bg: '#F0FDF4' },
          { label: 'Excellent', value: stats.excellent, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'À améliorer', value: stats.passable, color: '#DC2626', bg: '#FEF2F2' },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.label}>
            <Box sx={{ bgcolor: c.bg, borderRadius: '12px', p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{c.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Tableau */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Catégorie</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Note globale</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Appréciation</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Entretien</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 3 }}>
                      Aucune évaluation pour {filtreAnnee}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : evals.map(ev => (
                <TableRow key={ev.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#E0E7FF', color: '#4338CA' }}>
                        {ev.employee?.first_name?.[0]}{ev.employee?.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {ev.employee?.first_name} {ev.employee?.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {ev.employee?.department?.name}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={ev.employee?.categorie_emploi ?? '—'} size="small"
                      sx={{ fontSize: 11, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <NoteBar value={ev.note_globale} />
                  </TableCell>
                  <TableCell>
                    {ev.appreciation ? (
                      <Chip label={APPRECIATION_LABELS[ev.appreciation]} size="small"
                        sx={{ fontSize: 11, fontWeight: 700, bgcolor: APPRECIATION_COLORS[ev.appreciation] + '20',
                          color: APPRECIATION_COLORS[ev.appreciation] }} />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={ev.statut}
                      sx={{ fontSize: 11,
                        bgcolor: ev.statut === 'validee' ? '#F0FDF4' : ev.statut === 'soumise' ? '#EFF6FF' : '#F8FAFC',
                        color:   ev.statut === 'validee' ? '#059669' : ev.statut === 'soumise' ? '#2563EB' : '#64748B',
                      }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {ev.date_entretien ? new Date(ev.date_entretien).toLocaleDateString('fr-FR') : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifier">
                      <Button size="small" startIcon={<Edit sx={{ fontSize: 14 }} />}
                        onClick={() => openEdit(ev)}
                        sx={{ textTransform: 'none', fontSize: 11 }}>
                        Modifier
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog création / édition */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment sx={{ color: '#4338CA' }} />
          {editingId ? 'Modifier l\'évaluation' : 'Nouvelle évaluation annuelle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {err && <Alert severity="error" sx={{ borderRadius: '10px' }}>{err}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <AgentAutocomplete
                  employees={employees as Employee[]}
                  value={(employees as Employee[]).find(e => e.id === form.employee_id) ?? null}
                  onChange={(emp) => set('employee_id', emp?.id ?? 0)}
                  label="Agent *"
                  required
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Année *"
                  value={form.annee ?? ANNEE_COURANTE} onChange={e => set('annee', Number(e.target.value))}>
                  {[ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Statut"
                  value={form.statut ?? 'brouillon'} onChange={e => set('statut', e.target.value)}>
                  <MenuItem value="brouillon">Brouillon</MenuItem>
                  <MenuItem value="soumise">Soumise</MenuItem>
                  <MenuItem value="validee">Validée</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Date d'entretien" type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_entretien ?? ''} onChange={e => set('date_entretien', e.target.value)} />
              </Grid>
            </Grid>

            <Divider><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Notes par domaine (0 – 4)</Typography></Divider>

            <Grid container spacing={2}>
              {DOMAINES.map(d => (
                <Grid item xs={12} sm={6} key={d.key}>
                  <TextField fullWidth size="small" label={d.label} type="number"
                    inputProps={{ min: 0, max: 4, step: 0.5 }}
                    value={(form as Record<string, unknown>)[d.key] ?? ''}
                    onChange={e => set(d.key, e.target.value === '' ? null : Number(e.target.value))} />
                </Grid>
              ))}
            </Grid>

            <TextField fullWidth size="small" label="Objectifs de l'année" multiline rows={2}
              value={form.objectifs_annee ?? ''} onChange={e => set('objectifs_annee', e.target.value)} />
            <TextField fullWidth size="small" label="Commentaire de l'évaluateur" multiline rows={2}
              value={form.commentaire_evaluateur ?? ''} onChange={e => set('commentaire_evaluateur', e.target.value)} />
            <TextField fullWidth size="small" label="Commentaire de l'agent" multiline rows={2}
              value={form.commentaire_agent ?? ''} onChange={e => set('commentaire_agent', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.employee_id}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <CheckCircle />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
