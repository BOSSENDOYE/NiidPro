import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, TextField,
  Divider, Alert, InputAdornment, Tooltip, Paper,
  CircularProgress, Collapse,
} from '@mui/material';
import {
  ArrowBack, Save, CheckCircle, Add,
  ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { documentsApi } from '../../api/documents';
import type { DocumentTemplate } from '../../types';
import RichTextEditor, { type RichTextEditorHandle } from '../../components/common/RichTextEditor';
import { useCompany } from '../../hooks/useCompany';

// ── 8 document types ──────────────────────────────────────────────────────────
export const DOC_TYPES = [
  { key: 'attestation',           label: 'Attestation de travail',   cat: 'Attestation', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', multi: false, title: 'ATTESTATION DE TRAVAIL',  prefix: 'ATT'  },
  { key: 'attestation_salaire',   label: 'Attestation de salaire',   cat: 'Attestation', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', multi: false, title: 'ATTESTATION DE SALAIRE',  prefix: 'ATS'  },
  { key: 'attestation_presence',  label: 'Attestation de présence',  cat: 'Attestation', color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD', multi: false, title: 'ATTESTATION DE PRÉSENCE', prefix: 'ATP'  },
  { key: 'note_service',          label: 'Note de service',           cat: 'Note',        color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', multi: true,  title: 'NOTE DE SERVICE',         prefix: 'NS'   },
  { key: 'lettre_mission',        label: 'Lettre de mission',         cat: 'Lettre',      color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', multi: false, title: 'LETTRE DE MISSION',       prefix: 'LM'   },
  { key: 'decision_avancement',   label: "Décision d'avancement",    cat: 'Décision',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', multi: false, title: "DÉCISION D'AVANCEMENT",  prefix: 'DA'   },
  { key: 'ordre_mission',         label: 'Ordre de mission',          cat: 'Ordre',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', multi: false, title: 'ORDRE DE MISSION',        prefix: 'OM'   },
  { key: 'contrat',               label: 'Contrat / Convention',      cat: 'Contrat',     color: '#374151', bg: '#F9FAFB', border: '#D1D5DB', multi: false, title: 'CONTRAT',                 prefix: 'CONT' },
] as const;

export type DocTypeKey = typeof DOC_TYPES[number]['key'];
export type DocTypeDef = typeof DOC_TYPES[number];

export function getDocType(key: string): DocTypeDef {
  return (DOC_TYPES.find(t => t.key === key) ?? DOC_TYPES[0]) as DocTypeDef;
}

// ── Variable groups ───────────────────────────────────────────────────────────
const VARIABLE_GROUPS = [
  {
    label: 'Agent', color: '#2563EB', bg: '#EFF6FF',
    vars: [
      { key: '{NOM_AGENT}',           label: 'Nom',               preview: 'DIALLO' },
      { key: '{PRENOM_AGENT}',        label: 'Prénom',            preview: 'Abdoulaye' },
      { key: '{NOM_COMPLET}',         label: 'Nom complet',       preview: 'Abdoulaye DIALLO' },
      { key: '{MATRICULE}',           label: 'Matricule',         preview: 'AG-2024-001' },
      { key: '{FONCTION}',            label: 'Fonction',          preview: 'Chargé RH' },
      { key: '{DIRECTION}',           label: 'Direction',         preview: 'DAF/RH' },
      { key: '{DATE_ENTREE_SERVICE}', label: 'Entrée en service', preview: '01/03/2015' },
      { key: '{DATE_NAISSANCE}',      label: 'Naissance',         preview: '15/05/1990' },
      { key: '{LIEU_NAISSANCE}',      label: 'Lieu naissance',    preview: 'Dakar' },
      { key: '{NATIONALITE}',         label: 'Nationalité',       preview: 'Sénégalaise' },
    ],
  },
  {
    label: 'Contact', color: '#059669', bg: '#F0FDF4',
    vars: [
      { key: '{EMAIL_PROFESSIONNEL}', label: 'Email professionnel', preview: 'a.diallo@anaser.sn' },
      { key: '{TELEPHONE}',           label: 'Téléphone',           preview: '+221 77 000 00 00' },
    ],
  },
  {
    label: 'Date & Référence', color: '#D97706', bg: '#FFFBEB',
    vars: [
      { key: '{DATE_GENERATION}', label: 'Date de génération', preview: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
      { key: '{ANNEE_EN_COURS}',  label: 'Année en cours',     preview: String(new Date().getFullYear()) },
      { key: '{NUMERO_DOCUMENT}', label: 'N° document',        preview: 'ATT-2026-0001' },
    ],
  },
] as const;

const PREDEFINED_KEYS = new Set(
  VARIABLE_GROUPS.flatMap(g => g.vars.map(v => v.key))
);

// ── Mock data for live preview ────────────────────────────────────────────────
const PREVIEW_MOCK: Record<string, string> = {
  NOM_AGENT: 'DIALLO',
  PRENOM_AGENT: 'Abdoulaye',
  NOM_COMPLET: 'Abdoulaye DIALLO',
  MATRICULE: 'AG-2024-001',
  FONCTION: 'Chargé des Ressources Humaines',
  DIRECTION: 'Direction Administrative et Financière',
  DATE_ENTREE_SERVICE: '01/03/2015',
  DATE_NAISSANCE: '15/05/1990',
  LIEU_NAISSANCE: 'Dakar',
  NATIONALITE: 'Sénégalaise',
  EMAIL_PROFESSIONNEL: 'a.diallo@anaser.sn',
  TELEPHONE: '+221 77 000 00 00',
  DATE_GENERATION: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
  ANNEE_EN_COURS: String(new Date().getFullYear()),
  NUMERO_DOCUMENT: 'ATT-2026-0001',
};

function substitutePreview(content: string, customVarNames: string[]): string {
  let result = content;
  Object.entries(PREVIEW_MOCK).forEach(([key, val]) => {
    result = result.replaceAll(`{${key}}`, val);
  });
  customVarNames.forEach(v => {
    result = result.replaceAll(v, `<span style="color:#F97316;font-style:italic;">[${v.replace(/[{}]/g, '')}]</span>`);
  });
  return result;
}

// ── Build preview HTML ────────────────────────────────────────────────────────
function buildPreviewHtml(p: {
  type: DocTypeDef;
  content: string;
  ministry: string;
  sigTitle: string;
  sigName: string;
  objet: string;
  ampliations: string[];
  customVarNames: string[];
  companyName: string;
  logoUrl: string;
}): string {
  const previewContent = substitutePreview(p.content, p.customVarNames);
  const dateDoc = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const letterFormat = !!p.objet;
  const refNum = `${p.type.prefix}-${new Date().getFullYear()}-XXXX`;
  const footer = 'Sacré-cœur Cité Keur Gorgui Lot n° 06 – BP 25545 – contact@anaser.sn – Tél : +221 33 856 40 46';

  const sigBlock = letterFormat
    ? `<div class="sig-block">
        <p class="paraph">/-/</p><br>
        <p class="addr-intro">À Monsieur</p>
        <p class="addr-name">Abdoulaye DIALLO</p>
        <p class="addr-fn">Chargé des Ressources Humaines</p>
      </div>`
    : `<div class="sig-block">
        <p>${p.sigTitle || 'Le Directeur Général'},</p>
        <br><br><br><br>
        <p class="sig-name">${p.sigName}</p>
      </div>`;

  const bodyHeader = letterFormat
    ? `<p class="objet"><u><strong>Objet :</strong></u> ${p.objet}</p>`
    : `<div class="doc-title"><strong><u>${p.type.title}</u></strong></div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; padding: 1.2cm 1.8cm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .header-left { flex: 0 0 52%; }
  .header-right { flex: 0 0 44%; text-align: right; }
  .republic { font-weight: bold; font-size: 10pt; }
  .motto { font-size: 9pt; margin-top: 1px; }
  .sep { margin: 2px 0; font-size: 9pt; }
  .ministry { font-size: 9.5pt; font-weight: bold; margin: 4px 0; }
  .logo-block { margin: 5px 0 0 8px; display: inline-block; }
  .ref { font-size: 11pt; margin-bottom: 3px; }
  .date { font-size: 11pt; }
  .signataire { font-weight: bold; font-size: 12pt; margin: 10px 0; }
  .objet { font-size: 11pt; margin: 0 0 12px; }
  .doc-title { text-align: center; font-size: 13pt; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 auto 18px; }
  .doc-body { text-align: justify; line-height: 1.6; margin-bottom: 16px; }
  .doc-body p { margin-bottom: 8px; }
  .doc-body ul, .doc-body ol { padding-left: 22px; margin: 4px 0 8px; }
  .doc-body strong { font-weight: bold; }
  .doc-body em { font-style: italic; }
  .doc-body u { text-decoration: underline; }
  .content-box { border: 1px solid #000; padding: 14px 18px; margin: 6px 0 16px; min-height: 80px; }
  .sig-block { float: right; text-align: center; width: 42%; margin: 0 8px 12px; }
  .sig-name { font-weight: bold; font-size: 11pt; text-transform: uppercase; }
  .paraph { font-size: 11pt; }
  .addr-intro, .addr-fn { font-size: 10.5pt; text-align: left; margin-top: 4px; }
  .addr-name { font-weight: bold; font-size: 10.5pt; text-align: left; }
  .ampliations { clear: both; margin-top: 18px; }
  .ampliations ul { list-style: none; padding-left: 12px; margin-top: 2px; }
  .ampliations li::before { content: "- "; }
  .ampliations li { margin: 1px 0; font-size: 10.5pt; }
  .footer { margin-top: 14px; text-align: center; font-size: 7.5pt; color: #333; border-top: 2px solid #003399; padding-top: 4px; }
  .empty-hint { color: #94A3B8; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <p class="republic">RÉPUBLIQUE DU SÉNÉGAL</p>
      <p class="motto"><em>Un Peuple – Un But – Une Foi</em></p>
      <p class="sep">------</p>
      <p class="ministry">${p.ministry || 'Ministère des Transports terrestres et aériens'}</p>
      <div class="logo-block">
        <img src="${p.logoUrl}" width="60" height="60" style="display:block;object-fit:contain;" alt="${p.companyName}" onerror="this.style.display='none'" />
      </div>
    </div>
    <div class="header-right">
      <p class="ref">N° <strong>${refNum}</strong>/${p.companyName}/DG/SG/DAF/RH</p>
      <br>
      <p class="date">Dakar, le ${dateDoc}</p>
    </div>
  </div>
  <p class="signataire"><strong>${p.sigTitle || 'Le Directeur Général'},</strong></p>
  ${bodyHeader}
  ${p.type.key === 'note_service' && !letterFormat
    ? `<div class="content-box"><div class="doc-body">${previewContent || '<p class="empty-hint">Le corps de la note apparaîtra ici…</p>'}</div></div>`
    : `<div class="doc-body">${previewContent || '<p class="empty-hint">Le contenu du document apparaîtra ici…</p>'}</div>`
  }
  ${sigBlock}
  ${p.ampliations.length > 0
    ? `<div class="ampliations"><p><strong><u>Ampliations :</u></strong></p><ul>${p.ampliations.map(a => `<li>${a} ;</li>`).join('')}</ul></div>`
    : ''}
  <div class="footer">${footer}</div>
</body>
</html>`;
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_MINISTRY   = 'Ministère des Transports terrestres et aériens';
const DEFAULT_SIG_NAME   = 'ATOUMANE SY';
const DEFAULT_SIG_TITLE  = 'Le Directeur Général';
const DEFAULT_AMPLIATIONS = 'DG\nSG\nDAF/RH\nIntéressé(e)';

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentStudio() {
  const { id }  = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { company } = useCompany();
  const editorRef    = useRef<RichTextEditorHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [docType,        setDocType]        = useState<DocTypeKey>('attestation');
  const [name,           setName]           = useState('');
  const [description,    setDescription]    = useState('');
  const [content,        setContent]        = useState('');
  const [ministry,       setMinistry]       = useState(DEFAULT_MINISTRY);
  const [sigName,        setSigName]        = useState(DEFAULT_SIG_NAME);
  const [sigTitle,       setSigTitle]       = useState(DEFAULT_SIG_TITLE);
  const [objet,          setObjet]          = useState('');
  const [ampliationsText, setAmpliationsText] = useState(DEFAULT_AMPLIATIONS);
  const [customVars,     setCustomVars]     = useState<string[]>([]);
  const [newVarInput,    setNewVarInput]    = useState('');
  const [newVarError,    setNewVarError]    = useState('');
  const [previewHtml,    setPreviewHtml]    = useState('');
  const [previewScale,   setPreviewScale]   = useState(0.68);
  const [saved,          setSaved]          = useState(false);
  const [varPanelOpen,   setVarPanelOpen]   = useState(true);
  const [initialLoad,    setInitialLoad]    = useState(false);

  const currentType = getDocType(docType);

  // ── Scale preview to container ────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 48;
        setPreviewScale(Math.max(0.4, Math.min(w / 793, 0.82)));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Load template for editing ─────────────────────────────────────────────────
  const { isLoading: tplLoading, data: tplData } = useQuery({
    queryKey: ['doc-template-studio', id],
    queryFn: () => documentsApi.getTemplate(Number(id)).then(r => r.data),
    enabled: !!id && !initialLoad,
  });

  useEffect(() => {
    if (!tplData || initialLoad) return;
    const s = tplData.settings ?? {};
    setDocType((tplData.type as DocTypeKey) ?? 'attestation');
    setName(tplData.name);
    setDescription(tplData.description ?? '');
    setContent(tplData.content);
    setMinistry(s.ministry ?? DEFAULT_MINISTRY);
    setSigName(s.signataire_name ?? DEFAULT_SIG_NAME);
    setSigTitle(s.signataire_title ?? DEFAULT_SIG_TITLE);
    setObjet(s.objet ?? '');
    setAmpliationsText((s.ampliations ?? []).join('\n'));
    setInitialLoad(true);
  }, [tplData, initialLoad]);

  // ── Debounced live preview ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewHtml(buildPreviewHtml({
        type: currentType,
        content,
        ministry,
        sigTitle,
        sigName,
        objet,
        ampliations: ampliationsText.split('\n').map(l => l.trim()).filter(Boolean),
        customVarNames: customVars,
        companyName: company?.name ?? 'ANASER',
        logoUrl: company?.logo_url ?? `${window.location.origin}/image.png`,
      }));
    }, 250);
    return () => clearTimeout(timer);
  }, [content, ministry, sigName, sigTitle, objet, ampliationsText, docType, customVars, company, currentType]);

  // ── Save / update ─────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        type: docType,
        name,
        description,
        content,
        settings: {
          ministry,
          signataire_name:  sigName,
          signataire_title: sigTitle,
          ...(objet ? { objet } : {}),
          ampliations: ampliationsText.split('\n').map(l => l.trim()).filter(Boolean),
          document_title: currentType.title,
        },
      };
      return id
        ? documentsApi.updateTemplate(Number(id), payload)
        : documentsApi.createTemplate(payload);
    },
    onSuccess: (res: { data: DocumentTemplate }) => {
      qc.invalidateQueries({ queryKey: ['doc-templates'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (!id) navigate(`/documents/studio/${res.data.id}`, { replace: true });
    },
  });

  const insertVariable = useCallback((key: string) => {
    editorRef.current?.insertContent(key);
  }, []);

  const addCustomVar = () => {
    const raw = newVarInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!raw) { setNewVarError('Entrez un nom de variable.'); return; }
    const formatted = `{${raw}}`;
    if (PREDEFINED_KEYS.has(formatted as never) || customVars.includes(formatted)) {
      setNewVarError('Cette variable existe déjà.'); return;
    }
    setCustomVars(prev => [...prev, formatted]);
    setNewVarInput('');
    setNewVarError('');
    setTimeout(() => insertVariable(formatted), 50);
  };

  const canSave = name.trim().length > 0 && content.length > 7;

  if (tplLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <Box sx={{
        bgcolor: '#fff', borderBottom: '1px solid #E8EDF2', flexShrink: 0,
        px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}>
        <Button startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/documents')}
          sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600,
            borderRadius: '8px', fontSize: 13, px: 1.5 }}>
          Documents
        </Button>
        <Divider orientation="vertical" flexItem />
        <Chip label={currentType.label} size="small"
          sx={{ bgcolor: currentType.bg, color: currentType.color,
            border: `1px solid ${currentType.border}`, fontWeight: 700, fontSize: 11 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0F172A', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || (id ? 'Modifier le modèle' : 'Nouveau modèle de document')}
        </Typography>
        {saved && (
          <Chip icon={<CheckCircle sx={{ fontSize: 14, color: '#059669' }} />}
            label="Sauvegardé" size="small"
            sx={{ bgcolor: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0', fontWeight: 700 }} />
        )}
        <Button variant="contained" onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !canSave}
          startIcon={saveMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Save sx={{ fontSize: 15 }} />}
          sx={{
            textTransform: 'none', borderRadius: '8px', fontWeight: 700, fontSize: 13,
            bgcolor: currentType.color, '&:hover': { bgcolor: currentType.color, filter: 'brightness(0.92)' },
            '&:disabled': { opacity: 0.5 },
          }}>
          {id ? 'Mettre à jour' : 'Créer le modèle'}
        </Button>
      </Box>

      {/* ── Split panel ── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─────────────────── LEFT: Editor ─────────────────── */}
        <Box sx={{ flex: '0 0 54%', overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {saveMut.isError && (
            <Alert severity="error" sx={{ borderRadius: '10px' }}>
              Erreur lors de la sauvegarde. Vérifiez que le nom et le contenu sont renseignés.
            </Alert>
          )}

          {/* 01 — Type de document */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px' }}>
            <SectionLabel n="01" label="Type de document" />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {DOC_TYPES.map(t => (
                <Chip key={t.key} label={t.label}
                  onClick={() => setDocType(t.key as DocTypeKey)}
                  sx={{
                    fontWeight: docType === t.key ? 700 : 500, fontSize: 12, cursor: 'pointer',
                    bgcolor: docType === t.key ? t.color : t.bg,
                    color:   docType === t.key ? '#fff' : t.color,
                    border:  `1.5px solid ${docType === t.key ? t.color : t.border}`,
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: t.color, color: '#fff' },
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* 02 — Identité du modèle */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px' }}>
            <SectionLabel n="02" label="Identité du modèle" />
            <Stack spacing={1.5}>
              <TextField fullWidth size="small" label="Nom du modèle *"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex : Attestation de travail CDI"
                error={saveMut.isError && !name.trim()}
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
              <TextField fullWidth size="small" label="Description (optionnel)"
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brève description pour retrouver facilement ce modèle…"
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
            </Stack>
          </Paper>

          {/* 03 — En-tête & signature */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px' }}>
            <SectionLabel n="03" label="En-tête officielle & signature" />
            <Stack spacing={1.5}>
              <TextField fullWidth size="small" label="Ministère de tutelle"
                value={ministry} onChange={e => setMinistry(e.target.value)}
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField size="small" label="Nom du signataire"
                  value={sigName} onChange={e => setSigName(e.target.value)}
                  placeholder="Ex : ATOUMANE SY"
                  InputProps={{ sx: { borderRadius: '10px' } }}
                />
                <TextField size="small" label="Titre du signataire"
                  value={sigTitle} onChange={e => setSigTitle(e.target.value)}
                  placeholder="Ex : Le Directeur Général"
                  InputProps={{ sx: { borderRadius: '10px' } }}
                />
              </Box>
              <TextField fullWidth size="small" label="Objet (format lettre — laisser vide pour attestation standard)"
                value={objet} onChange={e => setObjet(e.target.value)}
                placeholder="Ex : Convocation à l'entretien annuel d'évaluation"
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
            </Stack>
          </Paper>

          {/* 04 — Corps du document */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <SectionLabel n="04" label="Corps du document" noMargin />
              <Button size="small"
                startIcon={varPanelOpen ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                onClick={() => setVarPanelOpen(v => !v)}
                sx={{ textTransform: 'none', fontSize: 11, color: '#64748B',
                  borderRadius: '6px', px: 1 }}>
                Variables {varPanelOpen ? '▲' : '▼'}
              </Button>
            </Stack>

            {/* Variables panel */}
            <Collapse in={varPanelOpen}>
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '10px', mb: 2, border: '1px solid #E8EDF2' }}>
                <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600, mb: 1.5 }}>
                  Survolez pour voir la valeur de prévisualisation · Cliquez pour insérer au curseur
                </Typography>

                {VARIABLE_GROUPS.map(group => (
                  <Box key={group.label} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: group.color,
                      textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
                      {group.label}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {group.vars.map(v => (
                        <Tooltip key={v.key} title={`${v.label} → "${v.preview}"`} placement="top" arrow>
                          <Chip label={v.key} size="small"
                            onClick={() => insertVariable(v.key)}
                            sx={{
                              fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
                              bgcolor: group.bg, color: group.color,
                              border: `1px solid ${group.color}30`,
                              '&:hover': { bgcolor: group.color, color: '#fff' },
                              transition: 'all 0.12s',
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                ))}

                {/* Custom variables */}
                {customVars.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#F97316',
                      textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
                      Variables personnalisées
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {customVars.map(v => (
                        <Chip key={v} label={v} size="small"
                          onClick={() => insertVariable(v)}
                          onDelete={() => setCustomVars(prev => prev.filter(x => x !== v))}
                          sx={{
                            fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
                            bgcolor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
                            '& .MuiChip-deleteIcon': { color: '#F97316', fontSize: 14 },
                            '&:hover': { bgcolor: '#F97316', color: '#fff' },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Add custom var */}
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField size="small" sx={{ flex: 1 }}
                    placeholder="Nom personnalisé (ex: GRADE, SALAIRE)"
                    value={newVarInput}
                    onChange={e => { setNewVarInput(e.target.value); setNewVarError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomVar(); } }}
                    error={!!newVarError}
                    helperText={newVarError || undefined}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{'{'}</Typography>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{'}'}</Typography>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '8px', fontFamily: 'monospace', fontSize: 12, bgcolor: '#fff' },
                    }}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                  <Button variant="outlined" size="small" onClick={addCustomVar}
                    sx={{ mt: 0.25, borderRadius: '8px', textTransform: 'none', fontWeight: 700,
                      color: '#F97316', borderColor: '#F97316', height: 37, flexShrink: 0,
                      '&:hover': { bgcolor: '#FFF7ED', borderColor: '#EA580C' } }}>
                    <Add sx={{ fontSize: 16 }} />
                  </Button>
                </Stack>
              </Box>
            </Collapse>

            {/* Rich text editor */}
            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              accentColor={currentType.color}
              minHeight={320}
            />
            {saveMut.isError && !content.trim() && (
              <Typography sx={{ fontSize: 11, color: '#EF4444', mt: 0.5 }}>
                Le contenu est requis.
              </Typography>
            )}
          </Paper>

          {/* 05 — Ampliations */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px' }}>
            <SectionLabel n="05" label="Ampliations — destinataires en copie" />
            <TextField fullWidth size="small" multiline rows={4}
              label="Une ampliation par ligne"
              value={ampliationsText}
              onChange={e => setAmpliationsText(e.target.value)}
              placeholder={'DG\nSG\nDAF/RH\nIntéressé(e)'}
              InputProps={{ sx: { borderRadius: '10px', fontFamily: 'inherit', fontSize: 13 } }}
            />
            {ampliationsText.trim() && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {ampliationsText.split('\n').filter(Boolean).map((a, i) => (
                  <Chip key={i} label={a} size="small"
                    sx={{ fontSize: 11, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }} />
                ))}
              </Box>
            )}
          </Paper>

          {/* Bottom save */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 2 }}>
            <Button variant="contained" onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !canSave}
              startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Save />}
              sx={{
                textTransform: 'none', borderRadius: '10px', fontWeight: 700, px: 4,
                bgcolor: currentType.color, '&:hover': { bgcolor: currentType.color, filter: 'brightness(0.92)' },
              }}>
              {id ? 'Mettre à jour le modèle' : 'Créer le modèle'}
            </Button>
          </Box>
        </Box>

        {/* ─────────────────── RIGHT: Preview ─────────────────── */}
        <Box ref={containerRef} sx={{
          flex: '0 0 46%', bgcolor: '#D8DEE9',
          borderLeft: '1px solid #C8D0DC',
          overflowY: 'auto', p: 3,
          display: 'flex', flexDirection: 'column', gap: 2.5,
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5A6478',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Aperçu en temps réel
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label="A4 · Format officiel" size="small"
                sx={{ fontSize: 10, fontWeight: 700, bgcolor: '#fff', color: '#64748B',
                  border: '1px solid #CBD5E1' }} />
            </Stack>
          </Stack>

          {/* A4 scaled page */}
          <Box sx={{
            width:    Math.round(793 * previewScale),
            height:   Math.round(1122 * previewScale),
            overflow: 'hidden',
            borderRadius: '4px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            bgcolor: '#fff',
            flexShrink: 0,
            mx: 'auto',
          }}>
            <iframe
              srcDoc={previewHtml}
              title="Aperçu document officiel"
              sandbox="allow-same-origin"
              style={{
                width: '793px', height: '1122px',
                border: 'none', display: 'block',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            />
          </Box>

          <Alert severity="info" icon={false}
            sx={{ borderRadius: '10px', fontSize: 11, bgcolor: 'rgba(255,255,255,0.55)',
              color: '#64748B', border: '1px solid rgba(255,255,255,0.7)',
              '& .MuiAlert-message': { fontSize: 11 } }}>
            Données fictives utilisées pour l'aperçu. Les vraies données agent seront substituées lors de la génération.
          </Alert>
        </Box>
      </Box>
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ n, label, noMargin }: { n: string; label: string; noMargin?: boolean }) {
  return (
    <Typography sx={{
      fontSize: 11, fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      mb: noMargin ? 0 : 2,
    }}>
      {n} — {label}
    </Typography>
  );
}
