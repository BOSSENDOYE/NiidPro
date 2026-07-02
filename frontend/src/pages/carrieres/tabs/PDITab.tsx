import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Accordion,
  AccordionSummary, AccordionDetails, IconButton, Tooltip, Divider,
} from '@mui/material';
import { ExpandMore, Add, Delete, LibraryBooks, CheckCircle } from '@mui/icons-material';
import { carriereApi } from '../../../api/carrieres';
import type { PDI, PdiAction } from '../../../api/carrieres';
import { employeesApi } from '../../../api/employees';
import type { Employee } from '../../../types';
import AgentAutocomplete from '../../../components/common/AgentAutocomplete';

const ACTION_TYPE_LABELS: Record<string, string> = {
  formation:          'Formation',
  mission:            'Mission',
  projet_transverse:  'Projet transverse',
};

const ACTION_STATUT_COLORS: Record<string, string> = {
  planifie:   '#2563EB',
  en_cours:   '#D97706',
  realise:    '#059669',
  abandonne:  '#94A3B8',
};

const ANNEE_COURANTE = new Date().getFullYear();

const EMPTY_ACTION: Omit<PdiAction, 'id' | 'pdi_id'> = {
  type: 'formation', intitule: '', organisme: null,
  duree_jours: null, echeance: null, indicateur_suivi: null, statut: 'planifie',
};

