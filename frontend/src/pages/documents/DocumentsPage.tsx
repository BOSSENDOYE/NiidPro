import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Button, Tabs, Tab, Card, CardContent, CardActions,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Autocomplete, CircularProgress, Tooltip, Divider, Alert,
  Stack, Avatar, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, Description, History, NoteAlt, Print,
  Close, Search, Archive, PlayArrow, Article, CheckCircle,
  AccessTime, Person, ContentCopy, Settings,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { documentsApi } from '../../api/documents';
import { employeesApi } from '../../api/employees';
import type { DocumentTemplate, DocumentTemplateSettings, Employee, GeneratedDocument } from '../../types';
import RichTextEditor, { type RichTextEditorHandle } from '../../components/common/RichTextEditor';

// ─── Constantes de l'organisation ────────────────────────────────────────────
const ORG_FOOTER = 'Sacré-cœur Cité Keur Gorgui Lot n° 06 – BP 25545 – contact@anaser.sn – Tél : +221 33 856 40 46';

// ─── Toutes les variables système disponibles ─────────────────────────────────
const PREDEFINED_KEYS = new Set([
  '{NOM_AGENT}', '{PRENOM_AGENT}', '{NOM_COMPLET}', '{MATRICULE}', '{FONCTION}',
  '{DIRECTION}', '{DATE_ENTREE_SERVICE}', '{DATE_NAISSANCE}', '{LIEU_NAISSANCE}',
  '{NATIONALITE}', '{EMAIL_PROFESSIONNEL}', '{TELEPHONE}', '{DATE_GENERATION}',
  '{ANNEE_EN_COURS}', '{NUMERO_DOCUMENT}',
]);

/** Detecte les variables {XXX} dans le contenu qui ne sont pas dans la liste système */
function detectCustomVars(content: string): string[] {
  const matches = content.match(/\{[A-Z0-9_]+\}/g) ?? [];
  return [...new Set(matches.filter((m) => !PREDEFINED_KEYS.has(m)))];
}

