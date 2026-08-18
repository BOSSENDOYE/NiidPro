import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Chip, Button, IconButton, Paper, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Stepper, Step, StepLabel, StepContent,
  CircularProgress, Alert, Tooltip, Stack, Divider, Avatar,
  LinearProgress, Badge, Snackbar, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Assignment, BarChart, PlayArrow, CheckCircle, Send, Archive,
  CalendarToday, Person, Visibility, MoreVert, Flag,
  TrendingUp, Warning, Block, Star, HowToVote, Grade,
  Notifications, FolderOpen, Description, Edit, Refresh,
  ArticleOutlined, Groups, AdminPanelSettings, AccountBalance,
  Timeline, EmojiEvents, Close, Download, Gavel, DriveFileRenameOutline,
  VerifiedUser, PictureAsPdf,
} from '@mui/icons-material';
import {
  evalCampagnesApi, evalFichesApi, evalSynthesesApi,
  evalDecisionsDgApi, evalNotifDafApi, evalDashboardApi, evalReferentielsApi,
  EVAL_WORKFLOW_STEPS, STATUT_TO_STEP, STATUT_LABELS, STATUT_COLORS,
  APPRECIATION_LABELS, CATEGORIE_LABELS, DECISION_LABELS,
  type EvalCampagneAnn, type EvalFicheAnn, type EvalSyntheseAnn,
  type EvalStatutFicheAnn, type EvalAppreciationAnn,
  type EvalCritereAnn, type EvalReferentiel, type EvalDashboardDaf, type EvalDashboardDirection,
  type EvalDashboardAgent, type EvalTypeDecision, type EvalModeEnvoi,
  type EvalModeleNotification, type EvalEmployee, type EvalDepartment, type EvalOrganisationUnit,
  rhApi,
} from '../../api/evalAnnuel';

// ── Couleurs ANASER ────────────────────────────────────────────────────────
const NAVY = '#002f59';
const ORANGE = '#ff7631';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const fmtNum = (n?: number | null, decimals = 1) =>
  n != null ? n.toFixed(decimals) : '—';

// ── StatutChip ─────────────────────────────────────────────────────────────
function StatutChip({ statut, size = 'small' }: { statut: EvalStatutFicheAnn; size?: 'small' | 'medium' }) {
  const color = STATUT_COLORS[statut] ?? '#94A3B8';
  return (
    <Chip
      label={STATUT_LABELS[statut] ?? statut}
      size={size}
      sx={{
        bgcolor: color + '18',
        color,
        fontWeight: 700,
        fontSize: size === 'small' ? 11 : 12,
        border: `1px solid ${color}33`,
        maxWidth: 180,
      }}
    />
  );
}

// ── AppreciationChip ───────────────────────────────────────────────────────
function AppreciationChip({ val }: { val?: EvalAppreciationAnn | null }) {
  if (!val) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const colors: Record<EvalAppreciationAnn, string> = {
    excellent: '#059669', tres_satisfaisant: '#0284C7',
    satisfaisant: '#6366F1', a_ameliorer: '#F59E0B', insuffisant: '#DC2626',
  };
  return (
    <Chip
      label={APPRECIATION_LABELS[val]}
      size="small"
      sx={{ bgcolor: (colors[val] ?? '#94A3B8') + '18', color: colors[val], fontWeight: 700, fontSize: 11 }}
    />
  );
}

// ── MiniStepper (barre de progression dans le tableau) ─────────────────────
function MiniStepper({ statut }: { statut: EvalStatutFicheAnn }) {
  const activeStep = STATUT_TO_STEP[statut] ?? 0;
  const total = EVAL_WORKFLOW_STEPS.length;
  const pct = Math.round((activeStep / (total - 1)) * 100);
  const color = activeStep === total - 1 ? '#059669' : ORANGE;

  return (
    <Box sx={{ minWidth: 120 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>
          {EVAL_WORKFLOW_STEPS[activeStep]?.sp}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          {activeStep + 1}/{total}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: '#E2E8F0',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.3 }}>
        {EVAL_WORKFLOW_STEPS[activeStep]?.label}
      </Typography>
    </Box>
  );
}

// ── WorkflowStepper (stepper complet dans la dialog fiche) ─────────────────
function WorkflowStepper({ statut }: { statut: EvalStatutFicheAnn }) {
  const activeStep = STATUT_TO_STEP[statut] ?? 0;
  const isException = ['entretien_reporte', 'signature_refusee', 'cloturee_sortie'].includes(statut);

  return (
    <Box sx={{ bgcolor: NAVY, borderRadius: 2, p: 2, mb: 2 }}>
      <Stepper activeStep={activeStep} alternativeLabel
        sx={{
          '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.6)', fontSize: 11, mt: 0.5 },
          '& .MuiStepLabel-label.Mui-active': { color: '#fff', fontWeight: 700, fontSize: 11 },
          '& .MuiStepLabel-label.Mui-completed': { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
          '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.25)' },
          '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.25)' },
          '& .MuiStepIcon-root.Mui-active': { color: ORANGE },
          '& .MuiStepIcon-root.Mui-completed': { color: '#10B981' },
        }}
      >
        {EVAL_WORKFLOW_STEPS.map((step, i) => (
          <Step key={step.sp} completed={i < activeStep}>
            <StepLabel>
              <Box>
                <Box sx={{ fontWeight: i === activeStep ? 800 : 600 }}>{step.label}</Box>
                <Box sx={{ fontSize: 9, opacity: 0.7 }}>{step.sp}</Box>
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      {isException && (
        <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, fontSize: 12, borderRadius: 1 }}>
          Statut d'exception : <strong>{STATUT_LABELS[statut]}</strong>
        </Alert>
      )}
    </Box>
  );
}

