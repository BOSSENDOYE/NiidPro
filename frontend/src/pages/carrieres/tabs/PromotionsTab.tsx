import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Stepper, Step, StepLabel,
} from '@mui/material';
import { WorkspacePremium, Add, CheckCircle } from '@mui/icons-material';
import { carriereApi, CATEGORIE_COLORS, CATEGORIE_LABELS } from '../../../api/carrieres';
import type { Promotion, CategorieEmploi } from '../../../api/carrieres';
import { employeesApi } from '../../../api/employees';
import type { Employee } from '../../../types';
import AgentAutocomplete from '../../../components/common/AgentAutocomplete';

const TYPE_LABELS: Record<string, string> = {
  au_choix:            'Au choix',
  concours_interne:    'Concours interne',
  formation_qualifiante: 'Formation qualifiante',
};

const STATUT_STEPS = ['appel_candidature', 'en_instruction', 'commission_tenue', 'accorde'];
const STATUT_LABELS_P: Record<string, { label: string; color: string; bg: string }> = {
  appel_candidature: { label: 'Appel candidature', color: '#2563EB', bg: '#EFF6FF' },
  en_instruction:    { label: 'En instruction',    color: '#D97706', bg: '#FFFBEB' },
  commission_tenue:  { label: 'Commission tenue',  color: '#7C3AED', bg: '#F5F3FF' },
  accorde:           { label: 'Accordée',          color: '#059669', bg: '#F0FDF4' },
  refuse:            { label: 'Refusée',           color: '#DC2626', bg: '#FEF2F2' },
};

const CATEGORIES: CategorieEmploi[] = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E'];