export default function PDITab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPdi, setEditingPdi] = useState<PDI | null>(null);
  const [form, setForm] = useState<Partial<PDI>>({ annee: ANNEE_COURANTE - 1, actions: [] });
  const [err, setErr] = useState<string | null>(null);
  const [filtreAnnee, setFiltreAnnee] = useState(ANNEE_COURANTE - 1);

  const { data: pdis = [], isLoading } = useQuery({
    queryKey: ['carrieres-pdis', filtreAnnee],
    queryFn: () => carriereApi.getPdis({ annee: filtreAnnee }).then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : (d as { data?: unknown[] }).data ?? [];
    }),
  });

  const saveMut = useMutation({
    mutationFn: () => editingPdi
      ? carriereApi.updatePdi(editingPdi.id, form)
      : carriereApi.createPdi(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-pdis'] });
      setOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const openCreate = () => {
    setEditingPdi(null);
    setForm({ annee: filtreAnnee, actions: [] });
    setErr(null);
    setOpen(true);
  };

  const openEdit = (pdi: PDI) => {
    setEditingPdi(pdi);
    setForm({ ...pdi, actions: pdi.actions ?? [] });
    setErr(null);
    setOpen(true);
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addAction = () => {
    setForm(f => ({ ...f, actions: [...(f.actions ?? []), { ...EMPTY_ACTION }] }));
  };

  const updateAction = (i: number, k: string, v: unknown) => {
    setForm(f => {
      const acts = [...(f.actions ?? [])];
      acts[i] = { ...acts[i], [k]: v } as PdiAction;
      return { ...f, actions: acts };
    });
  };

  const removeAction = (i: number) => {
    setForm(f => ({ ...f, actions: (f.actions ?? []).filter((_, idx) => idx !== i) }));
  };

  const totalActions = pdis.reduce((acc, p) => acc + (p.actions?.length ?? 0), 0);
  const totalRealises = pdis.reduce((acc, p) =>
    acc + (p.actions?.filter(a => a.statut === 'realise').length ?? 0), 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField select size="small" value={filtreAnnee}
            onChange={e => setFiltreAnnee(Number(e.target.value))} sx={{ minWidth: 110 }}>
            {[ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2].map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {pdis.length} PDI · {totalActions} actions · {totalRealises} réalisées
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouveau PDI
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : pdis.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 5 }}>
          Aucun PDI pour {filtreAnnee}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {pdis.map(pdi => {
            const realises = pdi.actions?.filter(a => a.statut === 'realise').length ?? 0;
            const total = pdi.actions?.length ?? 0;
            return (
              <Grid item xs={12} sm={6} md={4} key={pdi.id}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#E0E7FF', color: '#4338CA' }}>
                      {pdi.employee?.first_name?.[0]}{pdi.employee?.last_name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {pdi.employee?.first_name} {pdi.employee?.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {pdi.employee?.department?.name}
                      </Typography>
                    </Box>
                    <Chip size="small" label={pdi.statut}
                      sx={{ fontSize: 10, fontWeight: 700,
                        bgcolor: pdi.statut === 'valide' ? '#F0FDF4' : pdi.statut === 'soumis' ? '#EFF6FF' : '#F8FAFC',
                        color:   pdi.statut === 'valide' ? '#059669' : pdi.statut === 'soumis' ? '#2563EB' : '#64748B',
                      }} />
                  </Stack>

                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                    {total} action(s) · {realises}/{total} réalisée(s)
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {pdi.actions?.slice(0, 3).map((a, i) => (
                      <Chip key={i} label={a.intitule} size="small" variant="outlined"
                        sx={{ fontSize: 10, maxWidth: 140,
                          borderColor: ACTION_STATUT_COLORS[a.statut] + '60',
                          color: ACTION_STATUT_COLORS[a.statut] }} />
                    ))}
                    {(pdi.actions?.length ?? 0) > 3 && (
                      <Chip label={`+${(pdi.actions?.length ?? 0) - 3}`} size="small"
                        sx={{ fontSize: 10 }} />
                    )}
                  </Box>

                  <Divider sx={{ mb: 1 }} />
                  <Button fullWidth size="small" onClick={() => openEdit(pdi)}
                    sx={{ textTransform: 'none', fontSize: 12 }}>
                    Voir / Modifier
                  </Button>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog PDI */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LibraryBooks sx={{ color: '#4338CA' }} />
          {editingPdi ? 'Modifier le PDI' : 'Nouveau Plan de Développement Individuel'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {err && <Alert severity="error" sx={{ borderRadius: '10px' }}>{err}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <AgentAutocomplete
                  employees={employees as Employee[]}
                  value={(employees as Employee[]).find(e => e.id === form.employee_id) ?? null}
                  onChange={(emp) => set('employee_id', emp?.id ?? 0)}
                  label="Agent *"
                  required
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField select fullWidth size="small" label="Année"
                  value={form.annee ?? ANNEE_COURANTE} onChange={e => set('annee', Number(e.target.value))}>
                  {[ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField select fullWidth size="small" label="Statut"
                  value={form.statut ?? 'brouillon'} onChange={e => set('statut', e.target.value)}>
                  <MenuItem value="brouillon">Brouillon</MenuItem>
                  <MenuItem value="soumis">Soumis</MenuItem>
                  <MenuItem value="valide">Validé</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <TextField fullWidth size="small" label="Objectifs professionnels" multiline rows={2}
              value={form.objectifs_professionnels ?? ''} onChange={e => set('objectifs_professionnels', e.target.value)} />
            <TextField fullWidth size="small" label="Compétences à renforcer" multiline rows={2}
              value={form.competences_a_renforcer ?? ''} onChange={e => set('competences_a_renforcer', e.target.value)} />

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  Actions ({form.actions?.length ?? 0})
                </Typography>
                <Button size="small" startIcon={<Add />} onClick={addAction}
                  sx={{ textTransform: 'none', fontSize: 12 }}>
                  Ajouter une action
                </Button>
              </Stack>

              {(form.actions ?? []).map((a, i) => (
                <Accordion key={i} disableGutters elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', mb: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />}
                    sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, mr: 1 }}>
                      <Chip label={ACTION_TYPE_LABELS[a.type]} size="small"
                        sx={{ fontSize: 10, bgcolor: '#EFF6FF', color: '#2563EB' }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {a.intitule || `Action ${i + 1}`}
                      </Typography>
                    </Stack>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" onClick={e => { e.stopPropagation(); removeAction(i); }}
                        sx={{ color: '#DC2626' }}>
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <TextField select fullWidth size="small" label="Type"
                          value={a.type} onChange={e => updateAction(i, 'type', e.target.value)}>
                          <MenuItem value="formation">Formation</MenuItem>
                          <MenuItem value="mission">Mission</MenuItem>
                          <MenuItem value="projet_transverse">Projet transverse</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <TextField fullWidth size="small" label="Intitulé *"
                          value={a.intitule} onChange={e => updateAction(i, 'intitule', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Organisme"
                          value={a.organisme ?? ''} onChange={e => updateAction(i, 'organisme', e.target.value || null)} />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField fullWidth size="small" label="Durée (j)" type="number"
                          value={a.duree_jours ?? ''} onChange={e => updateAction(i, 'duree_jours', e.target.value ? Number(e.target.value) : null)} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField fullWidth size="small" label="Échéance" type="date"
                          InputLabelProps={{ shrink: true }}
                          value={a.echeance ?? ''} onChange={e => updateAction(i, 'echeance', e.target.value || null)} />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField select fullWidth size="small" label="Statut"
                          value={a.statut} onChange={e => updateAction(i, 'statut', e.target.value)}>
                          <MenuItem value="planifie">Planifié</MenuItem>
                          <MenuItem value="en_cours">En cours</MenuItem>
                          <MenuItem value="realise">Réalisé</MenuItem>
                          <MenuItem value="abandonne">Abandonné</MenuItem>
                        </TextField>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.employee_id}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <CheckCircle />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