// ── Fiche Detail Dialog ────────────────────────────────────────────────────
function FicheDetailDialog({
  fiche, open, onClose, onRefresh,
}: {
  fiche: EvalFicheAnn;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [planifierOpen, setPlanifierOpen] = useState(false);
  const [noterOpen, setNoterOpen] = useState(false);
  const [signerEvalOpen, setSignerEvalOpen] = useState(false);
  const [transmettreOpen, setTransmettreOpen] = useState(false);

  // Charger le détail complet
  const { data: detail, isLoading } = useQuery({
    queryKey: ['eval-fiche-detail', fiche.id],
    queryFn: () => evalFichesApi.show(fiche.id).then(r => r.data),
    enabled: open,
  });

  const f = detail?.fiche ?? fiche;
  const criteres = detail?.criteres ?? [];
  const historique = f.historique_statuts ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['eval-fiches'] });
    qc.invalidateQueries({ queryKey: ['eval-fiche-detail', fiche.id] });
    onRefresh();
  };

  // Mutations actions rapides
  const transmettreDAF = useMutation({
    mutationFn: () => evalFichesApi.transmettreDAF(fiche.id),
    onSuccess: () => { invalidate(); },
  });

  const activeStep = STATUT_TO_STEP[f.statut] ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box sx={{ bgcolor: NAVY, px: 3, pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>
              {f.snapshot_nom_complet}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, mt: 0.3 }}>
              {f.snapshot_matricule && `MAT: ${f.snapshot_matricule} · `}
              {f.snapshot_direction ?? '—'} {f.snapshot_fonction ? `· ${f.snapshot_fonction}` : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={CATEGORIE_LABELS[f.categorie_agent]}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
            />
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
        {/* Stepper */}
        <WorkflowStepper statut={f.statut} />
        {/* Statut détaillé */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5 }}>
          <StatutChip statut={f.statut} />
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
            Étape {activeStep + 1} / {EVAL_WORKFLOW_STEPS.length} —
            {' '}{EVAL_WORKFLOW_STEPS[activeStep]?.sublabel}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {isLoading && <LinearProgress />}

        {/* Infos résumé */}
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {/* Colonne gauche */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  ENTRETIEN
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(f.date_entretien)}</Typography>
                  </Box>
                  {f.heure_entretien && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Heure</Typography>
                      <Typography variant="body2" fontWeight={600}>{f.heure_entretien}</Typography>
                    </Box>
                  )}
                  {f.lieu_entretien && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Lieu</Typography>
                      <Typography variant="body2" fontWeight={600}>{f.lieu_entretien}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Évaluateur</Typography>
                    <Typography variant="body2" fontWeight={600}>{f.evaluateur?.name ?? '—'}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Colonne droite */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  RÉSULTAT
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Note</Typography>
                    <Typography variant="body1" fontWeight={800} color={NAVY}>
                      {fmtNum(f.moyenne)}{f.moyenne != null ? '/5' : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Appréciation</Typography>
                    <AppreciationChip val={f.appreciation} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Signé évaluateur</Typography>
                    <Typography variant="body2" fontWeight={600} color={f.signe_evaluateur_at ? '#059669' : '#94A3B8'}>
                      {fmt(f.signe_evaluateur_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Signé agent</Typography>
                    <Typography variant="body2" fontWeight={600} color={f.signe_agent_at ? '#059669' : '#94A3B8'}>
                      {fmt(f.signe_agent_at)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Observations */}
          {f.observations_evaluateur && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>OBSERVATIONS ÉVALUATEUR</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{f.observations_evaluateur}</Typography>
            </Paper>
          )}

          {/* Critères et notes */}
          {criteres.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                GRILLE DE NOTATION
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Critère</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Note /5</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {criteres.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontSize: 12 }}>{c.libelle}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={c.type === 'socle' ? 'Socle' : 'Complémentaire'}
                            size="small"
                            sx={{
                              fontSize: 10, fontWeight: 600,
                              bgcolor: c.type === 'socle' ? '#EFF6FF' : '#F5F3FF',
                              color: c.type === 'socle' ? '#1D4ED8' : '#7C3AED',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {c.note != null ? (
                            <Typography fontWeight={700} color={c.note >= 4 ? '#059669' : c.note >= 3 ? '#F59E0B' : '#DC2626'}>
                              {c.note}
                            </Typography>
                          ) : (
                            <Typography color="text.disabled" fontSize={12}>—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Historique des transitions */}
          {historique.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                HISTORIQUE DES TRANSITIONS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {historique.slice().reverse().slice(0, 8).map((h) => (
                  <Box key={h.id} sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    p: 1.2, bgcolor: '#F8FAFC', borderRadius: 1.5,
                    border: '1px solid #E2E8F0',
                  }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', mt: 0.7, flexShrink: 0,
                      bgcolor: STATUT_COLORS[h.statut as EvalStatutFicheAnn] ?? '#94A3B8',
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                          {STATUT_LABELS[h.statut as EvalStatutFicheAnn] ?? h.statut}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fmt(h.created_at)}
                        </Typography>
                      </Box>
                      {h.user?.name && (
                        <Typography variant="caption" color="text.secondary">
                          par {h.user.name}
                        </Typography>
                      )}
                      {h.commentaire && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                          {h.commentaire}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Actions contextuelles */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Fermer</Button>
        <Box sx={{ flex: 1 }} />

        {/* SP2 — Planifier entretien */}
        {['cree', 'transmise_responsable', 'entretien_reporte'].includes(f.statut) && (
          <Button
            variant="contained"
            startIcon={<CalendarToday />}
            onClick={() => setPlanifierOpen(true)}
            sx={{ textTransform: 'none', bgcolor: NAVY, '&:hover': { bgcolor: '#003d75' }, borderRadius: 2 }}
          >
            Planifier l'entretien
          </Button>
        )}

        {/* SP3 — Noter */}
        {['agent_convoque', 'en_cours_notation', 'notee_attente_discussion'].includes(f.statut) && (
          <Button
            variant="contained"
            startIcon={<Grade />}
            onClick={() => setNoterOpen(true)}
            sx={{ textTransform: 'none', bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, borderRadius: 2 }}
          >
            Saisir les notes
          </Button>
        )}

        {/* SP3 — Signer évaluateur */}
        {f.statut === 'attente_signature_agent' && !f.signe_evaluateur_at && (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => setSignerEvalOpen(true)}
            sx={{ textTransform: 'none', bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}
          >
            Signer (évaluateur)
          </Button>
        )}

        {/* SP3 — Transmettre DAF */}
        {f.statut === 'signee' && (
          <Button
            variant="contained"
            startIcon={<Send />}
            disabled={transmettreDAF.isPending}
            onClick={() => transmettreDAF.mutate()}
            sx={{ textTransform: 'none', bgcolor: ORANGE, '&:hover': { bgcolor: '#e56920' }, borderRadius: 2 }}
          >
            {transmettreDAF.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Transmettre au DAF'}
          </Button>
        )}

        {/* PDF */}
        <Tooltip title="Télécharger le PDF">
          <IconButton
            href={`/api/eval/fiches/${fiche.id}/pdf`}
            target="_blank"
            sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}
          >
            <Download fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogActions>

      {/* Sub-dialogs */}
      {planifierOpen && (
        <PlanifierDialog
          fiche={f}
          open={planifierOpen}
          onClose={() => setPlanifierOpen(false)}
          onSuccess={invalidate}
        />
      )}
      {noterOpen && (
        <NoterDialog
          fiche={f}
          criteres={criteres}
          open={noterOpen}
          onClose={() => setNoterOpen(false)}
          onSuccess={invalidate}
        />
      )}
    </Dialog>
  );
}

// ── Dialog Planifier entretien ─────────────────────────────────────────────
function PlanifierDialog({
  fiche, open, onClose, onSuccess,
}: {
  fiche: EvalFicheAnn;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('09:00');
  const [lieu, setLieu] = useState('Salle de réunion ANASER');
  const [motif, setMotif] = useState('');
  const isReporte = fiche.statut === 'entretien_reporte';

  const mutation = useMutation({
    mutationFn: () =>
      isReporte
        ? evalFichesApi.replanifier(fiche.id, {
            motif,
            nouvelle_date_entretien: date,
            heure_entretien: heure,
            lieu_entretien: lieu,
          })
        : evalFichesApi.planifier(fiche.id, {
            date_entretien: date,
            heure_entretien: heure,
            lieu_entretien: lieu,
          }),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {isReporte ? 'Replanifier l\'entretien' : 'Planifier l\'entretien'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fiche.snapshot_nom_complet}
        </Typography>
        <Stack spacing={2}>
          {isReporte && (
            <TextField
              label="Motif du report *"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              multiline rows={2}
              fullWidth size="small"
            />
          )}
          <TextField
            label="Date de l'entretien *"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Heure"
            type="time"
            value={heure}
            onChange={e => setHeure(e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Lieu"
            value={lieu}
            onChange={e => setLieu(e.target.value)}
            fullWidth size="small"
          />
        </Stack>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>
            {(mutation.error as Error)?.message ?? 'Erreur lors de la planification'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button
          variant="contained"
          disabled={!date || mutation.isPending || (isReporte && !motif)}
          onClick={() => mutation.mutate()}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
        >
          {mutation.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog Notation ────────────────────────────────────────────────────────
function NoterDialog({
  fiche, criteres, open, onClose, onSuccess,
}: {
  fiche: EvalFicheAnn;
  criteres: EvalCritereAnn[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState<Record<number, number>>(() =>
    Object.fromEntries(criteres.map(c => [c.id, c.note ?? 3]))
  );
  const [observations, setObservations] = useState(fiche.observations_evaluateur ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      evalFichesApi.noter(fiche.id, {
        notations: Object.entries(notes).map(([cid, note]) => ({
          critere_id: Number(cid),
          note,
        })),
        observations_evaluateur: observations || undefined,
      }),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const moyenne = criteres.length > 0
    ? Object.values(notes).reduce((a, b) => a + b, 0) / Object.values(notes).length
    : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1, bgcolor: NAVY, color: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Grille de notation — {fiche.snapshot_nom_complet}</span>
          <Box sx={{
            bgcolor: ORANGE, color: '#fff', px: 1.5, py: 0.3,
            borderRadius: 2, fontWeight: 900, fontSize: 16,
          }}>
            {moyenne.toFixed(2)} / 5
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {criteres.map(c => (
            <Box key={c.id} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{c.libelle}</Typography>
                <Chip
                  label={c.type === 'socle' ? 'Socle' : 'Complémentaire'}
                  size="small"
                  sx={{ fontSize: 10, bgcolor: c.type === 'socle' ? '#EFF6FF' : '#F5F3FF', color: c.type === 'socle' ? '#1D4ED8' : '#7C3AED' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 0.8, mt: 1 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Box
                    key={n}
                    onClick={() => setNotes(prev => ({ ...prev, [c.id]: n }))}
                    sx={{
                      width: 36, height: 36, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', borderRadius: 1.5, cursor: 'pointer',
                      fontWeight: 700, fontSize: 15, border: '2px solid',
                      borderColor: notes[c.id] === n ? NAVY : '#E2E8F0',
                      bgcolor: notes[c.id] === n ? NAVY : '#F8FAFC',
                      color: notes[c.id] === n ? '#fff' : '#64748B',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: NAVY, bgcolor: '#EFF6FF' },
                    }}
                  >
                    {n}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
          <TextField
            label="Observations de l'évaluateur"
            multiline
            rows={3}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            fullWidth
            size="small"
          />
        </Stack>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>
            {(mutation.error as Error)?.message ?? 'Erreur lors de la notation'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
        >
          {mutation.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Enregistrer les notes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog Créer Référentiel (depuis CampagneFormDialog) ───────────────────
function CreerReferentielDialog({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ref: EvalReferentiel) => void;
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState('ANASER');
  const [libelle, setLibelle] = useState("Référentiel d'évaluation ANASER");
  const [avecCriteres, setAvecCriteres] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      avecCriteres
        ? evalReferentielsApi.seed({ code: code.trim(), libelle: libelle.trim() })
        : evalReferentielsApi.create({ code: code.trim(), libelle: libelle.trim() }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['eval-referentiels'] });
      onCreated(r.data);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1, color: NAVY }}>
        Créer un référentiel
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Code *"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            fullWidth size="small"
            helperText="Si ce code existe déjà, une nouvelle version est créée automatiquement"
          />
          <TextField
            label="Libellé *"
            value={libelle}
            onChange={e => setLibelle(e.target.value)}
            fullWidth size="small"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={avecCriteres}
                onChange={e => setAvecCriteres(e.target.checked)}
                sx={{ color: NAVY, '&.Mui-checked': { color: NAVY } }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Pré-remplir les 13 critères officiels ANASER
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  7 critères socles (C01–C07) + 6 critères complémentaires (C08–C13)
                </Typography>
              </Box>
            }
          />
        </Stack>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>
            {(mutation.error as any)?.response?.data?.message ?? (mutation.error as Error)?.message ?? 'Erreur'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || !code.trim() || !libelle.trim()}
          onClick={() => mutation.mutate()}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
        >
          {mutation.isPending
            ? <CircularProgress size={16} sx={{ color: '#fff' }} />
            : 'Créer le référentiel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog Créer/Modifier Campagne ─────────────────────────────────────────
function CampagneFormDialog({
  open, onClose, onSuccess, campagne,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campagne?: EvalCampagneAnn;
}) {
  const [exercice, setExercice] = useState(campagne?.exercice ?? new Date().getFullYear());
  const [titre, setTitre] = useState(campagne?.titre ?? '');
  const [refId, setRefId] = useState<number | ''>(campagne?.referentiel_id ?? '');
  const [dateLancement, setDateLancement] = useState(campagne?.date_lancement ?? '');
  const [dateCloture, setDateCloture] = useState(campagne?.date_cloture ?? '');
  const [refDialogOpen, setRefDialogOpen] = useState(false);

  const { data: refs } = useQuery({
    queryKey: ['eval-referentiels'],
    queryFn: () => evalReferentielsApi.list().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      campagne
        ? evalCampagnesApi.update(campagne.id, { titre, date_lancement: dateLancement || undefined, date_cloture: dateCloture || undefined })
        : evalCampagnesApi.create({
            exercice,
            titre: titre || undefined,
            referentiel_id: refId !== '' ? refId : undefined,
            date_lancement: dateLancement || undefined,
            date_cloture: dateCloture || undefined,
          }),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {campagne ? 'Modifier la campagne' : 'Nouvelle campagne'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Exercice *"
            type="number"
            value={exercice}
            onChange={e => setExercice(Number(e.target.value))}
            disabled={!!campagne}
            fullWidth size="small"
          />
          <TextField
            label="Titre (optionnel)"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            placeholder={`Campagne d'évaluation ${exercice}`}
            fullWidth size="small"
          />
          {!campagne && (
            <Box>
              <FormControl size="small" fullWidth>
                <InputLabel>Référentiel</InputLabel>
                <Select
                  value={refId}
                  label="Référentiel"
                  onChange={e => setRefId(e.target.value as number | '')}
                >
                  <MenuItem value="">— Sélectionner —</MenuItem>
                  {(refs as EvalReferentiel[] | undefined)?.map(r => (
                    <MenuItem key={r.id} value={r.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {r.code} v{r.version}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.libelle}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!(refs as EvalReferentiel[] | undefined)?.length && (
                <Alert severity="warning" sx={{ mt: 1, fontSize: 12, py: 0.5 }}>
                  Aucun référentiel disponible.
                </Alert>
              )}
              <Button
                size="small"
                onClick={() => setRefDialogOpen(true)}
                sx={{ mt: 0.5, textTransform: 'none', color: NAVY, fontWeight: 600, p: 0, minWidth: 0 }}
              >
                + Créer un nouveau référentiel
              </Button>
              <CreerReferentielDialog
                open={refDialogOpen}
                onClose={() => setRefDialogOpen(false)}
                onCreated={(ref) => { setRefId(ref.id); setRefDialogOpen(false); }}
              />
            </Box>
          )}
          <TextField
            label="Date de lancement"
            type="date"
            value={dateLancement}
            onChange={e => setDateLancement(e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date de clôture"
            type="date"
            value={dateCloture}
            onChange={e => setDateCloture(e.target.value)}
            fullWidth size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>
            {(mutation.error as Error)?.message ?? 'Erreur'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
        >
          {mutation.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : (campagne ? 'Modifier' : 'Créer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ONGLET TABLEAU DE BORD ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function DashboardTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['eval-dashboard'],
    queryFn: () => evalDashboardApi.get().then(r => r.data),
  });

  if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: NAVY }} /></Box>;
  if (error || !data) return <Alert severity="error" sx={{ m: 2 }}>Impossible de charger le tableau de bord.</Alert>;

  const role = data.role_dashboard;

  if (role === 'daf' || role === 'responsable') {
    const d = data as EvalDashboardDaf;
    if (d.message) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          <strong>Aucune campagne active.</strong> Créez une campagne depuis l'onglet Campagnes.
        </Alert>
      );
    }
    return (
      <Box>
        {/* Cartes KPI */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Fiches total', value: d.nb_fiches_total ?? 0, icon: <Assignment />, color: NAVY },
            { label: 'Complétion', value: `${d.taux_completion ?? 0}%`, icon: <TrendingUp />, color: '#059669' },
            { label: 'En retard', value: d.en_retard ?? 0, icon: <Warning />, color: '#F59E0B' },
            { label: 'Bloquées', value: d.bloquees ?? 0, icon: <Block />, color: '#DC2626' },
          ].map(kpi => (
            <Grid item xs={6} md={3} key={kpi.label}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}
              >
                <Box sx={{ p: 1.2, bgcolor: kpi.color + '15', borderRadius: 2, color: kpi.color }}>
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={900} color={kpi.color}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Barre de progression globale */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography fontWeight={700} color={NAVY}>Répartition par statut</Typography>
            <Typography variant="body2" color="text.secondary">
              Campagne {d.campagne_courante?.exercice} — {d.campagne_courante?.titre}
            </Typography>
          </Box>
          {(d.par_statut ?? []).map(s => (
            <Box key={s.libelle} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  <Chip
                    label={s.sous_procedure}
                    size="small"
                    sx={{ mr: 1, fontSize: 10, height: 18, bgcolor: '#EFF6FF', color: NAVY, fontWeight: 700 }}
                  />
                  {s.libelle}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{s.nb}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(s.nb / (d.nb_fiches_total || 1)) * 100}
                sx={{
                  height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
                  '& .MuiLinearProgress-bar': { bgcolor: NAVY, borderRadius: 3 },
                }}
              />
            </Box>
          ))}
          {(d.par_statut ?? []).length === 0 && (
            <Typography color="text.secondary" variant="body2">Aucune fiche pour cette campagne.</Typography>
          )}
        </Paper>

        {/* Campagnes actives */}
        {(d.campagnes_actives ?? []).length > 0 && (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
            <Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Campagnes actives</Typography>
            {(d.campagnes_actives ?? []).map(c => (
              <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{c.titre ?? `Exercice ${c.exercice}`}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lancement: {fmt(c.date_lancement)} · Clôture: {fmt(c.date_cloture)}
                  </Typography>
                </Box>
                <Chip
                  label={c.statut === 'lancee' ? 'Active' : c.statut}
                  size="small"
                  sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 11 }}
                />
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    );
  }

  if (role === 'direction') {
    const d = data as EvalDashboardDirection;
    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Synthèses à étudier', value: d.syntheses_a_etudier.length, icon: <FolderOpen />, color: '#7C3AED' },
            { label: 'En attente notification', value: d.nb_en_attente_notif, icon: <Notifications />, color: ORANGE },
            { label: 'En attente archivage', value: d.nb_en_attente_archiv, icon: <Archive />, color: '#0284C7' },
          ].map(kpi => (
            <Grid item xs={12} md={4} key={kpi.label}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.2, bgcolor: kpi.color + '15', borderRadius: 2, color: kpi.color }}>{kpi.icon}</Box>
                <Box>
                  <Typography variant="h5" fontWeight={900} color={kpi.color}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {d.syntheses_a_etudier.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>{d.syntheses_a_etudier.length} tableau(x) de synthèse</strong> en attente de votre étude.
          </Alert>
        )}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Décisions enregistrées</Typography>
          {d.gratifications.map(g => (
            <Box key={g.type_decision} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #F1F5F9' }}>
              <Typography variant="body2">{DECISION_LABELS[g.type_decision as EvalTypeDecision] ?? g.type_decision}</Typography>
              <Typography variant="body2" fontWeight={700}>{g.nb}</Typography>
            </Box>
          ))}
          {d.gratifications.length === 0 && <Typography color="text.secondary" variant="body2">Aucune décision enregistrée.</Typography>}
        </Paper>
      </Box>
    );
  }

  if (role === 'agent') {
    const d = data as EvalDashboardAgent;
    return (
      <Box>
        {d.action_requise && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Action requise :</strong> {d.action_requise}
          </Alert>
        )}
        {d.employee && (
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: NAVY, width: 48, height: 48, fontSize: 18, fontWeight: 700 }}>
                {d.employee.nom_complet.charAt(0)}
              </Avatar>
              <Box>
                <Typography fontWeight={800}>{d.employee.nom_complet}</Typography>
                <Typography variant="body2" color="text.secondary">MAT: {d.employee.matricule}</Typography>
              </Box>
              {d.courrier_disponible && (
                <Chip label="Courrier disponible" size="small" sx={{ ml: 'auto', bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700 }} />
              )}
            </Box>
          </Paper>
        )}
        {d.message && <Alert severity="info">{d.message}</Alert>}
        {d.fiches.length > 0 && (
          <Box>
            <Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Mes évaluations</Typography>
            {d.fiches.map(f => (
              <Paper key={f.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography fontWeight={700}>Exercice {f.exercice}</Typography>
                  <StatutChip statut={f.statut} />
                </Box>
                <MiniStepper statut={f.statut} />
                {f.moyenne != null && (
                  <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
                    Note : <strong>{f.moyenne.toFixed(2)}/5</strong>
                    {f.appreciation ? ` — ${APPRECIATION_LABELS[f.appreciation]}` : ''}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return <Alert severity="info">Tableau de bord non disponible pour votre rôle.</Alert>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── DIALOG ORGANIGRAMME (correction avant lancement) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function OrganigrammeDialog({
  open, onClose, campagneId, onFixed,
}: {
  open: boolean;
  onClose: () => void;
  campagneId: number;
  onFixed: () => void;
}) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deptId, setDeptId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [managerId, setManagerId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false, message: '', severity: 'success',
  });

  const { data: empData, isLoading, refetch } = useQuery({
    queryKey: ['employees-correction-orga', campagneId],
    queryFn: () => rhApi.employees({ per_page: 500, status: 'active' }).then(r => r.data.data),
    enabled: open,
    staleTime: 0,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['eval-departments'],
    queryFn: () => rhApi.departments().then(r => r.data),
    enabled: open,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['eval-services-orga', deptId],
    queryFn: () => rhApi.organisationUnits(deptId ? { department_id: deptId as number } : undefined).then(r => r.data),
    enabled: open,
  });

  const tousEmployes = empData ?? [];

  const sansManager = useMemo(
    () => tousEmployes.filter(e => !e.manager_id),
    [tousEmployes]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sansManager.filter(e =>
      !q ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_number ?? '').toLowerCase().includes(q) ||
      (e.department?.name ?? '').toLowerCase().includes(q)
    );
  }, [sansManager, search]);

  const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.includes(e.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(ids => ids.filter(id => !filtered.some(e => e.id === id)));
    } else {
      setSelectedIds(ids => [...new Set([...ids, ...filtered.map(e => e.id)])]);
    }
  };

  const toggle = (id: number) =>
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);

  const canApply = selectedIds.length > 0 && (deptId !== '' || serviceId !== '' || managerId !== '');

  const affecterLot = useMutation({
    mutationFn: () =>
      rhApi.affecterLot({
        employee_ids: selectedIds,
        ...(deptId !== '' ? { department_id: deptId as number } : {}),
        ...(serviceId !== '' ? { organisation_unit_id: serviceId as number } : {}),
        ...(managerId !== '' ? { manager_id: managerId as number } : {}),
      }),
    onSuccess: (r) => {
      setSnackbar({ open: true, message: r.data.message, severity: 'success' });
      setSelectedIds([]);
      refetch();
      qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
      qc.invalidateQueries({ queryKey: ['eval-fiches'] });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.message ?? 'Erreur lors de la mise à jour.', severity: 'error' });
    },
  });

  const nomManager = useMemo(() => {
    if (managerId === '') return null;
    const m = tousEmployes.find(e => e.id === managerId);
    return m ? `${m.first_name} ${m.last_name}` : null;
  }, [managerId, tousEmployes]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: '92vh', display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ pb: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Warning sx={{ color: ORANGE, fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800} color={NAVY} variant="h6">
              Corriger l'organigramme
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isLoading ? '…' : sansManager.length} agent(s) sans responsable hiérarchique — à corriger avant le lancement
            </Typography>
          </Box>
          {!isLoading && sansManager.length === 0 && (
            <Chip
              icon={<CheckCircle sx={{ fontSize: 14 }} />}
              label="Organigramme complet"
              size="small"
              sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700 }}
            />
          )}
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Zone d'affectation en lot ─────────────────────────────────── */}
        <Box sx={{ px: 2.5, py: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>
            Affectation en lot
            {selectedIds.length > 0 && (
              <Chip label={`${selectedIds.length} sélectionné(s)`} size="small"
                sx={{ ml: 1, bgcolor: NAVY + '18', color: NAVY, fontWeight: 700, fontSize: 11 }} />
            )}
          </Typography>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid item xs={12} sm={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Direction</InputLabel>
                <Select
                  value={deptId}
                  label="Direction"
                  onChange={e => { setDeptId(e.target.value as number | ''); setServiceId(''); setManagerId(''); }}
                >
                  <MenuItem value="">— Toutes —</MenuItem>
                  {(departments as EvalDepartment[]).map(d => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Service</InputLabel>
                <Select
                  value={serviceId}
                  label="Service"
                  onChange={e => setServiceId(e.target.value as number | '')}
                  disabled={!deptId}
                >
                  <MenuItem value="">— Tous —</MenuItem>
                  {(services as EvalOrganisationUnit[]).map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.libelle}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Responsable hiérarchique *</InputLabel>
                <Select
                  value={managerId}
                  label="Responsable hiérarchique *"
                  onChange={e => setManagerId(e.target.value as number | '')}
                >
                  <MenuItem value="">— Sélectionner —</MenuItem>
                  {tousEmployes
                    .filter(e => !deptId || e.department_id === deptId)
                    .map(e => (
                      <MenuItem key={e.id} value={e.id}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {e.first_name} {e.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {e.department?.name ?? '—'}{e.position?.title ? ` · ${e.position.title}` : ''}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {!managerId && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                  Obligatoire pour pouvoir lancer la campagne
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                fullWidth
                size="medium"
                disabled={!canApply || affecterLot.isPending}
                onClick={() => affecterLot.mutate()}
                sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, height: 40 }}
              >
                {affecterLot.isPending
                  ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                  : 'Appliquer'}
              </Button>
            </Grid>
          </Grid>

          {/* Résumé de l'affectation à appliquer */}
          {(deptId !== '' || serviceId !== '' || managerId !== '') && selectedIds.length > 0 && (
            <Alert severity="info" sx={{ mt: 1.5, fontSize: 12, py: 0.5 }}>
              <strong>{selectedIds.length} agent(s)</strong> →
              {deptId !== '' && ` Direction: ${(departments as EvalDepartment[]).find(d => d.id === deptId)?.name}`}
              {serviceId !== '' && ` · Service: ${(services as EvalOrganisationUnit[]).find(s => s.id === serviceId)?.libelle}`}
              {managerId !== '' && ` · Responsable: ${nomManager}`}
            </Alert>
          )}
        </Box>

        {/* ── Recherche + liste ─────────────────────────────────────────── */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <TextField
            size="small"
            placeholder="Rechercher par nom, matricule, direction…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Person sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
            sx={{ width: 320 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            {filtered.length} agent(s) affiché(s) sur {sansManager.length} sans responsable
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: NAVY }} /></Box>
          ) : sansManager.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 56, color: '#059669', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="#059669" gutterBottom>
                Organigramme complet !
              </Typography>
              <Typography color="text.secondary">
                Tous les agents actifs ont un responsable hiérarchique. Vous pouvez lancer la campagne.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#F8FAFC' }}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={selectedIds.some(id => filtered.some(e => e.id === id)) && !allSelected}
                        onChange={toggleAll}
                        sx={{ color: NAVY, '&.Mui-checked': { color: NAVY } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Matricule</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Direction actuelle</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Service</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Fonction</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#F8FAFC', fontSize: 12, color: NAVY }}>Responsable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(e => (
                    <TableRow
                      key={e.id}
                      hover
                      selected={selectedIds.includes(e.id)}
                      onClick={() => toggle(e.id)}
                      sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: NAVY + '08' } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(e.id)}
                          onClick={ev => ev.stopPropagation()}
                          onChange={() => toggle(e.id)}
                          sx={{ color: NAVY, '&.Mui-checked': { color: NAVY } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                        {e.first_name} {e.last_name}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>
                        {e.employee_number ?? '—'}
                      </TableCell>
                      <TableCell>
                        {e.department?.name
                          ? <Chip label={e.department.name} size="small"
                              sx={{ fontSize: 11, bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }} />
                          : <Chip label="Non affecté" size="small"
                              sx={{ fontSize: 11, bgcolor: '#FEF2F2', color: '#DC2626' }} />}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {e.organisation_unit?.libelle ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {e.position?.title ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label="Manquant" size="small"
                          sx={{ fontSize: 10, bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          {sansManager.length > 0
            ? <Typography variant="body2" color="text.secondary">
                <strong style={{ color: ORANGE }}>{sansManager.length}</strong> agent(s) restant(s) à corriger
              </Typography>
            : <Typography variant="body2" color="#059669" fontWeight={700}>
                Prêt pour le lancement ✓
              </Typography>}
        </Box>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Fermer</Button>
        {sansManager.length === 0 && (
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => { onClose(); onFixed(); }}
            sx={{ textTransform: 'none', bgcolor: '#059669', borderRadius: 2, fontWeight: 700 }}
          >
            Lancer la campagne
          </Button>
        )}
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ fontWeight: 700, fontSize: 13, borderRadius: 2, boxShadow: 4 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── DIALOG NOTE DE SERVICE ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function NoteServiceDialog({
  open, onClose, campagne, onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  campagne: EvalCampagneAnn;
  onUpdated: () => void;
}) {
  const [texte, setTexte] = useState(campagne.note_service ?? '');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const estSignee = !!campagne.note_service_signee;

  const generer = useMutation({
    mutationFn: () => evalCampagnesApi.genererNote(campagne.id),
    onSuccess: (r) => {
      setTexte(r.data.note_service);
      setSnackbar({ open: true, message: 'Note de service générée.', severity: 'success' });
      onUpdated();
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.message ?? 'Erreur lors de la génération.', severity: 'error' });
    },
  });

  const signer = useMutation({
    mutationFn: () => evalCampagnesApi.signerNote(campagne.id),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Note de service signée avec succès.', severity: 'success' });
      onUpdated();
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err?.response?.data?.message ?? 'Erreur lors de la signature.', severity: 'error' });
    },
  });

  const telecharger = async () => {
    try {
      const r = await evalCampagnesApi.downloadNotePdf(campagne.id);
      const url = URL.createObjectURL(r.data as unknown as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note_service_${campagne.exercice}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Impossible de télécharger le PDF.', severity: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ArticleOutlined sx={{ color: NAVY }} />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800} color={NAVY}>
              Note de service — Exercice {campagne.exercice}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {campagne.titre ?? `Campagne d'évaluation ${campagne.exercice}`}
            </Typography>
          </Box>
          {estSignee ? (
            <Chip
              icon={<VerifiedUser sx={{ fontSize: 14 }} />}
              label="Signée"
              size="small"
              sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 11 }}
            />
          ) : (
            <Chip
              label="Non signée"
              size="small"
              sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: 11 }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Barre d'actions */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DriveFileRenameOutline />}
            onClick={() => generer.mutate()}
            disabled={generer.isPending || estSignee}
            sx={{ textTransform: 'none', borderColor: NAVY, color: NAVY, borderRadius: 2 }}
          >
            {generer.isPending ? <CircularProgress size={14} /> : (texte ? 'Regénérer' : 'Générer la note')}
          </Button>
          {texte && !estSignee && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Gavel />}
              onClick={() => signer.mutate()}
              disabled={signer.isPending}
              sx={{ textTransform: 'none', bgcolor: '#059669', borderRadius: 2, '&:hover': { bgcolor: '#047857' } }}
            >
              {signer.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Signer (DG)'}
            </Button>
          )}
          {texte && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={telecharger}
              sx={{ textTransform: 'none', borderColor: '#DC2626', color: '#DC2626', borderRadius: 2, ml: 'auto' }}
            >
              Télécharger PDF
            </Button>
          )}
        </Box>

        {/* Corps de la note */}
        {!texte ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ArticleOutlined sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              La note de service n'a pas encore été générée.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cliquez sur "Générer la note" pour créer le projet basé sur le calendrier de la campagne.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2.5 }}>
            {estSignee && (
              <Alert severity="success" sx={{ mb: 2, fontSize: 12 }}>
                <strong>Note signée</strong> le {new Date(campagne.note_service_signee_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                Le contenu ne peut plus être modifié.
              </Alert>
            )}
            <TextField
              value={texte}
              onChange={e => setTexte(e.target.value)}
              multiline
              minRows={18}
              fullWidth
              disabled={estSignee}
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.7,
                  bgcolor: estSignee ? '#F8FAFC' : '#fff',
                },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {!estSignee && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Vous pouvez modifier le texte avant de signer. Une fois signée, la note sera verrouillée.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Fermer</Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ fontWeight: 700, fontSize: 13, borderRadius: 2, boxShadow: 4 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ONGLET CAMPAGNES ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function CampagnesTab() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editCampagne, setEditCampagne] = useState<EvalCampagneAnn | undefined>();
  const [noteDialog, setNoteDialog] = useState<EvalCampagneAnn | null>(null);
  const [orgDialog, setOrgDialog] = useState<{ campagneId: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'warning' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const { data: campagnes = [], isLoading } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagnesApi.list().then(r => r.data),
  });

  const lancer = useMutation({
    mutationFn: (id: number) => evalCampagnesApi.lancer(id),
    onSuccess: (r) => {
      invalidate();
      const msg = (r as any)?.data?.message ?? 'Campagne lancée avec succès.';
      setSnackbar({ open: true, message: msg, severity: 'success' });
    },
    onError: (err: any, campId: number) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erreur lors du lancement.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
      if (msg.includes('sans responsable hiérarchique')) {
        setOrgDialog({ campagneId: campId });
      }
    },
  });

  const STATUT_CAMPAGNE: Record<string, { label: string; color: string; bg: string }> = {
    brouillon: { label: 'Brouillon', color: '#64748B', bg: '#F1F5F9' },
    lancee:    { label: 'Active',    color: '#059669', bg: '#D1FAE5' },
    cloturee:  { label: 'Clôturée', color: '#6B7280', bg: '#F3F4F6' },
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
    qc.invalidateQueries({ queryKey: ['eval-fiches'] });
    qc.invalidateQueries({ queryKey: ['eval-dashboard'] });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {campagnes.length} campagne(s)
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => { setEditCampagne(undefined); setFormOpen(true); }}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, fontWeight: 700 }}
        >
          Nouvelle campagne
        </Button>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {campagnes.length === 0 && !isLoading && (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '2px dashed #E2E8F0' }}>
          <Assignment sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
          <Typography color="text.secondary">Aucune campagne. Créez-en une pour commencer.</Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {(campagnes as EvalCampagneAnn[]).map(c => {
          const st = STATUT_CAMPAGNE[c.statut] ?? STATUT_CAMPAGNE.brouillon;
          const stats = c.stats;
          return (
            <Paper
              key={c.id}
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', '&:hover': { borderColor: NAVY + '44', boxShadow: '0 2px 12px #002f5911' } }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={800} color={NAVY}>
                      Exercice {c.exercice}
                    </Typography>
                    <Chip
                      label={st.label}
                      size="small"
                      sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {c.titre ?? `Campagne d'évaluation ${c.exercice}`}
                  </Typography>
                  {c.referentiel && (
                    <Chip
                      label={`${c.referentiel.code} v${c.referentiel.version}`}
                      size="small"
                      sx={{ fontSize: 10, bgcolor: '#EFF6FF', color: '#1D4ED8', mr: 1 }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {fmt(c.date_lancement)} → {fmt(c.date_cloture)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.statut === 'brouillon' && (
                    <>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => { setEditCampagne(c); setFormOpen(true); }}
                        sx={{ textTransform: 'none', color: NAVY }}
                      >
                        Modifier
                      </Button>
                      <Tooltip title={c.note_service_signee ? 'Note de service signée ✓' : 'Note de service à signer avant le lancement'}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={c.note_service_signee ? <VerifiedUser sx={{ color: '#059669' }} /> : <ArticleOutlined />}
                          onClick={() => setNoteDialog(c)}
                          sx={{
                            textTransform: 'none',
                            borderColor: c.note_service_signee ? '#059669' : ORANGE,
                            color: c.note_service_signee ? '#059669' : ORANGE,
                            borderRadius: 2,
                          }}
                        >
                          Note de service
                        </Button>
                      </Tooltip>
                      <Tooltip title={!c.note_service_signee ? 'Signez d\'abord la note de service' : ''}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrow />}
                            disabled={lancer.isPending || !c.note_service_signee}
                            onClick={() => lancer.mutate(c.id)}
                            sx={{ textTransform: 'none', bgcolor: '#059669', borderRadius: 2, '&:hover': { bgcolor: '#047857' } }}
                          >
                            {lancer.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Lancer'}
                          </Button>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Box>

              {/* Stats fiches */}
              {stats && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F1F5F9' }}>
                  <Grid container spacing={1}>
                    {[
                      { label: 'Total', value: stats.total, color: NAVY },
                      { label: 'À planifier', value: stats.a_planifier, color: '#94A3B8' },
                      { label: 'Planifiées', value: stats.planifiees, color: '#6366F1' },
                      { label: 'En cours', value: stats.en_cours, color: '#F59E0B' },
                      { label: 'Signées', value: stats.signees, color: '#10B981' },
                      { label: 'Trans. DAF', value: stats.transmises_daf, color: '#059669' },
                      { label: 'Notifiées', value: stats.notifiees, color: ORANGE },
                      { label: 'Archivées', value: stats.archivees, color: '#6B7280' },
                    ].map(s => (
                      <Grid item key={s.label}>
                        <Box sx={{ textAlign: 'center', px: 1 }}>
                          <Typography fontWeight={800} color={s.color} sx={{ fontSize: 18 }}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{s.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {orgDialog && (
        <OrganigrammeDialog
          open={!!orgDialog}
          campagneId={orgDialog.campagneId}
          onClose={() => setOrgDialog(null)}
          onFixed={() => lancer.mutate(orgDialog.campagneId)}
        />
      )}

      {noteDialog && (
        <NoteServiceDialog
          open={!!noteDialog}
          campagne={noteDialog}
          onClose={() => setNoteDialog(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['eval-campagnes'] })}
        />
      )}

      {formOpen && (
        <CampagneFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={invalidate}
          campagne={editCampagne}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={7000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ fontWeight: 700, fontSize: 14, borderRadius: 2, boxShadow: 4, maxWidth: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── DIALOG CRÉATION DE FICHES ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
type CreationMode = 'agent' | 'direction' | 'service';

function CreerFichesDialog({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<CreationMode>('agent');
  const [campagneId, setCampagneId] = useState<number | ''>('');
  const [categorieAgent, setCategorieAgent] = useState<string>('contractuel');
  const [evaluateurId, setEvaluateurId] = useState<number | ''>('');
  const [directionId, setDirectionId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [searchAgent, setSearchAgent] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'warning' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const { data: campagnes = [] } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagnesApi.list().then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['rh-departments'],
    queryFn: () => rhApi.departments().then(r => r.data),
    enabled: open,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['rh-services', directionId],
    queryFn: () => rhApi.organisationUnits(directionId !== '' ? { department_id: directionId } : undefined).then(r => r.data),
    enabled: open && mode !== 'agent',
  });
  const services = (servicesData as EvalOrganisationUnit[] | undefined) ?? [];

  // Employees selon le mode
  const employeeParams = useMemo(() => {
    if (mode === 'direction' && directionId !== '') return { department_id: directionId as number };
    if (mode === 'service' && serviceId !== '') return { organisation_unit_id: serviceId as number };
    if (mode === 'agent') return {};
    return null;
  }, [mode, directionId, serviceId]);

  const { data: employeesData, isLoading: loadingEmp } = useQuery({
    queryKey: ['rh-employees', employeeParams],
    queryFn: () => rhApi.employees(employeeParams ?? {}).then(r => r.data),
    enabled: open && employeeParams !== null,
  });

  const allEmployees: EvalEmployee[] = useMemo(() => {
    const raw = employeesData as { data: EvalEmployee[] } | EvalEmployee[] | undefined;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw as { data: EvalEmployee[] }).data ?? [];
  }, [employeesData]);

  // Filtrage recherche (mode agent)
  const filteredEmployees = useMemo(() => {
    if (!searchAgent.trim()) return allEmployees;
    const q = searchAgent.toLowerCase();
    return allEmployees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_number ?? '').toLowerCase().includes(q)
    );
  }, [allEmployees, searchAgent]);

  // Auto-sélection quand direction/service change
  const selectAll = () => setSelectedIds(allEmployees.map(e => e.id));
  const clearAll = () => setSelectedIds([]);
  const toggleAgent = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const mutation = useMutation({
    mutationFn: () =>
      evalFichesApi.creerLot({
        campagne_id: campagneId as number,
        employee_ids: selectedIds,
        evaluateur_id: evaluateurId !== '' ? evaluateurId as number : undefined,
        categorie_agent: categorieAgent,
      }),
    onSuccess: (r) => {
      const d = r.data;
      setSnackbar({
        open: true,
        message: d.message,
        severity: d.crees > 0 ? 'success' : 'warning',
      });
      // Réinitialiser la sélection pour permettre une nouvelle création
      setSelectedIds([]);
      onSuccess();
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message ?? err?.message ?? 'Erreur lors de la création des fiches.',
        severity: 'error',
      });
    },
  });

  const canSubmit = campagneId !== '' && selectedIds.length > 0 && !mutation.isPending;

  const handleModeChange = (m: CreationMode) => {
    setMode(m);
    setSelectedIds([]);
    setDirectionId('');
    setServiceId('');
    setSearchAgent('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* Header */}
      <Box sx={{ bgcolor: NAVY, px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>Créer des fiches d'évaluation</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Sélectionnez les agents à évaluer dans cette campagne
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }} size="small"><Close /></IconButton>
        </Box>
        {/* Mode selector */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          {([
            { key: 'agent', icon: <Person sx={{ fontSize: 16 }} />, label: 'Par agent(s)' },
            { key: 'direction', icon: <AccountBalance sx={{ fontSize: 16 }} />, label: 'Par direction' },
            { key: 'service', icon: <Groups sx={{ fontSize: 16 }} />, label: 'Par service' },
          ] as { key: CreationMode; icon: React.ReactNode; label: string }[]).map(m => (
            <Button
              key={m.key}
              size="small"
              startIcon={m.icon}
              onClick={() => handleModeChange(m.key)}
              variant={mode === m.key ? 'contained' : 'outlined'}
              sx={{
                textTransform: 'none', fontWeight: 700, fontSize: 12,
                borderRadius: 2,
                ...(mode === m.key
                  ? { bgcolor: ORANGE, color: '#fff', '&:hover': { bgcolor: '#e56920' }, borderColor: ORANGE }
                  : { color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.5)' } }
                ),
              }}
            >
              {m.label}
            </Button>
          ))}
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Colonne gauche — paramètres */}
          <Grid item xs={12} md={4} sx={{ borderRight: '1px solid #E2E8F0', p: 2.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1.5, letterSpacing: 0.5 }}>
              PARAMÈTRES
            </Typography>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth required>
                <InputLabel>Campagne *</InputLabel>
                <Select value={campagneId} label="Campagne *" onChange={e => setCampagneId(e.target.value as number | '')}>
                  {(campagnes as EvalCampagneAnn[]).filter(c => c.statut === 'lancee').map(c => (
                    <MenuItem key={c.id} value={c.id}>Exercice {c.exercice}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Catégorie d'agent</InputLabel>
                <Select value={categorieAgent} label="Catégorie d'agent" onChange={e => setCategorieAgent(e.target.value)}>
                  <MenuItem value="contractuel">Contractuel</MenuItem>
                  <MenuItem value="mis_a_disposition">Mis à disposition</MenuItem>
                  <MenuItem value="decisionnaire">Décisionnaire</MenuItem>
                </Select>
              </FormControl>

              {mode === 'direction' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Direction *</InputLabel>
                  <Select
                    value={directionId}
                    label="Direction *"
                    onChange={e => { setDirectionId(e.target.value as number | ''); setSelectedIds([]); }}
                  >
                    <MenuItem value="">— Choisir —</MenuItem>
                    {(departments as EvalDepartment[]).map(d => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                        {d.employees_count != null ? ` (${d.employees_count})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {mode === 'service' && (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Direction (filtrer)</InputLabel>
                    <Select
                      value={directionId}
                      label="Direction (filtrer)"
                      onChange={e => { setDirectionId(e.target.value as number | ''); setServiceId(''); setSelectedIds([]); }}
                    >
                      <MenuItem value="">Toutes</MenuItem>
                      {(departments as EvalDepartment[]).map(d => (
                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Service *</InputLabel>
                    <Select
                      value={serviceId}
                      label="Service *"
                      onChange={e => { setServiceId(e.target.value as number | ''); setSelectedIds([]); }}
                    >
                      <MenuItem value="">— Choisir —</MenuItem>
                      {services.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.libelle}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}

              <Divider />
              {selectedIds.length > 0 && (
                <Box sx={{ p: 1.5, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #BBF7D0' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>
                    {selectedIds.length} agent(s) sélectionné(s)
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#059669' }}>
                    {campagneId ? `Campagne sélectionnée` : 'Choisissez une campagne'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Colonne droite — liste agents */}
          <Grid item xs={12} md={8} sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                AGENTS DISPONIBLES
                {allEmployees.length > 0 && ` — ${allEmployees.length} trouvé(s)`}
              </Typography>
              {allEmployees.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" sx={{ fontSize: 11, textTransform: 'none', color: NAVY }} onClick={selectAll}>
                    Tout sélectionner
                  </Button>
                  <Button size="small" sx={{ fontSize: 11, textTransform: 'none', color: '#94A3B8' }} onClick={clearAll}>
                    Effacer
                  </Button>
                </Box>
              )}
            </Box>

            {/* Barre de recherche (mode agent) */}
            {mode === 'agent' && (
              <TextField
                placeholder="Rechercher un agent (nom, matricule)…"
                value={searchAgent}
                onChange={e => setSearchAgent(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: <Person sx={{ color: '#94A3B8', mr: 1, fontSize: 18 }} />,
                }}
              />
            )}

            {loadingEmp && <LinearProgress sx={{ mb: 1 }} />}

            {/* Indicateurs de sélection rapide (direction/service) */}
            {(mode === 'direction' || mode === 'service') && allEmployees.length > 0 && (
              <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: 12 }}>
                {allEmployees.length} agent(s) dans ce périmètre — cliquez « Tout sélectionner » ou choisissez individuellement.
              </Alert>
            )}

            {/* Liste des agents */}
            <Box sx={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 2 }}>
              {filteredEmployees.length === 0 && !loadingEmp && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Person sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">
                    {mode === 'agent'
                      ? 'Commencez à taper pour chercher un agent.'
                      : 'Sélectionnez une direction ou un service pour voir les agents.'}
                  </Typography>
                </Box>
              )}
              {filteredEmployees.map(emp => {
                const selected = selectedIds.includes(emp.id);
                return (
                  <Box
                    key={emp.id}
                    onClick={() => toggleAgent(emp.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: 2, py: 1.2, cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9',
                      bgcolor: selected ? '#EFF6FF' : 'transparent',
                      '&:hover': { bgcolor: selected ? '#DBEAFE' : '#F8FAFC' },
                      transition: 'background 0.1s',
                    }}
                  >
                    <Box sx={{
                      width: 18, height: 18, borderRadius: 0.5, flexShrink: 0,
                      border: `2px solid ${selected ? NAVY : '#CBD5E1'}`,
                      bgcolor: selected ? NAVY : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <CheckCircle sx={{ color: '#fff', fontSize: 14 }} />}
                    </Box>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: NAVY + '15', color: NAVY, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                        {emp.first_name} {emp.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {emp.employee_number ? `MAT: ${emp.employee_number} · ` : ''}
                        {emp.department?.name ?? ''}
                        {emp.organisation_unit ? ` / ${emp.organisation_unit.libelle}` : ''}
                      </Typography>
                    </Box>
                    {emp.position?.title && (
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', flexShrink: 0, maxWidth: 100, textAlign: 'right' }}>
                        {emp.position.title}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {mutation.isSuccess && (
              <Alert severity="success" sx={{ mt: 2, fontSize: 13, fontWeight: 600, borderRadius: 2 }}>
                ✓ {mutation.data?.data?.message}
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Fermer</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {selectedIds.length} agent(s) · {campagneId !== '' ? `Campagne sélectionnée` : 'Aucune campagne'}
        </Typography>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          {mutation.isPending
            ? <CircularProgress size={16} sx={{ color: '#fff' }} />
            : `Créer ${selectedIds.length > 0 ? selectedIds.length : ''} fiche(s)`
          }
        </Button>
      </DialogActions>

      {/* Snackbar flottant — visible même si le dialog est ouvert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ fontWeight: 700, fontSize: 14, borderRadius: 2, boxShadow: 4 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ONGLET FICHES ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function FichesTab() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [campagneFilter, setCampagneFilter] = useState<number | ''>('');
  const [statutFilter, setStatutFilter] = useState<EvalStatutFicheAnn | ''>('');
  const [spFilter, setSpFilter] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [selectedFiche, setSelectedFiche] = useState<EvalFicheAnn | null>(null);
  const [creerOpen, setCreerOpen] = useState(false);

  const { data: campagnes = [] } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagnesApi.list().then(r => r.data),
  });

  const { data: allFiches = [], isLoading, refetch } = useQuery({
    queryKey: ['eval-fiches', campagneFilter, statutFilter, directionFilter, serviceFilter],
    queryFn: () =>
      evalFichesApi.list({
        campagne_id: campagneFilter !== '' ? campagneFilter : undefined,
        statut: statutFilter !== '' ? statutFilter : undefined,
        direction: directionFilter || undefined,
        service: serviceFilter || undefined,
      }).then(r => r.data),
  });

  // Valeurs uniques pour les filtres direction/service (extraites des fiches chargées sans filtre)
  const { data: allFichesRaw = [] } = useQuery({
    queryKey: ['eval-fiches-all-dirs'],
    queryFn: () => evalFichesApi.list({}).then(r => r.data),
  });

  const uniqueDirections = useMemo(() => {
    const set = new Set<string>();
    (allFichesRaw as EvalFicheAnn[]).forEach(f => { if (f.snapshot_direction) set.add(f.snapshot_direction); });
    return [...set].sort();
  }, [allFichesRaw]);

  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    (allFichesRaw as EvalFicheAnn[]).forEach(f => {
      if (f.snapshot_service && (!directionFilter || f.snapshot_direction === directionFilter)) {
        set.add(f.snapshot_service);
      }
    });
    return [...set].sort();
  }, [allFichesRaw, directionFilter]);

  // Filtrage côté client par SP
  const fiches = useMemo(() => {
    if (!spFilter) return allFiches as EvalFicheAnn[];
    return (allFiches as EvalFicheAnn[]).filter(f => {
      const step = STATUT_TO_STEP[f.statut];
      return EVAL_WORKFLOW_STEPS[step]?.sp === spFilter;
    });
  }, [allFiches, spFilter]);

  const paginated = fiches.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const spCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (allFiches as EvalFicheAnn[]).forEach(f => {
      const sp = EVAL_WORKFLOW_STEPS[STATUT_TO_STEP[f.statut]]?.sp ?? '?';
      counts[sp] = (counts[sp] ?? 0) + 1;
    });
    return counts;
  }, [allFiches]);

  const resetFilters = () => {
    setCampagneFilter(''); setStatutFilter(''); setSpFilter('');
    setDirectionFilter(''); setServiceFilter(''); setPage(0);
  };

  const hasActiveFilter = campagneFilter !== '' || statutFilter !== '' || spFilter !== '' || directionFilter !== '' || serviceFilter !== '';

  return (
    <Box>
      {/* En-tête avec bouton créer */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {fiches.length} fiche(s)
            {hasActiveFilter && <span style={{ color: ORANGE }}> — filtres actifs</span>}
          </Typography>
          {hasActiveFilter && (
            <Button size="small" onClick={resetFilters} sx={{ fontSize: 11, textTransform: 'none', color: '#94A3B8', p: 0.3 }}>
              Effacer les filtres
            </Button>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<Assignment />}
          onClick={() => setCreerOpen(true)}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, fontWeight: 700 }}
        >
          Créer des fiches
        </Button>
      </Box>

      {/* Filtres rapides par SP */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label={`Toutes (${(allFiches as EvalFicheAnn[]).length})`}
          onClick={() => { setSpFilter(''); setPage(0); }}
          variant={spFilter === '' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, cursor: 'pointer', ...(spFilter === '' ? { bgcolor: NAVY, color: '#fff' } : {}) }}
        />
        {EVAL_WORKFLOW_STEPS.map(step => {
          const count = spCounts[step.sp] ?? 0;
          if (count === 0) return null;
          const active = spFilter === step.sp;
          return (
            <Chip
              key={step.sp}
              label={`${step.sp} · ${step.label} (${count})`}
              onClick={() => { setSpFilter(active ? '' : step.sp); setPage(0); }}
              variant={active ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600, cursor: 'pointer', fontSize: 11,
                ...(active ? { bgcolor: ORANGE, color: '#fff', borderColor: ORANGE } : {}),
              }}
            />
          );
        })}
      </Box>

      {/* Filtres avancés */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Campagne */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Campagne</InputLabel>
            <Select value={campagneFilter} label="Campagne" onChange={e => { setCampagneFilter(e.target.value as number | ''); setPage(0); }}>
              <MenuItem value="">Toutes</MenuItem>
              {(campagnes as EvalCampagneAnn[]).map(c => (
                <MenuItem key={c.id} value={c.id}>Exercice {c.exercice}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Direction */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Direction</InputLabel>
            <Select
              value={directionFilter}
              label="Direction"
              onChange={e => { setDirectionFilter(e.target.value); setServiceFilter(''); setPage(0); }}
            >
              <MenuItem value="">Toutes</MenuItem>
              {uniqueDirections.map(d => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Service */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Service</InputLabel>
            <Select
              value={serviceFilter}
              label="Service"
              onChange={e => { setServiceFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">Tous</MenuItem>
              {uniqueServices.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Statut précis */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Statut précis</InputLabel>
            <Select value={statutFilter} label="Statut précis" onChange={e => { setStatutFilter(e.target.value as EvalStatutFicheAnn | ''); setPage(0); }}>
              <MenuItem value="">Tous</MenuItem>
              {(Object.keys(STATUT_LABELS) as EvalStatutFicheAnn[]).map(s => (
                <MenuItem key={s} value={s}>{STATUT_LABELS[s]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <IconButton onClick={() => refetch()} size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      {isLoading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Direction / Service</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, minWidth: 140 }}>Progression</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Note</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Entretien</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(f => (
              <TableRow
                key={f.id}
                hover
                onClick={() => setSelectedFiche(f)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: NAVY + '22', color: NAVY, fontSize: 11, fontWeight: 800 }}>
                      {f.snapshot_nom_complet.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                        {f.snapshot_nom_complet}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {f.snapshot_matricule ?? '—'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: NAVY }}>{f.snapshot_direction ?? '—'}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {f.snapshot_service ? `${f.snapshot_service}` : (f.snapshot_fonction ?? '')}
                  </Typography>
                </TableCell>
                <TableCell><StatutChip statut={f.statut} /></TableCell>
                <TableCell><MiniStepper statut={f.statut} /></TableCell>
                <TableCell align="center">
                  {f.moyenne != null ? (
                    <Typography fontWeight={800} sx={{ color: f.moyenne >= 4 ? '#059669' : f.moyenne >= 3 ? '#F59E0B' : '#DC2626', fontSize: 13 }}>
                      {fmtNum(f.moyenne)}
                    </Typography>
                  ) : <Typography color="text.disabled" fontSize={12}>—</Typography>}
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 11 }}>{fmt(f.date_entretien)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir le détail">
                    <IconButton size="small" sx={{ color: NAVY }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Aucune fiche trouvée.
                  {hasActiveFilter && (
                    <Button sx={{ ml: 1, fontSize: 12, textTransform: 'none' }} onClick={resetFilters}>
                      Effacer les filtres
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={fiches.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 15, 25, 50]}
        labelRowsPerPage="Lignes :"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
      />

      {selectedFiche && (
        <FicheDetailDialog
          fiche={selectedFiche}
          open={!!selectedFiche}
          onClose={() => setSelectedFiche(null)}
          onRefresh={() => refetch()}
        />
      )}

      {creerOpen && (
        <CreerFichesDialog
          open={creerOpen}
          onClose={() => setCreerOpen(false)}
          onSuccess={() => { refetch(); }}
        />
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ONGLET SYNTHÈSE & DIRECTION ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function SyntheseTab() {
  const qc = useQueryClient();
  const [campagneFilter, setCampagneFilter] = useState<number | ''>('');
  const [genererOpen, setGenererOpen] = useState(false);
  const [genCampagneId, setGenCampagneId] = useState<number | ''>('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSyntheseId, setNotifSyntheseId] = useState<number | null>(null);

  const { data: campagnes = [] } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagnesApi.list().then(r => r.data),
  });

  const { data: synthesesData, isLoading, refetch } = useQuery({
    queryKey: ['eval-syntheses', campagneFilter],
    queryFn: () =>
      evalSynthesesApi.list(campagneFilter !== '' ? { campagne_id: campagneFilter } : undefined).then(r => r.data),
  });

  const syntheses: EvalSyntheseAnn[] = (synthesesData as { syntheses: EvalSyntheseAnn[] } | undefined)?.syntheses ?? [];

  const generer = useMutation({
    mutationFn: () => evalSynthesesApi.generer({ campagne_id: genCampagneId as number }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-syntheses'] }); setGenererOpen(false); },
  });

  const transmettre = useMutation({
    mutationFn: (id: number) => evalSynthesesApi.transmettreAuDg(id),
    onSuccess: () => refetch(),
  });

  const valider = useMutation({
    mutationFn: (id: number) => evalDecisionsDgApi.valider(id),
    onSuccess: () => refetch(),
  });

  const archiverLot = useMutation({
    mutationFn: (id: number) => evalNotifDafApi.archiverLot(id),
    onSuccess: () => { refetch(); },
  });

  const STATUT_SYN: Record<string, { label: string; color: string; bg: string }> = {
    brouillon: { label: 'Brouillon', color: '#64748B', bg: '#F1F5F9' },
    transmis:  { label: 'Transmis DG', color: '#7C3AED', bg: '#EDE9FE' },
    valide_dg: { label: 'Validé DG', color: '#059669', bg: '#D1FAE5' },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Campagne</InputLabel>
          <Select value={campagneFilter} label="Campagne" onChange={e => setCampagneFilter(e.target.value as number | '')}>
            <MenuItem value="">Toutes</MenuItem>
            {(campagnes as EvalCampagneAnn[]).map(c => (
              <MenuItem key={c.id} value={c.id}>Exercice {c.exercice}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<ArticleOutlined />}
          onClick={() => setGenererOpen(true)}
          sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2, fontWeight: 700 }}
        >
          Générer une synthèse
        </Button>
        <IconButton onClick={() => refetch()} size="small" sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 1 }} />}

      {syntheses.length === 0 && !isLoading && (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '2px dashed #E2E8F0' }}>
          <ArticleOutlined sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
          <Typography color="text.secondary">Aucune synthèse. Lancez d'abord une campagne et générez le tableau.</Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {syntheses.map(s => {
          const st = STATUT_SYN[s.statut] ?? STATUT_SYN.brouillon;
          return (
            <Paper key={s.id} elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography fontWeight={800} color={NAVY}>
                      Synthèse — Exercice {s.campagne?.exercice ?? s.campagne_id}
                    </Typography>
                    <Chip label={`v${s.version}`} size="small" sx={{ fontSize: 10, bgcolor: '#EFF6FF', color: NAVY }} />
                    <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Générée le {fmt(s.created_at)}
                    {s.transmis_dg_at ? ` · Transmise DG le ${fmt(s.transmis_dg_at)}` : ''}
                    {s.valide_dg_at ? ` · Validée DG le ${fmt(s.valide_dg_at)}` : ''}
                  </Typography>
                  {s.annotation_dg && (
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: '#7C3AED' }}>
                      « {s.annotation_dg} »
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* Export PDF */}
                  <Tooltip title="Exporter en PDF">
                    <IconButton
                      size="small"
                      href={`/api/eval/syntheses/${s.id}/export-pdf`}
                      target="_blank"
                      sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Transmettre au DG */}
                  {s.statut === 'brouillon' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Send />}
                      disabled={transmettre.isPending}
                      onClick={() => transmettre.mutate(s.id)}
                      sx={{ textTransform: 'none', borderColor: '#7C3AED', color: '#7C3AED', borderRadius: 2 }}
                    >
                      Transmettre au DG
                    </Button>
                  )}

                  {/* Valider (DG) */}
                  {s.statut === 'transmis' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<HowToVote />}
                      disabled={valider.isPending}
                      onClick={() => valider.mutate(s.id)}
                      sx={{ textTransform: 'none', bgcolor: '#7C3AED', borderRadius: 2, '&:hover': { bgcolor: '#6D28D9' } }}
                    >
                      Valider (DG)
                    </Button>
                  )}

                  {/* Notifications SP6 */}
                  {s.statut === 'valide_dg' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Notifications />}
                        onClick={() => { setNotifSyntheseId(s.id); setNotifOpen(true); }}
                        sx={{ textTransform: 'none', bgcolor: ORANGE, borderRadius: 2, '&:hover': { bgcolor: '#e56920' } }}
                      >
                        Courriers SP6
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Archive />}
                        disabled={archiverLot.isPending}
                        onClick={() => archiverLot.mutate(s.id)}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Archiver tout
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Dialog Générer synthèse */}
      <Dialog open={genererOpen} onClose={() => setGenererOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Générer le tableau de synthèse</DialogTitle>
        <DialogContent>
          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Campagne *</InputLabel>
            <Select value={genCampagneId} label="Campagne *" onChange={e => setGenCampagneId(e.target.value as number | '')}>
              {(campagnes as EvalCampagneAnn[]).filter(c => c.statut === 'lancee').map(c => (
                <MenuItem key={c.id} value={c.id}>Exercice {c.exercice} — {c.titre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {generer.isError && <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>{(generer.error as Error)?.message}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGenererOpen(false)} sx={{ textTransform: 'none' }}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!genCampagneId || generer.isPending}
            onClick={() => generer.mutate()}
            sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
          >
            {generer.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Générer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Notifications SP6 */}
      {notifOpen && notifSyntheseId && (
        <NotifSp6Dialog
          syntheseId={notifSyntheseId}
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          onRefresh={refetch}
        />
      )}
    </Box>
  );
}

// ── Dialog Notifications SP6 ───────────────────────────────────────────────
function NotifSp6Dialog({
  syntheseId, open, onClose, onRefresh,
}: {
  syntheseId: number;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [modeleId, setModeleId] = useState<number | ''>('');
  const [mode, setMode] = useState<EvalModeEnvoi>('portail');

  const { data: modelesData } = useQuery({
    queryKey: ['eval-modeles-notif'],
    queryFn: () => evalNotifDafApi.modeles().then(r => r.data),
    enabled: open,
  });
  const modeles: EvalModeleNotification[] = (modelesData as { modeles: EvalModeleNotification[] } | undefined)?.modeles ?? [];

  const { data: courriersData, refetch: refetchCourriers } = useQuery({
    queryKey: ['eval-courriers', syntheseId],
    queryFn: () => evalNotifDafApi.courriers(syntheseId).then(r => r.data),
    enabled: open,
  });
  const courriers = (courriersData as { courriers: { id: number; signe_at?: string; envoye_at?: string; accuse_at?: string; fiche?: EvalFicheAnn }[] } | undefined)?.courriers ?? [];

  const generer = useMutation({
    mutationFn: () => evalNotifDafApi.generer(syntheseId, { modele_id: modeleId as number }),
    onSuccess: () => { refetchCourriers(); onRefresh(); },
  });

  const signer = useMutation({
    mutationFn: (id: number) => evalNotifDafApi.signer(id),
    onSuccess: () => refetchCourriers(),
  });

  const envoyer = useMutation({
    mutationFn: (id: number) => evalNotifDafApi.envoyer(id, { mode }),
    onSuccess: () => refetchCourriers(),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, color: NAVY, pb: 1 }}>
        Courriers de notification — SP6
      </DialogTitle>
      <DialogContent>
        {/* Génération */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            GÉNÉRER LES COURRIERS
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Modèle de lettre</InputLabel>
              <Select value={modeleId} label="Modèle de lettre" onChange={e => setModeleId(e.target.value as number | '')}>
                {modeles.map(m => <MenuItem key={m.id} value={m.id}>{m.nom}</MenuItem>)}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={!modeleId || generer.isPending}
              onClick={() => generer.mutate()}
              sx={{ textTransform: 'none', bgcolor: NAVY, borderRadius: 2 }}
            >
              {generer.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Générer les courriers'}
            </Button>
          </Box>
        </Paper>

        {/* Mode d'envoi */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {(['portail', 'email', 'main_propre'] as EvalModeEnvoi[]).map(m => (
            <Chip
              key={m}
              label={m === 'portail' ? 'Portail' : m === 'email' ? 'Email' : 'Main propre'}
              onClick={() => setMode(m)}
              sx={{
                cursor: 'pointer', fontWeight: 600,
                ...(mode === m ? { bgcolor: NAVY, color: '#fff' } : {}),
              }}
            />
          ))}
        </Box>

        {/* Liste courriers */}
        {courriers.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Agent</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Signé</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Envoyé</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Accusé</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courriers.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                      {c.fiche?.snapshot_nom_complet ?? `Fiche #${c.fiche}`}
                    </TableCell>
                    <TableCell align="center">
                      {c.signe_at
                        ? <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                        : <Typography color="text.disabled" fontSize={12}>—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      {c.envoye_at
                        ? <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                        : <Typography color="text.disabled" fontSize={12}>—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      {c.accuse_at
                        ? <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                        : <Typography color="text.disabled" fontSize={12}>—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {!c.signe_at && (
                          <Tooltip title="Signer">
                            <IconButton size="small" onClick={() => signer.mutate(c.id)} sx={{ color: NAVY }}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.signe_at && !c.envoye_at && (
                          <Tooltip title={`Envoyer (${mode})`}>
                            <IconButton size="small" onClick={() => envoyer.mutate(c.id)} sx={{ color: ORANGE }}>
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="PDF">
                          <IconButton size="small" href={evalNotifDafApi.pdfUrl(c.id)} target="_blank" sx={{ color: '#6B7280' }}>
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
            Aucun courrier généré. Cliquez sur « Générer les courriers » ci-dessus.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── PAGE PRINCIPALE ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function EvaluationsPage() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: 'Tableau de bord', icon: <BarChart sx={{ fontSize: 18 }} /> },
    { label: 'Campagnes',       icon: <CalendarToday sx={{ fontSize: 18 }} /> },
    { label: 'Fiches',          icon: <Assignment sx={{ fontSize: 18 }} /> },
    { label: 'Synthèse & DG',   icon: <AccountBalance sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color={NAVY}>
          Évaluation Annuelle du Personnel
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Gestion du cycle d'évaluation SP1→SP6 · Référentiel ANASER
        </Typography>
      </Box>

      {/* Stepper d'information (référence workflow) */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: NAVY, border: '1px solid ' + NAVY }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1.5, letterSpacing: 1, fontWeight: 700 }}>
          CYCLE D'ÉVALUATION — 7 GRANDES ÉTAPES
        </Typography>
        <Box sx={{ display: 'flex', gap: 0, overflowX: 'auto', pb: 0.5 }}>
          {EVAL_WORKFLOW_STEPS.map((step, i) => (
            <Box
              key={step.sp}
              sx={{
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
            >
              <Box sx={{
                textAlign: 'center', px: 1.5, py: 0.8,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Typography sx={{ color: ORANGE, fontWeight: 900, fontSize: 11 }}>{step.sp}</Typography>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{step.label}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{step.sublabel}</Typography>
              </Box>
              {i < EVAL_WORKFLOW_STEPS.length - 1 && (
                <Box sx={{ px: 0.5, color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: 100 }}>›</Box>
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Navigation tabs */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid #E2E8F0',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 52 },
            '& .Mui-selected': { color: NAVY, fontWeight: 800 },
            '& .MuiTabs-indicator': { bgcolor: ORANGE, height: 3 },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 0 && <DashboardTab />}
          {tab === 1 && <CampagnesTab />}
          {tab === 2 && <FichesTab />}
          {tab === 3 && <SyntheseTab />}
        </Box>
      </Paper>
    </Box>
  );
}
