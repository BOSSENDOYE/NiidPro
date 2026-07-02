import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip, Button,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, LinearProgress,
  Stepper, Step, StepLabel,
  Alert, Divider, Paper, Stack, Tooltip,
} from '@mui/material';
import {
  Add, ArrowBack, CheckCircle, AccessTime, Person,
  Grade, Assignment, HowToVote, Archive, Send, Edit, Print,
} from '@mui/icons-material';
import { evaluationApi } from '../../api/evaluations';
import { useCompany } from '../../hooks/useCompany';
import type {
  EvaluationCritere, EvaluationPeriodeEssai, GroupeCritere,
  AppreciationEvaluation, DecisionEvaluation, StatutEvaluation,
} from '../../types';

// ── Constantes & helpers ─────────────────────────────────────────────────────

const STATUT_STEPS: StatutEvaluation[] = [
  'brouillon', 'auto_evaluation', 'entretien', 'signe', 'valide_rrh', 'decision_dg', 'archive',
];

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  auto_evaluation: 'Auto-évaluation',
  entretien: 'Entretien',
  signe: 'Signé',
  valide_rrh: 'Validé RRH',
  decision_dg: 'Décision DG',
  archive: 'Archivé',
};

const STATUT_COLORS: Record<string, 'default' | 'info' | 'primary' | 'warning' | 'success' | 'error'> = {
  brouillon: 'default',
  auto_evaluation: 'info',
  entretien: 'primary',
  signe: 'warning',
  valide_rrh: 'warning',
  decision_dg: 'success',
  archive: 'default',
};

const APPRECIATION_COLORS: Record<AppreciationEvaluation, 'error' | 'warning' | 'primary' | 'success'> = {
  insuffisant: 'error',
  passable: 'warning',
  satisfaisant: 'primary',
  excellent: 'success',
};

const APPRECIATION_LABELS: Record<AppreciationEvaluation, string> = {
  insuffisant: 'Insuffisant',
  passable: 'Passable',
  satisfaisant: 'Satisfaisant',
  excellent: 'Excellent',
};

const DECISION_COLORS: Record<DecisionEvaluation, 'success' | 'warning' | 'error'> = {
  confirmation: 'success',
  renouvellement: 'warning',
  non_confirmation: 'error',
};

const DECISION_LABELS: Record<DecisionEvaluation, string> = {
  confirmation: 'Confirmation',
  renouvellement: 'Renouvellement',
  non_confirmation: 'Non-confirmation',
};

const GROUPE_LABELS: Record<GroupeCritere, string> = {
  competences_techniques:  'A — Compétences Techniques et Professionnelles (40%)',
  comportement_relations:  'B — Comportement et Relations Professionnelles (30%)',
  aptitudes_personnelles:  'C — Aptitudes Personnelles (30%)',
};

const GROUPE_POIDS_GLOBAL: Record<GroupeCritere, number> = {
  competences_techniques: 0.40,
  comportement_relations: 0.30,
  aptitudes_personnelles: 0.30,
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function calcAppréciation(note: number): AppreciationEvaluation {
  if (note < 1.5) return 'insuffisant';
  if (note < 2.5) return 'passable';
  if (note < 3.25) return 'satisfaisant';
  return 'excellent';
}

function calcDecision(note: number): DecisionEvaluation {
  if (note < 2.0) return 'non_confirmation';
  if (note < 2.5) return 'renouvellement';
  return 'confirmation';
}

// ── Composants réutilisables ──────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card sx={{ borderTop: `4px solid ${color}`, height: '100%' }}>
      <CardContent sx={{ textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={700} color={color}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

function AppreciationChip({ appreciation }: { appreciation: AppreciationEvaluation | null }) {
  if (!appreciation) return <Chip label="—" size="small" />;
  return (
    <Chip
      label={APPRECIATION_LABELS[appreciation]}
      color={APPRECIATION_COLORS[appreciation]}
      size="small"
    />
  );
}

function DecisionChip({ decision }: { decision: DecisionEvaluation | null }) {
  if (!decision) return null;
  return (
    <Chip
      label={DECISION_LABELS[decision]}
      color={DECISION_COLORS[decision]}
      size="small"
      variant="outlined"
    />
  );
}

function StatutBadge({ statut }: { statut: StatutEvaluation }) {
  return (
    <Chip label={STATUT_LABELS[statut]} color={STATUT_COLORS[statut]} size="small" />
  );
}

function NoteBar({ note }: { note: number | null }) {
  if (!note) return <Typography variant="body2" color="text.disabled">—/4</Typography>;
  const pct = (note / 4) * 100;
  const color = note < 2 ? 'error' : note < 2.5 ? 'warning' : note < 3.25 ? 'primary' : 'success';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 32 }}>{note}/4</Typography>
    </Box>
  );
}

// ── Onglet 1 : Tableau de bord ────────────────────────────────────────────────

