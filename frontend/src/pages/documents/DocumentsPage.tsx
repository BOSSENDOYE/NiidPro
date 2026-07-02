import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Autocomplete, CircularProgress, Tooltip, Divider, Alert,
  Stack, Avatar, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Delete, Description, History, Print,
  Close, Search, Archive, PlayArrow, Article, CheckCircle,
  AccessTime, ContentCopy, Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../../api/documents';
import { employeesApi } from '../../api/employees';
import { useCompany } from '../../hooks/useCompany';
import type { DocumentTemplate, DocumentTemplateSettings, Employee, GeneratedDocument } from '../../types';
import { DOC_TYPES, getDocType } from './DocumentStudio';

// ── Org footer ────────────────────────────────────────────────────────────────
const ORG_FOOTER = 'Sacré-cœur Cité Keur Gorgui Lot n° 06 – BP 25545 – contact@anaser.sn – Tél : +221 33 856 40 46';

// ── Variables système ─────────────────────────────────────────────────────────
const PREDEFINED_KEYS = new Set([
  '{NOM_AGENT}', '{PRENOM_AGENT}', '{NOM_COMPLET}', '{MATRICULE}', '{FONCTION}',
  '{DIRECTION}', '{DATE_ENTREE_SERVICE}', '{DATE_NAISSANCE}', '{LIEU_NAISSANCE}',
  '{NATIONALITE}', '{EMAIL_PROFESSIONNEL}', '{TELEPHONE}', '{DATE_GENERATION}',
  '{ANNEE_EN_COURS}', '{NUMERO_DOCUMENT}',
]);

function detectCustomVars(content: string): string[] {
  const matches = content.match(/\{[A-Z0-9_]+\}/g) ?? [];
  return [...new Set(matches.filter(m => !PREDEFINED_KEYS.has(m)))];
}

type PrintCompany = { name?: string | null; logo_url?: string | null; email?: string | null; phone?: string | null; address?: string | null };

