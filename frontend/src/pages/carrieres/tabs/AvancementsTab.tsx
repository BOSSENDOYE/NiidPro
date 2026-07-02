import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, Tabs, Tab, Divider,
} from '@mui/material';
import { TrendingUp, CheckCircle, Cancel, Pause, Add } from '@mui/icons-material';
import { carriereApi, CATEGORIE_COLORS, CATEGORIE_LABELS, APPRECIATION_COLORS } from '../../../api/carrieres';
import type { EligibleAvancement, Avancement } from '../../../api/carrieres';

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente_daf: { label: 'Attente DAF',  color: '#D97706', bg: '#FFFBEB' },
  en_attente_dg:  { label: 'Attente DG',   color: '#2563EB', bg: '#EFF6FF' },
  accorde:        { label: 'Accordé',       color: '#059669', bg: '#F0FDF4' },
  refuse:         { label: 'Refusé',        color: '#DC2626', bg: '#FEF2F2' },
  reporte:        { label: 'Reporté',       color: '#64748B', bg: '#F8FAFC' },
};

function EmpAvatar({ nom, prenom }: { nom: string; prenom: string }) {
  return (
    <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: '#E0E7FF', color: '#4338CA' }}>
      {prenom?.[0]}{nom?.[0]}
    </Avatar>
  );
}

