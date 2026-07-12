import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid, Chip, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  IconButton, Tooltip, Alert, CircularProgress, Stack, Divider,
} from '@mui/material';
import {
  School, Add, CheckCircle, Cancel, Visibility, Edit,
  AccountBalance, People, CalendarMonth, TrendingUp,
  Assessment, Star, PlayArrow, Business,
} from '@mui/icons-material';
import { planFormationApi } from '../../api/planFormation';
import type {
  FormationAction, FormationBesoin, FormationPrestataire,
  PlanFormation, LignePlanFormation, FormationSession,
  FormationInscription, FormationEvaluation,
  CategorieFormation, ModeFormation, CaractereFormation, SourceFinancement,
} from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR').format(v) + ' FCFA';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const CATEGORIE_LABELS: Record<CategorieFormation, string> = {
  reglementaire:          'Réglementaire',
  manageriale:            'Managériale',
  metier:                 'Métier / Technique',
  rh:                     'RH / Social',
  developpement_personnel:'Développement personnel',
  integration:            'Intégration',
};

const CATEGORIE_COLORS: Record<CategorieFormation, string> = {
  reglementaire:          '#EF4444',
  manageriale:            '#8B5CF6',
  metier:                 '#3B82F6',
  rh:                     '#10B981',
  developpement_personnel:'#F59E0B',
  integration:            '#6366F1',
};

const MODE_LABELS: Record<ModeFormation, string> = {
  presentiel: 'Présentiel', distanciel: 'Distanciel', mixte: 'Mixte', tutorat: 'Tutorat',
};

const CARACTERE_COLORS: Record<CaractereFormation, 'error' | 'warning' | 'default'> = {
  obligatoire:    'error',
  prioritaire:    'warning',
  complementaire: 'default',
};

const SOURCE_FIN_LABELS: Record<SourceFinancement, string> = {
  budget_propre: 'Budget propre', '3fpt': '3FPT', cooperation: 'Coopération', bailleurs: 'Bailleurs',
};

const STATUT_SESSION_COLORS: Record<string, string> = {
  planifiee: '#3B82F6', en_cours: '#F59E0B', realisee: '#10B981', annulee: '#9CA3AF',
};

const STATUT_SESSION_LABELS: Record<string, string> = {
  planifiee: 'Planifiée', en_cours: 'En cours', realisee: 'Réalisée', annulee: 'Annulée',
};