function buildAnaserPrintHtml(docs: GeneratedDocument[], template: DocumentTemplate, company?: PrintCompany): string {
  const s: DocumentTemplateSettings = template.settings ?? {};
  const ministry    = s.ministry         ?? 'Ministère des Infrastructures, des Transports terrestres et Aériens';
  const sigName     = s.signataire_name  ?? '';
  const sigTitle    = s.signataire_title ?? 'Le Directeur Général';
  const ampliations = s.ampliations      ?? [];
  const typeLabel   = s.document_title   ?? getDocType(template.type).title;
  const objet       = s.objet            ?? null;
  const letterFormat = !!objet;
  const companyName = company?.name || 'ANASER';
  const logoUrl     = company?.logo_url || `${window.location.origin}/image.png`;
  const footer      = [company?.address, company?.email, company?.phone].filter(Boolean).join(' – ') || ORG_FOOTER;

  const pages = docs.map(doc => {
    const dateDoc = new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const civility = doc.employee?.gender === 'F' ? 'Madame' : 'Monsieur';
    const empName  = doc.employee?.full_name ?? `${doc.employee?.first_name ?? ''} ${doc.employee?.last_name ?? ''}`.trim();
    const empFn    = (doc.employee as Employee & { position?: { title: string } })?.position?.title ?? '';
    const empDept  = (doc.employee as Employee & { department?: { name: string } })?.department?.name ?? '';

    const sigBlock = letterFormat
      ? `<div class="sig-block"><p class="paraph">/-/</p><br><p class="addr-intro">À ${civility}</p><p class="addr-name">${empName}</p>${empFn ? `<p class="addr-fn">${empFn}</p>` : ''}${empDept ? `<p class="addr-dept">${empDept}</p>` : ''}</div>`
      : `<div class="sig-block"><p>${sigTitle}</p><br><br><br><br><p class="sig-name">${sigName}</p></div>`;

    const bodyHeader = letterFormat
      ? `<p class="objet"><u><strong>Objet :</strong></u> ${objet}</p>`
      : `<div class="doc-title"><strong><u>${typeLabel}</u></strong></div>`;

    const isNoteService = template.type === 'note_service' && !letterFormat;

    return `<div class="page">
      <div class="header">
        <div class="header-left">
          <p class="republic">RÉPUBLIQUE DU SÉNÉGAL</p>
          <p class="motto"><em>Un Peuple – Un But – Une Foi</em></p>
          <p class="sep">------</p>
          <p class="ministry">${ministry}</p>
          <div class="logo-block"><img src="${logoUrl}" width="70" height="70" style="display:block;object-fit:contain;" alt="${companyName}"/></div>
        </div>
        <div class="header-right">
          <p class="ref">N° <strong>${doc.reference}</strong>/${companyName}/DG/SG/DAF/RH</p>
          <br><p class="date">Dakar, le ${dateDoc}</p>
        </div>
      </div>
      <p class="signataire"><strong>${sigTitle},</strong></p>
      ${bodyHeader}
      ${isNoteService
        ? `<div class="content-box"><div class="doc-body">${doc.content_final.replace(/<script[^>]*>.*?<\/script>/gi, '')}</div></div>`
        : `<div class="doc-body">${doc.content_final.replace(/<script[^>]*>.*?<\/script>/gi, '')}</div>`
      }
      ${sigBlock}
      ${ampliations.length > 0
        ? `<div class="ampliations"><p><strong><u>Ampliations :</u></strong></p><ul>${ampliations.map(a => `<li>${a} ;</li>`).join('')}</ul></div>`
        : ''}
      <div class="footer">${footer}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Documents ${companyName}</title>
<style>
  @page { margin: 1.2cm 1.8cm; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; }
  .page { page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: avoid; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .header-left { flex: 0 0 52%; } .header-right { flex: 0 0 44%; text-align: right; }
  .republic { font-weight: bold; font-size: 10pt; } .motto { font-size: 9pt; margin-top: 1px; }
  .sep { margin: 2px 0; font-size: 9pt; } .ministry { font-size: 9.5pt; font-weight: bold; margin: 4px 0; }
  .logo-block { margin: 5px 0 0 8px; display: inline-block; } .ref { font-size: 11pt; margin-bottom: 3px; }
  .signataire { font-weight: bold; font-size: 12pt; margin: 10px 0; }
  .objet { font-size: 11pt; margin: 0 0 12px; }
  .doc-title { text-align: center; font-size: 13pt; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 auto 18px; }
  .doc-body { text-align: justify; line-height: 1.6; margin-bottom: 16px; }
  .doc-body p { margin-bottom: 8px; } .doc-body ul { padding-left: 22px; margin: 5px 0 8px; }
  .doc-body strong { font-weight: bold; } .doc-body em { font-style: italic; } .doc-body u { text-decoration: underline; }
  .content-box { border: 1px solid #000; padding: 14px 18px; margin: 6px 0 16px; min-height: 90px; }
  .sig-block { float: right; text-align: center; width: 42%; margin: 0 8px 12px; }
  .sig-name { font-weight: bold; font-size: 11pt; text-transform: uppercase; }
  .paraph { font-size: 11pt; } .addr-intro { font-size: 10.5pt; margin-top: 6px; text-align: left; }
  .addr-name { font-weight: bold; font-size: 10.5pt; text-align: left; } .addr-fn, .addr-dept { font-size: 10.5pt; text-align: left; }
  .ampliations { clear: both; margin-top: 18px; } .ampliations ul { list-style: none; padding-left: 12px; margin-top: 2px; }
  .ampliations li::before { content: "- "; } .ampliations li { margin: 1px 0; font-size: 10.5pt; }
  .footer { margin-top: 14px; text-align: center; font-size: 7.5pt; color: #333; border-top: 2px solid #003399; padding-top: 4px; }
</style></head><body>${pages}</body></html>`;
}

// ── Generate Modal ────────────────────────────────────────────────────────────
interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
}

function GenerateModal({ open, onClose, template }: GenerateModalProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [generatedDocs, setGeneratedDocs]         = useState<GeneratedDocument[]>([]);
  const [step, setStep]                           = useState<'select' | 'vars' | 'preview'>('select');
  const [customVarValues, setCustomVarValues]     = useState<Record<string, string>>({});
  const qc  = useQueryClient();
  const { company } = useCompany();
  const cfg = template ? getDocType(template.type) : getDocType('attestation');
  const detectedVars = template ? detectCustomVars(template.content) : [];

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r => {
      const d = r.data as { data?: Employee[] } | Employee[];
      return Array.isArray(d) ? d : (d as { data?: Employee[] }).data ?? [];
    }),
    enabled: open,
  });

  const generateMut = useMutation({
    mutationFn: () => documentsApi.generate(template!.id, selectedEmployees.map(e => e.id), customVarValues),
    onSuccess: res => {
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

  const handlePrint = () => {
    if (!template || generatedDocs.length === 0) return;
    const html = buildAnaserPrintHtml(generatedDocs, template, company);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: cfg.bg, borderBottom: `1px solid ${cfg.border}`, py: 2, px: 3 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <PlayArrow sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Générer — {template.name}</Typography>
          <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
            {step === 'select' ? 'Étape 1 / Sélection des agents'
              : step === 'vars' ? 'Étape 2 / Valeurs des variables'
              : 'Étape 3 / Aperçu & Impression'}
          </Typography>
        </Box>
        {step === 'preview' && (
          <Button startIcon={<Print />} variant="contained" size="small" onClick={handlePrint}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700,
              bgcolor: cfg.color, px: 2, '&:hover': { bgcolor: cfg.color, opacity: 0.9 } }}>
            Imprimer (format officiel)
          </Button>
        )}
        <IconButton size="small" onClick={handleClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
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
              filterOptions={(opts, { inputValue }) => {
                const q = inputValue.trim();
                if (q.length < 2) return [];
                const ql = q.toLowerCase();
                return opts.filter(o =>
                  (o.employee_number ?? '').toLowerCase().includes(ql) ||
                  (o.phone_professional ?? o.phone ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                  (o.phone_personal ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                  (o.first_name ?? '').toLowerCase().startsWith(ql)
                );
              }}
              noOptionsText="Tapez 2 caractères (matricule, téléphone ou prénom)…"
              renderOption={(props, o: Employee) => {
                const { key, ...optProps } = props as typeof props & { key: React.Key };
                return (
                  <Box key={key} component="li" {...optProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
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
                );
              }}
              renderInput={params => (
                <TextField {...params} label={cfg.multi ? 'Agent(s) concerné(s)' : 'Agent concerné'} size="small"
                  placeholder="Matricule, téléphone ou 2 lettres du prénom…"
                  InputProps={{ ...params.InputProps, sx: { borderRadius: '10px' } }} />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            {selectedEmployees.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedEmployees.map(e => (
                  <Chip key={e.id}
                    avatar={<Avatar sx={{ bgcolor: cfg.color + '22', color: cfg.color, fontSize: 11 }}>
                      {e.first_name[0]}{e.last_name[0]}
                    </Avatar>}
                    label={e.full_name}
                    onDelete={() => setSelectedEmployees(prev => prev.filter(x => x.id !== e.id))}
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

        {step === 'vars' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning" sx={{ borderRadius: '10px', fontSize: 13 }}>
              Ce modèle contient des variables personnalisées. Renseignez leurs valeurs ci-dessous.
            </Alert>
            {detectedVars.map(v => (
              <TextField key={v} label={v} size="small"
                value={customVarValues[v] ?? ''}
                onChange={e => setCustomVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Valeur pour ${v}`}
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
            ))}
          </Box>
        )}

        {step === 'preview' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CheckCircle sx={{ color: '#10B981' }} />
              <Typography sx={{ fontWeight: 700, color: '#10B981', fontSize: 14 }}>
                {generatedDocs.length} document{generatedDocs.length > 1 ? 's' : ''} généré{generatedDocs.length > 1 ? 's' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 420, overflowY: 'auto' }}>
              {generatedDocs.map(doc => (
                <Paper key={doc.id} variant="outlined" sx={{ p: 3, borderRadius: '12px', borderColor: cfg.border, bgcolor: '#FAFAFA' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Chip label={doc.reference} size="small"
                      sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 700 }} />
                    {doc.employee && (
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {doc.employee.full_name} · {doc.employee.employee_number}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ fontSize: 13, lineHeight: 1.9, color: '#1E293B',
                    '& p': { margin: '0 0 6px 0' }, '& strong': { fontWeight: 700 },
                    '& em': { fontStyle: 'italic' } }}
                    dangerouslySetInnerHTML={{ __html: doc.content_final }} />
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
            onClick={() => { if (detectedVars.length > 0) setStep('vars'); else generateMut.mutate(); }}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
              bgcolor: cfg.color, px: 3, '&:hover': { bgcolor: cfg.color, opacity: 0.9 } }}>
            {detectedVars.length > 0 ? 'Suivant →' : (generateMut.isPending
              ? <CircularProgress size={18} color="inherit" />
              : `Générer${selectedEmployees.length > 1 ? ` (${selectedEmployees.length})` : ''}`)}
          </Button>
        )}
        {step === 'vars' && (
          <>
            <Button onClick={() => setStep('select')} variant="outlined"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>← Retour</Button>
            <Button variant="contained" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                bgcolor: cfg.color, px: 3, '&:hover': { bgcolor: cfg.color, opacity: 0.9 } }}>
              {generateMut.isPending ? <CircularProgress size={18} color="inherit" /> : `Générer${selectedEmployees.length > 1 ? ` (${selectedEmployees.length})` : ''}`}
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

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const qc = useQueryClient();
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ['doc-generated', typeFilter, search],
    queryFn: () => documentsApi.listGenerated({
      ...(typeFilter ? { type: typeFilter } : {}),
      search: search || undefined,
    }).then(r => r.data),
    enabled: open,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => documentsApi.deleteGenerated(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-generated'] }),
  });

  const rows: GeneratedDocument[] = (data as { data?: GeneratedDocument[] })?.data ?? [];

  const handlePrint = (doc: GeneratedDocument) => {
    if (!doc.template) return;
    const html = buildAnaserPrintHtml([doc], doc.template, company);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: '#F8FAFC', borderBottom: '1px solid #E8EDF2', py: 2, px: 3 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#374151',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <History sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', flexGrow: 1 }}>
          Historique des documents générés
        </Typography>
        <TextField size="small" placeholder="Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment>,
            sx: { borderRadius: '10px', bgcolor: '#fff', fontSize: 13, width: 220 },
          }}
        />
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      {/* Type filter chips */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #E8EDF2', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        <Chip label="Tous" size="small" onClick={() => setTypeFilter('')}
          sx={{ fontWeight: typeFilter === '' ? 700 : 500, fontSize: 11,
            bgcolor: typeFilter === '' ? '#374151' : '#F1F5F9',
            color:   typeFilter === '' ? '#fff' : '#475569' }} />
        {DOC_TYPES.map(t => (
          <Chip key={t.key} label={t.label} size="small"
            onClick={() => setTypeFilter(typeFilter === t.key ? '' : t.key)}
            sx={{ fontWeight: typeFilter === t.key ? 700 : 500, fontSize: 11,
              bgcolor: typeFilter === t.key ? t.color : t.bg,
              color:   typeFilter === t.key ? '#fff' : t.color,
              border:  `1px solid ${typeFilter === t.key ? t.color : t.border}` }} />
        ))}
      </Box>

      <DialogContent sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
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
                  {['Référence', 'Type', 'Agent', 'Matricule', 'Modèle', 'Généré par', 'Date', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(doc => {
                  const docCfg = getDocType(doc.type);
                  return (
                    <TableRow key={doc.id} hover sx={{ '& td': { py: 1.25 } }}>
                      <TableCell>
                        <Chip label={doc.reference} size="small"
                          sx={{ fontFamily: 'monospace', fontSize: 11,
                            bgcolor: docCfg.bg, color: docCfg.color, border: `1px solid ${docCfg.border}`, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={docCfg.cat} size="small"
                          sx={{ fontSize: 10, bgcolor: docCfg.bg, color: docCfg.color,
                            border: `1px solid ${docCfg.border}` }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: docCfg.color + '22', color: docCfg.color, fontSize: 11, fontWeight: 700 }}>
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
                              sx={{ color: docCfg.color, '&:hover': { bgcolor: docCfg.bg } }}>
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
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({
  template, onGenerate, onDelete,
}: {
  template: DocumentTemplate;
  onGenerate: (t: DocumentTemplate) => void;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();
  const cfg      = getDocType(template.type);
  const count    = template.generated_documents_count ?? 0;
  const archived = template.status === 'archived';

  return (
    <Card sx={{
      borderRadius: '16px',
      border: `1px solid ${archived ? '#E2E8F0' : cfg.border}`,
      boxShadow: archived ? 'none' : '0 2px 12px rgba(0,0,0,0.05)',
      transition: 'all 0.2s', opacity: archived ? 0.6 : 1,
      display: 'flex', flexDirection: 'column',
      '&:hover': { boxShadow: archived ? 'none' : '0 8px 28px rgba(0,0,0,0.10)', transform: archived ? 'none' : 'translateY(-2px)' },
    }}>
      <Box sx={{ height: 5, bgcolor: archived ? '#CBD5E1' : cfg.color, borderRadius: '16px 16px 0 0', flexShrink: 0 }} />

      <CardContent sx={{ p: 2.5, pb: '16px !important', flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
              bgcolor: archived ? '#F1F5F9' : cfg.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: archived ? '#94A3B8' : cfg.color,
              border: `1px solid ${archived ? '#E2E8F0' : cfg.border}` }}>
              <Description sx={{ fontSize: 18 }} />
            </Box>
            <Chip label={cfg.cat} size="small"
              sx={{ fontSize: 10, fontWeight: 700, bgcolor: archived ? '#F1F5F9' : cfg.bg,
                color: archived ? '#64748B' : cfg.color, border: `1px solid ${archived ? '#E2E8F0' : cfg.border}` }} />
          </Box>
          {archived && (
            <Chip label="Archivé" size="small"
              sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: 10, fontWeight: 700 }} />
          )}
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', lineHeight: 1.4, mb: 0.75,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {template.name}
        </Typography>

        {template.description && (
          <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, mb: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {template.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Article sx={{ fontSize: 13, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
              {count} génération{count !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 13, color: '#94A3B8' }} />
            <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
              {new Date(template.created_at).toLocaleDateString('fr-FR')}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.25, gap: 0 }}>
        <Stack direction="row" spacing={0.25}>
          <Tooltip title="Modifier dans le Studio">
            <IconButton size="small" onClick={() => navigate(`/documents/studio/${template.id}`)}
              sx={{ color: '#94A3B8', '&:hover': { color: cfg.color, bgcolor: cfg.bg } }}>
              <Edit sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dupliquer">
            <IconButton size="small"
              sx={{ color: '#94A3B8', '&:hover': { color: '#F97316', bgcolor: '#FFF7ED' } }}>
              <ContentCopy sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {!archived && (
            <Tooltip title="Archiver">
              <IconButton size="small"
                sx={{ color: '#94A3B8', '&:hover': { color: '#64748B', bgcolor: '#F1F5F9' } }}>
                <Archive sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={() => onDelete(template.id)}
              sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: '#FEE2E2' } }}>
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        {!archived && (
          <Button size="small" variant="contained"
            startIcon={<PlayArrow sx={{ fontSize: 14 }} />}
            onClick={() => onGenerate(template)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: 12,
              bgcolor: cfg.color, px: 2, py: 0.75, '&:hover': { bgcolor: cfg.color, opacity: 0.88 } }}>
            Générer
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [typeFilter,    setTypeFilter]    = useState<string>('');
  const [search,        setSearch]        = useState('');
  const [generateModal, setGenerateModal] = useState<DocumentTemplate | null>(null);
  const [historyOpen,   setHistoryOpen]   = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['doc-templates', typeFilter, search],
    queryFn: () => documentsApi.listTemplates({
      ...(typeFilter ? { type: typeFilter } : {}),
      search: search || undefined,
    }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => documentsApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-templates'] }),
  });

  const filtered = templates as DocumentTemplate[];
  const total = filtered.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ── */}
      <Box sx={{
        p: 3, borderRadius: '16px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, right: 80, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 50, height: 50, borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(37,99,235,0.4)' }}>
            <Description sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: '#F1F5F9', letterSpacing: '-0.4px' }}>
              Document Studio
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#94A3B8', mt: 0.25 }}>
              8 types de documents · Éditeur split-screen avec aperçu A4 · Génération multi-agents
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1.5}>
            <Box sx={{ textAlign: 'center', px: 2, py: 1,
              bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9' }}>{total}</Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Modèle{total !== 1 ? 's' : ''}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', px: 2, py: 1,
              bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9' }}>{DOC_TYPES.length}</Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Types</Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ── Catalogue + actions ── */}
      <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #E8EDF2', overflow: 'hidden' }}>

        {/* Type filter strip */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #E8EDF2',
          display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', mr: 0.5 }}>Filtrer :</Typography>
          <Chip label="Tous les types" size="small"
            onClick={() => setTypeFilter('')}
            sx={{ fontWeight: typeFilter === '' ? 700 : 500, fontSize: 11,
              bgcolor: typeFilter === '' ? '#0F172A' : '#F1F5F9',
              color:   typeFilter === '' ? '#fff' : '#475569',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#0F172A', color: '#fff' } }} />
          {DOC_TYPES.map(t => (
            <Chip key={t.key} label={t.label} size="small"
              onClick={() => setTypeFilter(typeFilter === t.key ? '' : t.key)}
              sx={{ fontWeight: typeFilter === t.key ? 700 : 500, fontSize: 11,
                cursor: 'pointer',
                bgcolor: typeFilter === t.key ? t.color : t.bg,
                color:   typeFilter === t.key ? '#fff' : t.color,
                border:  `1px solid ${typeFilter === t.key ? t.color : t.border}`,
                '&:hover': { bgcolor: t.color, color: '#fff' },
                transition: 'all 0.12s' }} />
          ))}
        </Box>

        {/* Toolbar */}
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', borderBottom: '1px solid #F1F5F9' }}>
          <TextField size="small" placeholder="Rechercher un modèle…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment>,
              sx: { borderRadius: '10px', width: 280, fontSize: 13 },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button startIcon={<History />} variant="outlined" size="small"
            onClick={() => setHistoryOpen(true)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 13 }}>
            Historique
          </Button>
          <Button startIcon={<SettingsIcon sx={{ fontSize: 16 }} />} variant="outlined" size="small"
            onClick={() => navigate('/documents/studio')}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 600, fontSize: 13 }}>
            Ouvrir le Studio
          </Button>
          <Button startIcon={<Add />} variant="contained" size="small"
            onClick={() => navigate('/documents/studio')}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, fontSize: 13,
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
            Nouveau modèle
          </Button>
        </Box>

        {/* Grid */}
        <Box sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, borderRadius: '14px',
              border: '2px dashed #E2E8F0', bgcolor: '#F8FAFC' }}>
              <Description sx={{ fontSize: 48, color: '#E2E8F0', mb: 2 }} />
              <Typography sx={{ fontWeight: 700, color: '#475569', mb: 1 }}>
                {typeFilter
                  ? `Aucun modèle de type « ${getDocType(typeFilter).label} »`
                  : 'Aucun modèle de document'}
              </Typography>
              <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 3 }}>
                Créez votre premier modèle avec l'éditeur split-screen et l'aperçu A4 en temps réel.
              </Typography>
              <Button startIcon={<Add />} variant="contained"
                onClick={() => navigate('/documents/studio')}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                Créer un modèle dans le Studio
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' },
              gap: 2.5, alignItems: 'stretch' }}>
              {filtered.map(t => (
                <TemplateCard key={t.id} template={t}
                  onGenerate={tpl => setGenerateModal(tpl)}
                  onDelete={id => deleteMut.mutate(id)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Modals */}
      <GenerateModal open={!!generateModal} onClose={() => setGenerateModal(null)} template={generateModal} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Box>
  );
}