export default function AvancementsTab() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [openAction, setOpenAction] = useState<Avancement | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<EligibleAvancement | null>(null);
  const [action, setAction] = useState('valider_daf');
  const [motif, setMotif] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const { data: eligibles = [], isLoading: loadElig } = useQuery({
    queryKey: ['carrieres-eligibles'],
    queryFn: () => carriereApi.getEligibles().then(r => r.data),
  });

  const { data: avancements = [], isLoading: loadAv } = useQuery({
    queryKey: ['carrieres-avancements'],
    queryFn: () => carriereApi.getAvancements().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => carriereApi.createAvancement({
      employee_id: selectedEmp!.employee.id,
      date_eligibilite: selectedEmp!.date_eligibilite,
      note_evaluation: selectedEmp!.note_derniere_eval ?? undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-avancements'] });
      qc.invalidateQueries({ queryKey: ['carrieres-eligibles'] });
      setOpenCreate(false);
      setSelectedEmp(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur'),
  });

  const actionMut = useMutation({
    mutationFn: () => carriereApi.validerAvancement(openAction!.id, action, motif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrieres-avancements'] });
      setOpenAction(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setErr(e.response?.data?.message ?? 'Erreur'),
  });

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Tab label={`Agents éligibles (${eligibles.length})`} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600 }} />
        <Tab label={`Dossiers en cours (${avancements.filter(a => ['en_attente_daf','en_attente_dg'].includes(a.statut)).length})`}
          sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600 }} />
        <Tab label="Historique" sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600 }} />
      </Tabs>

      {/* ─── Onglet éligibles ─── */}
      {subTab === 0 && (
        <Box>
          {loadElig ? <CircularProgress /> : (
            <Grid container spacing={2}>
              {eligibles.length === 0 ? (
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center', py: 4 }}>
                    Aucun agent éligible à l'avancement actuellement.
                  </Typography>
                </Grid>
              ) : eligibles.map((el, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <EmpAvatar nom={el.employee.last_name} prenom={el.employee.first_name} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {el.employee.first_name} {el.employee.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {el.employee.department?.name} · Échelon {el.employee.echelon}
                        </Typography>
                      </Box>
                      {el.employee.categorie_emploi && (
                        <Chip label={el.employee.categorie_emploi} size="small"
                          sx={{ fontSize: 11, fontWeight: 800,
                            bgcolor: CATEGORIE_COLORS[el.employee.categorie_emploi] + '20',
                            color: CATEGORIE_COLORS[el.employee.categorie_emploi] }} />
                      )}
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Éligible depuis</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                          {new Date(el.date_eligibilite).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Dernière note</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 600,
                          color: el.note_derniere_eval !== null
                            ? APPRECIATION_COLORS[el.appreciation ?? 'satisfaisant'] : 'text.disabled' }}>
                          {el.note_derniere_eval !== null ? `${el.note_derniere_eval}/4 (${el.annee_eval})` : '—'}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Button fullWidth variant="contained" size="small" startIcon={<TrendingUp />}
                      onClick={() => { setSelectedEmp(el); setErr(null); setOpenCreate(true); }}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: '8px', fontWeight: 700 }}>
                      Initier l'avancement
                    </Button>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ─── Onglet dossiers en cours ─── */}
      {subTab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Catégorie</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Échelon</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date éligibilité</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {avancements.filter(a => ['en_attente_daf', 'en_attente_dg'].includes(a.statut)).map(av => {
                const s = STATUT_LABELS[av.statut];
                return (
                  <TableRow key={av.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmpAvatar nom={av.employee?.last_name ?? ''} prenom={av.employee?.first_name ?? ''} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {av.employee?.first_name} {av.employee?.last_name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={av.categorie} size="small"
                        sx={{ fontSize: 11, fontWeight: 700,
                          bgcolor: CATEGORIE_COLORS[av.categorie] + '20',
                          color: CATEGORIE_COLORS[av.categorie] }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {av.echelon_avant} → <strong>{av.echelon_apres}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.label} size="small"
                        sx={{ fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {new Date(av.date_eligibilite).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => { setOpenAction(av); setAction('valider_daf'); setMotif(''); setErr(null); }}
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
      )}

      {/* ─── Onglet historique ─── */}
      {subTab === 2 && (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Catégorie</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Échelon</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Décision</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {avancements.filter(a => !['en_attente_daf', 'en_attente_dg'].includes(a.statut)).map(av => {
                const s = STATUT_LABELS[av.statut];
                return (
                  <TableRow key={av.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {av.employee?.first_name} {av.employee?.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip label={av.categorie} size="small" sx={{ fontSize: 11 }} /></TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{av.echelon_avant} → {av.echelon_apres}</TableCell>
                    <TableCell>
                      <Chip label={s.label} size="small"
                        sx={{ fontSize: 11, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {av.date_decision ? new Date(av.date_decision).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog confirmer initiation */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15 }}>Initier un avancement</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{err}</Alert>}
          {selectedEmp && (
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: '10px', p: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                {selectedEmp.employee.first_name} {selectedEmp.employee.last_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                Catégorie {selectedEmp.employee.categorie_emploi} · Échelon {selectedEmp.employee.echelon} → {selectedEmp.employee.echelon + 1}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Note : {selectedEmp.note_derniere_eval ?? '—'}/4
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 2 }}>
            Ceci crée un dossier d'avancement soumis au DAF pour validation budgétaire.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => createMut.mutate()} disabled={createMut.isPending}
            startIcon={createMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Add />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Créer le dossier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog traitement workflow */}
      <Dialog open={!!openAction} onClose={() => setOpenAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 15 }}>Traiter le dossier d'avancement</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{err}</Alert>}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select fullWidth size="small" label="Action" value={action} onChange={e => setAction(e.target.value)}>
              <MenuItem value="valider_daf"><Stack direction="row" spacing={1} alignItems="center"><CheckCircle sx={{ fontSize: 16, color: '#059669' }} /><span>Valider (DAF)</span></Stack></MenuItem>
              <MenuItem value="valider_dg"><Stack direction="row" spacing={1} alignItems="center"><CheckCircle sx={{ fontSize: 16, color: '#2563EB' }} /><span>Valider (DG — accordé)</span></Stack></MenuItem>
              <MenuItem value="refuser"><Stack direction="row" spacing={1} alignItems="center"><Cancel sx={{ fontSize: 16, color: '#DC2626' }} /><span>Refuser</span></Stack></MenuItem>
              <MenuItem value="reporter"><Stack direction="row" spacing={1} alignItems="center"><Pause sx={{ fontSize: 16, color: '#D97706' }} /><span>Reporter</span></Stack></MenuItem>
            </TextField>
            {action === 'refuser' && (
              <TextField fullWidth size="small" label="Motif du refus" multiline rows={2}
                value={motif} onChange={e => setMotif(e.target.value)} />
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