export default function PromotionsTab() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openAction, setOpenAction] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Partial<Promotion>>({ type_promotion: 'au_choix' });
  const [actionForm, setActionForm] = useState<Record<string, unknown>>({ action: 'commission' });
  const [err, setErr] = useState<string | null>(null);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['carrieres-promotions'],
    queryFn: () => carriereApi.getPromotions().then(r => r.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : (d as { data?: unknown[] }).data ?? [];
    }),
  });

  const createMut = useMutation({
    mutationFn: () => carriereApi.createPromotion(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carrieres-promotions'] }); setOpenCreate(false); },
    onError: (e: { response?: { data?: { message?: string } } }) => setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const actionMut = useMutation({
    mutationFn: () => carriereApi.validerPromotion(openAction!.id, actionForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carrieres-promotions'] }); setOpenAction(null); },
    onError: (e: { response?: { data?: { message?: string } } }) => setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const enCours = promotions.filter(p => !['accorde', 'refuse'].includes(p.statut));
  const archives = promotions.filter(p => ['accorde', 'refuse'].includes(p.statut));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {enCours.length} dossier(s) en cours · {archives.filter(p => p.statut === 'accorde').length} promotion(s) accordée(s)
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ type_promotion: 'au_choix' }); setErr(null); setOpenCreate(true); }}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouveau dossier
        </Button>
      </Stack>

      {/* Dossiers en cours */}
      {enCours.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>EN COURS</Typography>
          <Grid container spacing={2}>
            {enCours.map(p => {
              const s = STATUT_LABELS_P[p.statut];
              const stepIndex = STATUT_STEPS.indexOf(p.statut);
              return (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#E0E7FF', color: '#4338CA' }}>
                          {p.employee?.first_name?.[0]}{p.employee?.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                            {p.employee?.first_name} {p.employee?.last_name}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {p.employee?.department?.name}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip label={s.label} size="small"
                        sx={{ fontSize: 11, fontWeight: 700, bgcolor: s.bg, color: s.color }} />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip label={p.categorie_avant} size="small"
                        sx={{ fontSize: 12, fontWeight: 800, bgcolor: CATEGORIE_COLORS[p.categorie_avant] + '20', color: CATEGORIE_COLORS[p.categorie_avant] }} />
                      <Typography sx={{ fontSize: 14 }}>→</Typography>
                      <Chip label={p.categorie_apres} size="small"
                        sx={{ fontSize: 12, fontWeight: 800, bgcolor: CATEGORIE_COLORS[p.categorie_apres] + '20', color: CATEGORIE_COLORS[p.categorie_apres] }} />
                      <Chip label={TYPE_LABELS[p.type_promotion]} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                    </Stack>

                    <Stepper activeStep={stepIndex} alternativeLabel sx={{ mb: 2 }}>
                      {['Appel', 'Instruction', 'Commission', 'Décision'].map(label => (
                        <Step key={label}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 10 } }}>{label}</StepLabel></Step>
                      ))}
                    </Stepper>

                    <Button fullWidth size="small" variant="outlined" onClick={() => { setOpenAction(p); setActionForm({ action: 'commission' }); setErr(null); }}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: '8px' }}>
                      Traiter
                    </Button>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
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
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Promotion</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Décision</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date effet</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archives.map(p => {
                  const s = STATUT_LABELS_P[p.statut];
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                        {p.employee?.first_name} {p.employee?.last_name}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={p.categorie_avant} size="small" sx={{ fontSize: 11 }} />
                          <Typography sx={{ fontSize: 12 }}>→</Typography>
                          <Chip label={p.categorie_apres} size="small" sx={{ fontSize: 11 }} />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{TYPE_LABELS[p.type_promotion]}</TableCell>
                      <TableCell>
                        <Chip label={s.label} size="small"
                          sx={{ fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {p.date_effet ? new Date(p.date_effet).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>}

      {/* Dialog créer dossier */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkspacePremium sx={{ color: '#7C3AED' }} /> Nouveau dossier de promotion
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
            <TextField select fullWidth size="small" label="Catégorie cible *"
              value={form.categorie_apres ?? ''} onChange={e => set('categorie_apres', e.target.value)}>
              {CATEGORIES.map(c => (
                <MenuItem key={c} value={c}>{c} — {CATEGORIE_LABELS[c]}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Type de promotion *"
              value={form.type_promotion ?? 'au_choix'} onChange={e => set('type_promotion', e.target.value)}>
              <MenuItem value="au_choix">Au choix</MenuItem>
              <MenuItem value="concours_interne">Concours interne</MenuItem>
              <MenuItem value="formation_qualifiante">Suite à formation qualifiante</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label="Commentaire" multiline rows={2}
              value={form.commentaire ?? ''} onChange={e => set('commentaire', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.employee_id || !form.categorie_apres}
            startIcon={createMut.isPending ? <CircularProgress size={15} color="inherit" /> : <CheckCircle />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog traitement */}
      <Dialog open={!!openAction} onClose={() => setOpenAction(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15 }}>Traiter le dossier de promotion</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {err && <Alert severity="error" sx={{ borderRadius: '10px' }}>{err}</Alert>}
            <TextField select fullWidth size="small" label="Action"
              value={actionForm.action ?? 'commission'} onChange={e => setActionForm(f => ({ ...f, action: e.target.value }))}>
              <MenuItem value="commission">Enregistrer avis de la Commission</MenuItem>
              <MenuItem value="accorder">Accorder la promotion (DG)</MenuItem>
              <MenuItem value="refuser">Refuser la promotion (DG)</MenuItem>
            </TextField>
            {actionForm.action === 'commission' && (
              <>
                <TextField fullWidth size="small" label="Date de la commission" type="date"
                  InputLabelProps={{ shrink: true }}
                  value={(actionForm.commission_date as string) ?? ''}
                  onChange={e => setActionForm(f => ({ ...f, commission_date: e.target.value }))} />
                <TextField select fullWidth size="small" label="Avis de la commission"
                  value={(actionForm.commission_avis as string) ?? ''}
                  onChange={e => setActionForm(f => ({ ...f, commission_avis: e.target.value }))}>
                  <MenuItem value="favorable">Favorable</MenuItem>
                  <MenuItem value="defavorable">Défavorable</MenuItem>
                  <MenuItem value="reporte">Reporté</MenuItem>
                </TextField>
              </>
            )}
            {actionForm.action === 'accorder' && (
              <TextField fullWidth size="small" label="Date d'effet" type="date"
                InputLabelProps={{ shrink: true }}
                value={(actionForm.date_effet as string) ?? ''}
                onChange={e => setActionForm(f => ({ ...f, date_effet: e.target.value }))} />
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