const INSCRIPTION_LABELS: Record<string, string> = {
  inscrit: 'Inscrit', present: 'Présent', absent: 'Absent', certifie: 'Certifié',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit = '%', cible, color, icon,
}: {
  label: string; value: number | null; unit?: string; cible?: number; color: string; icon: React.ReactNode;
}) {
  const display = value == null ? '—' : `${value}${unit}`;
  const pct     = cible && value != null ? Math.min(value / cible * 100, 100) : 0;

  return (
    <Card sx={{ borderRadius: '14px', border: `1px solid ${color}22`, height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Box sx={{ color, fontSize: 20 }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Stack>
        <Typography variant="h5" fontWeight={700} color={color}>{display}</Typography>
        {cible != null && value != null && (
          <>
            <LinearProgress
              variant="determinate" value={pct}
              sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color } }}
            />
            <Typography variant="caption" color="text.secondary">Cible : {cible}{unit}</Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ONGLET 1 — TABLEAU DE BORD ──────────────────────────────────────────────
function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['formation-dashboard'],
    queryFn: () => planFormationApi.dashboard().then(r => r.data),
  });

  if (isLoading) return <CircularProgress sx={{ m: 4 }} />;
  if (!data) return null;

  const { kpis, prochaines_sessions, plans_recents } = data;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Taux d'accès à la formation" value={kpis.taux_acces} cible={60}
            color="#6366F1" icon={<People />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Jours moyen / agent" value={kpis.jours_moyen} unit=" j" cible={3}
            color="#3B82F6" icon={<CalendarMonth />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Taux d'exécution budgétaire" value={kpis.taux_budget} cible={80}
            color="#10B981" icon={<AccountBalance />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Satisfaction (à chaud)" value={kpis.taux_satisfaction} cible={75}
            color="#F59E0B" icon={<Star />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Transfert des acquis (N+90)" value={kpis.taux_transfert} cible={60}
            color="#8B5CF6" icon={<TrendingUp />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard label="Taux de réalisation du plan" value={kpis.taux_realisation} cible={100}
            color="#EF4444" icon={<Assessment />} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Prochaines sessions</Typography>
              {prochaines_sessions.length === 0
                ? <Typography color="text.secondary">Aucune session planifiée</Typography>
                : prochaines_sessions.map(s => (
                  <Box key={s.id} sx={{ mb: 1.5, p: 1.5, borderRadius: '8px', bgcolor: '#F8FAFF', border: '1px solid #E5E7EB' }}>
                    <Typography fontWeight={600} fontSize={13}>{s.lignePlan?.action?.intitule}</Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {fmtDate(s.date_debut)} → {fmtDate(s.date_fin)} • {s.lieu || 'Lieu à confirmer'}
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Plans de formation</Typography>
              {plans_recents.map(p => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box>
                    <Typography fontSize={13} fontWeight={600}>{p.titre}</Typography>
                    <Typography fontSize={12} color="text.secondary">{p.lignes_count} actions</Typography>
                  </Box>
                  <Chip
                    label={p.statut === 'valide_dg' ? 'Validé DG' : p.statut === 'soumis' ? 'Soumis' : 'Brouillon'}
                    size="small"
                    color={p.statut === 'valide_dg' ? 'success' : p.statut === 'soumis' ? 'warning' : 'default'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── ONGLET 2 — CATALOGUE ────────────────────────────────────────────────────
function CatalogueTab() {
  const qc = useQueryClient();
  const [filterCat, setFilterCat] = useState('');
  const [openAction, setOpenAction] = useState(false);
  const [openPrest, setOpenPrest]   = useState(false);
  const [formAction, setFormAction] = useState<Partial<FormationAction>>({ categorie: 'metier', mode: 'presentiel', caractere: 'prioritaire', statut: 'actif' });
  const [formPrest,  setFormPrest]  = useState<Partial<FormationPrestataire>>({ type: 'externe', statut: 'actif' });

  const { data: actions = [] } = useQuery({
    queryKey: ['formation-actions', filterCat],
    queryFn: () => planFormationApi.actions(filterCat ? { categorie: filterCat } : undefined).then(r => r.data),
  });
  const { data: prestataires = [] } = useQuery({
    queryKey: ['formation-prestataires'],
    queryFn: () => planFormationApi.prestataires().then(r => r.data),
  });

  const mutAction = useMutation({
    mutationFn: (d: Partial<FormationAction>) => planFormationApi.createAction(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-actions'] }); setOpenAction(false); },
  });
  const mutPrest = useMutation({
    mutationFn: (d: Partial<FormationPrestataire>) => planFormationApi.createPrestataire(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-prestataires'] }); setOpenPrest(false); },
  });

  return (
    <Box>
      {/* Actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Actions de formation</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" value={filterCat} onChange={e => setFilterCat(e.target.value)}
            label="Type de formation" sx={{ minWidth: 180 }}>
            <MenuItem value="">Toutes</MenuItem>
            {(Object.entries(CATEGORIE_LABELS) as [CategorieFormation, string][]).map(([k, v]) =>
              <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpenAction(true)}>
            Nouvelle action
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ borderRadius: '14px', overflow: 'hidden', mb: 4 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFF' }}>
            <TableRow>
              <TableCell>Intitulé</TableCell>
              <TableCell>Type de formation</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Durée</TableCell>
              <TableCell>Caractère</TableCell>
              <TableCell align="right">Coût estimé</TableCell>
              <TableCell>Prestataire</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actions.map(a => (
              <TableRow key={a.id} hover>
                <TableCell>
                  <Typography fontSize={13} fontWeight={600}>{a.intitule}</Typography>
                  {a.objectifs_pedagogiques && (
                    <Typography fontSize={11} color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
                      {a.objectifs_pedagogiques}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={CATEGORIE_LABELS[a.categorie]} size="small"
                    sx={{ bgcolor: CATEGORIE_COLORS[a.categorie] + '22', color: CATEGORIE_COLORS[a.categorie], fontWeight: 600 }} />
                </TableCell>
                <TableCell><Typography fontSize={12}>{MODE_LABELS[a.mode]}</Typography></TableCell>
                <TableCell><Typography fontSize={12}>{a.duree_jours} j</Typography></TableCell>
                <TableCell>
                  <Chip label={a.caractere} size="small" color={CARACTERE_COLORS[a.caractere]} />
                </TableCell>
                <TableCell align="right"><Typography fontSize={12}>{fmtMoney(a.cout_unitaire_estime)}</Typography></TableCell>
                <TableCell><Typography fontSize={12}>{a.prestataire?.nom || '—'}</Typography></TableCell>
              </TableRow>
            ))}
            {actions.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" p={2}>Aucune action</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Prestataires */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Prestataires</Typography>
        <Button startIcon={<Add />} variant="outlined" size="small" onClick={() => setOpenPrest(true)}>
          Nouveau prestataire
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {prestataires.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card sx={{ borderRadius: '10px' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={700}>{p.nom}</Typography>
                  <Chip label={p.type} size="small" color={p.type === 'externe' ? 'default' : 'primary'} />
                </Stack>
                {p.contact_nom && <Typography fontSize={12} color="text.secondary">{p.contact_nom}</Typography>}
                {p.email && <Typography fontSize={12} color="text.secondary">{p.email}</Typography>}
                {p.telephone && <Typography fontSize={12}>{p.telephone}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog nouvelle action */}
      <Dialog open={openAction} onClose={() => setOpenAction(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle fontWeight={700}>Nouvelle action de formation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Intitulé *" fullWidth size="small" value={formAction.intitule || ''}
              onChange={e => setFormAction(p => ({ ...p, intitule: e.target.value }))} />
            <TextField label="Objectifs pédagogiques" fullWidth multiline rows={2} size="small"
              value={formAction.objectifs_pedagogiques || ''}
              onChange={e => setFormAction(p => ({ ...p, objectifs_pedagogiques: e.target.value }))} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField select label="Type de formation *" fullWidth size="small" value={formAction.categorie || 'metier'}
                  onChange={e => setFormAction(p => ({ ...p, categorie: e.target.value as CategorieFormation }))}>
                  {(Object.entries(CATEGORIE_LABELS) as [CategorieFormation, string][]).map(([k, v]) =>
                    <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Mode *" fullWidth size="small" value={formAction.mode || 'presentiel'}
                  onChange={e => setFormAction(p => ({ ...p, mode: e.target.value as ModeFormation }))}>
                  {(Object.entries(MODE_LABELS) as [ModeFormation, string][]).map(([k, v]) =>
                    <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Caractère *" fullWidth size="small" value={formAction.caractere || 'prioritaire'}
                  onChange={e => setFormAction(p => ({ ...p, caractere: e.target.value as CaractereFormation }))}>
                  <MenuItem value="obligatoire">Obligatoire</MenuItem>
                  <MenuItem value="prioritaire">Prioritaire</MenuItem>
                  <MenuItem value="complementaire">Complémentaire</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Durée (jours) *" type="number" fullWidth size="small"
                  value={formAction.duree_jours || ''} inputProps={{ step: 0.5, min: 0.5 }}
                  onChange={e => setFormAction(p => ({ ...p, duree_jours: +e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Coût unitaire estimé (FCFA)" type="number" fullWidth size="small"
                  value={formAction.cout_unitaire_estime || ''}
                  onChange={e => setFormAction(p => ({ ...p, cout_unitaire_estime: +e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Prestataire" fullWidth size="small" value={formAction.prestataire_id || ''}
                  onChange={e => setFormAction(p => ({ ...p, prestataire_id: +e.target.value || undefined }))}>
                  <MenuItem value="">Aucun</MenuItem>
                  {prestataires.map(p => <MenuItem key={p.id} value={p.id}>{p.nom}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAction(false)}>Annuler</Button>
          <Button variant="contained" disabled={mutAction.isPending || !formAction.intitule}
            onClick={() => mutAction.mutate(formAction)}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog nouveau prestataire */}
      <Dialog open={openPrest} onClose={() => setOpenPrest(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle fontWeight={700}>Nouveau prestataire</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nom *" fullWidth size="small" value={formPrest.nom || ''}
              onChange={e => setFormPrest(p => ({ ...p, nom: e.target.value }))} />
            <TextField select label="Type *" fullWidth size="small" value={formPrest.type || 'externe'}
              onChange={e => setFormPrest(p => ({ ...p, type: e.target.value as FormationPrestataire['type'] }))}>
              <MenuItem value="externe">Externe (privé)</MenuItem>
              <MenuItem value="public">Organisme public</MenuItem>
              <MenuItem value="interne">Interne</MenuItem>
              <MenuItem value="bailleurs">Bailleurs / Partenaires</MenuItem>
            </TextField>
            <TextField label="Contact" fullWidth size="small" value={formPrest.contact_nom || ''}
              onChange={e => setFormPrest(p => ({ ...p, contact_nom: e.target.value }))} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField label="Email" type="email" fullWidth size="small" value={formPrest.email || ''}
                  onChange={e => setFormPrest(p => ({ ...p, email: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Téléphone" fullWidth size="small" value={formPrest.telephone || ''}
                  onChange={e => setFormPrest(p => ({ ...p, telephone: e.target.value }))} />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenPrest(false)}>Annuler</Button>
          <Button variant="contained" disabled={mutPrest.isPending || !formPrest.nom}
            onClick={() => mutPrest.mutate(formPrest)}>Créer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── ONGLET 3 — BESOINS ──────────────────────────────────────────────────────
function BesoinsTab() {
  const qc = useQueryClient();
  const [filterStatut, setFilterStatut] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState<Partial<FormationBesoin>>({ source: 'direction', statut: 'collecte', annee: new Date().getFullYear() });

  const { data: besoins = [] } = useQuery({
    queryKey: ['formation-besoins', filterStatut],
    queryFn: () => planFormationApi.besoins(filterStatut ? { statut: filterStatut } : undefined).then(r => r.data),
  });
  const { data: actions = [] } = useQuery({
    queryKey: ['formation-actions'],
    queryFn: () => planFormationApi.actions().then(r => r.data),
  });

  const mutCreate = useMutation({
    mutationFn: (d: Partial<FormationBesoin>) => planFormationApi.createBesoin(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-besoins'] }); setOpenDialog(false); },
  });
  const mutValider = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: 'retenu' | 'rejete' }) =>
      planFormationApi.validerBesoin(id, statut),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-besoins'] }),
  });

  const collecte = besoins.filter(b => b.statut === 'collecte');
  const retenus  = besoins.filter(b => b.statut === 'retenu');
  const rejetes  = besoins.filter(b => b.statut === 'rejete');

  const BesoinRow = ({ b }: { b: FormationBesoin }) => (
    <Box sx={{ mb: 1.5, p: 1.5, borderRadius: '10px', bgcolor: '#F8FAFF', border: '1px solid #E5E7EB' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography fontSize={13} fontWeight={600}>
            {b.action?.intitule || b.intitule_libre || '(formation sans intitulé)'}
          </Typography>
          <Typography fontSize={11} color="text.secondary">
            {b.direction?.name} • {b.employee ? `${b.employee.last_name} ${b.employee.first_name}` : 'Toute la direction'} • {b.annee}
          </Typography>
          {b.commentaire && <Typography fontSize={11} color="text.secondary" mt={0.5}>{b.commentaire}</Typography>}
        </Box>
        {b.statut === 'collecte' && (
          <Stack direction="row" spacing={0.5} ml={1}>
            <Tooltip title="Retenir">
              <IconButton size="small" color="success" onClick={() => mutValider.mutate({ id: b.id, statut: 'retenu' })}>
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rejeter">
              <IconButton size="small" color="error" onClick={() => mutValider.mutate({ id: b.id, statut: 'rejete' })}>
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        <Chip
          label={b.statut === 'retenu' ? 'Retenu' : b.statut === 'rejete' ? 'Rejeté' : 'En collecte'}
          size="small"
          color={b.statut === 'retenu' ? 'success' : b.statut === 'rejete' ? 'error' : 'default'}
          sx={{ ml: 1 }}
        />
      </Stack>
    </Box>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Besoins de formation</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            label="Statut" sx={{ minWidth: 150 }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="collecte">En collecte</MenuItem>
            <MenuItem value="retenu">Retenus</MenuItem>
            <MenuItem value="rejete">Rejetés</MenuItem>
          </TextField>
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpenDialog(true)}>
            Exprimer un besoin
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            En collecte ({collecte.length})
          </Typography>
          {collecte.map(b => <BesoinRow key={b.id} b={b} />)}
          {collecte.length === 0 && <Typography color="text.secondary" fontSize={13}>Aucun besoin en collecte</Typography>}
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="success.main" mb={1}>
            Retenus ({retenus.length})
          </Typography>
          {retenus.map(b => <BesoinRow key={b.id} b={b} />)}
          {retenus.length === 0 && <Typography color="text.secondary" fontSize={13}>Aucun besoin retenu</Typography>}
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="error.main" mb={1}>
            Rejetés ({rejetes.length})
          </Typography>
          {rejetes.map(b => <BesoinRow key={b.id} b={b} />)}
          {rejetes.length === 0 && <Typography color="text.secondary" fontSize={13}>Aucun besoin rejeté</Typography>}
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle fontWeight={700}>Exprimer un besoin de formation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select label="Action de formation (si cataloguée)" fullWidth size="small"
              value={form.action_id || ''}
              onChange={e => setForm(p => ({ ...p, action_id: +e.target.value || undefined }))}>
              <MenuItem value="">— Autre (intitulé libre) —</MenuItem>
              {actions.map(a => <MenuItem key={a.id} value={a.id}>{a.intitule}</MenuItem>)}
            </TextField>
            {!form.action_id && (
              <TextField label="Intitulé libre" fullWidth size="small" value={form.intitule_libre || ''}
                onChange={e => setForm(p => ({ ...p, intitule_libre: e.target.value }))} />
            )}
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField select label="Source *" fullWidth size="small" value={form.source || 'direction'}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value as FormationBesoin['source'] }))}>
                  <MenuItem value="entretien_annuel">Entretien annuel</MenuItem>
                  <MenuItem value="direction">Direction</MenuItem>
                  <MenuItem value="rh">RH</MenuItem>
                  <MenuItem value="reglementaire">Réglementaire</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Année *" type="number" fullWidth size="small" value={form.annee || ''}
                  onChange={e => setForm(p => ({ ...p, annee: +e.target.value }))} />
              </Grid>
            </Grid>
            <TextField label="Commentaire" fullWidth multiline rows={2} size="small"
              value={form.commentaire || ''}
              onChange={e => setForm(p => ({ ...p, commentaire: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained" disabled={mutCreate.isPending}
            onClick={() => mutCreate.mutate({ ...form, direction_id: form.direction_id || 1 })}>
            Soumettre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── ONGLET 4 — PLAN ANNUEL ──────────────────────────────────────────────────
function PlanAnnuelTab() {
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PlanFormation | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [openLigne, setOpenLigne] = useState(false);
  const [formPlan, setFormPlan] = useState<Partial<PlanFormation>>({ annee: new Date().getFullYear(), statut: 'brouillon' });
  const [formLigne, setFormLigne] = useState<Partial<LignePlanFormation>>({ source_financement: 'budget_propre', caractere: 'prioritaire', nb_participants_prevu: 1 });

  const { data: plans = [] } = useQuery({
    queryKey: ['formation-plans'],
    queryFn: () => planFormationApi.plans().then(r => r.data),
  });
  const { data: planDetail } = useQuery({
    queryKey: ['formation-plan', selectedPlan?.id],
    queryFn: () => planFormationApi.showPlan(selectedPlan!.id).then(r => r.data),
    enabled: !!selectedPlan,
  });
  const { data: actions = [] } = useQuery({
    queryKey: ['formation-actions'],
    queryFn: () => planFormationApi.actions().then(r => r.data),
  });

  const mutCreatePlan = useMutation({
    mutationFn: (d: Partial<PlanFormation>) => planFormationApi.createPlan(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-plans'] }); setOpenPlan(false); },
  });
  const mutValiderPlan = useMutation({
    mutationFn: (id: number) => planFormationApi.validerPlan(id),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['formation-plans'] }); setSelectedPlan(r.data); },
  });
  const mutCreateLigne = useMutation({
    mutationFn: (d: Partial<LignePlanFormation>) => planFormationApi.createLigne(selectedPlan!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-plan', selectedPlan?.id] }); setOpenLigne(false); },
  });
  const mutDeleteLigne = useMutation({
    mutationFn: (id: number) => planFormationApi.deleteLigne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-plan', selectedPlan?.id] }),
  });

  const totalBudget = planDetail?.lignes?.reduce((s, l) => s + (l.cout_total || 0), 0) ?? 0;

  if (selectedPlan && planDetail) {
    return (
      <Box>
        <Button onClick={() => setSelectedPlan(null)} sx={{ mb: 2 }}>← Retour aux plans</Button>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{planDetail.titre}</Typography>
            <Typography fontSize={13} color="text.secondary">
              {fmtDate(planDetail.periode_debut)} — {fmtDate(planDetail.periode_fin)} •{' '}
              Enveloppe : {fmtMoney(planDetail.enveloppe_budgetaire)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={planDetail.statut === 'valide_dg' ? 'Validé DG' : planDetail.statut === 'soumis' ? 'Soumis' : 'Brouillon'}
              color={planDetail.statut === 'valide_dg' ? 'success' : planDetail.statut === 'soumis' ? 'warning' : 'default'}
            />
            {planDetail.statut === 'brouillon' && (
              <Button size="small" variant="contained" color="success"
                onClick={() => mutValiderPlan.mutate(planDetail.id)}>
                Valider DG
              </Button>
            )}
            <Button startIcon={<Add />} variant="outlined" size="small" onClick={() => setOpenLigne(true)}>
              Ajouter une ligne
            </Button>
          </Stack>
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
          Budget total prévu : <strong>{fmtMoney(totalBudget)}</strong>
          {planDetail.enveloppe_budgetaire && (
            <> / Enveloppe : <strong>{fmtMoney(planDetail.enveloppe_budgetaire)}</strong>
              {' '}({Math.round(totalBudget / planDetail.enveloppe_budgetaire * 100)}% consommé)</>
          )}
        </Alert>

        <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFF' }}>
              <TableRow>
                <TableCell>Formation</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Participants</TableCell>
                <TableCell>Dates prévues</TableCell>
                <TableCell>Caractère</TableCell>
                <TableCell>Financement</TableCell>
                <TableCell align="right">Coût total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {(planDetail.lignes || []).map(l => (
                <TableRow key={l.id} hover>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600}>{l.action?.intitule}</Typography>
                    <Typography fontSize={11} color="text.secondary">
                      {l.action && CATEGORIE_LABELS[l.action.categorie]} • {l.action?.duree_jours} j
                    </Typography>
                  </TableCell>
                  <TableCell><Typography fontSize={12}>{l.direction?.name}</Typography></TableCell>
                  <TableCell align="center">{l.nb_participants_prevu}</TableCell>
                  <TableCell><Typography fontSize={12}>{l.dates_previsionnelles || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={l.caractere} size="small" color={CARACTERE_COLORS[l.caractere]} />
                  </TableCell>
                  <TableCell>
                    <Chip label={SOURCE_FIN_LABELS[l.source_financement]} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right"><Typography fontSize={12} fontWeight={600}>{fmtMoney(l.cout_total)}</Typography></TableCell>
                  <TableCell>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => mutDeleteLigne.mutate(l.id)}>
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {(planDetail.lignes || []).length === 0 && (
                <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" p={2}>Aucune ligne dans ce plan</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Dialog nouvelle ligne */}
        <Dialog open={openLigne} onClose={() => setOpenLigne(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
          <DialogTitle fontWeight={700}>Ajouter une action au plan</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField select label="Action de formation *" fullWidth size="small"
                value={formLigne.action_id || ''}
                onChange={e => setFormLigne(p => ({ ...p, action_id: +e.target.value }))}>
                {actions.map(a => <MenuItem key={a.id} value={a.id}>{a.intitule}</MenuItem>)}
              </TextField>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField label="Nb participants *" type="number" fullWidth size="small"
                    value={formLigne.nb_participants_prevu || 1}
                    onChange={e => setFormLigne(p => ({ ...p, nb_participants_prevu: +e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Coût unitaire (FCFA)" type="number" fullWidth size="small"
                    value={formLigne.cout_unitaire || ''}
                    onChange={e => setFormLigne(p => ({ ...p, cout_unitaire: +e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Caractère *" fullWidth size="small" value={formLigne.caractere || 'prioritaire'}
                    onChange={e => setFormLigne(p => ({ ...p, caractere: e.target.value as CaractereFormation }))}>
                    <MenuItem value="obligatoire">Obligatoire</MenuItem>
                    <MenuItem value="prioritaire">Prioritaire</MenuItem>
                    <MenuItem value="complementaire">Complémentaire</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Financement *" fullWidth size="small" value={formLigne.source_financement || 'budget_propre'}
                    onChange={e => setFormLigne(p => ({ ...p, source_financement: e.target.value as SourceFinancement }))}>
                    {(Object.entries(SOURCE_FIN_LABELS) as [SourceFinancement, string][]).map(([k, v]) =>
                      <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>
              <TextField label="Dates prévisionnelles (ex: Mars 2026)" fullWidth size="small"
                value={formLigne.dates_previsionnelles || ''}
                onChange={e => setFormLigne(p => ({ ...p, dates_previsionnelles: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenLigne(false)}>Annuler</Button>
            <Button variant="contained" disabled={mutCreateLigne.isPending || !formLigne.action_id}
              onClick={() => mutCreateLigne.mutate(formLigne)}>Ajouter</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Plans annuels de formation</Typography>
        <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpenPlan(true)}>
          Nouveau plan
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {plans.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card sx={{ borderRadius: '14px', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
              onClick={() => setSelectedPlan(p)}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h4" fontWeight={900} color="primary">{p.annee}</Typography>
                  <Chip
                    label={p.statut === 'valide_dg' ? 'Validé DG' : p.statut === 'soumis' ? 'Soumis' : 'Brouillon'}
                    size="small"
                    color={p.statut === 'valide_dg' ? 'success' : p.statut === 'soumis' ? 'warning' : 'default'}
                  />
                </Stack>
                <Typography fontWeight={700} mb={0.5}>{p.titre}</Typography>
                <Typography fontSize={12} color="text.secondary">
                  {p.lignes_count || 0} actions • Enveloppe : {fmtMoney(p.enveloppe_budgetaire)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {plans.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center" p={4}>Aucun plan de formation créé</Typography>
          </Grid>
        )}
      </Grid>

      {/* Dialog nouveau plan */}
      <Dialog open={openPlan} onClose={() => setOpenPlan(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle fontWeight={700}>Nouveau plan de formation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Titre *" fullWidth size="small" value={formPlan.titre || ''}
              onChange={e => setFormPlan(p => ({ ...p, titre: e.target.value }))} />
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <TextField label="Année *" type="number" fullWidth size="small" value={formPlan.annee || ''}
                  onChange={e => setFormPlan(p => ({ ...p, annee: +e.target.value }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Début *" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={formPlan.periode_debut || ''}
                  onChange={e => setFormPlan(p => ({ ...p, periode_debut: e.target.value }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Fin *" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={formPlan.periode_fin || ''}
                  onChange={e => setFormPlan(p => ({ ...p, periode_fin: e.target.value }))} />
              </Grid>
            </Grid>
            <TextField label="Enveloppe budgétaire (FCFA)" type="number" fullWidth size="small"
              value={formPlan.enveloppe_budgetaire || ''}
              onChange={e => setFormPlan(p => ({ ...p, enveloppe_budgetaire: +e.target.value }))} />
            <TextField label="Notes" fullWidth multiline rows={2} size="small"
              value={formPlan.notes || ''}
              onChange={e => setFormPlan(p => ({ ...p, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenPlan(false)}>Annuler</Button>
          <Button variant="contained" disabled={mutCreatePlan.isPending || !formPlan.titre}
            onClick={() => mutCreatePlan.mutate(formPlan)}>Créer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── ONGLET 5 — SESSIONS ─────────────────────────────────────────────────────
function SessionsTab() {
  const qc = useQueryClient();
  const [filterStatut, setFilterStatut] = useState('');
  const [selectedSession, setSelectedSession] = useState<FormationSession | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [formSession, setFormSession] = useState<Partial<FormationSession>>({ statut: 'planifiee' });

  const { data: sessions = [] } = useQuery({
    queryKey: ['formation-sessions', filterStatut],
    queryFn: () => planFormationApi.sessions(filterStatut ? { statut: filterStatut } : undefined).then(r => r.data),
  });
  const { data: sessionDetail } = useQuery({
    queryKey: ['formation-session', selectedSession?.id],
    queryFn: () => planFormationApi.showSession(selectedSession!.id).then(r => r.data),
    enabled: !!selectedSession,
  });

  const mutUpdateSession = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormationSession> }) =>
      planFormationApi.updateSession(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-sessions'] }),
  });
  const mutUpdateInscription = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormationInscription> }) =>
      planFormationApi.updateInscription(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formation-session', selectedSession?.id] }),
  });

  if (selectedSession && sessionDetail) {
    const duree = Math.round((new Date(sessionDetail.date_fin).getTime() - new Date(sessionDetail.date_debut).getTime()) / 86400000) + 1;
    return (
      <Box>
        <Button onClick={() => setSelectedSession(null)} sx={{ mb: 2 }}>← Retour aux sessions</Button>
        <Card sx={{ borderRadius: '14px', mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" fontWeight={700}>{sessionDetail.lignePlan?.action?.intitule}</Typography>
                <Typography fontSize={13} color="text.secondary">
                  {fmtDate(sessionDetail.date_debut)} → {fmtDate(sessionDetail.date_fin)} ({duree} j) •{' '}
                  {sessionDetail.lieu || 'Lieu non précisé'}
                </Typography>
                {sessionDetail.prestataire && (
                  <Typography fontSize={13} color="text.secondary">Prestataire : {sessionDetail.prestataire.nom}</Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={STATUT_SESSION_LABELS[sessionDetail.statut]}
                  sx={{ bgcolor: STATUT_SESSION_COLORS[sessionDetail.statut] + '22', color: STATUT_SESSION_COLORS[sessionDetail.statut], fontWeight: 600 }}
                />
                {sessionDetail.statut === 'planifiee' && (
                  <Button size="small" variant="outlined" startIcon={<PlayArrow />}
                    onClick={() => mutUpdateSession.mutate({ id: sessionDetail.id, data: { statut: 'en_cours' } })}>
                    Démarrer
                  </Button>
                )}
                {sessionDetail.statut === 'en_cours' && (
                  <Button size="small" variant="contained" color="success"
                    onClick={() => mutUpdateSession.mutate({ id: sessionDetail.id, data: { statut: 'realisee' } })}>
                    Clôturer
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Participants ({sessionDetail.inscriptions?.length || 0})
        </Typography>
        <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFF' }}>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Statut présence</TableCell>
                <TableCell>Attestation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(sessionDetail.inscriptions || []).map(insc => (
                <TableRow key={insc.id} hover>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600}>
                      {insc.employee?.last_name} {insc.employee?.first_name}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography fontSize={12}>{insc.employee?.department?.name}</Typography></TableCell>
                  <TableCell>
                    <TextField select size="small" value={insc.statut}
                      onChange={e => mutUpdateInscription.mutate({ id: insc.id, data: { statut: e.target.value as FormationInscription['statut'] } })}
                      sx={{ minWidth: 120 }}>
                      {Object.entries(INSCRIPTION_LABELS).map(([k, v]) =>
                        <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    {insc.date_attestation ? (
                      <Chip label={`Attestation ${fmtDate(insc.date_attestation)}`} size="small" color="success" />
                    ) : (
                      <Typography fontSize={12} color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(sessionDetail.inscriptions || []).length === 0 && (
                <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" p={2}>Aucun participant inscrit</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Sessions de formation</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            label="Statut" sx={{ minWidth: 150 }}>
            <MenuItem value="">Toutes</MenuItem>
            <MenuItem value="planifiee">Planifiées</MenuItem>
            <MenuItem value="en_cours">En cours</MenuItem>
            <MenuItem value="realisee">Réalisées</MenuItem>
            <MenuItem value="annulee">Annulées</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFF' }}>
            <TableRow>
              <TableCell>Formation</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Lieu</TableCell>
              <TableCell>Prestataire</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell align="right">Coût réel</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map(s => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Typography fontSize={13} fontWeight={600}>{s.lignePlan?.action?.intitule}</Typography>
                  <Typography fontSize={11} color="text.secondary">{s.lignePlan?.plan?.titre}</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize={12}>{fmtDate(s.date_debut)}</Typography>
                  <Typography fontSize={11} color="text.secondary">→ {fmtDate(s.date_fin)}</Typography>
                </TableCell>
                <TableCell><Typography fontSize={12}>{s.lieu || '—'}</Typography></TableCell>
                <TableCell><Typography fontSize={12}>{s.prestataire?.nom || '—'}</Typography></TableCell>
                <TableCell align="center">{s.nb_participants_reel ?? '—'}</TableCell>
                <TableCell align="right"><Typography fontSize={12}>{fmtMoney(s.cout_reel)}</Typography></TableCell>
                <TableCell>
                  <Chip label={STATUT_SESSION_LABELS[s.statut]} size="small"
                    sx={{ bgcolor: STATUT_SESSION_COLORS[s.statut] + '22', color: STATUT_SESSION_COLORS[s.statut], fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  <Tooltip title="Voir détail">
                    <IconButton size="small" onClick={() => setSelectedSession(s)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" p={2}>Aucune session</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

// ─── ONGLET 6 — ÉVALUATIONS ──────────────────────────────────────────────────
function EvaluationsTab() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formEval, setFormEval] = useState<Partial<FormationEvaluation>>({
    type: 'a_chaud', date_evaluation: new Date().toISOString().split('T')[0],
  });

  const { data: evals = [] } = useQuery({
    queryKey: ['formation-evaluations', filterType],
    queryFn: () => planFormationApi.evaluations(filterType ? { type: filterType } : undefined).then(r => r.data),
  });

  const mutCreate = useMutation({
    mutationFn: (d: Partial<FormationEvaluation>) => planFormationApi.createEvaluation(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['formation-evaluations'] }); setOpenDialog(false); },
  });

  const TYPE_LABELS: Record<string, string> = {
    a_chaud: 'À chaud (J+0)', acquis_j30: 'Acquis (J+30)', transfert_n90: 'Transfert (N+90)',
  };
  const TYPE_COLORS: Record<string, string> = {
    a_chaud: '#F59E0B', acquis_j30: '#3B82F6', transfert_n90: '#10B981',
  };

  const avgByType = (type: string) => {
    const scores = evals.filter(e => e.type === type && e.score != null).map(e => e.score!);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
  };

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {(['a_chaud', 'acquis_j30', 'transfert_n90'] as const).map(t => {
          const avg = avgByType(t);
          return (
            <Grid item xs={12} md={4} key={t}>
              <Card sx={{ borderRadius: '14px', border: `1px solid ${TYPE_COLORS[t]}33` }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{TYPE_LABELS[t]}</Typography>
                  <Typography variant="h4" fontWeight={700} color={TYPE_COLORS[t]}>
                    {avg != null ? `${avg}/100` : '—'}
                  </Typography>
                  {avg != null && (
                    <LinearProgress variant="determinate" value={avg}
                      sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: `${TYPE_COLORS[t]}22`,
                        '& .MuiLinearProgress-bar': { bgcolor: TYPE_COLORS[t] } }} />
                  )}
                  <Typography fontSize={11} color="text.secondary" mt={0.5}>
                    {evals.filter(e => e.type === t).length} évaluations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Toutes les évaluations</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" value={filterType} onChange={e => setFilterType(e.target.value)}
            label="Type" sx={{ minWidth: 200 }}>
            <MenuItem value="">Tous</MenuItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpenDialog(true)}>
            Saisir une évaluation
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FAFF' }}>
            <TableRow>
              <TableCell>Agent</TableCell>
              <TableCell>Formation</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Score</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Commentaire</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evals.map(e => (
              <TableRow key={e.id} hover>
                <TableCell>
                  <Typography fontSize={13}>
                    {e.inscription?.employee?.last_name} {e.inscription?.employee?.first_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize={12}>{e.inscription?.session?.lignePlan?.action?.intitule}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={TYPE_LABELS[e.type]} size="small"
                    sx={{ bgcolor: TYPE_COLORS[e.type] + '22', color: TYPE_COLORS[e.type], fontWeight: 600 }} />
                </TableCell>
                <TableCell align="center">
                  {e.score != null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <Typography fontWeight={700} color={e.score >= 75 ? 'success.main' : e.score >= 50 ? 'warning.main' : 'error.main'}>
                        {e.score}
                      </Typography>
                      <Typography fontSize={11} color="text.secondary">/100</Typography>
                    </Box>
                  ) : '—'}
                </TableCell>
                <TableCell><Typography fontSize={12}>{fmtDate(e.date_evaluation)}</Typography></TableCell>
                <TableCell>
                  <Typography fontSize={12} noWrap sx={{ maxWidth: 200 }}>{e.commentaire || '—'}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {evals.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" p={2}>Aucune évaluation saisie</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle fontWeight={700}>Saisir une évaluation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="ID Inscription" type="number" fullWidth size="small"
              value={formEval.inscription_id || ''}
              onChange={e => setFormEval(p => ({ ...p, inscription_id: +e.target.value }))} />
            <TextField select label="Type d'évaluation *" fullWidth size="small" value={formEval.type || 'a_chaud'}
              onChange={e => setFormEval(p => ({ ...p, type: e.target.value as FormationEvaluation['type'] }))}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField label="Score (0 - 100)" type="number" fullWidth size="small"
              value={formEval.score || ''} inputProps={{ min: 0, max: 100, step: 1 }}
              onChange={e => setFormEval(p => ({ ...p, score: +e.target.value }))} />
            <TextField label="Date d'évaluation *" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
              value={formEval.date_evaluation || ''}
              onChange={e => setFormEval(p => ({ ...p, date_evaluation: e.target.value }))} />
            <TextField label="Commentaire" fullWidth multiline rows={2} size="small"
              value={formEval.commentaire || ''}
              onChange={e => setFormEval(p => ({ ...p, commentaire: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained" disabled={mutCreate.isPending || !formEval.inscription_id}
            onClick={() => mutCreate.mutate(formEval)}>Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────
export default function PlanFormationPage({ embeddedMode = false }: { embeddedMode?: boolean }) {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={embeddedMode ? {} : { p: { xs: 2, md: 3 } }}>
      {!embeddedMode && (
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#10B98122', color: '#10B981', display: 'flex' }}>
            <School />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Plan de Formation</Typography>
            <Typography variant="caption" color="text.secondary">
              ANASER — Développement des compétences
            </Typography>
          </Box>
        </Stack>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #E5E7EB' }}>
        <Tab label="Tableau de bord" />
        <Tab label="Catalogue" />
        <Tab label="Besoins" />
        <Tab label="Plan annuel" />
        <Tab label="Sessions" />
        <Tab label="Évaluations" />
      </Tabs>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <CatalogueTab />}
      {tab === 2 && <BesoinsTab />}
      {tab === 3 && <PlanAnnuelTab />}
      {tab === 4 && <SessionsTab />}
      {tab === 5 && <EvaluationsTab />}
    </Box>
  );
}
