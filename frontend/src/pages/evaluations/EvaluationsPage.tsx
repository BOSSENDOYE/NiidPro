import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip, Button,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TablePagination, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Alert, Divider, Paper, Stack, Tooltip,
  MenuItem, Select, FormControl, InputLabel,
  Stepper, Step, StepLabel, StepConnector,
  CircularProgress, Avatar, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  Add, CheckCircle, Assignment, Send, Archive,
  Edit, Visibility, BarChart, Settings,
  FiberManualRecord, EventNote, Grade, Person,
  ThumbUp, Warning, Block, Star, Delete, DeleteForever, Print,
} from '@mui/icons-material';
import { evalCampagneApi, evalFicheApi } from '../../api/evaluations';
import { employeesApi } from '../../api/employees';
import type {
  EvalCampagne, EvalFiche, EvalStatutFiche, EvalAppreciation,
  EvalNotation, EvalBesoinFormation, EvalObjectif, EvalDecisionRh, EvalCritere,
  Employee,
} from '../../types';

// ── Impression fiche ──────────────────────────────────────────────────────────

function printFiche(
  fiche: EvalFiche,
  criteres: EvalCritere[],
  notations: Record<number, { note: number; observation: string }>,
) {
  const apprecLabel = (m: number | null) => {
    if (m === null) return '—';
    if (m >= 4.5) return 'Excellent';
    if (m >= 3.5) return 'Très satisfaisant';
    if (m >= 2.5) return 'Satisfaisant';
    if (m >= 1.5) return 'À améliorer';
    return 'Insuffisant';
  };
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const field = (label: string, val?: string | null) =>
    `<div class="field"><span class="label">${label}</span><span class="val">${val || '—'}</span></div>`;
  const noteCircle = (n: number, active: boolean) =>
    `<span class="circle${active ? ' active' : ''}">${n}</span>`;

  const categorieLabel: Record<string, string> = {
    base: '7 Critères de base',
    complementaire: '5 Critères complémentaires',
    fonctionnaire: '6 Critères spécifiques fonctionnaires',
  };

  const grille = ['base', 'complementaire', 'fonctionnaire'].map(cat => {
    const cats = criteres.filter(c => c.categorie === cat);
    if (!cats.length) return '';
    const rows = cats.map(c => {
      const n = notations[c.id];
      const note = n?.note ?? 0;
      const obs = n?.observation ?? '';
      return `<tr>
        <td class="crit-code">${c.code}</td>
        <td class="crit-label">${c.libelle}</td>
        <td class="crit-notes">
          ${[1,2,3,4,5].map(v => noteCircle(v, note === v)).join('')}
        </td>
        <td class="crit-obs">${obs}</td>
      </tr>`;
    }).join('');
    return `<div class="section-block">
      <div class="sub-title">${categorieLabel[cat]}</div>
      <table class="grid-table">
        <thead><tr><th style="width:8%">Code</th><th>Critère</th><th style="width:18%">Note /5</th><th style="width:22%">Observation</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const besoinsRows = (fiche.besoins_formation ?? []).map((b, i) =>
    `<tr><td>${i + 1}</td><td>${b.intitule}</td><td><span class="badge badge-${b.priorite}">${b.priorite.charAt(0).toUpperCase() + b.priorite.slice(1)}</span></td></tr>`
  ).join('') || '<tr><td colspan="3" style="text-align:center;color:#888">Aucun besoin renseigné</td></tr>';

  const objectifsRows = (fiche.objectifs ?? []).map((o, i) =>
    `<tr><td>${i + 1}</td><td>${o.objectif}</td><td>${o.indicateur || '—'}</td><td>${fmt(o.echeance)}</td></tr>`
  ).join('') || '<tr><td colspan="4" style="text-align:center;color:#888">Aucun objectif renseigné</td></tr>';

  const dec = fiche.decision_rh;
  const decChecks = dec ? [
    ['Formation', dec.formation],
    ['Coaching', dec.coaching],
    ['Mobilité', dec.mobilite],
    ['Félicitations', dec.felicitations],
    ['Suivi particulier', dec.suivi_particulier],
    ['Gratification', dec.gratification],
  ].map(([l, v]) => `<div class="dec-item"><span class="chk">${v ? '☑' : '☐'}</span> ${l}</div>`).join('') : '';

  const sigBlock = (label: string, name: string, date?: string | null) => `
    <div class="sig-box">
      <div class="sig-title">${label}</div>
      <div class="sig-name">${name}</div>
      <div class="sig-line"></div>
      <div class="sig-date">${date ? `Signé le ${fmt(date)}` : 'Signature &amp; Date'}</div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche d'évaluation — ${fiche.employee?.first_name} ${fiche.employee?.last_name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; }

  /* === HEADER === */
  .header { background: #002f59; color: #fff; padding: 18px 28px 14px; display: flex; align-items: center; gap: 20px; }
  .header-logo { width: 56px; height: 56px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
  .header-text h1 { font-size: 14pt; font-weight: 800; letter-spacing: 0.5px; }
  .header-text h2 { font-size: 10pt; color: rgba(255,255,255,0.7); font-weight: 400; margin-top: 3px; }
  .header-meta { margin-left: auto; text-align: right; }
  .header-meta .exercice { font-size: 20pt; font-weight: 900; color: #ff7631; }
  .header-meta .statut { font-size: 9pt; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .orange-bar { height: 4px; background: linear-gradient(90deg, #ff7631, #ff9a62); }

  /* === FICHE META === */
  .fiche-meta { display: flex; justify-content: space-between; align-items: center; padding: 10px 28px; background: #f0f4f8; border-bottom: 1px solid #d1dce8; }
  .fiche-meta .agent-name { font-size: 14pt; font-weight: 800; color: #002f59; }
  .fiche-meta .agent-sub { font-size: 10pt; color: #555; margin-top: 2px; }
  .moyenne-badge { background: #002f59; color: #fff; border-radius: 8px; padding: 8px 18px; text-align: center; }
  .moyenne-badge .moy-val { font-size: 20pt; font-weight: 900; color: #ff7631; }
  .moyenne-badge .moy-apprec { font-size: 9pt; color: rgba(255,255,255,0.85); }

  /* === SECTIONS === */
  .page-body { padding: 20px 28px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 12pt; font-weight: 800; color: #002f59; border-left: 4px solid #ff7631; padding-left: 10px; margin-bottom: 12px; }
  .sub-title { font-size: 10pt; font-weight: 700; color: #475569; margin: 10px 0 6px; background: #f8fafc; padding: 4px 8px; border-radius: 4px; }

  /* === IDENTIFICATION GRID === */
  .id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 12px; }
  .field .label { display: block; font-size: 8.5pt; color: #64748b; margin-bottom: 2px; }
  .field .val { font-size: 10.5pt; font-weight: 700; color: #0f172a; }

  /* === GRILLE NOTATION === */
  .grid-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .grid-table th { background: #e8eef5; color: #002f59; font-weight: 700; padding: 6px 8px; border: 1px solid #c8d5e0; text-align: left; }
  .grid-table td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: middle; }
  .grid-table tr:nth-child(even) td { background: #fafbfc; }
  .crit-code { font-weight: 700; color: #002f59; font-size: 9pt; width: 8%; }
  .crit-label { width: 52%; }
  .crit-notes { text-align: center; }
  .crit-obs { font-size: 8.5pt; color: #475569; }
  .circle { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #94a3b8; color: #64748b; font-size: 8.5pt; font-weight: 700; margin: 0 1px; }
  .circle.active { background: #002f59; border-color: #002f59; color: #fff; }
  .section-block { margin-bottom: 14px; }

  /* === BILAN PROFESSIONNEL === */
  .text-block { border: 1px solid #e2e8f0; border-radius: 5px; padding: 10px 12px; min-height: 50px; font-size: 10pt; color: #1a1a2e; background: #fafbfc; }
  .text-label { font-size: 8.5pt; color: #64748b; margin-bottom: 4px; font-weight: 600; }

  /* === TABLEAUX BESOINS / OBJECTIFS === */
  .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 6px; }
  .data-table th { background: #e8eef5; color: #002f59; font-weight: 700; padding: 6px 8px; border: 1px solid #c8d5e0; }
  .data-table td { border: 1px solid #e2e8f0; padding: 5px 8px; }
  .data-table tr:nth-child(even) td { background: #fafbfc; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
  .badge-haute { background: #fee2e2; color: #dc2626; }
  .badge-moyenne { background: #fef3c7; color: #d97706; }
  .badge-faible { background: #dcfce7; color: #16a34a; }

  /* === DÉCISIONS RH === */
  .dec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .dec-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 10px; font-size: 10pt; }
  .chk { font-size: 14pt; color: #002f59; }

  /* === SIGNATURES === */
  .sig-row { display: flex; gap: 20px; margin-top: 14px; }
  .sig-box { flex: 1; border: 2px solid #002f59; border-radius: 8px; padding: 14px 16px; min-height: 110px; text-align: center; }
  .sig-title { font-size: 9.5pt; font-weight: 800; color: #002f59; margin-bottom: 4px; }
  .sig-name { font-size: 9pt; color: #475569; margin-bottom: 14px; }
  .sig-line { border-bottom: 1px dashed #94a3b8; margin: 24px 0 8px; }
  .sig-date { font-size: 8.5pt; color: #64748b; }

  /* === FOOTER === */
  .doc-footer { border-top: 2px solid #002f59; padding: 8px 28px; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b; background: #f8fafc; }

  /* === PRINT OVERRIDES === */
  @media print {
    @page { size: A4; margin: 0; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- BOUTON IMPRESSION (masqué à l'impression) -->
<div class="no-print" style="position:fixed;top:14px;right:20px;z-index:99;display:flex;gap:10px;">
  <button onclick="window.print()" style="background:#002f59;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:12pt;font-weight:700;cursor:pointer;">Imprimer / PDF</button>
  <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:10px 18px;border-radius:8px;font-size:12pt;cursor:pointer;">Fermer</button>
</div>

<!-- EN-TÊTE DOCUMENT -->
<div class="header">
  <div class="header-logo">${(fiche.employee?.first_name?.[0] ?? '') + (fiche.employee?.last_name?.[0] ?? '')}</div>
  <div class="header-text">
    <h1>AGENCE NATIONALE DE LA SÉCURITÉ ROUTIÈRE</h1>
    <h2>FICHE D'ÉVALUATION ANNUELLE DU PERSONNEL — CDC-ANASER-EVAL-2026-01</h2>
  </div>
  <div class="header-meta">
    <div class="exercice">${fiche.campagne?.exercice ?? '—'}</div>
    <div class="statut">${fiche.campagne?.titre ?? ''}</div>
  </div>
</div>
<div class="orange-bar"></div>

<!-- IDENTITÉ AGENT & MOYENNE -->
<div class="fiche-meta">
  <div>
    <div class="agent-name">${fiche.employee?.first_name ?? ''} ${fiche.employee?.last_name ?? ''}</div>
    <div class="agent-sub">${fiche.snapshot_fonction ?? '—'} &nbsp;|&nbsp; ${fiche.snapshot_direction ?? '—'}</div>
    <div class="agent-sub" style="margin-top:3px;color:#002f59;font-weight:600;">Matricule : ${fiche.snapshot_matricule ?? '—'}</div>
  </div>
  ${fiche.moyenne !== null ? `
  <div class="moyenne-badge">
    <div class="moy-val">${fiche.moyenne}/5</div>
    <div class="moy-apprec">${apprecLabel(fiche.moyenne)}</div>
  </div>` : ''}
</div>

<!-- CORPS DU DOCUMENT -->
<div class="page-body">

  <!-- === PAGE 1 : IDENTIFICATION === -->
  <div class="section avoid-break">
    <div class="section-title">1. Identification de l'agent</div>
    <div class="id-grid">
      ${field('Matricule', fiche.snapshot_matricule)}
      ${field('Nom complet', `${fiche.employee?.first_name ?? ''} ${fiche.employee?.last_name ?? ''}`)}
      ${field('Fonction', fiche.snapshot_fonction)}
      ${field('Direction / Service', fiche.snapshot_direction)}
      ${field('Poste', fiche.snapshot_service)}
      ${field('Statut agent', fiche.statut_agent === 'fonctionnaire' ? 'Fonctionnaire (mis à disposition)' : fiche.statut_agent === 'decisionnaire' ? 'Décisionnaire' : 'Contractuel')}
      ${field('Ancienneté', fiche.snapshot_anciennete_mois !== null && fiche.snapshot_anciennete_mois !== undefined ? `${fiche.snapshot_anciennete_mois} mois` : '—')}
      ${field('Évaluateur', fiche.evaluateur?.name)}
      ${field('Date d\'entretien', fmt(fiche.date_entretien))}
      ${field('Lieu d\'entretien', fiche.lieu_entretien)}
    </div>
  </div>

  <!-- === PAGE 2 : GRILLE DE NOTATION === -->
  <div class="section page-break">
    <div class="section-title">2. Grille de notation (barème /5)</div>
    <div style="background:#e8f4fd;border:1px solid #bee3f8;border-radius:5px;padding:8px 12px;margin-bottom:12px;font-size:9.5pt;">
      <strong>${criteres.length} critère(s) applicables</strong> pour un agent
      <strong>${fiche.statut_agent === 'fonctionnaire' ? 'fonctionnaire' : 'contractuel/décisionnaire'}</strong>.
      &nbsp;—&nbsp; Barème : 1 Insuffisant · 2 À améliorer · 3 Satisfaisant · 4 Très satisfaisant · 5 Excellent
    </div>
    ${grille}
  </div>

  <!-- === PAGE 3 : BILAN PROFESSIONNEL === -->
  <div class="section page-break">
    <div class="section-title">3. Bilan professionnel</div>
    <div style="margin-bottom:10px;">
      <div class="text-label">Principales réalisations de la période</div>
      <div class="text-block">${fiche.realisations || '<em style="color:#94a3b8">Non renseigné</em>'}</div>
    </div>
    <div style="margin-bottom:10px;">
      <div class="text-label">Difficultés rencontrées dans l'exercice des fonctions</div>
      <div class="text-block">${fiche.difficultes || '<em style="color:#94a3b8">Non renseigné</em>'}</div>
    </div>
    <div style="margin-bottom:14px;">
      <div class="text-label">Compétences démontrées</div>
      <div class="text-block">${fiche.competences_demontrees || '<em style="color:#94a3b8">Non renseigné</em>'}</div>
    </div>

    <div class="sub-title">Besoins de formation et renforcement des capacités</div>
    <table class="data-table">
      <thead><tr><th style="width:5%">#</th><th>Formation souhaitée</th><th style="width:15%">Priorité</th></tr></thead>
      <tbody>${besoinsRows}</tbody>
    </table>
  </div>

  <!-- === PAGE 4 : OBJECTIFS & DÉCISIONS === -->
  <div class="section page-break">
    <div class="section-title">4. Objectifs assignés pour l'exercice suivant</div>
    <table class="data-table">
      <thead><tr><th style="width:5%">#</th><th>Objectif</th><th style="width:22%">Indicateur</th><th style="width:13%">Échéance</th></tr></thead>
      <tbody>${objectifsRows}</tbody>
    </table>

    <div class="sub-title" style="margin-top:16px;">Observations de l'évaluateur</div>
    <div class="text-block">${fiche.observations_evaluateur || '<em style="color:#94a3b8">Aucune observation</em>'}</div>

    <div class="sub-title" style="margin-top:14px;">Observations de l'agent</div>
    <div class="text-block">${fiche.observations_agent || '<em style="color:#94a3b8">Aucune observation</em>'}</div>

    <div class="sub-title" style="margin-top:14px;">Avis du Directeur Général</div>
    <div class="text-block">${fiche.avis_dg || '<em style="color:#94a3b8">Aucun avis</em>'}</div>

    ${dec ? `
    <div class="sub-title" style="margin-top:14px;">Décisions de la Division des Ressources Humaines</div>
    <div class="dec-grid">${decChecks}</div>` : ''}

    <!-- SIGNATURES -->
    <div class="section-title" style="margin-top:20px;">5. Signatures</div>
    <div class="sig-row">
      ${sigBlock("L'Évaluateur", fiche.evaluateur?.name ?? '—', fiche.signe_evaluateur_at)}
      ${sigBlock("L'Agent évalué", `${fiche.employee?.first_name ?? ''} ${fiche.employee?.last_name ?? ''}`, fiche.signe_agent_at)}
      ${sigBlock("Le Directeur Général", fiche.avis_dg ? 'DG / SG' : '—', fiche.signe_agent_at ? fiche.signe_agent_at : null)}
    </div>
    ${fiche.refus_signature_agent ? `<div style="margin-top:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:5px;padding:8px 12px;font-size:9.5pt;color:#dc2626;"><strong>Refus de signature :</strong> ${fiche.motif_refus_signature || 'Motif non précisé'}</div>` : ''}
  </div>

</div>

<!-- PIED DE PAGE -->
<div class="doc-footer">
  <span>ANASER — Fiche d'évaluation annuelle du personnel</span>
  <span>Statut : ${fiche.statut ? fiche.statut.replace(/_/g, ' ').toUpperCase() : '—'}</span>
  <span>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</span>
</div>

</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<EvalStatutFiche, string> = {
  a_planifier:       'À planifier',
  planifiee:         'Planifiée',
  en_cours:          'En cours',
  signee_evaluateur: 'Signée évaluateur',
  signee_agent:      'Signée agent',
  transmise_daf:     'Transmise DAF',
  annotee_dg:        'Annotée DG',
  notifiee:          'Notifiée',
  archivee:          'Archivée',
};

const STATUT_COLORS: Record<EvalStatutFiche, string> = {
  a_planifier:       '#94A3B8',
  planifiee:         '#3B82F6',
  en_cours:          '#F59E0B',
  signee_evaluateur: '#8B5CF6',
  signee_agent:      '#06B6D4',
  transmise_daf:     '#10B981',
  annotee_dg:        '#F97316',
  notifiee:          '#059669',
  archivee:          '#6B7280',
};

const APPRECIATION_LABELS: Record<EvalAppreciation, string> = {
  excellent:        'Excellent',
  tres_satisfaisant:'Très satisfaisant',
  satisfaisant:     'Satisfaisant',
  a_ameliorer:      'À améliorer',
  insuffisant:      'Insuffisant',
};

const APPRECIATION_COLORS: Record<EvalAppreciation, 'success' | 'info' | 'primary' | 'warning' | 'error'> = {
  excellent:        'success',
  tres_satisfaisant:'info',
  satisfaisant:     'primary',
  a_ameliorer:      'warning',
  insuffisant:      'error',
};

const WORKFLOW_STEPS: EvalStatutFiche[] = [
  'a_planifier', 'planifiee', 'en_cours',
  'signee_evaluateur', 'signee_agent', 'transmise_daf',
  'annotee_dg', 'notifiee', 'archivee',
];

// ── Dialog confirmation suppression ──────────────────────────────────────────

function ConfirmDeleteDialog({
  open, title, description, loading, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <DeleteForever sx={{ color: '#DC2626', fontSize: 28 }} />
        <Typography fontWeight={800} fontSize={17}>{title}</Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ borderRadius: 2, fontSize: 13 }}>{description}</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={loading}>Annuler</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{ bgcolor: '#DC2626', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#B91C1C' } }}
        >
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Supprimer définitivement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function StatutChip({ statut }: { statut: EvalStatutFiche }) {
  return (
    <Chip
      label={STATUT_LABELS[statut]}
      size="small"
      sx={{ bgcolor: STATUT_COLORS[statut] + '22', color: STATUT_COLORS[statut], fontWeight: 700, fontSize: 11 }}
    />
  );
}

function ApprecChip({ appreciation }: { appreciation: EvalAppreciation | null }) {
  if (!appreciation) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return (
    <Chip
      label={APPRECIATION_LABELS[appreciation]}
      color={APPRECIATION_COLORS[appreciation]}
      size="small"
      variant="outlined"
    />
  );
}

function MoyenneBar({ moyenne }: { moyenne: number | null }) {
  if (moyenne === null) return <Typography variant="body2" color="text.disabled">—/5</Typography>;
  const pct = (moyenne / 5) * 100;
  const color = moyenne >= 4.5 ? 'success' : moyenne >= 3.5 ? 'info' : moyenne >= 2.5 ? 'primary' : moyenne >= 1.5 ? 'warning' : 'error';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 7, borderRadius: 4 }} />
      </Box>
      <Typography variant="body2" fontWeight={700} sx={{ minWidth: 36 }}>{moyenne}/5</Typography>
    </Box>
  );
}

// ── Onglet 1 — Tableau de bord ────────────────────────────────────────────────

function DashboardTab() {
  const { data: campagnes, isLoading } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagneApi.list().then(r => r.data),
  });

  if (isLoading) return <LinearProgress />;

  const active = campagnes?.find(c => c.statut === 'active');
  const stats = active?.stats;

  return (
    <Box>
      {!active && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Aucune campagne active. Créez une campagne dans l'onglet <strong>Campagnes</strong> et lancez-la.
        </Alert>
      )}

      {active && (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #E2E8F0', background: 'linear-gradient(135deg, #002f59 0%, #004080 100%)' }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>
              Campagne {active.exercice} — {active.titre}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, mt: 0.5 }}>
              Période : {fmtDate(active.periode_debut)} → {fmtDate(active.periode_fin)}
            </Typography>
            {active.date_limite_entretiens && (
              <Typography sx={{ color: '#ff7631', fontSize: 13, mt: 0.5, fontWeight: 600 }}>
                Limite entretiens : {fmtDate(active.date_limite_entretiens)}
              </Typography>
            )}
          </Paper>

          {stats && (
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Total fiches',   value: stats.total,      color: '#6366F1' },
                { label: 'À planifier',    value: stats.a_planifier,color: '#94A3B8' },
                { label: 'Planifiées',     value: stats.planifiees, color: '#3B82F6' },
                { label: 'En cours',       value: stats.en_cours,   color: '#F59E0B' },
                { label: 'Signées',        value: stats.signees,    color: '#8B5CF6' },
                { label: 'Transmises DAF', value: stats.transmises, color: '#10B981' },
                { label: 'Notifiées',      value: stats.notifiees,  color: '#059669' },
                { label: 'Archivées',      value: stats.archivees,  color: '#6B7280' },
              ].map(kpi => (
                <Grid item xs={6} sm={3} md={3} key={kpi.label}>
                  <Card elevation={0} sx={{ border: `2px solid ${kpi.color}22`, borderTop: `4px solid ${kpi.color}`, borderRadius: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color }}>{kpi.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {stats && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Typography fontWeight={700} mb={1.5}>Avancement global</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, height: 24, borderRadius: 2, overflow: 'hidden' }}>
                {stats.total > 0 && [
                  { val: stats.a_planifier, color: '#94A3B8' },
                  { val: stats.planifiees,  color: '#3B82F6' },
                  { val: stats.en_cours,    color: '#F59E0B' },
                  { val: stats.signees,     color: '#8B5CF6' },
                  { val: stats.transmises,  color: '#10B981' },
                  { val: stats.notifiees + stats.archivees, color: '#059669' },
                ].filter(s => s.val > 0).map((s, i) => (
                  <Box key={i} sx={{ flex: s.val, bgcolor: s.color, minWidth: 4 }} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                {stats.notifiees + stats.archivees} / {stats.total} fiches finalisées
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

// ── Onglet 2 — Campagnes (liste + vue détail avec fiches) ─────────────────────

const STATUT_CAMPAGNE_LABELS: Record<string, string> = {
  preparation: 'Préparation', active: 'Active', synthese: 'Synthèse', cloturee: 'Clôturée',
};
const STATUT_CAMPAGNE_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  preparation: 'default', active: 'primary', synthese: 'warning', cloturee: 'success',
};

const EMPTY_FORM = {
  exercice: new Date().getFullYear(),
  titre: '',
  periode_debut: '',
  periode_fin: '',
};

function CampagnesTab() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<EvalCampagne | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvalCampagne | null>(null);
  const [selected, setSelected] = useState<EvalCampagne | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: campagnes, isLoading } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagneApi.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => evalCampagneApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eval-campagnes'] }); setOpenCreate(false); setForm(EMPTY_FORM); },
  });

  const updateMut = useMutation({
    mutationFn: (data: typeof form) => evalCampagneApi.update(editTarget!.id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
      if (selected?.id === editTarget?.id) setSelected(res.data as EvalCampagne);
      setEditTarget(null);
    },
  });

  const lancerMut = useMutation({
    mutationFn: (id: number) => evalCampagneApi.lancer(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
      qc.invalidateQueries({ queryKey: ['eval-fiches-campagne', id] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => evalCampagneApi.destroy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
      qc.invalidateQueries({ queryKey: ['eval-fiches'] });
      setDeleteTarget(null);
      setSelected(null);
    },
  });

  if (isLoading) return <LinearProgress />;

  // Vue détail d'une campagne
  if (selected) {
    return (
      <CampagneDetail
        campagne={selected}
        onBack={() => setSelected(null)}
        onDelete={() => setDeleteTarget(selected)}
        onEdit={() => {
          setEditTarget(selected);
          setForm({ exercice: selected.exercice, titre: selected.titre ?? '', periode_debut: selected.periode_debut ?? '', periode_fin: selected.periode_fin ?? '' });
        }}
        onLancer={() => lancerMut.mutate(selected.id)}
        lancerLoading={lancerMut.isPending}
        deleteConfirm={
          <ConfirmDeleteDialog
            open={!!deleteTarget}
            title="Supprimer la campagne"
            description={`La campagne "${deleteTarget?.titre}" et toutes ses fiches (${deleteTarget?.stats?.total ?? 0}) seront supprimées définitivement.`}
            loading={deleteMut.isPending}
            onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            onClose={() => setDeleteTarget(null)}
          />
        }
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={700} fontSize={16}>Campagnes d'évaluation</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}
          sx={{ bgcolor: '#002f59', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
          Nouvelle campagne
        </Button>
      </Box>

      {!campagnes?.length && !isLoading && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>Aucune campagne. Créez la première.</Alert>
      )}

      <Grid container spacing={2}>
        {campagnes?.map(c => (
          <Grid item xs={12} key={c.id}>
            <Paper elevation={0} sx={{
              border: '1px solid #E2E8F0', borderRadius: 2, p: 2,
              '&:hover': { borderColor: '#002f59', boxShadow: '0 2px 12px rgba(0,47,89,0.08)' },
              transition: 'all .15s', cursor: 'pointer',
            }}
              onClick={() => setSelected(c)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Année en gros */}
                <Box sx={{
                  minWidth: 64, height: 64, borderRadius: 2,
                  bgcolor: c.statut === 'active' ? '#002f59' : '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 900, color: c.statut === 'active' ? '#fff' : '#64748B' }}>
                    {c.exercice}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography fontWeight={800} fontSize={15} noWrap>{c.titre}</Typography>
                    <Chip label={STATUT_CAMPAGNE_LABELS[c.statut]} color={STATUT_CAMPAGNE_COLORS[c.statut]} size="small" />
                  </Box>
                  <Typography fontSize={12} color="text.secondary" mt={0.5}>
                    Période : {fmtDate(c.periode_debut)} → {fmtDate(c.periode_fin)}
                    {c.date_limite_entretiens && ` · Limite entretiens : ${fmtDate(c.date_limite_entretiens)}`}
                  </Typography>
                </Box>

                {/* Mini stats */}
                {c.stats && (
                  <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                    {[
                      { label: 'Total', value: c.stats.total,     color: '#6366F1' },
                      { label: 'En cours', value: c.stats.en_cours + c.stats.planifiees + c.stats.a_planifier, color: '#F59E0B' },
                      { label: 'Finalisées', value: c.stats.notifiees + c.stats.archivees, color: '#10B981' },
                    ].map(s => (
                      <Box key={s.label} sx={{ textAlign: 'center', minWidth: 52 }}>
                        <Typography fontWeight={800} fontSize={18} sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography fontSize={10} color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}

                <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
                  {c.statut === 'preparation' && (
                    <Button size="small" variant="contained"
                      disabled={lancerMut.isPending}
                      onClick={e => { e.stopPropagation(); lancerMut.mutate(c.id); }}
                      sx={{ bgcolor: '#002f59', borderRadius: 1.5, textTransform: 'none', fontSize: 12 }}>
                      {lancerMut.isPending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Lancer'}
                    </Button>
                  )}
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={e => {
                      e.stopPropagation();
                      setEditTarget(c);
                      setForm({ exercice: c.exercice, titre: c.titre ?? '', periode_debut: c.periode_debut ?? '', periode_fin: c.periode_fin ?? '' });
                    }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                      sx={{ color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Barre avancement */}
              {c.stats && c.stats.total > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  {[
                    { val: c.stats.a_planifier, color: '#CBD5E1' },
                    { val: c.stats.planifiees,  color: '#93C5FD' },
                    { val: c.stats.en_cours,    color: '#FCD34D' },
                    { val: c.stats.signees,     color: '#C4B5FD' },
                    { val: c.stats.transmises,  color: '#6EE7B7' },
                    { val: c.stats.notifiees + c.stats.archivees, color: '#10B981' },
                  ].filter(s => s.val > 0).map((s, i) => (
                    <Box key={i} sx={{ flex: s.val, bgcolor: s.color }} />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog suppression campagne */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Supprimer la campagne"
        description={`La campagne "${deleteTarget?.titre}" et toutes ses fiches (${deleteTarget?.stats?.total ?? 0}) seront supprimées définitivement.`}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Dialog création campagne */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Nouvelle campagne d'évaluation</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} pt={1}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Exercice *" type="number" size="small"
                value={form.exercice} onChange={e => setForm(f => ({ ...f, exercice: +e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Titre" size="small"
                value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                placeholder={`Campagne d'évaluation ${form.exercice}`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Début période" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={form.periode_debut} onChange={e => setForm(f => ({ ...f, periode_debut: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fin période" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={form.periode_fin} onChange={e => setForm(f => ({ ...f, periode_fin: e.target.value }))} />
            </Grid>
          </Grid>
          {createMut.isError && <Alert severity="error" sx={{ mt: 2 }}>Erreur lors de la création.</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={createMut.isPending} onClick={() => createMut.mutate(form)}
            sx={{ bgcolor: '#002f59', textTransform: 'none', fontWeight: 700 }}>
            {createMut.isPending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog modification campagne */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Modifier la campagne</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} pt={1}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Exercice *" type="number" size="small"
                value={form.exercice} onChange={e => setForm(f => ({ ...f, exercice: +e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Titre" size="small"
                value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                placeholder={`Campagne d'évaluation ${form.exercice}`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Début période" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={form.periode_debut} onChange={e => setForm(f => ({ ...f, periode_debut: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fin période" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={form.periode_fin} onChange={e => setForm(f => ({ ...f, periode_fin: e.target.value }))} />
            </Grid>
          </Grid>
          {updateMut.isError && <Alert severity="error" sx={{ mt: 2 }}>Erreur lors de la modification.</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditTarget(null)} sx={{ textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" disabled={updateMut.isPending} onClick={() => updateMut.mutate(form)}
            sx={{ bgcolor: '#002f59', textTransform: 'none', fontWeight: 700 }}>
            {updateMut.isPending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Vue détail campagne avec liste de fiches ──────────────────────────────────

function CampagneDetail({
  campagne, onBack, onDelete, onEdit, onLancer, lancerLoading, deleteConfirm,
}: {
  campagne: EvalCampagne;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onLancer: () => void;
  lancerLoading: boolean;
  deleteConfirm: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [openAddFiche, setOpenAddFiche] = useState(false);
  const [selectedFiche, setSelectedFiche] = useState<EvalFiche | null>(null);
  const [deleteFicheTarget, setDeleteFicheTarget] = useState<EvalFiche | null>(null);
  const [statutFilter, setStatutFilter] = useState<EvalStatutFiche | ''>('');
  const [pg, setPg] = useState(0);
  const [rpp, setRpp] = useState(15);

  const { data: fiches, isLoading } = useQuery({
    queryKey: ['eval-fiches-campagne', campagne.id, statutFilter],
    queryFn: () => evalFicheApi.list({ campagne_id: campagne.id, statut: statutFilter || undefined }).then(r => r.data),
  });

  const deleteFicheMut = useMutation({
    mutationFn: (id: number) => evalFicheApi.destroy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eval-fiches-campagne', campagne.id] });
      qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
      setDeleteFicheTarget(null);
    },
  });

  const stats = campagne.stats;

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button size="small" startIcon={<Assignment />} onClick={onBack}
          sx={{ textTransform: 'none', color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}>
          Campagnes
        </Button>
        <Typography color="text.disabled">/</Typography>
        <Typography fontWeight={700} fontSize={14}>{campagne.titre}</Typography>
      </Box>

      {/* Header campagne */}
      <Paper elevation={0} sx={{
        p: 2.5, mb: 3, borderRadius: 2,
        background: 'linear-gradient(135deg, #002f59 0%, #004080 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>
                {campagne.titre}
              </Typography>
              <Chip label={STATUT_CAMPAGNE_LABELS[campagne.statut]} color={STATUT_CAMPAGNE_COLORS[campagne.statut]} size="small" />
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Période : {fmtDate(campagne.periode_debut)} → {fmtDate(campagne.periode_fin)}
            </Typography>
            {campagne.date_limite_entretiens && (
              <Typography sx={{ color: '#ff7631', fontSize: 12, mt: 0.5, fontWeight: 600 }}>
                Limite entretiens : {fmtDate(campagne.date_limite_entretiens)}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {campagne.statut === 'preparation' && (
              <Button size="small" variant="contained" disabled={lancerLoading} onClick={onLancer}
                sx={{ bgcolor: '#ff7631', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#e06520' } }}>
                {lancerLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Lancer la campagne'}
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<Edit />} onClick={onEdit}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
              Modifier
            </Button>
            <Button size="small" variant="outlined" startIcon={<Delete />} onClick={onDelete}
              sx={{ color: '#FCA5A5', borderColor: '#FCA5A5', textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', borderColor: '#EF4444' } }}>
              Supprimer
            </Button>
          </Stack>
        </Box>

        {/* Barre avancement */}
        {stats && stats.total > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.5, height: 8, borderRadius: 4, overflow: 'hidden', mb: 1 }}>
              {[
                { val: stats.a_planifier, color: '#CBD5E1' },
                { val: stats.planifiees,  color: '#93C5FD' },
                { val: stats.en_cours,    color: '#FCD34D' },
                { val: stats.signees,     color: '#C4B5FD' },
                { val: stats.transmises,  color: '#6EE7B7' },
                { val: stats.notifiees + stats.archivees, color: '#10B981' },
              ].filter(s => s.val > 0).map((s, i) => (
                <Box key={i} sx={{ flex: s.val, bgcolor: s.color }} />
              ))}
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {[
                { label: 'Total', value: stats.total, color: '#fff' },
                { label: 'À planifier', value: stats.a_planifier, color: '#CBD5E1' },
                { label: 'En cours', value: stats.en_cours, color: '#FCD34D' },
                { label: 'Signées', value: stats.signees, color: '#C4B5FD' },
                { label: 'DAF', value: stats.transmises, color: '#6EE7B7' },
                { label: 'Finalisées', value: stats.notifiees + stats.archivees, color: '#10B981' },
              ].map(s => (
                <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FiberManualRecord sx={{ fontSize: 8, color: s.color }} />
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    {s.label} : <strong style={{ color: s.color }}>{s.value}</strong>
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Toolbar fiches */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography fontWeight={700} fontSize={15} sx={{ mr: 'auto' }}>
          Fiches d'évaluation ({fiches?.length ?? 0})
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statutFilter} label="Statut"
            onChange={e => { setStatutFilter(e.target.value as EvalStatutFiche | ''); setPg(0); }}>
            <MenuItem value="">Tous</MenuItem>
            {(Object.keys(STATUT_LABELS) as EvalStatutFiche[]).map(s => (
              <MenuItem key={s} value={s}>{STATUT_LABELS[s]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddFiche(true)}
          sx={{ bgcolor: '#002f59', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
          Ajouter une fiche
        </Button>
      </Box>

      {isLoading && <LinearProgress />}

      {/* Table fiches */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Agent / Matricule', 'Fonction', 'Direction', 'Évaluateur', 'Entretien', 'Moy.', 'Appréciation', 'Statut', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', bgcolor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!fiches?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    {campagne.statut === 'preparation'
                      ? 'Lancez la campagne pour générer les fiches automatiquement, ou ajoutez-en une manuellement.'
                      : 'Aucune fiche correspondant au filtre.'}
                  </TableCell>
                </TableRow>
              )}
              {fiches?.slice(pg * rpp, pg * rpp + rpp).map(f => (
                <TableRow key={f.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: '#002f59', color: '#fff' }}>
                        {`${f.employee?.first_name?.[0] ?? ''}${f.employee?.last_name?.[0] ?? ''}`}
                      </Avatar>
                      <Box>
                        <Typography fontSize={13} fontWeight={700} lineHeight={1.2}>
                          {f.employee?.first_name} {f.employee?.last_name}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary">{f.snapshot_matricule}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 140 }}>
                    <Typography fontSize={12} noWrap title={f.snapshot_fonction ?? ''}>{f.snapshot_fonction ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 140 }}>
                    <Typography fontSize={12} noWrap title={f.snapshot_direction ?? ''}>{f.snapshot_direction ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{f.evaluateur?.name ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(f.date_entretien)}</TableCell>
                  <TableCell>
                    {f.moyenne !== null
                      ? <Typography fontSize={13} fontWeight={800} sx={{ color: (f.moyenne ?? 0) >= 3.5 ? '#10B981' : (f.moyenne ?? 0) >= 2.5 ? '#3B82F6' : '#EF4444' }}>
                          {f.moyenne}/5
                        </Typography>
                      : <Typography fontSize={12} color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell><ApprecChip appreciation={f.appreciation} /></TableCell>
                  <TableCell><StatutChip statut={f.statut} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Ouvrir la fiche">
                        <IconButton size="small" onClick={() => setSelectedFiche(f)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => setDeleteFicheTarget(f)}
                          sx={{ color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {(fiches?.length ?? 0) > 0 && (
          <TablePagination
            component="div"
            count={fiches?.length ?? 0}
            page={pg}
            onPageChange={(_, p) => setPg(p)}
            rowsPerPage={rpp}
            onRowsPerPageChange={e => { setRpp(+e.target.value); setPg(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="Lignes :"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
            sx={{ borderTop: '1px solid #E2E8F0', fontSize: 12 }}
          />
        )}
      </Paper>

      {/* Dialog fiche détail */}
      {selectedFiche && (
        <FicheDetailDialog fiche={selectedFiche} onClose={() => setSelectedFiche(null)} />
      )}

      {/* Dialog ajouter fiche */}
      {openAddFiche && (
        <AddFicheDialog
          campagneId={campagne.id}
          onClose={() => setOpenAddFiche(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['eval-fiches-campagne', campagne.id] });
            qc.invalidateQueries({ queryKey: ['eval-campagnes'] });
            setOpenAddFiche(false);
          }}
        />
      )}

      {/* Dialog supprimer fiche */}
      <ConfirmDeleteDialog
        open={!!deleteFicheTarget}
        title="Supprimer la fiche"
        description={`La fiche de ${deleteFicheTarget?.employee?.first_name ?? ''} ${deleteFicheTarget?.employee?.last_name ?? ''} (${deleteFicheTarget?.snapshot_matricule ?? ''}) sera supprimée avec toutes ses données.`}
        loading={deleteFicheMut.isPending}
        onConfirm={() => deleteFicheTarget && deleteFicheMut.mutate(deleteFicheTarget.id)}
        onClose={() => setDeleteFicheTarget(null)}
      />

      {deleteConfirm}
    </Box>
  );
}

// ── Dialog ajout d'une fiche individuelle ────────────────────────────────────

function AddFicheDialog({ campagneId, onClose, onSuccess }: {
  campagneId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [statutAgent, setStatutAgent] = useState<'contractuel' | 'fonctionnaire' | 'decisionnaire'>('contractuel');
  const [errMsg, setErrMsg] = useState('');

  const { data: empPage } = useQuery({
    queryKey: ['employees-search', employeeSearch],
    queryFn: () => employeesApi.list({ search: employeeSearch, per_page: 20, status: 'active' }).then(r => r.data),
    enabled: employeeSearch.length >= 2 || !employeeSearch,
  });

  const createMut = useMutation({
    mutationFn: () => evalFicheApi.create({
      campagne_id: campagneId,
      employee_id: selectedEmp!.id,
      statut_agent: statutAgent,
    }),
    onSuccess,
    onError: (e: unknown) => {
      setErrMsg((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    },
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Add sx={{ color: '#002f59' }} /> Ajouter une fiche d'évaluation
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} pt={1}>
          {/* Recherche agent */}
          <Grid item xs={12}>
            <TextField
              fullWidth label="Rechercher un agent *" size="small"
              value={employeeSearch}
              onChange={e => { setEmployeeSearch(e.target.value); setSelectedEmp(null); }}
              placeholder="Nom, prénom ou matricule…"
              helperText={selectedEmp ? `✓ ${selectedEmp.first_name} ${selectedEmp.last_name} — ${selectedEmp.employee_number}` : 'Saisissez au moins 2 caractères'}
              FormHelperTextProps={{ sx: { color: selectedEmp ? '#10B981' : undefined, fontWeight: selectedEmp ? 700 : 400 } }}
            />
          </Grid>

          {/* Liste résultats */}
          {empPage?.data && !selectedEmp && employeeSearch.length >= 2 && (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, maxHeight: 220, overflow: 'auto' }}>
                {empPage.data.length === 0 && (
                  <Typography sx={{ p: 2, color: '#94A3B8', fontSize: 13 }}>Aucun agent trouvé.</Typography>
                )}
                {empPage.data.map(emp => (
                  <Box key={emp.id}
                    onClick={() => { setSelectedEmp(emp); setEmployeeSearch(`${emp.first_name} ${emp.last_name}`); }}
                    sx={{
                      px: 2, py: 1.2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                      '&:hover': { bgcolor: '#F0F9FF' }, borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#002f59', color: '#fff' }}>
                      {`${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`}
                    </Avatar>
                    <Box>
                      <Typography fontSize={13} fontWeight={600}>{emp.first_name} {emp.last_name}</Typography>
                      <Typography fontSize={11} color="text.secondary">{emp.employee_number} · {emp.fonction ?? '—'}</Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            </Grid>
          )}

          {/* Statut agent */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut de l'agent *</InputLabel>
              <Select value={statutAgent} label="Statut de l'agent *"
                onChange={e => setStatutAgent(e.target.value as typeof statutAgent)}>
                <MenuItem value="contractuel">Contractuel</MenuItem>
                <MenuItem value="fonctionnaire">Fonctionnaire (mis à disposition État)</MenuItem>
                <MenuItem value="decisionnaire">Décisionnaire</MenuItem>
              </Select>
            </FormControl>
            <Typography fontSize={11} color="text.secondary" mt={0.5}>
              Détermine la grille de critères applicable (7, 12 ou 18 critères).
            </Typography>
          </Grid>

          {errMsg && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>{errMsg}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button variant="contained" disabled={!selectedEmp || createMut.isPending} onClick={() => createMut.mutate()}
          sx={{ bgcolor: '#002f59', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
          {createMut.isPending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Ajouter la fiche'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Onglet 3 — Fiches ─────────────────────────────────────────────────────────

function FichesTab() {
  const [campagneFilter, setCampagneFilter] = useState<number | ''>('');
  const [statutFilter, setStatutFilter] = useState<EvalStatutFiche | ''>('');
  const [selectedFiche, setSelectedFiche] = useState<EvalFiche | null>(null);
  const [pg, setPg] = useState(0);
  const [rpp, setRpp] = useState(15);

  const { data: campagnes } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagneApi.list().then(r => r.data),
  });

  const { data: fiches, isLoading } = useQuery({
    queryKey: ['eval-fiches', campagneFilter, statutFilter],
    queryFn: () => evalFicheApi.list({
      campagne_id: campagneFilter || undefined,
      statut: statutFilter || undefined,
    }).then(r => r.data),
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Campagne</InputLabel>
          <Select value={campagneFilter} label="Campagne" onChange={e => { setCampagneFilter(e.target.value as number | ''); setPg(0); }}>
            <MenuItem value="">Toutes</MenuItem>
            {campagnes?.map(c => <MenuItem key={c.id} value={c.id}>{c.exercice} — {c.titre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statutFilter} label="Statut" onChange={e => { setStatutFilter(e.target.value as EvalStatutFiche | ''); setPg(0); }}>
            <MenuItem value="">Tous</MenuItem>
            {(Object.keys(STATUT_LABELS) as EvalStatutFiche[]).map(s => (
              <MenuItem key={s} value={s}>{STATUT_LABELS[s]}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading && <LinearProgress />}

      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Agent', 'Matricule', 'Direction', 'Fonction', 'Évaluateur', 'Entretien', 'Moyenne', 'Appréciation', 'Statut', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', bgcolor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!fiches?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    {campagneFilter ? 'Aucune fiche correspondant au filtre.' : 'Sélectionnez une campagne pour filtrer les fiches.'}
                  </TableCell>
                </TableRow>
              )}
              {fiches?.slice(pg * rpp, pg * rpp + rpp).map(f => (
                <TableRow key={f.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: '#002f59', color: '#fff' }}>
                        {`${f.employee?.first_name?.[0] ?? ''}${f.employee?.last_name?.[0] ?? ''}`}
                      </Avatar>
                      <Box>
                        <Typography fontSize={13} fontWeight={700} lineHeight={1.2}>
                          {f.employee?.first_name} {f.employee?.last_name}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary">{f.campagne?.exercice}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{f.snapshot_matricule}</TableCell>
                  <TableCell sx={{ maxWidth: 130 }}>
                    <Typography fontSize={12} noWrap>{f.employee?.department?.name ?? f.snapshot_direction ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 130 }}>
                    <Typography fontSize={12} noWrap>{f.snapshot_fonction ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{f.evaluateur?.name ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(f.date_entretien)}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}><MoyenneBar moyenne={f.moyenne} /></TableCell>
                  <TableCell><ApprecChip appreciation={f.appreciation} /></TableCell>
                  <TableCell><StatutChip statut={f.statut} /></TableCell>
                  <TableCell>
                    <Tooltip title="Ouvrir la fiche">
                      <IconButton size="small" onClick={() => setSelectedFiche(f)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {(fiches?.length ?? 0) > 0 && (
          <TablePagination
            component="div"
            count={fiches?.length ?? 0}
            page={pg}
            onPageChange={(_, p) => setPg(p)}
            rowsPerPage={rpp}
            onRowsPerPageChange={e => { setRpp(+e.target.value); setPg(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="Lignes :"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
            sx={{ borderTop: '1px solid #E2E8F0', fontSize: 12 }}
          />
        )}
      </Paper>

      {selectedFiche && (
        <FicheDetailDialog fiche={selectedFiche} onClose={() => setSelectedFiche(null)} />
      )}
    </Box>
  );
}

// ── Dialog Fiche Détail (4 pages) ─────────────────────────────────────────────

function FicheDetailDialog({ fiche: ficheInit, onClose }: { fiche: EvalFiche; onClose: () => void }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['eval-fiche', ficheInit.id],
    queryFn: () => evalFicheApi.show(ficheInit.id).then(r => r.data),
  });

  const fiche   = detail?.fiche ?? ficheInit;
  const criteres = detail?.criteres ?? [];

  // États locaux notation page 2
  const [notations, setNotations] = useState<Record<number, { note: number; observation: string }>>({});
  const [bilan, setBilan] = useState({ realisations: '', difficultes: '', competences_demontrees: '' });
  const [observations_evaluateur, setObsEval] = useState('');
  const [entretien_tenu, setEntretienTenu] = useState(false);

  // Besoins formation page 3
  const [besoins, setBesoins] = useState<EvalBesoinFormation[]>([]);
  // Objectifs page 4
  const [objectifs, setObjectifs] = useState<EvalObjectif[]>([]);
  // Décision RH page 4
  const [decision, setDecision] = useState<Partial<EvalDecisionRh>>({
    formation: false, coaching: false, mobilite: false,
    felicitations: false, suivi_particulier: false, gratification: false,
  });
  const [avis_dg, setAvisDG] = useState('');

  // Sync depuis API quand le détail arrive
  useState(() => {
    if (!detail) return;
    const f = detail.fiche;
    setBilan({
      realisations: f.realisations ?? '',
      difficultes: f.difficultes ?? '',
      competences_demontrees: f.competences_demontrees ?? '',
    });
    setObsEval(f.observations_evaluateur ?? '');
    setEntretienTenu(f.entretien_tenu ?? false);
    setAvisDG(f.avis_dg ?? '');
    if (f.besoins_formation) setBesoins(f.besoins_formation);
    if (f.objectifs) setObjectifs(f.objectifs);
    if (f.decision_rh) setDecision(f.decision_rh);
    const map: typeof notations = {};
    f.notations?.forEach(n => {
      map[n.critere_id] = { note: n.note ?? 0, observation: n.observation ?? '' };
    });
    setNotations(map);
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['eval-fiche', ficheInit.id] });
    qc.invalidateQueries({ queryKey: ['eval-fiches'] });
  };

  const action = async (fn: () => Promise<unknown>) => {
    setSaving(true); setErrMsg('');
    try { await fn(); invalidate(); }
    catch (e: unknown) { setErrMsg((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleNoter = () => action(async () => {
    const payload = Object.entries(notations).map(([cid, v]) => ({
      critere_id: +cid, note: v.note, observation: v.observation,
    }));
    await evalFicheApi.noter(fiche.id, {
      notations: payload,
      ...bilan, observations_evaluateur, entretien_tenu,
    });
    await evalFicheApi.sauvegarderBesoins(fiche.id, besoins);
    await evalFicheApi.sauvegarderObjectifs(fiche.id, objectifs);
  });

  const handleSignerEval = () => action(() => evalFicheApi.signerEvaluateur(fiche.id, observations_evaluateur));
  const handleSignerAgent = () => action(() => evalFicheApi.signerAgent(fiche.id, { observations_agent: fiche.observations_agent ?? '' }));
  const handleTransmettre = () => action(() => evalFicheApi.transmettreDAF(fiche.id));
  const handleAnnoterDG   = () => action(() => evalFicheApi.annoterDG(fiche.id, { avis_dg, decision }));
  const handleNotifier    = () => action(() => evalFicheApi.notifier(fiche.id));
  const handleArchiver    = () => action(() => evalFicheApi.archiver(fiche.id));

  // Calcul moyenne temps réel
  const notesRemplies = Object.values(notations).filter(n => n.note > 0);
  const moyenneTemp   = notesRemplies.length > 0
    ? Math.round(notesRemplies.reduce((s, n) => s + n.note, 0) / notesRemplies.length * 100) / 100
    : null;

  const stepIndex = WORKFLOW_STEPS.indexOf(fiche.statut);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #002f59 0%, #004080 100%)', px: 3, py: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {`${fiche.employee?.first_name?.[0] ?? ''}${fiche.employee?.last_name?.[0] ?? ''}`}
          </Avatar>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>
              {fiche.employee?.first_name} {fiche.employee?.last_name}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {fiche.snapshot_fonction} — {fiche.snapshot_direction}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', textAlign: 'right' }}>
            <StatutChip statut={fiche.statut} />
            {fiche.moyenne !== null && (
              <Typography sx={{ color: '#ff7631', fontWeight: 800, fontSize: 18, mt: 0.5 }}>
                {fiche.moyenne}/5
              </Typography>
            )}
          </Box>
        </Box>
        {/* Stepper workflow */}
        <Stepper activeStep={stepIndex} connector={<StepConnector sx={{ '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.3)' } }} />}>
          {WORKFLOW_STEPS.map((s, i) => (
            <Step key={s} completed={i < stepIndex}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': { color: i <= stepIndex ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 10 },
                  '& .MuiStepIcon-root': { color: i < stepIndex ? '#10B981' : i === stepIndex ? '#ff7631' : 'rgba(255,255,255,0.2)' },
                }}
              >
                {STATUT_LABELS[s].split(' ')[0]}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Onglets pages */}
      <Tabs value={page} onChange={(_, v) => setPage(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
        <Tab label="Page 1 — Identification" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
        <Tab label="Page 2 — Notation" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
        <Tab label="Page 3 — Bilan" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
        <Tab label="Page 4 — Développement & Décisions" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
      </Tabs>

      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        {isLoading && <LinearProgress />}
        {errMsg && <Alert severity="error" sx={{ m: 2 }}>{errMsg}</Alert>}

        {/* ── Page 1 : Identification ── */}
        {page === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography fontWeight={800} mb={2} color="#002f59">Identification de l'agent</Typography>
            <Grid container spacing={2}>
              {[
                ['Matricule',         fiche.snapshot_matricule],
                ['Nom complet',       `${fiche.employee?.first_name ?? ''} ${fiche.employee?.last_name ?? ''}`],
                ['Fonction',          fiche.snapshot_fonction],
                ['Direction',         fiche.snapshot_direction],
                ['Service / Poste',   fiche.snapshot_service],
                ['Supérieur',         fiche.snapshot_superieur],
                ['Statut agent',      fiche.statut_agent === 'fonctionnaire' ? 'Fonctionnaire (mis à disposition)' : fiche.statut_agent === 'decisionnaire' ? 'Décisionnaire' : 'Contractuel'],
                ['Ancienneté',        fiche.snapshot_anciennete_mois !== null ? `${fiche.snapshot_anciennete_mois} mois` : '—'],
                ['Évaluateur',        fiche.evaluateur?.name ?? '—'],
                ['Date entretien',    fmtDate(fiche.date_entretien)],
                ['Lieu entretien',    fiche.lieu_entretien ?? '—'],
                ['Campagne',          fiche.campagne ? `${fiche.campagne.exercice} — ${fiche.campagne.titre}` : '—'],
              ].map(([label, val]) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography fontWeight={600} fontSize={14}>{val || '—'}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Page 2 : Notation ── */}
        {page === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography fontWeight={800} color="#002f59">Grille de notation — /5</Typography>
              {moyenneTemp !== null && (
                <Paper elevation={0} sx={{ px: 2, py: 0.75, bgcolor: '#002f59', borderRadius: 2 }}>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                    Moy. : {moyenneTemp}/5
                    {moyenneTemp >= 4.5 ? ' — Excellent' : moyenneTemp >= 3.5 ? ' — Très satisfaisant' : moyenneTemp >= 2.5 ? ' — Satisfaisant' : moyenneTemp >= 1.5 ? ' — À améliorer' : ' — Insuffisant'}
                  </Typography>
                </Paper>
              )}
            </Box>

            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}>
              <strong>{fiche.statut_agent === 'fonctionnaire' ? '18 critères' : '12 critères'}</strong> applicables pour un agent{' '}
              <strong>{fiche.statut_agent === 'fonctionnaire' ? 'fonctionnaire' : 'contractuel/décisionnaire'}</strong>.
            </Alert>

            {['base', 'complementaire', 'fonctionnaire'].map(categorie => {
              const cats = criteres.filter(c => c.categorie === categorie);
              if (!cats.length) return null;
              const labels: Record<string, string> = { base: '7 Critères de base', complementaire: '5 Critères complémentaires', fonctionnaire: '6 Critères spécifiques fonctionnaires' };
              return (
                <Box key={categorie} mb={3}>
                  <Typography fontWeight={700} color="#475569" mb={1} fontSize={13}>{labels[categorie]}</Typography>
                  <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Critère</TableCell>
                          {[1, 2, 3, 4, 5].map(n => (
                            <TableCell key={n} align="center" sx={{ fontWeight: 700, fontSize: 12, width: 48 }}>{n}</TableCell>
                          ))}
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Observation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cats.map((c: EvalCritere) => {
                          const n = notations[c.id] ?? { note: 0, observation: '' };
                          return (
                            <TableRow key={c.id} hover>
                              <TableCell sx={{ fontSize: 13 }}>
                                <Typography fontSize={12} color="text.secondary" component="span" mr={0.5}>{c.code}</Typography>
                                {c.libelle}
                              </TableCell>
                              {[1, 2, 3, 4, 5].map(val => (
                                <TableCell key={val} align="center">
                                  <Box
                                    onClick={() => setNotations(prev => ({ ...prev, [c.id]: { ...n, note: val } }))}
                                    sx={{
                                      width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                                      bgcolor: n.note === val ? '#002f59' : '#F1F5F9',
                                      color: n.note === val ? '#fff' : '#64748B',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      mx: 'auto', fontWeight: 700, fontSize: 13, transition: 'all .15s',
                                      '&:hover': { bgcolor: n.note === val ? '#002f59' : '#CBD5E1' },
                                    }}
                                  >{val}</Box>
                                </TableCell>
                              ))}
                              <TableCell>
                                <TextField size="small" fullWidth placeholder="Observation…"
                                  value={n.observation}
                                  onChange={e => setNotations(prev => ({ ...prev, [c.id]: { ...n, observation: e.target.value } }))}
                                  sx={{ '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              );
            })}

            {/* Entretien tenu */}
            <FormControlLabel
              control={<Checkbox checked={entretien_tenu} onChange={e => setEntretienTenu(e.target.checked)} />}
              label={<Typography fontSize={13}>Entretien tenu le {fmtDate(fiche.date_entretien)}</Typography>}
            />
          </Box>
        )}

        {/* ── Page 3 : Bilan professionnel ── */}
        {page === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography fontWeight={800} color="#002f59" mb={2}>Bilan professionnel</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label="Principales réalisations de la période"
                  value={bilan.realisations}
                  onChange={e => setBilan(b => ({ ...b, realisations: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label="Difficultés rencontrées dans l'exercice des fonctions"
                  value={bilan.difficultes}
                  onChange={e => setBilan(b => ({ ...b, difficultes: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label="Compétences démontrées"
                  value={bilan.competences_demontrees}
                  onChange={e => setBilan(b => ({ ...b, competences_demontrees: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography fontWeight={700} fontSize={14}>Besoins de formation et renforcement des capacités</Typography>
                  <Button size="small" startIcon={<Add />}
                    onClick={() => setBesoins(b => [...b, { intitule: '', priorite: 'moyenne' }])}
                    sx={{ textTransform: 'none' }}>Ajouter</Button>
                </Box>
                {besoins.map((b, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                    <TextField size="small" label="Formation souhaitée" value={b.intitule} sx={{ flex: 1 }}
                      onChange={e => setBesoins(prev => prev.map((x, j) => j === i ? { ...x, intitule: e.target.value } : x))} />
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>Priorité</InputLabel>
                      <Select value={b.priorite} label="Priorité"
                        onChange={e => setBesoins(prev => prev.map((x, j) => j === i ? { ...x, priorite: e.target.value as EvalBesoinFormation['priorite'] } : x))}>
                        <MenuItem value="haute">Haute</MenuItem>
                        <MenuItem value="moyenne">Moyenne</MenuItem>
                        <MenuItem value="faible">Faible</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton size="small" color="error" onClick={() => setBesoins(prev => prev.filter((_, j) => j !== i))}>
                      <Block fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Page 4 : Développement & Décisions ── */}
        {page === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography fontWeight={800} color="#002f59" mb={2}>Plan de développement & Signatures</Typography>
            <Grid container spacing={2.5}>
              {/* Objectifs N+1 */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography fontWeight={700} fontSize={14}>Objectifs assignés pour l'exercice suivant</Typography>
                  <Button size="small" startIcon={<Add />}
                    onClick={() => setObjectifs(o => [...o, { objectif: '', indicateur: '', echeance: null }])}
                    sx={{ textTransform: 'none' }}>Ajouter</Button>
                </Box>
                {objectifs.map((o, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                    <TextField size="small" label="Objectif" value={o.objectif} multiline sx={{ flex: 2 }}
                      onChange={e => setObjectifs(prev => prev.map((x, j) => j === i ? { ...x, objectif: e.target.value } : x))} />
                    <TextField size="small" label="Indicateur" value={o.indicateur ?? ''} sx={{ flex: 1 }}
                      onChange={e => setObjectifs(prev => prev.map((x, j) => j === i ? { ...x, indicateur: e.target.value } : x))} />
                    <TextField size="small" label="Échéance" type="date" InputLabelProps={{ shrink: true }} value={o.echeance ?? ''} sx={{ width: 140 }}
                      onChange={e => setObjectifs(prev => prev.map((x, j) => j === i ? { ...x, echeance: e.target.value } : x))} />
                    <IconButton size="small" color="error" onClick={() => setObjectifs(prev => prev.filter((_, j) => j !== i))}>
                      <Block fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Grid>

              {/* Observations */}
              <Grid item xs={12} sm={6}>
                <TextField fullWidth multiline minRows={3} label="Observations de l'évaluateur"
                  value={observations_evaluateur}
                  onChange={e => setObsEval(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0', minHeight: 100 }}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Observations de l'agent</Typography>
                  <Typography fontSize={13}>{fiche.observations_agent || '—'}</Typography>
                  {fiche.refus_signature_agent && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: 12 }}>
                      Refus de signature : {fiche.motif_refus_signature}
                    </Alert>
                  )}
                </Paper>
              </Grid>

              {/* Décisions RH */}
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
                <Typography fontWeight={700} fontSize={14} mb={1}>Décisions de la Division des Ressources humaines</Typography>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <Grid container spacing={1}>
                    {([
                      ['formation',        'Formation'],
                      ['coaching',         'Coaching'],
                      ['mobilite',         'Mobilité'],
                      ['felicitations',    'Félicitations'],
                      ['suivi_particulier','Suivi particulier'],
                      ['gratification',    'Gratification'],
                    ] as [keyof EvalDecisionRh, string][]).map(([key, label]) => (
                      <Grid item xs={6} sm={4} key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={!!(decision[key])}
                              onChange={e => setDecision(d => ({ ...d, [key]: e.target.checked }))}
                            />
                          }
                          label={<Typography fontSize={13}>{label}</Typography>}
                        />
                      </Grid>
                    ))}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth size="small" label="Autres décisions"
                        value={decision.autre ?? ''}
                        onChange={e => setDecision(d => ({ ...d, autre: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth size="small" label="Commentaire"
                        value={decision.commentaire ?? ''}
                        onChange={e => setDecision(d => ({ ...d, commentaire: e.target.value }))} />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Avis DG */}
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Avis du Directeur Général"
                  value={avis_dg}
                  onChange={e => setAvisDG(e.target.value)} />
              </Grid>

              {/* Signatures */}
              <Grid item xs={12}>
                <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
                <Typography fontWeight={700} fontSize={14} mb={1.5}>Signatures</Typography>
                <Grid container spacing={2}>
                  {[
                    {
                      label: 'Évaluateur',
                      signed: fiche.signe_evaluateur_at,
                      name: fiche.evaluateur?.name,
                      icon: <Person />,
                    },
                    {
                      label: 'Agent évalué',
                      signed: fiche.signe_agent_at,
                      name: `${fiche.employee?.first_name ?? ''} ${fiche.employee?.last_name ?? ''}`,
                      icon: <Grade />,
                    },
                  ].map(sig => (
                    <Grid item xs={12} sm={6} key={sig.label}>
                      <Paper elevation={0} sx={{
                        p: 2, border: `2px solid ${sig.signed ? '#10B981' : '#E2E8F0'}`,
                        borderRadius: 2, textAlign: 'center',
                      }}>
                        {sig.signed
                          ? <CheckCircle sx={{ color: '#10B981', fontSize: 32, mb: 0.5 }} />
                          : <Box sx={{ width: 32, height: 32, mx: 'auto', mb: 0.5 }}>{sig.icon}</Box>}
                        <Typography fontWeight={700} fontSize={13}>{sig.label}</Typography>
                        <Typography fontSize={12} color="text.secondary">{sig.name}</Typography>
                        {sig.signed && (
                          <Typography fontSize={11} color="#10B981" mt={0.5}>Signé le {fmtDate(sig.signed)}</Typography>
                        )}
                        {!sig.signed && (
                          <Typography fontSize={11} color="#94A3B8" mt={0.5}>En attente de signature</Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ fontSize: 11, py: 0.5, borderRadius: 1.5 }}>
                      La signature de l'agent atteste uniquement sa prise de connaissance de l'évaluation, sans valoir approbation du contenu.
                    </Alert>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Actions workflow */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Fermer</Button>
        <Button
          startIcon={<Print />}
          onClick={() => printFiche(fiche, criteres, notations)}
          disabled={isLoading}
          sx={{ textTransform: 'none', color: '#002f59', borderColor: '#002f59', mr: 'auto' }}
          variant="outlined"
        >
          Imprimer / PDF
        </Button>

        {/* Sauvegarder notes (pages 2+3) */}
        {['a_planifier','planifiee','en_cours'].includes(fiche.statut) && (
          <Button variant="outlined" startIcon={<Assignment />} disabled={saving}
            onClick={handleNoter} sx={{ textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} /> : 'Sauvegarder'}
          </Button>
        )}

        {/* Signer évaluateur */}
        {fiche.statut === 'en_cours' && fiche.moyenne !== null && (
          <Button variant="contained" startIcon={<CheckCircle />} disabled={saving}
            onClick={handleSignerEval}
            sx={{ bgcolor: '#8B5CF6', textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Signer (évaluateur)'}
          </Button>
        )}

        {/* Signer agent */}
        {fiche.statut === 'signee_evaluateur' && (
          <Button variant="contained" startIcon={<CheckCircle />} disabled={saving}
            onClick={handleSignerAgent}
            sx={{ bgcolor: '#06B6D4', textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Signer (agent)'}
          </Button>
        )}

        {/* Transmettre DAF */}
        {fiche.statut === 'signee_agent' && (
          <Button variant="contained" startIcon={<Send />} disabled={saving}
            onClick={handleTransmettre}
            sx={{ bgcolor: '#10B981', textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Transmettre au DAF'}
          </Button>
        )}

        {/* Annoter DG */}
        {['transmise_daf', 'annotee_dg'].includes(fiche.statut) && (
          <Button variant="contained" startIcon={<Star />} disabled={saving}
            onClick={handleAnnoterDG}
            sx={{ bgcolor: '#F97316', textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Enregistrer décisions DG'}
          </Button>
        )}

        {/* Notifier */}
        {fiche.statut === 'annotee_dg' && (
          <Button variant="contained" startIcon={<Send />} disabled={saving}
            onClick={handleNotifier}
            sx={{ bgcolor: '#059669', textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Notifier l\'agent'}
          </Button>
        )}

        {/* Archiver */}
        {fiche.statut === 'notifiee' && (
          <Button variant="outlined" startIcon={<Archive />} disabled={saving}
            onClick={handleArchiver}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} /> : 'Archiver'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Onglet 4 — Synthèse ───────────────────────────────────────────────────────

function SyntheseTab() {
  const [campagneId, setCampagneId] = useState<number | ''>('');

  const { data: campagnes } = useQuery({
    queryKey: ['eval-campagnes'],
    queryFn: () => evalCampagneApi.list().then(r => r.data),
  });

  const { data: synthese, isLoading } = useQuery({
    queryKey: ['eval-synthese', campagneId],
    queryFn: () => evalCampagneApi.synthese(campagneId as number).then(r => r.data),
    enabled: !!campagneId,
  });

  const APPREC_COLOR: Record<string, string> = {
    excellent: '#059669', tres_satisfaisant: '#3B82F6',
    satisfaisant: '#6366F1', a_ameliorer: '#F59E0B', insuffisant: '#EF4444',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Sélectionner une campagne</InputLabel>
          <Select value={campagneId} label="Sélectionner une campagne" onChange={e => setCampagneId(e.target.value as number)}>
            {campagnes?.map(c => <MenuItem key={c.id} value={c.id}>{c.exercice} — {c.titre}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {isLoading && <LinearProgress />}

      {synthese && (
        <>
          {/* KPIs globaux */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={800} color="#002f59">{synthese.total_fiches}</Typography>
                <Typography variant="caption" color="text.secondary">Fiches finalisées</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={800} color="#10B981">{synthese.moyenne_globale}/5</Typography>
                <Typography variant="caption" color="text.secondary">Moyenne globale ANASER</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={800} color="#6366F1">{synthese.synthese.length}</Typography>
                <Typography variant="caption" color="text.secondary">Directions évaluées</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Tableau par direction */}
          {synthese.synthese.map(dir => (
            <Paper key={dir.direction} elevation={0} sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight={800}>{dir.direction}</Typography>
                <Stack direction="row" spacing={2}>
                  <Typography variant="caption" color="text.secondary">{dir.nb_agents} agent(s)</Typography>
                  <Typography variant="caption" fontWeight={700} color="#002f59">Moy. : {dir.moyenne_direction}/5</Typography>
                </Stack>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Matricule', 'Agent', 'Fonction', 'Moyenne', 'Appréciation', 'Décisions', 'Besoins formation'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: '#64748B' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dir.agents.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>{a.matricule}</TableCell>
                      <TableCell fontWeight={600}>{a.nom_complet}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{a.fonction}</TableCell>
                      <TableCell>
                        {a.moyenne !== null
                          ? <Typography fontWeight={700} sx={{ color: a.moyenne >= 3.5 ? '#10B981' : a.moyenne >= 2.5 ? '#3B82F6' : '#EF4444' }}>{a.moyenne}/5</Typography>
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {a.appreciation
                          ? <Chip label={APPRECIATION_LABELS[a.appreciation]} size="small"
                              sx={{ bgcolor: APPREC_COLOR[a.appreciation] + '22', color: APPREC_COLOR[a.appreciation], fontWeight: 700, fontSize: 11 }} />
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {a.decisions && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {a.decisions.formation && <Chip label="Formation" size="small" color="primary" variant="outlined" sx={{ fontSize: 10 }} />}
                            {a.decisions.coaching && <Chip label="Coaching" size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />}
                            {a.decisions.mobilite && <Chip label="Mobilité" size="small" color="warning" variant="outlined" sx={{ fontSize: 10 }} />}
                            {a.decisions.felicitations && <Chip label="Félicitations" size="small" color="success" variant="outlined" sx={{ fontSize: 10 }} />}
                            {a.decisions.gratification && <Chip label="Gratification" size="small" color="error" variant="outlined" sx={{ fontSize: 10 }} />}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{a.besoins.join(', ') || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ))}
        </>
      )}

      {!campagneId && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>Sélectionnez une campagne pour afficher le tableau de synthèse.</Alert>
      )}
    </Box>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function EvaluationsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0F172A">
          Évaluation annuelle du personnel
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Campagne ANASER — CDC-ANASER-EVAL-2026-01
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid #E2E8F0', px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 48 },
            '& .Mui-selected': { color: '#002f59', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: '#002f59' },
          }}
        >
          <Tab icon={<BarChart sx={{ fontSize: 18 }} />} iconPosition="start" label="Tableau de bord" />
          <Tab icon={<EventNote sx={{ fontSize: 18 }} />} iconPosition="start" label="Campagnes" />
          <Tab icon={<Assignment sx={{ fontSize: 18 }} />} iconPosition="start" label="Fiches" />
          <Tab icon={<Grade sx={{ fontSize: 18 }} />} iconPosition="start" label="Synthèse" />
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