/** Génère le HTML complet au format officiel ANASER pour l'impression */
function buildAnaserPrintHtml(docs: GeneratedDocument[], template: DocumentTemplate): string {
  const s: DocumentTemplateSettings = template.settings ?? {};
  const ministry    = s.ministry         ?? 'Ministère des Infrastructures, des Transports terrestres et Aériens';
  const sigName     = s.signataire_name  ?? '';
  const sigTitle    = s.signataire_title ?? 'Le Directeur Général';
  const ampliations = s.ampliations      ?? [];
  const typeLabel   = template.type === 'attestation' ? 'ATTESTATION' : 'NOTE DE SERVICE';

  const pages = docs.map((doc) => {
    const dateDoc = new Date(doc.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    return `
    <div class="page">
      <div class="header">
        <div class="header-left">
          <p class="republic">RÉPUBLIQUE DU SÉNÉGAL</p>
          <p class="motto"><em>Un Peuple – Un But – Une Foi</em></p>
          <p class="sep">------</p>
          <p class="ministry">${ministry}</p>
          <div class="logo-block">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="#003366" stroke-width="2"/>
              <text x="30" y="38" text-anchor="middle" font-family="Arial" font-weight="900"
                font-size="24" fill="#003366" font-style="italic">A</text>
            </svg>
            <p class="logo-name">ANASER</p>
            <p class="logo-sub">Sénégal — AGENCE NATIONALE<br>DE SÉCURITÉ ROUTIÈRE</p>
          </div>
        </div>
        <div class="header-right">
          <p class="ref">N° <strong>${doc.reference}</strong>/ANASER/DG/SG/DAF/RH</p>
          <br>
          <p class="date">Dakar, le ${dateDoc}</p>
        </div>
      </div>

      <p class="signataire"><strong>Le Directeur général,</strong></p>

      <div class="doc-title">
        <strong><u>${typeLabel}</u></strong>
      </div>

      <div class="doc-body">${doc.content_final.replace(/<script[^>]*>.*?<\/script>/gi, '')}</div>

      <div class="sig-block">
        <p>${sigTitle}</p>
        <br><br><br><br>
        <p class="sig-name">${sigName}</p>
      </div>

      ${ampliations.length > 0 ? `
      <div class="ampliations">
        <p><strong><u>Ampliations :</u></strong></p>
        <ul>${ampliations.map((a) => `<li>${a} ;</li>`).join('')}</ul>
      </div>` : ''}

      <div class="footer">${ORG_FOOTER}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Documents ANASER</title>
  <style>
    @page { margin: 1.8cm 2cm; size: A4 portrait; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }
    .page { position: relative; min-height: 240mm; page-break-after: always; padding-bottom: 40px; }
    .page:last-child { page-break-after: avoid; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .header-left { flex: 0 0 48%; }
    .header-right { flex: 0 0 46%; text-align: right; }
    .republic { font-weight: bold; font-size: 11pt; }
    .motto { font-size: 10pt; margin-top: 2px; }
    .sep { margin: 4px 0; }
    .ministry { font-size: 10pt; font-weight: bold; margin: 6px 0; }
    .logo-block { margin: 8px 0 0 10px; display: inline-block; text-align: center; }
    .logo-name { font-size: 9pt; font-weight: 900; letter-spacing: 3px; color: #003366; margin-top: 3px; }
    .logo-sub { font-size: 7pt; color: #444; line-height: 1.3; }
    .ref { font-size: 12pt; margin-bottom: 6px; }
    .date { font-size: 12pt; }

    /* Body */
    .signataire { font-weight: bold; font-size: 13pt; margin: 20px 0 36px; }
    .doc-title {
      text-align: center; font-size: 14pt; letter-spacing: 2px;
      text-transform: uppercase; margin: 0 auto 36px; padding-bottom: 2px;
    }
    .doc-body { text-align: justify; line-height: 1.85; margin-bottom: 50px; }
    .doc-body p { margin-bottom: 12px; }
    .doc-body ul { padding-left: 30px; margin: 8px 0 12px; }
    .doc-body li { margin: 5px 0; }
    .doc-body strong { font-weight: bold; }
    .doc-body em { font-style: italic; }
    .doc-body u { text-decoration: underline; }

    /* Signature */
    .sig-block { float: right; text-align: center; width: 42%; margin: 0 10px 20px; }
    .sig-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; }

    /* Ampliations */
    .ampliations { clear: both; margin-top: 50px; }
    .ampliations ul { list-style: none; padding-left: 16px; margin-top: 4px; }
    .ampliations li::before { content: "- "; }
    .ampliations li { margin: 2px 0; font-size: 11pt; }

    /* Footer */
    .footer {
      position: absolute; bottom: 0; left: 0; right: 0;
      text-align: center; font-size: 8pt; color: #333;
      border-top: 3px solid #003399; padding-top: 5px;
      background: #fff;
    }
  </style>
</head>
<body>${pages}</body>
</html>`;
}

// ─── Available variables ─────────────────────────────────────────────────────
const VARIABLES = [
  { key: '{NOM_AGENT}',           label: 'Nom' },
  { key: '{PRENOM_AGENT}',        label: 'Prénom' },
  { key: '{NOM_COMPLET}',         label: 'Nom complet' },
  { key: '{MATRICULE}',           label: 'Matricule' },
  { key: '{FONCTION}',            label: 'Fonction' },
  { key: '{DIRECTION}',           label: 'Direction' },
  { key: '{DATE_ENTREE_SERVICE}', label: 'Date entrée en service' },
  { key: '{DATE_NAISSANCE}',      label: 'Date de naissance' },
  { key: '{LIEU_NAISSANCE}',      label: 'Lieu de naissance' },
  { key: '{NATIONALITE}',         label: 'Nationalité' },
  { key: '{EMAIL_PROFESSIONNEL}', label: 'Email professionnel' },
  { key: '{TELEPHONE}',           label: 'Téléphone' },
  { key: '{DATE_GENERATION}',     label: 'Date de génération' },
  { key: '{ANNEE_EN_COURS}',      label: 'Année en cours' },
  { key: '{NUMERO_DOCUMENT}',     label: 'Numéro du document' },
];

// ─── Type config ─────────────────────────────────────────────────────────────
const TYPE_CFG = {
  attestation: {
    label:    'Attestation',
    color:    '#2563EB',
    bg:       '#EFF6FF',
    border:   '#BFDBFE',
    icon:     <Description sx={{ fontSize: 18 }} />,
    multi:    false,
  },
  note_service: {
    label:    'Note de service',
    color:    '#7C3AED',
    bg:       '#F5F3FF',
    border:   '#DDD6FE',
    icon:     <NoteAlt sx={{ fontSize: 18 }} />,
    multi:    true,
  },
};

// ─── Template Form Modal ──────────────────────────────────────────────────────
interface TemplateFormValues {
  name:              string;
  description:       string;
  content:           string;
  ministry:          string;
  signataire_name:   string;
  signataire_title:  string;
  ampliations_text:  string;
}

interface TemplateModalProps {
  open:     boolean;
  onClose:  () => void;
  template: DocumentTemplate | null;
  type:     'attestation' | 'note_service';
}

function TemplateModal({ open, onClose, template, type }: TemplateModalProps) {
  const qc                            = useQueryClient();
  const editorRef                     = useRef<RichTextEditorHandle>(null);
  const cfg                           = TYPE_CFG[type];
  const [customVars, setCustomVars]   = useState<string[]>([]);
  const [newVarInput, setNewVarInput] = useState('');
  const [varError, setVarError]       = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const { handleSubmit, reset, control, formState: { errors } } =
    useForm<TemplateFormValues>({
      defaultValues: {
        name: '', description: '', content: '',
        ministry:         'Ministère des Infrastructures, des Transports terrestres et Aériens (MITTA)',
        signataire_name:  'ATOUMANE SY',
        signataire_title: 'Le Directeur Général',
        ampliations_text: 'DG\nSG\nDAF/RH\nIntéressé(e)',
      },
    });

  /* Pré-remplissage au montage (key sur TemplateModal force un remontage frais à chaque ouverture) */
  useEffect(() => {
    if (template) {
      const s = template.settings ?? {};
      reset({
        name:             template.name,
        description:      template.description ?? '',
        content:          template.content,
        ministry:         s.ministry         ?? 'Ministère des Infrastructures, des Transports terrestres et Aériens (MITTA)',
        signataire_name:  s.signataire_name  ?? 'ATOUMANE SY',
        signataire_title: s.signataire_title ?? 'Le Directeur Général',
        ampliations_text: (s.ampliations ?? []).join('\n'),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildPayload = (d: TemplateFormValues) => ({
    name:        d.name,
    description: d.description,
    content:     d.content,
    type,
    settings: {
      ministry:         d.ministry,
      signataire_name:  d.signataire_name,
      signataire_title: d.signataire_title,
      ampliations:      d.ampliations_text.split('\n').map((l) => l.trim()).filter(Boolean),
    },
  });

  const createMut = useMutation({
    mutationFn: (d: TemplateFormValues) => documentsApi.createTemplate(buildPayload(d)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-templates'] }); onClose(); reset(); setCustomVars([]); },
  });

  const updateMut = useMutation({
    mutationFn: (d: TemplateFormValues) => documentsApi.updateTemplate(template!.id, buildPayload(d)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-templates'] }); onClose(); },
  });

  const onSubmit = (d: TemplateFormValues) =>
    template ? updateMut.mutate(d) : createMut.mutate(d);

  const insertVariable = (variable: string) => {
    editorRef.current?.insertContent(variable);
  };

  const addCustomVar = () => {
    const raw = newVarInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!raw) { setVarError('Entrez un nom de variable.'); return; }
    const formatted = `{${raw}}`;
    const allKeys = [...VARIABLES.map((v) => v.key), ...customVars];
    if (allKeys.includes(formatted)) { setVarError('Cette variable existe déjà.'); return; }
    setCustomVars((prev) => [...prev, formatted]);
    setNewVarInput('');
    setVarError('');
    setTimeout(() => insertVariable(formatted), 50);
  };

  const removeCustomVar = (key: string) => {
    setCustomVars((prev) => prev.filter((v) => v !== key));
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: cfg.bg, borderBottom: `1px solid ${cfg.border}`, py: 2, px: 3,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', bgcolor: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          {cfg.icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
            {template ? 'Modifier le modèle' : 'Nouveau modèle'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>{cfg.label}</Typography>
        </Box>
        <Chip label={cfg.label} size="small"
          sx={{ bgcolor: cfg.color, color: '#fff', fontWeight: 700, fontSize: 11 }} />
        <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Name + description */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Controller name="name" control={control} rules={{ required: 'Nom requis' }}
              render={({ field }) => (
                <TextField {...field} label="Nom du modèle *" size="small" error={!!errors.name}
                  helperText={errors.name?.message}
                  InputProps={{ sx: { borderRadius: '10px' } }} />
              )} />
            <Controller name="description" control={control}
              render={({ field }) => (
                <TextField {...field} label="Description" size="small"
                  InputProps={{ sx: { borderRadius: '10px' } }} />
              )} />
          </Box>

          {/* Variables picker */}
          <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E8EDF2' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1.25 }}>
              Variables — cliquez pour insérer à la position du curseur
            </Typography>

            {/* Variables système */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
              {VARIABLES.map((v) => (
                <Chip key={v.key} label={v.key} size="small" onClick={() => insertVariable(v.key)}
                  title={v.label}
                  sx={{
                    fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                    bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    '&:hover': { bgcolor: cfg.color, color: '#fff' },
                    transition: 'all 0.15s',
                  }} />
              ))}
            </Box>

            {/* Variables personnalisées */}
            {customVars.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Variables personnalisées
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {customVars.map((v) => (
                    <Chip key={v} label={v} size="small"
                      onClick={() => insertVariable(v)}
                      onDelete={() => removeCustomVar(v)}
                      sx={{
                        fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                        bgcolor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
                        '& .MuiChip-deleteIcon': { color: '#F97316', fontSize: 14 },
                        '&:hover': { bgcolor: '#F97316', color: '#fff',
                          '& .MuiChip-deleteIcon': { color: '#fff' } },
                        transition: 'all 0.15s',
                      }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Ajouter une variable */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  size="small" fullWidth
                  placeholder="Ex: GRADE, SALAIRE, CATEGORIE…"
                  value={newVarInput}
                  onChange={(e) => { setNewVarInput(e.target.value); setVarError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomVar(); } }}
                  error={!!varError}
                  helperText={varError || 'Entrez un nom puis appuyez sur Entrée ou cliquez Ajouter'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
                          {'{'}
                        </Typography>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
                          {'}'}
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '9px', fontFamily: 'monospace', fontSize: 13,
                      bgcolor: '#fff', textTransform: 'uppercase' },
                  }}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Box>
              <Button variant="contained" size="small" onClick={addCustomVar}
                startIcon={<Add sx={{ fontSize: 16 }} />}
                sx={{
                  mt: 0.25, borderRadius: '9px', textTransform: 'none', fontWeight: 700,
                  bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' }, px: 2, height: 40,
                  flexShrink: 0,
                }}>
                Ajouter
              </Button>
            </Box>
          </Box>

          {/* Éditeur riche */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569', mb: 1 }}>
              Contenu du modèle *
            </Typography>
            <Controller
              name="content"
              control={control}
              rules={{ required: 'Contenu requis', validate: (v) => v !== '<p></p>' || 'Contenu requis' }}
              render={({ field }) => (
                <RichTextEditor
                  ref={editorRef}
                  value={field.value}
                  onChange={field.onChange}
                  accentColor={cfg.color}
                  minHeight={260}
                  error={!!errors.content}
                />
              )}
            />
            {errors.content && (
              <Typography sx={{ fontSize: 11, color: '#EF4444', mt: 0.5 }}>
                {errors.content.message}
              </Typography>
            )}
          </Box>

          {/* Paramètres d'impression (signataire, ministère, ampliations) */}
          <Box sx={{ border: '1px solid #E8EDF2', borderRadius: '12px', overflow: 'hidden' }}>
            <Box
              onClick={() => setShowSettings((v) => !v)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2, py: 1.25, cursor: 'pointer', bgcolor: '#F8FAFC',
                '&:hover': { bgcolor: '#F1F5F9' }, userSelect: 'none',
              }}>
              <Settings sx={{ fontSize: 16, color: '#64748B' }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#475569', flex: 1 }}>
                Paramètres d'impression (entête & signature)
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                {showSettings ? '▲ Réduire' : '▼ Développer'}
              </Typography>
            </Box>
            {showSettings && (
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Controller name="signataire_name" control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Nom du signataire" size="small" placeholder="ATOUMANE SY"
                        InputProps={{ sx: { borderRadius: '9px' } }} />
                    )} />
                  <Controller name="signataire_title" control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Titre du signataire" size="small" placeholder="Le Directeur Général"
                        InputProps={{ sx: { borderRadius: '9px' } }} />
                    )} />
                </Box>
                <Controller name="ministry" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Ministère de tutelle" size="small" fullWidth
                      InputProps={{ sx: { borderRadius: '9px' } }} />
                  )} />
                <Controller name="ampliations_text" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Ampliations (une par ligne)" size="small" fullWidth
                      multiline rows={3} placeholder={'DG\nSG\nDAF/RH\nIntéressé(e)'}
                      InputProps={{ sx: { borderRadius: '9px', fontSize: 13 } }} />
                  )} />
                <Alert severity="info" sx={{ borderRadius: '9px', fontSize: 12, py: 0.5 }}>
                  Ces informations apparaissent sur le document imprimé (entête officielle ANASER, bloc signature, ampliations).
                </Alert>
              </Box>
            )}
          </Box>

          {(createMut.isError || updateMut.isError) && (
            <Alert severity="error" sx={{ borderRadius: '10px' }}>
              Une erreur est survenue. Veuillez réessayer.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}
            sx={{
              borderRadius: '10px', textTransform: 'none', fontWeight: 700,
              bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color, opacity: 0.9 },
              px: 3,
            }}>
            {isLoading ? <CircularProgress size={18} color="inherit" /> : (template ? 'Enregistrer' : 'Créer le modèle')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Generate Modal ───────────────────────────────────────────────────────────
interface GenerateModalProps {
  open:     boolean;
  onClose:  () => void;
  template: DocumentTemplate | null;
}

function GenerateModal({ open, onClose, template }: GenerateModalProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [generatedDocs, setGeneratedDocs]         = useState<GeneratedDocument[]>([]);
  const [step, setStep]                           = useState<'select' | 'vars' | 'preview'>('select');
  const [customVarValues, setCustomVarValues]     = useState<Record<string, string>>({});

  const qc  = useQueryClient();
  const cfg = template ? TYPE_CFG[template.type] : TYPE_CFG.attestation;

  // Detect custom variables (non-system) in template content
  const detectedVars = template ? detectCustomVars(template.content) : [];

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees-all'],
    queryFn:  () => employeesApi.list({ per_page: 500 }).then((r) => {
      const d = r.data as { data?: Employee[] } | Employee[];
      return Array.isArray(d) ? d : (d as { data?: Employee[] }).data ?? [];
    }),
    enabled: open,
  });

  const generateMut = useMutation({
    mutationFn: () => documentsApi.generate(
      template!.id,
      selectedEmployees.map((e) => e.id),
      customVarValues,
    ),
    onSuccess: (res) => {
      setGeneratedDocs(res.data.documents);
      setStep('preview');
      qc.invalidateQueries({ queryKey: ['doc-generated'] });
    },
  });

  const handleClose = () => {
    setSelectedEmployees([]); setGeneratedDocs([]);
    setStep('select'); setCustomVarValues({});
    onClose();
  };

  const handleNextFromSelect = () => {
    if (detectedVars.length > 0) setStep('vars');
    else generateMut.mutate();
  };

  const handlePrint = () => {
    if (!template || generatedDocs.length === 0) return;
    const html = buildAnaserPrintHtml(generatedDocs, template);
    const win  = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: cfg.bg, borderBottom: `1px solid ${cfg.border}`, py: 2, px: 3,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', bgcolor: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <PlayArrow sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
            Générer — {template.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
            {step === 'select' ? 'Étape 1 / Sélection des agents'
              : step === 'vars' ? 'Étape 2 / Valeurs des variables'
              : 'Étape 3 / Aperçu & Impression'}
          </Typography>
        </Box>
        {step === 'preview' && (
          <Button startIcon={<Print />} variant="contained" size="small" onClick={handlePrint}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, bgcolor: cfg.color,
              '&:hover': { bgcolor: cfg.color, opacity: 0.9 }, px: 2 }}>
            Imprimer (format ANASER)
          </Button>
        )}
        <IconButton size="small" onClick={handleClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>

        {/* ── STEP 1 : SELECT EMPLOYEES ── */}
        {step === 'select' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Autocomplete
              multiple={cfg.multi}
              options={employees}
              loading={empLoading}
              value={cfg.multi ? selectedEmployees : (selectedEmployees[0] ?? null)}
              onChange={(_, val) =>
                setSelectedEmployees(val ? (Array.isArray(val) ? val : [val]) : [])
              }
              getOptionLabel={(o: Employee) => `${o.full_name} — ${o.employee_number}`}
              renderOption={(props, o: Employee) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: cfg.color, fontSize: 12, fontWeight: 700 }}>
                    {o.first_name[0]}{o.last_name[0]}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{o.full_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                      {o.employee_number} · {o.position?.title ?? 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField {...params} label={cfg.multi ? 'Agent(s) concerné(s)' : 'Agent concerné'} size="small"
                  InputProps={{ ...params.InputProps, sx: { borderRadius: '10px' } }} />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            {selectedEmployees.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedEmployees.map((e) => (
                  <Chip key={e.id}
                    avatar={<Avatar sx={{ bgcolor: cfg.color + '22', color: cfg.color, fontSize: 11 }}>
                      {e.first_name[0]}{e.last_name[0]}
                    </Avatar>}
                    label={e.full_name}
                    onDelete={() => setSelectedEmployees((prev) => prev.filter((x) => x.id !== e.id))}
                    sx={{ bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, fontWeight: 600 }}
                  />
                ))}
              </Box>
            )}
            {generateMut.isError && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>Erreur lors de la génération.</Alert>
            )}
          </Box>
        )}

        {/* ── STEP 2 : CUSTOM VARIABLES ── */}
        {step === 'vars' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning" sx={{ borderRadius: '10px', fontSize: 13 }}>
              Ce modèle contient des variables personnalisées. Renseignez leurs valeurs ci-dessous.
            </Alert>
            {detectedVars.map((v) => (
              <TextField key={v}
                label={v}
                size="small"
                value={customVarValues[v] ?? ''}
                onChange={(e) => setCustomVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Valeur pour ${v}`}
                InputProps={{ sx: { borderRadius: '10px', fontFamily: 'inherit' } }}
              />
            ))}
          </Box>
        )}

        {/* ── STEP 3 : PREVIEW ── */}
        {step === 'preview' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CheckCircle sx={{ color: '#10B981' }} />
              <Typography sx={{ fontWeight: 700, color: '#10B981', fontSize: 14 }}>
                {generatedDocs.length} document{generatedDocs.length > 1 ? 's' : ''} généré{generatedDocs.length > 1 ? 's' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 420, overflowY: 'auto' }}>
              {generatedDocs.map((doc) => (
                <Paper key={doc.id} variant="outlined"
                  sx={{ p: 3, borderRadius: '12px', borderColor: cfg.border, bgcolor: '#FAFAFA' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Chip label={doc.reference} size="small"
                      sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.border}`, fontWeight: 700 }} />
                    {doc.employee && (
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {doc.employee.full_name} · {doc.employee.employee_number}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{
                    fontSize: 13, lineHeight: 1.9, color: '#1E293B',
                    '& p': { margin: '0 0 6px 0' },
                    '& h1': { fontSize: 18, fontWeight: 700, margin: '12px 0 6px' },
                    '& h2': { fontSize: 15, fontWeight: 700, margin: '10px 0 4px' },
                    '& ul, & ol': { paddingLeft: 24, margin: '4px 0' },
                    '& strong': { fontWeight: 700 }, '& em': { fontStyle: 'italic' },
                  }} dangerouslySetInnerHTML={{ __html: doc.content_final }} />
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
        <Button onClick={handleClose} variant="outlined"
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
          {step === 'preview' ? 'Fermer' : 'Annuler'}
        </Button>
        {step === 'select' && (
          <Button variant="contained"
            disabled={selectedEmployees.length === 0 || generateMut.isPending}
            onClick={handleNextFromSelect}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
              bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color, opacity: 0.9 }, px: 3 }}>
            {detectedVars.length > 0 ? 'Suivant →' : (generateMut.isPending
              ? <CircularProgress size={18} color="inherit" />
              : `Générer${selectedEmployees.length > 1 ? ` (${selectedEmployees.length})` : ''}`)}
          </Button>
        )}
        {step === 'vars' && (
          <>
            <Button onClick={() => setStep('select')} variant="outlined"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
              ← Retour
            </Button>
            <Button variant="contained" onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color, opacity: 0.9 }, px: 3 }}>
              {generateMut.isPending
                ? <CircularProgress size={18} color="inherit" />
                : `Générer${selectedEmployees.length > 1 ? ` (${selectedEmployees.length})` : ''}`}
            </Button>
          </>
        )}
        {step === 'preview' && (
          <Button onClick={() => { setStep('select'); setGeneratedDocs([]); setCustomVarValues({}); }}
            variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
            Nouveau
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── History Modal ────────────────────────────────────────────────────────────
interface HistoryModalProps {
  open:    boolean;
  onClose: () => void;
  type:    'attestation' | 'note_service';
}

function HistoryModal({ open, onClose, type }: HistoryModalProps) {
  const [search, setSearch] = useState('');
  const qc   = useQueryClient();
  const cfg  = TYPE_CFG[type];

  const { data, isLoading } = useQuery({
    queryKey: ['doc-generated', type, search],
    queryFn:  () => documentsApi.listGenerated({ type, search: search || undefined }).then((r) => r.data),
    enabled: open,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => documentsApi.deleteGenerated(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-generated'] }),
  });

  const rows: GeneratedDocument[] = (data as { data?: GeneratedDocument[] })?.data ?? [];

  const handlePrint = (doc: GeneratedDocument) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>@page{margin:2cm}body{font-family:Arial,sans-serif;font-size:13px;line-height:1.9}
      .ref{color:#666;font-size:11px;margin-bottom:20px}.body{white-space:pre-wrap;text-align:justify}</style>
      </head><body>
      <div class="ref">Réf: ${doc.reference}</div>
      <div class="body">${doc.content_final.replace(/<script[^>]*>.*?<\/script>/gi, '')}</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', maxHeight: '85vh' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: cfg.bg, borderBottom: `1px solid ${cfg.border}`, py: 2, px: 3,
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', bgcolor: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <History sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', flexGrow: 1 }}>
          Historique — {cfg.label}s
        </Typography>
        <TextField
          size="small" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment>,
            sx: { borderRadius: '10px', bgcolor: '#fff', fontSize: 13, width: 240 },
          }}
        />
        <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <History sx={{ fontSize: 48, color: '#CBD5E1', mb: 1.5 }} />
            <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>Aucun document généré</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  {['Référence', 'Agent', 'Matricule', 'Modèle', 'Généré par', 'Date', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((doc) => (
                  <TableRow key={doc.id} hover sx={{ '& td': { py: 1.25 } }}>
                    <TableCell>
                      <Chip label={doc.reference} size="small"
                        sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: cfg.bg,
                          color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: cfg.color + '22', color: cfg.color, fontSize: 11, fontWeight: 700 }}>
                          {doc.employee?.first_name?.[0]}{doc.employee?.last_name?.[0]}
                        </Avatar>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{doc.employee?.full_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>
                      {doc.employee?.employee_number}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#475569' }}>{doc.template?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#475569' }}>{doc.generator?.name ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#94A3B8' }}>
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Imprimer">
                          <IconButton size="small" onClick={() => handlePrint(doc)}
                            sx={{ color: cfg.color, '&:hover': { bgcolor: cfg.bg } }}>
                            <Print sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => deleteMut.mutate(doc.id)}
                            sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEE2E2' } }}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
interface TemplateCardProps {
  template:  DocumentTemplate;
  onEdit:    (t: DocumentTemplate) => void;
  onGenerate:(t: DocumentTemplate) => void;
  onDelete:  (id: number) => void;
}

function TemplateCard({ template, onEdit, onGenerate, onDelete }: TemplateCardProps) {
  const cfg     = TYPE_CFG[template.type];
  const count   = template.generated_documents_count ?? 0;
  const archived = template.status === 'archived';

  return (
    <Card sx={{
      borderRadius: '14px', border: `1px solid ${archived ? '#E2E8F0' : cfg.border}`,
      boxShadow: archived ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'all 0.2s', opacity: archived ? 0.65 : 1,
      '&:hover': { boxShadow: archived ? 'none' : '0 6px 24px rgba(0,0,0,0.10)', transform: archived ? 'none' : 'translateY(-2px)' },
    }}>
      {/* Header band */}
      <Box sx={{ height: 5, bgcolor: archived ? '#CBD5E1' : cfg.color, borderRadius: '14px 14px 0 0' }} />

      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
            bgcolor: archived ? '#F1F5F9' : cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: archived ? '#94A3B8' : cfg.color,
          }}>
            {cfg.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', lineHeight: 1.3 }} noWrap>
              {template.name}
            </Typography>
            {template.description && (
              <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.25 }} noWrap>
                {template.description}
              </Typography>
            )}
          </Box>
          {archived && (
            <Chip label="Archivé" size="small" icon={<Archive sx={{ fontSize: '14px !important' }} />}
              sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: 10, fontWeight: 600 }} />
          )}
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Article sx={{ fontSize: 14, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              {count} génération{count !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              {new Date(template.created_at).toLocaleDateString('fr-FR')}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 1.5, py: 1, gap: 0.5 }}>
        <Tooltip title="Modifier le modèle">
          <IconButton size="small" onClick={() => onEdit(template)}
            sx={{ color: '#475569', '&:hover': { color: cfg.color, bgcolor: cfg.bg } }}>
            <Edit sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Dupliquer">
          <IconButton size="small"
            sx={{ color: '#475569', '&:hover': { color: '#F97316', bgcolor: '#FFF7ED' } }}>
            <ContentCopy sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        {!archived && (
          <Tooltip title={archived ? 'Archivé' : 'Archiver'}>
            <IconButton size="small"
              sx={{ color: '#475569', '&:hover': { color: '#64748B', bgcolor: '#F1F5F9' } }}>
              <Archive sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Supprimer">
          <IconButton size="small" onClick={() => onDelete(template.id)}
            sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: '#FEE2E2' } }}>
            <Delete sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        {!archived && (
          <Button size="small" variant="contained" startIcon={<PlayArrow sx={{ fontSize: 15 }} />}
            onClick={() => onGenerate(template)}
            sx={{
              borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12,
              bgcolor: cfg.color, px: 1.5, py: 0.5,
              '&:hover': { bgcolor: cfg.color, opacity: 0.9 },
            }}>
            Générer
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────
interface TabPanelProps {
  type:     'attestation' | 'note_service';
  active:   boolean;
}

function DocTabPanel({ type, active }: TabPanelProps) {
  const [search, setSearch]         = useState('');
  const [templateModal, setTplModal] = useState<{ open: boolean; template: DocumentTemplate | null }>({ open: false, template: null });
  const [generateModal, setGenModal] = useState<DocumentTemplate | null>(null);
  const [historyOpen, setHistory]   = useState(false);
  const qc  = useQueryClient();
  const cfg = TYPE_CFG[type];

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['doc-templates', type, search],
    queryFn:  () => documentsApi.listTemplates({ type, search: search || undefined }).then((r) => r.data),
    enabled: active,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => documentsApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-templates'] }),
  });

  const filtered = templates as DocumentTemplate[];

  return (
    <Box sx={{ display: active ? 'flex' : 'none', flexDirection: 'column', gap: 2.5 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="Rechercher un modèle..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment>,
            sx: { borderRadius: '10px', width: 280, fontSize: 13 },
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<History />} variant="outlined" size="small"
          onClick={() => setHistory(true)}
          sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 13,
            color: cfg.color, borderColor: cfg.border, bgcolor: cfg.bg,
            '&:hover': { bgcolor: cfg.bg, borderColor: cfg.color } }}>
          Historique
        </Button>
        <Button startIcon={<Add />} variant="contained" size="small"
          onClick={() => setTplModal({ open: true, template: null })}
          sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, fontSize: 13,
            bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color, opacity: 0.9 } }}>
          Nouveau modèle
        </Button>
      </Box>

      {/* Grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: cfg.color }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 8, borderRadius: '14px',
          border: `2px dashed ${cfg.border}`, bgcolor: cfg.bg,
        }}>
          {cfg.icon && <Box sx={{ fontSize: 48, color: cfg.border, mb: 2 }}>{cfg.icon}</Box>}
          <Typography sx={{ fontWeight: 700, color: '#475569', mb: 1 }}>
            Aucun modèle {cfg.label.toLowerCase()}
          </Typography>
          <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 3 }}>
            Créez votre premier modèle pour commencer à générer des documents.
          </Typography>
          <Button startIcon={<Add />} variant="contained"
            onClick={() => setTplModal({ open: true, template: null })}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
              bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color, opacity: 0.9 } }}>
            Créer un modèle
          </Button>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' },
          gap: 2,
        }}>
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={(tpl) => setTplModal({ open: true, template: tpl })}
              onGenerate={(tpl) => setGenModal(tpl)}
              onDelete={(id) => deleteMut.mutate(id)}
            />
          ))}
        </Box>
      )}

      {/* Modals */}
      <TemplateModal
        key={templateModal.template?.id ?? 'new'}
        open={templateModal.open}
        onClose={() => setTplModal({ open: false, template: null })}
        template={templateModal.template}
        type={type}
      />
      <GenerateModal
        open={!!generateModal}
        onClose={() => setGenModal(null)}
        template={generateModal}
      />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistory(false)}
        type={type}
      />
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [tab, setTab] = useState<0 | 1>(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{
        p: 3, borderRadius: '16px', bgcolor: '#fff',
        border: '1px solid #E8EDF2',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -30, right: -30, width: 180, height: 180,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -50, right: 80, width: 140, height: 140,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)',
        }} />
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 50, height: 50, borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
          }}>
            <Description sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: '#F1F5F9', letterSpacing: '-0.4px' }}>
              Documents de Service
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#94A3B8', mt: 0.25 }}>
              Gestion des attestations et notes de service · Modèles et génération
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            {(['attestation', 'note_service'] as const).map((t) => {
              const cfg = TYPE_CFG[t];
              return (
                <Box key={t} sx={{
                  textAlign: 'center', px: 2, py: 1,
                  bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9' }}>—</Typography>
                  <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{cfg.label}s</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Tabs + Content */}
      <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #E8EDF2', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid #E8EDF2', px: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 52, gap: 1 },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}>
            <Tab
              label="Attestations"
              icon={<Description sx={{ fontSize: 18 }} />}
              iconPosition="start"
              sx={{ color: tab === 0 ? '#2563EB' : '#64748B' }}
            />
            <Tab
              label="Notes de service"
              icon={<NoteAlt sx={{ fontSize: 18 }} />}
              iconPosition="start"
              sx={{ color: tab === 1 ? '#7C3AED' : '#64748B' }}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <DocTabPanel type="attestation" active={tab === 0} />
          <DocTabPanel type="note_service" active={tab === 1} />
        </Box>
      </Box>
    </Box>
  );
}