function DashboardTab() {
  const { data } = useQuery({
    queryKey: ['evaluations-dashboard'],
    queryFn: () => evaluationApi.dashboard().then(r => r.data),
  });

  if (!data) return <LinearProgress />;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Total dossiers" value={data.total} color="#6366F1" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="En cours" value={data.en_cours} color="#0EA5E9" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Confirmés" value={data.confirmes} color="#10B981" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Renouvelés" value={data.renouveles} color="#F59E0B" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Non confirmés" value={data.non_confirmes} color="#EF4444" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="En attente" value={data.en_attente} color="#8B5CF6" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Prochains entretiens */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime fontSize="small" color="primary" />
                Prochains entretiens (30j)
              </Typography>
              {data.prochains_entretiens.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Aucun entretien prévu dans les 30 prochains jours.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date entretien</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.prochains_entretiens.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {ev.employee?.first_name} {ev.employee?.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell><Chip label={ev.type.replace('_', ' ')} size="small" /></TableCell>
                        <TableCell><Typography variant="body2">{fmtDate(ev.date_entretien)}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Périodes échéant bientôt */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment fontSize="small" color="warning" />
                Périodes d'essai arrivant à échéance
              </Typography>
              {data.a_echoir.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Aucune période d'essai n'expire dans les 14 prochains jours.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Agent</TableCell>
                      <TableCell>Cat.</TableCell>
                      <TableCell>Fin période</TableCell>
                      <TableCell>Statut</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.a_echoir.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {ev.employee?.first_name} {ev.employee?.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell><Chip label={ev.categorie} size="small" /></TableCell>
                        <TableCell><Typography variant="body2" color="error">{fmtDate(ev.date_fin_periode)}</Typography></TableCell>
                        <TableCell><StatutBadge statut={ev.statut} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Répartition appréciations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Grade fontSize="small" color="secondary" />
                Répartition des appréciations
              </Typography>
              {data.repartition.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Aucune note saisie.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {data.repartition.map(r => (
                    <Box key={r.appreciation} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <AppreciationChip appreciation={r.appreciation as AppreciationEvaluation} />
                      <Box flex={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (r.count / data.total) * 100)}
                          color={APPRECIATION_COLORS[r.appreciation as AppreciationEvaluation]}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 20 }}>{r.count}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Dossiers récents */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person fontSize="small" />
                Dossiers récents
              </Typography>
              <Table size="small">
                <TableBody>
                  {data.recents.map(ev => (
                    <TableRow key={ev.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {ev.employee?.first_name} {ev.employee?.last_name}
                        </Typography>
                      </TableCell>
                      <TableCell><Chip label={ev.type.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                      <TableCell><StatutBadge statut={ev.statut} /></TableCell>
                      <TableCell>
                        {ev.note_globale ? <AppreciationChip appreciation={ev.appreciation} /> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Détail évaluation ─────────────────────────────────────────────────────────

type LocalNote = { critere_id: number; note: number; commentaire_hierarchique: string };

const NAVY = '#1e3a5f';

const SECTIONS_DEF: { groupe: GroupeCritere; lettre: string; titre: string; poids: number }[] = [
  { groupe: 'competences_techniques', lettre: 'A', titre: 'COMPÉTENCES TECHNIQUES ET PROFESSIONNELLES', poids: 0.40 },
  { groupe: 'comportement_relations', lettre: 'B', titre: 'COMPORTEMENT ET RELATIONS PROFESSIONNELLES',  poids: 0.30 },
  { groupe: 'aptitudes_personnelles', lettre: 'C', titre: 'APTITUDES PERSONNELLES',                      poids: 0.30 },
];

function NoteSelect({
  value, onChange, disabled,
}: { value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  const NOTE_META: Record<number, { label: string; color: string }> = {
    1: { label: '1 — Insuffisant',  color: '#DC2626' },
    2: { label: '2 — Passable',     color: '#D97706' },
    3: { label: '3 — Satisfaisant', color: '#2563EB' },
    4: { label: '4 — Excellent',    color: '#059669' },
  };
  const meta = value ? NOTE_META[value] : null;
  return (
    <Select
      size="small"
      value={value ?? ''}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      displayEmpty
      sx={{
        minWidth: 46, fontSize: 13, fontWeight: 700,
        color: meta?.color ?? '#94A3B8',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: meta ? meta.color : '#E2E8F0',
          borderWidth: value ? 2 : 1,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: meta?.color ?? '#94A3B8' },
        '& .MuiSelect-select': { py: 0.6, px: 1 },
      }}
    >
      <MenuItem value="" disabled sx={{ fontSize: 12, color: '#94A3B8' }}>—</MenuItem>
      {[1, 2, 3, 4].map(n => (
        <MenuItem key={n} value={n} sx={{ fontSize: 12, fontWeight: 700, color: NOTE_META[n].color }}>
          {NOTE_META[n].label}
        </MenuItem>
      ))}
    </Select>
  );
}

function EvaluationDetail({
  evaluation: initEval,
  criteres,
  onBack,
}: {
  evaluation: EvaluationPeriodeEssai;
  criteres: EvaluationCritere[];
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [ficheOpen, setFicheOpen] = useState(false);

  const { data: ev, isLoading } = useQuery({
    queryKey: ['evaluation-detail', initEval.id],
    queryFn: () => evaluationApi.show(initEval.id).then(r => r.data),
    initialData: initEval,
  });

  const [localNotes, setLocalNotes] = useState<Record<number, LocalNote>>(() => {
    const init: Record<number, LocalNote> = {};
    (initEval.notations ?? []).forEach(n => {
      init[n.critere_id] = { critere_id: n.critere_id, note: n.note ?? 1, commentaire_hierarchique: n.commentaire_hierarchique ?? '' };
    });
    return init;
  });
  const [commentaireGeneral, setCommentaireGeneral] = useState(initEval.commentaire_general ?? '');
  const [planAmelioration, setPlanAmelioration]     = useState(initEval.plan_amelioration ?? '');
  const [dgDialog, setDgDialog]   = useState(false);
  const [dgDecision, setDgDecision] = useState('confirmation');
  const [dgRemarques, setDgRemarques] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['evaluations'] });
    qc.invalidateQueries({ queryKey: ['eval-essai'] });
    qc.invalidateQueries({ queryKey: ['evaluation-detail', initEval.id] });
    qc.invalidateQueries({ queryKey: ['evaluations-dashboard'] });
    qc.invalidateQueries({ queryKey: ['eval-essai-dashboard'] });
  };

  const mutSaveNotes  = useMutation({ mutationFn: () => evaluationApi.saveNotes(initEval.id, { notations: Object.values(localNotes), commentaire_general: commentaireGeneral, plan_amelioration: planAmelioration }), onSuccess: invalidate });
  const mutAvancer    = useMutation({ mutationFn: () => evaluationApi.avancer(initEval.id),    onSuccess: invalidate });
  const mutValiderRrh = useMutation({ mutationFn: () => evaluationApi.validerRrh(initEval.id), onSuccess: invalidate });
  const mutDecisionDg = useMutation({ mutationFn: () => evaluationApi.decisionDg(initEval.id, { decision_finale: dgDecision, remarques_dg: dgRemarques }), onSuccess: () => { setDgDialog(false); invalidate(); } });

  if (isLoading || !ev) return <LinearProgress />;

  const setNote = (critereId: number, note: number) =>
    setLocalNotes(prev => ({ ...prev, [critereId]: { critere_id: critereId, note, commentaire_hierarchique: prev[critereId]?.commentaire_hierarchique ?? '' } }));
  const setComment = (critereId: number, txt: string) =>
    setLocalNotes(prev => ({ ...prev, [critereId]: { ...prev[critereId], critere_id: critereId, note: prev[critereId]?.note ?? 1, commentaire_hierarchique: txt } }));

  const liveTotal    = criteres.reduce((sum, c) => sum + (localNotes[c.id]?.note ?? 0) * c.poids, 0);
  const hasAllNotes  = criteres.every(c => localNotes[c.id]?.note);
  const liveApprec   = calcAppréciation(liveTotal);
  const liveDecision = calcDecision(liveTotal);
  const stepIndex    = STATUT_STEPS.indexOf(ev.statut);
  const isEditable   = ['brouillon', 'entretien'].includes(ev.statut);

  const avancerLabel: Record<string, string> = {
    brouillon:       'Envoyer la fiche à l\'agent',
    auto_evaluation: "Lancer l'entretien",
    entretien:       'Signer (hiérarchique)',
    decision_dg:     'Archiver le dossier',
  };

  // shared cell styles
  const th = { bgcolor: NAVY, color: '#fff', fontWeight: 700, fontSize: 11, border: `1px solid #2d5080`, px: 1.25, py: 0.9, textAlign: 'center' as const };
  const td = { border: '1px solid #d1d9e6', px: 1.25, py: 0.9, fontSize: 12 };

  const APPRECIATION_COLOR_HEX: Record<string, string> = {
    insuffisant: '#DC2626', passable: '#D97706', satisfaisant: '#2563EB', excellent: '#059669',
  };
  const DECISION_COLOR_HEX: Record<string, string> = {
    confirmation: '#059669', renouvellement: '#F59E0B', non_confirmation: '#DC2626',
  };

  return (
    <Box sx={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ═══ BARRE D'ACTIONS ═══ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
        p: 1.5, bgcolor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 4px rgba(15,23,42,0.07)' }}>
        <IconButton onClick={onBack} size="small" sx={{ color: NAVY }}>
          <ArrowBack />
        </IconButton>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Stepper activeStep={stepIndex} alternativeLabel
            sx={{ '& .MuiStepLabel-label': { fontSize: 10.5 }, '& .MuiSvgIcon-root': { fontSize: 18 } }}>
            {STATUT_STEPS.map((s, i) => (
              <Step key={s} completed={i < stepIndex}>
                <StepLabel>{STATUT_LABELS[s]}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Print />}
            onClick={() => setFicheOpen(true)}
            sx={{ fontSize: 11.5, borderColor: NAVY, color: NAVY, '&:hover': { bgcolor: '#EEF2FF' } }}>
            Imprimer
          </Button>
          {isEditable && (
            <Button size="small" variant="contained" startIcon={<Edit />}
              onClick={() => mutSaveNotes.mutate()}
              disabled={!hasAllNotes || mutSaveNotes.isPending}
              sx={{ fontSize: 11.5, bgcolor: NAVY, '&:hover': { bgcolor: '#162d4a' } }}>
              {mutSaveNotes.isPending ? 'Enregistrement…' : 'Enregistrer les notes'}
            </Button>
          )}
          {avancerLabel[ev.statut] && (
            <Button size="small" variant="contained" startIcon={<Send />}
              onClick={() => mutAvancer.mutate()} disabled={mutAvancer.isPending}
              sx={{ fontSize: 11.5, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}>
              {avancerLabel[ev.statut]}
            </Button>
          )}
          {ev.statut === 'signe' && (
            <Button size="small" variant="contained" startIcon={<CheckCircle />}
              onClick={() => mutValiderRrh.mutate()} disabled={mutValiderRrh.isPending}
              sx={{ fontSize: 11.5, bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' } }}>
              Valider (RRH)
            </Button>
          )}
          {ev.statut === 'valide_rrh' && (
            <Button size="small" variant="contained" startIcon={<HowToVote />}
              onClick={() => setDgDialog(true)}
              sx={{ fontSize: 11.5, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
              Décision DG
            </Button>
          )}
        </Stack>
      </Box>

      {/* ═══ FICHE ANASER ═══ */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #d1d9e6', borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(15,23,42,0.08)', overflow: 'hidden' }}>

        {/* ─── EN-TÊTE ─── */}
        <Box sx={{ bgcolor: NAVY, color: '#fff', textAlign: 'center', px: 3, py: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
            Fiche d'Évaluation Individuelle — Période d'Essai
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', mt: 0.25 }}>
            Direction Administrative et Financière — Ressources Humaines
            &nbsp;·&nbsp; Réf. ANASER-RH-GE-2025-002
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>

          {/* ─── IDENTIFICATION ─── */}
          <Box sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 800, fontSize: 11.5,
            px: 1.5, py: 0.75, mb: 0 }}>
            IDENTIFICATION DE L'AGENT
          </Box>
          <Table size="small" sx={{ mb: 2.5,
            '& td': { border: '1px solid #c5d0de', px: 1.5, py: 0.9, fontSize: 12 } }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', width: '18%' }}>Nom & Prénom :</TableCell>
                <TableCell sx={{ width: '32%', fontWeight: 600 }}>
                  {ev.employee ? `${ev.employee.last_name.toUpperCase()} ${ev.employee.first_name}` : `Agent #${ev.employee_id}`}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', width: '18%' }}>Date d'entrée :</TableCell>
                <TableCell sx={{ width: '32%' }}>{fmtDate(ev.date_prise_poste)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Matricule :</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{ev.employee?.employee_number ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Catégorie :</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{ev.categorie}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Direction / Pôle :</TableCell>
                <TableCell>{ev.employee?.department?.name ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Responsable hiérarchique :</TableCell>
                <TableCell>{ev.responsable?.name ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Poste occupé :</TableCell>
                <TableCell>{ev.employee?.position?.title ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Type d'évaluation :</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {ev.type === '3_mois' ? "Période d'essai — 3 mois" : "Période d'essai — 6 mois"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Fin de période :</TableCell>
                <TableCell>{fmtDate(ev.date_fin_periode)}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb' }}>Date d'entretien :</TableCell>
                <TableCell>{fmtDate(ev.date_entretien)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* ─── GRILLE NOTATION ─── */}
          <Box sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 800, fontSize: 11.5,
            px: 1.5, py: 0.75 }}>
            GRILLE D'ÉVALUATION — NOTATION SUR 4
          </Box>
          <Box sx={{ bgcolor: '#f0f4f8', border: '1px solid #c5d0de', borderTop: 0,
            px: 1.5, py: 0.7, mb: 0, fontSize: 11.5 }}>
            <Stack direction="row" spacing={3}>
              {[['1','Insuffisant','#DC2626'],['2','Passable','#D97706'],['3','Satisfaisant','#2563EB'],['4','Excellent','#059669']].map(([n,l,c]) => (
                <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '4px', bgcolor: c, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 12 }}>{n}</Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>= {l}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Table size="small" sx={{ mb: 0 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...th, width: '36%', textAlign: 'left' }}>CRITÈRES D'ÉVALUATION</TableCell>
                <TableCell sx={{ ...th, width: 72 }}>Note<br />(1 à 4)</TableCell>
                <TableCell sx={{ ...th, width: 70 }}>Pondér.<br />section</TableCell>
                <TableCell sx={{ ...th, width: 80 }}>Note<br />Pondérée</TableCell>
                <TableCell sx={{ ...th }}>Commentaire responsable hiérarchique</TableCell>
                <TableCell sx={{ ...th, width: '15%' }}>Auto-évaluation agent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SECTIONS_DEF.map(({ groupe, lettre, titre, poids: sectionPoids }) => {
                const sectionCriteres = criteres.filter(c => c.groupe === groupe).sort((a, b) => a.ordre - b.ordre);
                const sousTotal = sectionCriteres.reduce((sum, c) => {
                  const note = localNotes[c.id]?.note ?? 0;
                  return sum + note * (c.poids / sectionPoids);
                }, 0);
                const contribution = sousTotal * sectionPoids;

                return (
                  <>
                    {/* Section header */}
                    <TableRow key={`hdr-${groupe}`}>
                      <TableCell colSpan={6} sx={{ ...td, bgcolor: '#d4e3f5', fontWeight: 800, fontSize: 12, color: NAVY, py: 0.85 }}>
                        {lettre} — {titre}
                        <Box component="span" sx={{ ml: 1.5, fontWeight: 600, fontSize: 11, color: '#475569' }}>
                          (pondération globale : {Math.round(sectionPoids * 100)}%)
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Critères */}
                    {sectionCriteres.map(c => {
                      const ln       = localNotes[c.id];
                      const note     = ln?.note ?? null;
                      const poidsSect = c.poids / sectionPoids;
                      const notePond = note !== null ? note * poidsSect : null;
                      const agentNote = ev.notations?.find(n => n.critere_id === c.id);
                      const noteColor = note === 4 ? '#059669' : note === 3 ? '#2563EB' : note === 2 ? '#D97706' : note === 1 ? '#DC2626' : '#94A3B8';

                      return (
                        <TableRow key={c.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ ...td, fontSize: 12 }}>{c.libelle}</TableCell>

                          {/* Note */}
                          <TableCell sx={{ ...td, textAlign: 'center', p: 0.5 }}>
                            <NoteSelect value={note} onChange={v => setNote(c.id, v)} disabled={!isEditable} />
                          </TableCell>

                          {/* Pondération section */}
                          <TableCell sx={{ ...td, textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                            {Math.round(poidsSect * 100)}%
                          </TableCell>

                          {/* Note pondérée */}
                          <TableCell sx={{ ...td, textAlign: 'center', fontWeight: 700, color: noteColor }}>
                            {notePond !== null ? notePond.toFixed(2) : '—'}
                          </TableCell>

                          {/* Commentaire hiérarchique */}
                          <TableCell sx={{ ...td, p: 0.5 }}>
                            {isEditable ? (
                              <TextField size="small" fullWidth multiline maxRows={2}
                                placeholder="Observation du responsable…"
                                value={ln?.commentaire_hierarchique ?? ''}
                                onChange={e => setComment(c.id, e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: 11.5, borderRadius: '6px' },
                                  '& .MuiOutlinedInput-input': { py: 0.5 } }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: 11.5, fontStyle: ln?.commentaire_hierarchique ? 'normal' : 'italic', color: ln?.commentaire_hierarchique ? '#334155' : '#94A3B8' }}>
                                {ln?.commentaire_hierarchique || '—'}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Auto-évaluation agent */}
                          <TableCell sx={{ ...td, fontSize: 11, color: '#1D4ED8', fontStyle: 'italic' }}>
                            {agentNote?.commentaire_agent || <Box component="span" sx={{ color: '#CBD5E1' }}>—</Box>}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Sous-total section */}
                    <TableRow key={`sub-${groupe}`}>
                      <TableCell sx={{ ...td, bgcolor: '#eef4fb', fontWeight: 700, fontSize: 11.5, color: NAVY }}>
                        Sous-total section {lettre} (pondération globale : {Math.round(sectionPoids * 100)}%)
                      </TableCell>
                      <TableCell sx={{ ...td, bgcolor: '#eef4fb', textAlign: 'center', fontWeight: 800, color: NAVY }}>
                        {Math.round(sectionPoids * 100)}%
                      </TableCell>
                      <TableCell sx={{ ...td, bgcolor: '#eef4fb' }} />
                      <TableCell sx={{ ...td, bgcolor: '#eef4fb', textAlign: 'center', fontWeight: 800, color: NAVY, fontSize: 13 }}>
                        {contribution.toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2} sx={{ ...td, bgcolor: '#eef4fb' }} />
                    </TableRow>
                  </>
                );
              })}

              {/* NOTE GLOBALE */}
              <TableRow>
                <TableCell colSpan={3} sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 900, fontSize: 13, border: `1px solid ${NAVY}`, px: 1.5, py: 1.25 }}>
                  NOTE GLOBALE / 4
                </TableCell>
                <TableCell sx={{ bgcolor: NAVY, border: `1px solid ${NAVY}`, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 22, color: '#fff', lineHeight: 1 }}>
                    {hasAllNotes ? liveTotal.toFixed(2) : (ev.note_globale?.toFixed(2) ?? '—')}
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} sx={{ bgcolor: NAVY, border: `1px solid ${NAVY}`, px: 2 }}>
                  {(hasAllNotes || ev.appreciation) && (() => {
                    const appr  = hasAllNotes ? liveApprec   : ev.appreciation!;
                    const dec   = hasAllNotes ? liveDecision : ev.decision_recommandee!;
                    const aColor = APPRECIATION_COLOR_HEX[appr] ?? '#fff';
                    const dColor = DECISION_COLOR_HEX[dec]   ?? '#fff';
                    const aLabel: Record<string,string> = { insuffisant:'Insuffisant', passable:'Passable', satisfaisant:'Satisfaisant', excellent:'Excellent' };
                    const dLabel: Record<string,string> = { confirmation:'Confirmation', renouvellement:'Renouvellement PE', non_confirmation:'Non-confirmation' };
                    return (
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ bgcolor: aColor, color: '#fff', px: 1.5, py: 0.4, borderRadius: '6px', fontWeight: 800, fontSize: 12 }}>
                          {aLabel[appr] ?? appr}
                        </Box>
                        <Box sx={{ bgcolor: dColor, color: '#fff', px: 1.5, py: 0.4, borderRadius: '6px', fontWeight: 800, fontSize: 12 }}>
                          {dLabel[dec] ?? dec}
                        </Box>
                        {ev.decision_finale && (
                          <Chip label={`DG : ${dLabel[ev.decision_finale] ?? ev.decision_finale}`} size="small"
                            sx={{ bgcolor: '#fff', color: NAVY, fontWeight: 800, fontSize: 11 }} />
                        )}
                      </Stack>
                    );
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* ─── RECOMMANDATION ─── */}
          <Box sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 800, fontSize: 11.5, px: 1.5, py: 0.75, mt: 2.5 }}>
            RECOMMANDATION
          </Box>
          <Table size="small" sx={{ '& td': { border: '1px solid #c5d0de', px: 1.5, py: 1, fontSize: 12 } }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', width: '22%', verticalAlign: 'top', pt: 1.25 }}>
                  Décision proposée :
                </TableCell>
                <TableCell>
                  {ev.decision_finale ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DECISION_COLOR_HEX[ev.decision_finale] ?? '#64748B' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: DECISION_COLOR_HEX[ev.decision_finale] ?? '#0F172A' }}>
                        {{ confirmation: '✅ Confirmation dans le poste', renouvellement: '🔄 Renouvellement de la période d\'essai', non_confirmation: '❌ Non-confirmation — rupture de la période d\'essai' }[ev.decision_finale] ?? ev.decision_finale}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                      En attente de décision
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', verticalAlign: 'top', pt: 1.25 }}>
                  Commentaire général :
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField fullWidth multiline rows={3} size="small"
                      placeholder="Observations générales du responsable hiérarchique…"
                      value={commentaireGeneral}
                      onChange={e => setCommentaireGeneral(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: commentaireGeneral ? '#334155' : '#94A3B8', fontStyle: commentaireGeneral ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
                      {commentaireGeneral || '—'}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', verticalAlign: 'top', pt: 1.25 }}>
                  Plan d'amélioration :
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField fullWidth multiline rows={2} size="small"
                      placeholder="Plan d'amélioration si applicable…"
                      value={planAmelioration}
                      onChange={e => setPlanAmelioration(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: planAmelioration ? '#334155' : '#94A3B8', fontStyle: planAmelioration ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
                      {planAmelioration || '—'}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
              {ev.remarques_dg && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#eef4fb', verticalAlign: 'top' }}>
                    Remarques DG :
                  </TableCell>
                  <TableCell sx={{ fontStyle: 'italic', color: '#1e3a5f', fontWeight: 600 }}>
                    {ev.remarques_dg}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* ─── SIGNATURES ─── */}
          <Box sx={{ bgcolor: NAVY, color: '#fff', fontWeight: 800, fontSize: 11.5, px: 1.5, py: 0.75, mt: 2.5 }}>
            SIGNATURES
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["L'Agent", "Le Responsable Hiérarchique", "La Responsable RH"].map(h => (
                  <TableCell key={h} sx={{ ...th, textAlign: 'center', width: '33%' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                {[
                  ev.employee ? `${ev.employee.first_name} ${ev.employee.last_name}` : '—',
                  ev.responsable?.name ?? '—',
                  '—',
                ].map((name, i) => (
                  <TableCell key={i} sx={{ ...td, fontWeight: 600, bgcolor: '#eef4fb', textAlign: 'center' }}>{name}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...td, height: 56, verticalAlign: 'bottom', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, color: ev.signe_agent_at ? '#059669' : '#94A3B8' }}>
                    {ev.signe_agent_at ? `✓ Signé le ${fmtDate(ev.signe_agent_at)}` : 'Date : ___/___/______'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ ...td, height: 56, verticalAlign: 'bottom', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, color: ev.signe_hierarchique_at ? '#059669' : '#94A3B8' }}>
                    {ev.signe_hierarchique_at ? `✓ Signé le ${fmtDate(ev.signe_hierarchique_at)}` : 'Date : ___/___/______'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ ...td, height: 56, verticalAlign: 'bottom', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, color: ev.valide_rrh_at ? '#059669' : '#94A3B8' }}>
                    {ev.valide_rrh_at ? `✓ Validé le ${fmtDate(ev.valide_rrh_at)}` : 'Date : ___/___/______'}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* ─── HISTORIQUE ─── */}
          {(ev.historique ?? []).length > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Box sx={{ bgcolor: '#64748B', color: '#fff', fontWeight: 700, fontSize: 11.5, px: 1.5, py: 0.75, mb: 0 }}>
                HISTORIQUE DU DOSSIER
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...th, bgcolor: '#64748B', textAlign: 'left', width: 140 }}>Étape</TableCell>
                    <TableCell sx={{ ...th, bgcolor: '#64748B', textAlign: 'left', width: 120 }}>Date</TableCell>
                    <TableCell sx={{ ...th, bgcolor: '#64748B', textAlign: 'left', width: 140 }}>Acteur</TableCell>
                    <TableCell sx={{ ...th, bgcolor: '#64748B', textAlign: 'left' }}>Commentaire</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...(ev.historique ?? [])].reverse().map(h => (
                    <TableRow key={h.id} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ ...td, fontWeight: 600, color: NAVY, fontSize: 11.5 }}>
                        {STATUT_LABELS[h.etape] ?? h.etape}
                      </TableCell>
                      <TableCell sx={{ ...td, fontSize: 11.5, color: '#64748B' }}>{fmtDate(h.created_at)}</TableCell>
                      <TableCell sx={{ ...td, fontSize: 11.5 }}>{h.user?.name ?? '—'}</TableCell>
                      <TableCell sx={{ ...td, fontSize: 11.5, fontStyle: 'italic', color: '#475569' }}>{h.commentaire ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Pied de page */}
          <Box textAlign="center" sx={{ borderTop: '1px solid #dde3ea', mt: 2.5, pt: 1.25 }}>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>
              Document confidentiel — Usage interne exclusif — ANASER-RH-GE-2025-002
              · Dossier individuel de l'agent · Imprimé le {fmtDate(new Date().toISOString())}
            </Typography>
          </Box>
        </Box>
      </Box>

      {ficheOpen && <FicheEvaluation evaluation={ev} criteres={criteres} open={ficheOpen} onClose={() => setFicheOpen(false)} />}

      {/* Dialog Décision DG */}
      <Dialog open={dgDialog} onClose={() => setDgDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Décision du Directeur Général</DialogTitle>
        <DialogContent>
          {ev.note_globale !== null && (
            <Alert severity={ev.appreciation === 'excellent' ? 'success' : ev.appreciation === 'insuffisant' ? 'error' : 'info'} sx={{ mb: 2 }}>
              Note : <strong>{ev.note_globale}/4</strong> — {ev.appreciation ? APPRECIATION_LABELS[ev.appreciation] : ''}
              {' '}— Recommandation : <strong>{ev.decision_recommandee ? DECISION_LABELS[ev.decision_recommandee] : '—'}</strong>
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Décision finale</InputLabel>
            <Select label="Décision finale" value={dgDecision} onChange={e => setDgDecision(e.target.value)}>
              <MenuItem value="confirmation">✅ Confirmation dans le poste</MenuItem>
              <MenuItem value="renouvellement">🔄 Renouvellement de la période d'essai</MenuItem>
              <MenuItem value="non_confirmation">❌ Non-confirmation</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Remarques du DG (optionnel)" multiline rows={3} fullWidth
            value={dgRemarques} onChange={e => setDgRemarques(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDgDialog(false)}>Annuler</Button>
          <Button variant="contained" color="success"
            onClick={() => mutDecisionDg.mutate()} disabled={mutDecisionDg.isPending}>
            Confirmer la décision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Onglet 2 : Liste évaluations ──────────────────────────────────────────────

function EvaluationsTab({ criteres, openId }: { criteres: EvaluationCritere[]; openId?: number }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<EvaluationPeriodeEssai | null>(null);

  useEffect(() => {
    if (openId && !selected) {
      evaluationApi.show(openId).then(r => setSelected(r.data)).catch(() => {});
    }
  }, [openId]);

  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreType, setFiltreType] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    type: '3_mois',
    categorie: 'B1',
    date_prise_poste: '',
    date_fin_periode: '',
    date_entretien: '',
  });

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations', filtreStatut, filtreType],
    queryFn: () => evaluationApi.list({
      ...(filtreStatut ? { statut: filtreStatut } : {}),
      ...(filtreType ? { type: filtreType } : {}),
    }).then(r => r.data),
  });

  const mutCreate = useMutation({
    mutationFn: () => evaluationApi.create({
      employee_id: Number(form.employee_id),
      type: form.type as '3_mois' | '6_mois',
      categorie: form.categorie as any,
      date_prise_poste: form.date_prise_poste,
      date_fin_periode: form.date_fin_periode,
      date_entretien: form.date_entretien || undefined,
    }),
    onSuccess: () => {
      setCreateDialog(false);
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      qc.invalidateQueries({ queryKey: ['evaluations-dashboard'] });
    },
  });

  if (selected) {
    return (
      <EvaluationDetail
        evaluation={selected}
        criteres={criteres}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <Box>
      {/* Filtres + bouton créer */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Statut</InputLabel>
          <Select label="Statut" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <MenuItem value="">Tous les statuts</MenuItem>
            {Object.entries(STATUT_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={filtreType} onChange={e => setFiltreType(e.target.value)}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="3_mois">3 mois</MenuItem>
            <MenuItem value="6_mois">6 mois</MenuItem>
          </Select>
        </FormControl>
        <Box flex={1} />
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>
          Nouvelle évaluation
        </Button>
      </Box>

      {isLoading ? <LinearProgress /> : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Agent</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Date entretien</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Appréciation</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Décision</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" py={3}>Aucune évaluation trouvée.</Typography>
                  </TableCell>
                </TableRow>
              ) : evaluations.map(ev => (
                <TableRow key={ev.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(ev)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {ev.employee?.first_name} {ev.employee?.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ev.employee?.matricule}
                    </Typography>
                  </TableCell>
                  <TableCell><Chip label={ev.type.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                  <TableCell><Chip label={`Cat. ${ev.categorie}`} size="small" /></TableCell>
                  <TableCell>
                    <Typography variant="body2">{fmtDate(ev.date_entretien)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <NoteBar note={ev.note_globale} />
                  </TableCell>
                  <TableCell><AppreciationChip appreciation={ev.appreciation} /></TableCell>
                  <TableCell><StatutBadge statut={ev.statut} /></TableCell>
                  <TableCell>
                    {ev.decision_finale
                      ? <DecisionChip decision={ev.decision_finale} />
                      : ev.decision_recommandee
                        ? <Tooltip title="Décision recommandée (provisoire)">
                            <span><DecisionChip decision={ev.decision_recommandee} /></span>
                          </Tooltip>
                        : null
                    }
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Edit fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog création */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle évaluation en période d'essai</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="ID Employé"
                type="number"
                fullWidth
                size="small"
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="3_mois">3 mois</MenuItem>
                  <MenuItem value="6_mois">6 mois</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Catégorie</InputLabel>
                <Select label="Catégorie" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                  {['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E'].map(c => (
                    <MenuItem key={c} value={c}>Catégorie {c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date de prise de poste"
                type="date"
                fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={form.date_prise_poste}
                onChange={e => setForm(f => ({ ...f, date_prise_poste: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date fin période"
                type="date"
                fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={form.date_fin_periode}
                onChange={e => setForm(f => ({ ...f, date_fin_periode: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date d'entretien (optionnel)"
                type="date"
                fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                value={form.date_entretien}
                onChange={e => setForm(f => ({ ...f, date_entretien: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => mutCreate.mutate()}
            disabled={!form.employee_id || !form.date_prise_poste || !form.date_fin_periode || mutCreate.isPending}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Onglet 3 : Barème & Guide ─────────────────────────────────────────────────

function BaremeGuideTab() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Barème de décision</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Note globale (/4)</TableCell>
                  <TableCell>Appréciation</TableCell>
                  <TableCell>Décision recommandée</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['< 1,5', 'Insuffisant', 'Non-confirmation', 'error'],
                  ['1,5 – 2,49', 'Passable', 'Renouvellement', 'warning'],
                  ['2,5 – 3,24', 'Satisfaisant', 'Confirmation', 'primary'],
                  ['≥ 3,25', 'Excellent', 'Confirmation', 'success'],
                ].map(([range, appr, dec, color]) => (
                  <TableRow key={range}>
                    <TableCell><Typography variant="body2" fontWeight={600}>{range}</Typography></TableCell>
                    <TableCell><Chip label={appr} color={color as any} size="small" /></TableCell>
                    <TableCell><Typography variant="body2">{dec}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Durées légales par catégorie</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Durée initiale</TableCell>
                  <TableCell>Renouvellement possible</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['A1, A2', '6 mois', '1 fois × 6 mois'],
                  ['B1, B2', '3 mois', '1 fois × 3 mois'],
                  ['C', '3 mois', '1 fois × 3 mois'],
                  ['D', '1 mois', '1 fois × 1 mois'],
                  ['E', '1 mois', '1 fois × 1 mois'],
                ].map(([cat, duree, renouv]) => (
                  <TableRow key={cat}>
                    <TableCell><Chip label={cat} size="small" /></TableCell>
                    <TableCell>{duree}</TableCell>
                    <TableCell>{renouv}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Actes administratifs selon décision</Typography>
            {[
              { dec: 'Confirmation', color: 'success', actes: ["Lettre de confirmation de stage", "Avenant au contrat de travail", "Mise à jour du dossier individuel"] },
              { dec: 'Renouvellement', color: 'warning', actes: ["Lettre de renouvellement de la période d'essai", "Notification à l'agent et au responsable", "Planification de la nouvelle date d'évaluation"] },
              { dec: 'Non-confirmation', color: 'error', actes: ["Lettre de non-confirmation (motifs détaillés)", "Respect du préavis légal", "Solde de tout compte et attestations", "Archivage du dossier complet"] },
            ].map(({ dec, color, actes }) => (
              <Box key={dec} mb={2}>
                <Chip label={dec} color={color as any} size="small" sx={{ mb: 1 }} />
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  {actes.map(a => <Box component="li" key={a}><Typography variant="body2">{a}</Typography></Box>)}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Processus — 5 étapes</Typography>
            {[
              ["1", "Envoi de la fiche", "RRH envoie la fiche vide au responsable et à l'agent 5 jours ouvrables avant l'entretien."],
              ["2", "Préparation", "Le responsable et l'agent préparent leur partie de façon indépendante."],
              ["3", "Entretien", "Le responsable saisit les notes en concertation avec l'agent. Discussion de chaque critère."],
              ["4", "Signature", "La fiche est signée par les deux parties à l'issue de l'entretien."],
              ["5", "Validation & Archivage", "Validation RRH → Décision DG → Archivage au dossier individuel de l'agent."],
            ].map(([num, titre, desc]) => (
              <Box key={num} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>{num}</Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{titre}</Typography>
                  <Typography variant="caption" color="text.secondary">{desc}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Confidentialité :</strong> L'original de la fiche est versé au dossier individuel de l'agent (DRH).
            Une copie est remise à l'agent. Les données sont strictement confidentielles (DG, DAF, RRH, responsable hiérarchique direct uniquement).
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
}

// ── Fiche d'Évaluation Individuelle (imprimable) ─────────────────────────────

function FicheEvaluation({
  evaluation: ev,
  criteres,
  open,
  onClose,
}: {
  evaluation: EvaluationPeriodeEssai;
  criteres: EvaluationCritere[];
  open: boolean;
  onClose: () => void;
}) {
  const { logoUrl, name: companyName } = useCompany();
  const notationsMap = new Map(
    (ev.notations ?? []).map(n => [n.critere_id, n])
  );

  const SECTIONS: { groupe: GroupeCritere; lettre: string; titre: string; poids: number }[] = [
    { groupe: 'competences_techniques', lettre: 'A', titre: 'COMPÉTENCES TECHNIQUES ET PROFESSIONNELLES', poids: 0.40 },
    { groupe: 'comportement_relations', lettre: 'B', titre: 'COMPORTEMENT ET RELATIONS PROFESSIONNELLES',  poids: 0.30 },
    { groupe: 'aptitudes_personnelles', lettre: 'C', titre: 'APTITUDES PERSONNELLES',                      poids: 0.30 },
  ];

  const noteGlobale  = ev.note_globale ?? 0;
  const appreciation = ev.appreciation ?? (noteGlobale < 1.5 ? 'insuffisant' : noteGlobale < 2.5 ? 'passable' : noteGlobale < 3.25 ? 'satisfaisant' : 'excellent');

  const decisionLabel: Record<string, string> = {
    confirmation:     '✅ Confirmation dans le poste',
    renouvellement:   '🔄 Renouvellement de la période d\'essai',
    non_confirmation: '❌ Non-confirmation — rupture de la période d\'essai',
  };

  const appreciationLabel: Record<string, string> = {
    insuffisant:  'Insuffisant',
    passable:     'Passable',
    satisfaisant: 'Satisfaisant',
    excellent:    'Excellent',
  };

  const handlePrint = () => {
    const el = document.getElementById('fiche-anaser-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const logoHtml = logoUrl
      ? `<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:6px">
           <img src="${logoUrl}" alt="${companyName}" style="height:64px;max-width:130px;object-fit:contain" />
         </div>`
      : '';
    w.document.write(`
      <html><head><title>Fiche Évaluation ANASER</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; }
        h1 { font-size: 14px; text-align: center; margin: 4px 0; }
        h2 { font-size: 12px; text-align: center; margin: 2px 0; color: #555; }
        h3 { font-size: 11px; background: #1e3a5f; color: #fff; padding: 4px 8px; margin: 8px 0 0 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        th { background: #1e3a5f; color: #fff; font-size: 10px; padding: 4px; border: 1px solid #999; text-align: center; }
        td { border: 1px solid #bbb; padding: 3px 5px; font-size: 10px; }
        .section-header { background: #d4e3f5; font-weight: bold; }
        .subtotal { background: #eef4fb; font-weight: bold; }
        .global { background: #1e3a5f; color: #fff; font-weight: bold; font-size: 12px; text-align: center; }
        .sig-table { margin-top: 20px; }
        .sig-table td { height: 50px; vertical-align: top; padding: 5px; }
        .legend { font-size: 10px; color: #555; margin: 4px 0; }
        .note-glob { font-size: 18px; font-weight: bold; }
        @media print { body { margin: 10px; } }
      </style></head><body>${logoHtml}${el.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const cellSx = { border: '1px solid #bbb', px: 1, py: 0.5, fontSize: 11 };
  const hdrSx  = { bgcolor: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: 10.5, border: '1px solid #999', px: 1, py: 0.75, textAlign: 'center' as const };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', maxHeight: '95vh' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #E2E8F0', py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={800} fontSize={15}>
            Fiche d'Évaluation Individuelle — Période d'Essai
          </Typography>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}
            sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' }, borderRadius: '8px', fontSize: 13 }}>
            Imprimer
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#f9fafb' }}>
        <Box id="fiche-anaser-print" sx={{ bgcolor: '#fff', p: 3, maxWidth: 860, mx: 'auto',
          fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#000' }}>

          {/* ── EN-TÊTE ── */}
          <Box textAlign="center" mb={2} sx={{ borderBottom: '3px solid #1e3a5f', pb: 1.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: '#1e3a5f', letterSpacing: 1 }}>
              AGENCE NATIONALE DE LA SÉCURITÉ ROUTIÈRE — ANASER
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 0.5 }}>
              FICHE D'ÉVALUATION INDIVIDUELLE — PÉRIODE D'ESSAI
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#555', mt: 0.25 }}>
              Direction Administrative et Financière — Ressources Humaines
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#888', mt: 0.25 }}>
              Réf. : ANASER-RH-GE-2025-002 · Version 1.0 · Juin 2025
            </Typography>
          </Box>

          {/* ── IDENTIFICATION ── */}
          <Box sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 800, fontSize: 11,
            px: 1.5, py: 0.75, mb: 0.5 }}>
            IDENTIFICATION DE L'AGENT
          </Box>
          <Table size="small" sx={{ mb: 2, '& td': { border: '1px solid #bbb', px: 1.5, py: 0.75, fontSize: 11 } }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8', width: '18%' }}>Nom & Prénom :</TableCell>
                <TableCell sx={{ width: '32%' }}>
                  {ev.employee ? `${ev.employee.last_name} ${ev.employee.first_name}` : `Agent #${ev.employee_id}`}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8', width: '18%' }}>Date d'entrée :</TableCell>
                <TableCell sx={{ width: '32%' }}>{fmtDate(ev.date_prise_poste)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Matricule :</TableCell>
                <TableCell>{ev.employee?.employee_number ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Catégorie :</TableCell>
                <TableCell>{ev.categorie}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Direction / Pôle :</TableCell>
                <TableCell>{ev.employee?.department?.name ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Responsable hiérarchique :</TableCell>
                <TableCell>{ev.responsable?.name ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Poste occupé :</TableCell>
                <TableCell>{ev.employee?.position?.title ?? '—'}</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Type d'évaluation :</TableCell>
                <TableCell>{ev.type === '3_mois' ? 'Période d\'essai 3 mois' : 'Période d\'essai 6 mois'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* ── GRILLE D'ÉVALUATION ── */}
          <Box sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 800, fontSize: 11,
            px: 1.5, py: 0.75, mb: 0.5 }}>
            GRILLE D'ÉVALUATION — NOTATION SUR 4
          </Box>
          <Box sx={{ bgcolor: '#f0f4f8', border: '1px solid #bbb', px: 1.5, py: 0.75, mb: 1, fontSize: 11 }}>
            <strong>1 = Insuffisant</strong> &nbsp;|&nbsp; <strong>2 = Passable</strong> &nbsp;|&nbsp;
            <strong>3 = Satisfaisant</strong> &nbsp;|&nbsp; <strong>4 = Excellent</strong>
          </Box>

          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...hdrSx, width: '38%', textAlign: 'left' }}>CRITÈRES D'ÉVALUATION</TableCell>
                <TableCell sx={{ ...hdrSx, width: '9%' }}>Note<br />(1 à 4)</TableCell>
                <TableCell sx={{ ...hdrSx, width: '9%' }}>Pondér.<br />(%)</TableCell>
                <TableCell sx={{ ...hdrSx, width: '11%' }}>Note<br />Pondérée</TableCell>
                <TableCell sx={{ ...hdrSx }}>Commentaires</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SECTIONS.map(({ groupe, lettre, titre, poids: sectionPoids }) => {
                const sectionCriteres = criteres.filter(c => c.groupe === groupe).sort((a, b) => a.ordre - b.ordre);
                let sousTotal = 0;

                return (
                  <>
                    <TableRow key={`hdr-${groupe}`}>
                      <TableCell colSpan={5} sx={{ ...cellSx, bgcolor: '#d4e3f5', fontWeight: 800, fontSize: 11 }}>
                        {lettre} — {titre}
                      </TableCell>
                    </TableRow>
                    {sectionCriteres.map(c => {
                      const notation      = notationsMap.get(c.id);
                      const note          = notation?.note ?? null;
                      const poidsSect     = c.poids / sectionPoids;
                      const notePond      = note !== null ? +(note * poidsSect).toFixed(4) : null;
                      if (notePond) sousTotal += notePond;
                      return (
                        <TableRow key={c.id}>
                          <TableCell sx={cellSx}>{c.libelle}</TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: 'center', fontWeight: note ? 700 : 400 }}>
                            {note ?? '—'}
                          </TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                            {Math.round(poidsSect * 100)}%
                          </TableCell>
                          <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                            {notePond !== null ? notePond.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: '#555', fontStyle: 'italic', fontSize: 10.5 }}>
                            {notation?.commentaire_hierarchique ?? ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow key={`sub-${groupe}`}>
                      <TableCell sx={{ ...cellSx, bgcolor: '#eef4fb', fontWeight: 700 }}>
                        Sous-total section (pondération globale : {Math.round(sectionPoids * 100)}%)
                      </TableCell>
                      <TableCell sx={{ ...cellSx, bgcolor: '#eef4fb', textAlign: 'center', fontWeight: 700 }}>
                        {Math.round(sectionPoids * 100)}%
                      </TableCell>
                      <TableCell sx={{ ...cellSx, bgcolor: '#eef4fb' }} />
                      <TableCell sx={{ ...cellSx, bgcolor: '#eef4fb', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>
                        {(sousTotal * sectionPoids).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, bgcolor: '#eef4fb' }} />
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>

          {/* ── NOTE GLOBALE ── */}
          <Box sx={{ bgcolor: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 3, py: 1.5, mb: 2, borderRadius: '4px' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>NOTE GLOBALE / 4</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{noteGlobale.toFixed(2)}</Typography>
            <Box sx={{ bgcolor: '#fff', color: '#1e3a5f', px: 2, py: 0.5, borderRadius: '4px',
              fontWeight: 800, fontSize: 13 }}>
              {appreciationLabel[appreciation] ?? appreciation}
            </Box>
          </Box>

          {/* ── RECOMMANDATION ── */}
          <Box sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 800, fontSize: 11,
            px: 1.5, py: 0.75, mb: 0.5 }}>
            RECOMMANDATION
          </Box>
          <Table size="small" sx={{ mb: 2, '& td': { border: '1px solid #bbb', px: 1.5, py: 1, fontSize: 11 } }}>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8', width: '22%' }}>Décision proposée :</TableCell>
                <TableCell>
                  {decisionLabel[ev.decision_finale ?? ev.decision_recommandee ?? ''] ?? '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Commentaire général :</TableCell>
                <TableCell sx={{ minHeight: 50 }}>{ev.commentaire_general ?? ''}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Plan d'amélioration :</TableCell>
                <TableCell>{ev.plan_amelioration ?? ''}</TableCell>
              </TableRow>
              {ev.remarques_dg && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f0f4f8' }}>Remarques DG :</TableCell>
                  <TableCell>{ev.remarques_dg}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* ── SIGNATURES ── */}
          <Box sx={{ bgcolor: '#1e3a5f', color: '#fff', fontWeight: 800, fontSize: 11,
            px: 1.5, py: 0.75, mb: 0.5 }}>
            SIGNATURES
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...hdrSx }}>L'Agent</TableCell>
                <TableCell sx={{ ...hdrSx }}>Le Responsable Hiérarchique</TableCell>
                <TableCell sx={{ ...hdrSx }}>La Responsable RH</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                {['Nom & Signature :', 'Nom & Signature :', 'Nom & Signature :'].map((txt, i) => (
                  <TableCell key={i} sx={{ border: '1px solid #bbb', px: 1.5, py: 0.5, fontSize: 11, fontWeight: 600, bgcolor: '#f0f4f8' }}>
                    {txt}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {[
                  ev.employee ? `${ev.employee.first_name} ${ev.employee.last_name}` : '—',
                  ev.responsable?.name ?? '—',
                  '—',
                ].map((val, i) => (
                  <TableCell key={i} sx={{ border: '1px solid #bbb', height: 48, px: 1.5, fontSize: 11, verticalAlign: 'top', pt: 1 }}>
                    {val}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {[
                  ev.signe_agent_at ? `Signé le ${fmtDate(ev.signe_agent_at)}` : 'Date : ___/___/______',
                  ev.signe_hierarchique_at ? `Signé le ${fmtDate(ev.signe_hierarchique_at)}` : 'Date : ___/___/______',
                  ev.valide_rrh_at ? `Validé le ${fmtDate(ev.valide_rrh_at)}` : 'Date : ___/___/______',
                ].map((d, i) => (
                  <TableCell key={i} sx={{ border: '1px solid #bbb', px: 1.5, py: 0.75, fontSize: 10.5, color: '#555' }}>
                    {d}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>

          {/* Pied de page */}
          <Box textAlign="center" mt={2} sx={{ borderTop: '1px solid #ddd', pt: 1 }}>
            <Typography sx={{ fontSize: 9.5, color: '#888' }}>
              Document confidentiel — Usage interne exclusif — ANASER-RH-GE-2025-002
              · Dossier individuel de l'agent · {fmtDate(new Date().toISOString())}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Fermer</Button>
        <Button variant="contained" startIcon={<Print />} onClick={handlePrint}
          sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#162d4a' }, borderRadius: '8px' }}>
          Imprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function EvaluationsPage() {
  const location = useLocation();
  const openId   = (location.state as { openId?: number } | null)?.openId;
  const [tab, setTab] = useState(openId ? 1 : 0);

  const { data: criteres = [] } = useQuery({
    queryKey: ['evaluation-criteres'],
    queryFn: () => evaluationApi.criteres().then(r => r.data),
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Évaluation
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Grille ANASER-RH-GE-2025-002 · Suivi des dossiers d'évaluation et gestion du workflow de confirmation
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Tableau de bord" />
        <Tab label="Évaluations" />
        <Tab label="Barème & Guide" />
      </Tabs>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <EvaluationsTab criteres={criteres} openId={openId} />}
      {tab === 2 && <BaremeGuideTab />}
    </Box>
  );
}
