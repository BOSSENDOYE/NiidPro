import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Alert, Chip, CircularProgress, Divider, LinearProgress,
} from '@mui/material';
import { Download, Upload, CheckCircle, FileUpload, Warning } from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';

// ── Colonnes standards reconnues ──────────────────────────────────────
const STD_COLS = [
  { header: 'HIERARCHIE',    key: 'hierarchy_code', required: true,  type: 'string' },
  { header: 'INDICE',        key: 'valeur',         required: true,  type: 'number' },
  { header: 'VALEUR INDICE', key: 'valeur_point',   required: false, type: 'number' },
  { header: 'Solde M',       key: 'solde_mensuelle',required: false, type: 'number' },
  { header: 'GRADE',         key: 'garde',          required: false, type: 'string' },
  { header: 'CLASSE',        key: 'classe',         required: false, type: 'string' },
  { header: 'ECHELON',       key: 'echelon_label',  required: false, type: 'string' },
] as const;

// Toutes les variantes d'en-têtes standards → clé interne
const ALIASES: Record<string, string> = {
  'hierarchie':        'hierarchy_code',
  'hier':              'hierarchy_code',
  'hierarchy':         'hierarchy_code',
  'indice':            'valeur',
  'numéro indice':     'valeur',
  'numero indice':     'valeur',
  'valeur indice':     'valeur_point',
  'valeur_indice':     'valeur_point',
  'solde m':           'solde_mensuelle',
  'solde mensuelle':   'solde_mensuelle',
  'solde_mensuelle':   'solde_mensuelle',
  'grade':             'garde',
  'garde':             'garde',
  'classe':            'classe',
  'echelon':           'echelon_label',
  'échelon':           'echelon_label',
  'echelon_label':     'echelon_label',
  'n° sr':             '__skip__',
  'n°':                '__skip__',
  'num':               '__skip__',
  'numéro':            '__skip__',
};
STD_COLS.forEach(c => {
  ALIASES[c.header.toLowerCase()] = c.key;
  ALIASES[c.key.toLowerCase()]    = c.key;
});

const IMPORT_STEPS = [
  { label: 'Lecture du fichier', pct: 0  },
  { label: 'Envoi des données',  pct: 20 },
  { label: 'Insertion en base',  pct: 65 },
  { label: 'Finalisation',       pct: 91 },
];

type ParsedRow = {
  hierarchy_code: string;
  valeur: number;
  valeur_point?: number;
  solde_mensuelle?: number;
  garde?: string;
  classe?: string;
  echelon_label?: string;
  augmentations?: Record<string, number>;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ═══════════════════════════════════════════════════════════════════════
export default function IndiceImportDialog({ open, onClose, onSuccess }: Props) {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<0 | 1 | 2>(0);
  const [rows,        setRows]        = useState<ParsedRow[]>([]);
  const [augCols,     setAugCols]     = useState<string[]>([]);
  const [filename,    setFilename]    = useState('');
  const [parseError,  setParseError]  = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone,  setImportDone]  = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [resultStats, setResultStats] = useState<{ imported: number; skipped: number; augmentations: number } | null>(null);

  const reset = () => {
    setStep(0); setRows([]); setAugCols([]); setFilename(''); setParseError('');
    setIsDragging(false); setImportError(''); setImportDone(false);
    setProgress(0); setResultStats(null);
  };
  const handleClose = () => { reset(); onClose(); };

  // ── Mutation ──────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: () => recruitmentApi.importIndices(rows),
    onSuccess: (res) => {
      setProgress(100);
      setResultStats(res.data);
      setTimeout(() => setImportDone(true), 450);
      qc.invalidateQueries({ queryKey: ['payroll', 'params', 'indices'] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setImportError(e?.response?.data?.message ?? e?.message ?? "Une erreur est survenue lors de l'importation.");
    },
  });

  // ── Progression simulée ───────────────────────────────────────────────
  useEffect(() => {
    if (!importMutation.isPending) return;
    setProgress(5);
    const timers = [
      setTimeout(() => setProgress(22), 350),
      setTimeout(() => setProgress(48), 1100),
      setTimeout(() => setProgress(70), 2400),
      setTimeout(() => setProgress(86), 4000),
      setTimeout(() => setProgress(93), 6500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [importMutation.isPending]);

  // ── Téléchargement du modèle ──────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = [
      'HIERARCHIE', 'GRADE', 'CLASSE', 'ECHELON', 'INDICE',
      'VALEUR INDICE', 'Solde M', 'Indemnité de résidence', 'Prime Transport',
    ];
    const sample = [
      ['D3', 'D3 Principal Cl. Exceptionnelle', '',    '',       1092, 51.41, 56109.72, 50000, 20000],
      ['D3', 'D3 1e Cl 1e Ech',                '1e', '1e Ech', 879,  51.41, 45189.39, 45000, 20000],
      ['D3', 'D3 1e Cl 2e Ech',                '1e', '2e Ech', 1049, 51.41, 53929.09, 48000, 20000],
      ['D2', 'D2 1ere classe 1e Ech',           '1e', '1e Ech', 894,  51.41, 45960.54, 43000, 20000],
      ['C1', 'C1 2e Cl 1e Ech',                '2e', '1e Ech', 1138, 51.41, 58504.58, 52000, 20000],
      ['B1', 'B1 Principale 1e Ech',           '',   '1e Ech', 2010, 51.41, 103334.1, 80000, 20000],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 38 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Indices');
    XLSX.writeFile(wb, 'modele_indices.xlsx');
  };

  // ── Parse fichier ─────────────────────────────────────────────────────
  const parseFile = (file: File) => {
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        if (raw.length === 0) { setParseError('Le fichier ne contient aucune ligne de données.'); return; }

        // Détecter les colonnes d'augmentation dynamiquement
        const allHeaders = new Set<string>();
        raw.forEach(r => Object.keys(r).forEach(k => allHeaders.add(k)));

        const detectedAugCols: string[] = [];
        for (const h of allHeaders) {
          const mapped = ALIASES[h.trim().toLowerCase()];
          if (!mapped) detectedAugCols.push(h.trim());
        }
        setAugCols(detectedAugCols);

        // Parser les lignes
        const parsed: ParsedRow[] = [];
        for (const row of raw) {
          const out: Partial<ParsedRow> & Record<string, unknown> = {};
          const augs: Record<string, number> = {};

          for (const [k, v] of Object.entries(row)) {
            const normalized = k.trim().toLowerCase();
            const mapped = ALIASES[normalized];

            if (mapped === '__skip__') continue;

            if (mapped) {
              const col = STD_COLS.find(c => c.key === mapped);
              if (col?.type === 'number') {
                out[mapped] = typeof v === 'number' ? v
                  : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
              } else {
                out[mapped] = String(v ?? '').trim();
              }
            } else if (k.trim()) {
              // Colonne inconnue = augmentation
              const numVal = typeof v === 'number' ? v
                : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
              if (numVal > 0) augs[k.trim()] = numVal;
            }
          }

          if (Object.keys(augs).length > 0) out.augmentations = augs;

          const hCode  = String(out.hierarchy_code ?? '').trim().toUpperCase();
          const valeur = Number(out.valeur ?? 0);
          if (!hCode || valeur <= 0) continue;

          parsed.push({ ...out, hierarchy_code: hCode, valeur } as ParsedRow);
        }

        if (parsed.length === 0) {
          setParseError('Aucune ligne valide. Vérifiez que les colonnes HIERARCHIE et INDICE sont présentes et non vides.');
          return;
        }
        setRows(parsed);
        setFilename(file.name);
        setStep(2);
      } catch {
        setParseError("Impossible de lire le fichier. Assurez-vous qu'il s'agit d'un .xlsx, .xls ou .csv valide.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileSelected = (f: File | undefined) => { if (f) parseFile(f); };

  let activeImportStep = 0;
  for (let i = IMPORT_STEPS.length - 1; i >= 0; i--) {
    if (progress >= IMPORT_STEPS[i].pct) { activeImportStep = i; break; }
  }

  const isPending   = importMutation.isPending;
  const showOverlay = isPending || importDone;
  const rowsWithAug = rows.filter(r => r.augmentations && Object.keys(r.augmentations).length > 0).length;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={showOverlay ? undefined : handleClose}
      maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

      {/* ── Header / stepper ── */}
      <Box sx={{ bgcolor: '#0D2137', px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Importation des Indices
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(['Modèle', 'Fichier', 'Aperçu'] as const).map((label, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: step === i ? '#E85D04' : (step > i ? '#059669' : 'rgba(255,255,255,0.2)'),
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>
                {step > i ? '✓' : i + 1}
              </Box>
              <Typography sx={{ fontSize: 10.5, color: step === i ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: step === i ? 700 : 400 }}>
                {label}
              </Typography>
              {i < 2 && <Box sx={{ width: 16, height: 1, bgcolor: 'rgba(255,255,255,0.25)', mx: 0.5 }} />}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ════════════════════════════════════════════════════════════════ */}
      {showOverlay ? (
        <Box sx={{
          minHeight: 400, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: importDone ? '#059669' : '#0B1E32',
          px: 5, py: 6, transition: 'background-color 0.5s ease',
        }}>
          {importDone ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <CheckCircle sx={{ fontSize: 56, color: '#fff' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 24, mb: 1 }}>
                Importation réussie !
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, mb: 1 }}>
                <strong style={{ color: '#fff', fontSize: 28 }}>{resultStats?.imported ?? rows.length}</strong>{' '}
                indice{(resultStats?.imported ?? rows.length) > 1 ? 's' : ''} importé{(resultStats?.imported ?? rows.length) > 1 ? 's' : ''}
              </Typography>
              {(resultStats?.augmentations ?? 0) > 0 && (
                <Typography sx={{ color: '#A7F3D0', fontSize: 13, mb: 1 }}>
                  {resultStats?.augmentations} type{(resultStats?.augmentations ?? 0) > 1 ? 's' : ''} d'augmentation enregistré{(resultStats?.augmentations ?? 0) > 1 ? 's' : ''}
                </Typography>
              )}
              {(resultStats?.skipped ?? 0) > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Warning sx={{ fontSize: 18, color: '#FCD34D' }} />
                  <Typography sx={{ color: '#FCD34D', fontSize: 13 }}>
                    {resultStats?.skipped} ligne{(resultStats?.skipped ?? 0) > 1 ? 's' : ''} ignorée{(resultStats?.skipped ?? 0) > 1 ? 's' : ''} (hiérarchie introuvable)
                  </Typography>
                </Box>
              )}
              <Button variant="contained" onClick={handleClose}
                sx={{ mt: 2, bgcolor: '#fff', color: '#059669', fontWeight: 800, borderRadius: '10px',
                  textTransform: 'none', px: 5, py: 1, fontSize: 14, '&:hover': { bgcolor: '#F0FDF4' } }}>
                Fermer
              </Button>
            </Box>
          ) : (
            <Box sx={{ width: 380, textAlign: 'center' }}>
              <CircularProgress size={58} sx={{ color: '#ff7631', mb: 3 }} thickness={3} />
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 19, mb: 0.5 }}>
                Importation en cours…
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, mb: 4 }}>
                {rows.length} indice{rows.length > 1 ? 's' : ''}
                {augCols.length > 0 && ` · ${augCols.length} type${augCols.length > 1 ? 's' : ''} d'augmentation`}
              </Typography>
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Progression</Typography>
                  <Typography sx={{ color: '#ff7631', fontWeight: 700, fontSize: 12 }}>{progress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{
                  height: 9, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#ff7631', borderRadius: 5, transition: 'transform 0.7s cubic-bezier(.4,0,.2,1)' },
                }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, textAlign: 'left' }}>
                {IMPORT_STEPS.map((s, i) => {
                  const done    = i < activeImportStep;
                  const current = i === activeImportStep;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: done ? '#059669' : current ? '#ff7631' : 'rgba(255,255,255,0.08)',
                        transition: 'background-color 0.35s' }}>
                        {done ? <CheckCircle sx={{ fontSize: 16, color: '#fff' }} />
                          : current ? <CircularProgress size={12} sx={{ color: '#fff' }} thickness={5} /> : null}
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: current ? 700 : 400, transition: 'color 0.35s',
                        color: done ? '#86EFAC' : current ? '#fff' : 'rgba(255,255,255,0.28)' }}>
                        {s.label}
                      </Typography>
                      {done && <Typography sx={{ ml: 'auto', color: '#86EFAC', fontSize: 12, fontWeight: 700 }}>✓</Typography>}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <>
          <DialogContent sx={{ p: 0 }}>

            {/* ─── Étape 0 : Modèle ─── */}
            {step === 0 && (
              <Box sx={{ p: 4 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1E3A5F', mb: 0.75 }}>
                  Préparez votre fichier d'indices
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3, lineHeight: 1.7 }}>
                  Téléchargez le modèle Excel, renseignez vos données (une ligne = un indice), puis importez.
                  Les colonnes d'augmentation (<em>Indemnité, Prime Transport…</em>) sont détectées automatiquement.
                  Les indices existants avec le même code seront mis à jour.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 280, border: '1.5px solid #E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: '#F8FAFC', px: 2.5, py: 1.2, borderBottom: '1px solid #E2E8F0' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Colonnes standards</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, p: 2 }}>
                      {STD_COLS.map(c => (
                        <Chip key={c.key} label={c.header} size="small" sx={{
                          bgcolor: c.required ? '#DBEAFE' : '#F1F5F9',
                          color:   c.required ? '#1D4ED8' : '#475569',
                          fontWeight: c.required ? 700 : 500, fontSize: 11,
                          border: c.required ? '1px solid #93C5FD' : 'none',
                        }} />
                      ))}
                    </Box>
                    <Box sx={{ px: 2.5, pb: 1.5 }}>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                        <strong style={{ color: '#1D4ED8' }}>HIERARCHIE</strong> et{' '}
                        <strong style={{ color: '#1D4ED8' }}>INDICE</strong> sont obligatoires.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 280, border: '1.5px solid #D1FAE5', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: '#ECFDF5', px: 2.5, py: 1.2, borderBottom: '1px solid #D1FAE5' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Colonnes d'augmentation (dynamiques)</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Typography sx={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                        Toute colonne ne faisant pas partie des colonnes standards est traitée comme
                        une <strong>augmentation</strong>. Nommez vos colonnes librement :<br />
                        <em>Indemnité de résidence, Prime Transport, Augmentation 2024…</em>
                      </Typography>
                    </Box>
                    <Box sx={{ px: 2.5, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {['Indemnité de résidence', 'Prime Transport', 'Augmentation 2024'].map(l => (
                        <Chip key={l} label={l} size="small"
                          sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 600, fontSize: 11 }} />
                      ))}
                    </Box>
                  </Box>
                </Box>

                {/* Aperçu du modèle */}
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'auto', mb: 3 }}>
                  <Box sx={{ bgcolor: '#F8FAFC', px: 2.5, py: 1, borderBottom: '1px solid #E2E8F0' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Aperçu du modèle</Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#0D2137' }}>
                        {['HIERARCHIE','GRADE','CLASSE','ECHELON','INDICE','VALEUR INDICE','Solde M','Indemnité de résidence','Prime Transport'].map(h => (
                          <TableCell key={h} sx={{
                            color: ['Indemnité de résidence','Prime Transport'].includes(h) ? '#86EFAC' : '#fff',
                            fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap', py: 0.75,
                          }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        ['D3', 'D3 Principal', '', '', 1092, 51.41, 56109.72, 50000, 20000],
                        ['D3', 'D3 1e Cl 1e Ech', '1e', '1e Ech', 879, 51.41, 45189.39, 45000, 20000],
                        ['C1', 'C1 2e Cl 1e Ech', '2e', '1e Ech', 1138, 51.41, 58504.58, 52000, 20000],
                      ].map((row, i) => (
                        <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          {row.map((v, j) => (
                            <TableCell key={j} sx={{
                              fontSize: 11,
                              fontFamily: typeof v === 'number' ? 'monospace' : 'inherit',
                              color: j >= 7 ? '#059669' : '#334155',
                              fontWeight: j >= 7 ? 600 : 400,
                              py: 0.5,
                            }}>
                              {typeof v === 'number' ? v.toLocaleString('fr-FR') : v}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" startIcon={<Download />} onClick={downloadTemplate}
                    sx={{ bgcolor: '#059669', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
                    Télécharger le modèle (.xlsx)
                  </Button>
                  <Button variant="outlined" onClick={() => setStep(1)}
                    sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, color: '#1E3A5F', borderColor: '#1E3A5F' }}>
                    J'ai déjà un fichier →
                  </Button>
                </Box>
              </Box>
            )}

            {/* ─── Étape 1 : Upload ─── */}
            {step === 1 && (
              <Box sx={{ p: 4 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1E3A5F', mb: 0.75 }}>
                  Sélectionnez votre fichier
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3 }}>
                  Formats acceptés : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
                </Typography>

                <Box
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFileSelected(e.dataTransfer.files[0]); }}
                  sx={{
                    border: `2px dashed ${isDragging ? '#3B82F6' : '#CBD5E1'}`,
                    borderRadius: 3, p: 6, textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    bgcolor: isDragging ? '#EFF6FF' : '#FAFAFA',
                    '&:hover': { borderColor: '#3B82F6', bgcolor: '#EFF6FF' },
                  }}>
                  <FileUpload sx={{ fontSize: 44, color: isDragging ? '#3B82F6' : '#CBD5E1', mb: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, color: '#1E3A5F', fontSize: 14, mb: 0.5 }}>
                    {isDragging ? 'Relâchez pour importer' : 'Glissez-déposez ou cliquez pour sélectionner'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Fichier Excel (.xlsx, .xls) ou CSV</Typography>
                </Box>

                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                  onChange={(e) => { onFileSelected(e.target.files?.[0]); e.target.value = ''; }} />

                {parseError && <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>{parseError}</Alert>}

                <Box sx={{ mt: 2 }}>
                  <Button variant="text" size="small" onClick={() => setStep(0)}
                    sx={{ textTransform: 'none', fontSize: 12, color: '#64748B' }}>
                    ← Retour au modèle
                  </Button>
                </Box>
              </Box>
            )}

            {/* ─── Étape 2 : Aperçu ─── */}
            {step === 2 && (
              <Box>
                <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: '1px solid #E2E8F0', bgcolor: '#F0FDF4' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 22 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{filename}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: 11, color: '#16A34A' }}>
                          {rows.length} ligne{rows.length > 1 ? 's' : ''} valide{rows.length > 1 ? 's' : ''}
                        </Typography>
                        {augCols.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: '#065F46', bgcolor: '#D1FAE5', px: 1, py: 0.25, borderRadius: 1 }}>
                            {augCols.length} colonne{augCols.length > 1 ? 's' : ''} d'augmentation
                            {rowsWithAug > 0 && ` · ${rowsWithAug} ligne${rowsWithAug > 1 ? 's' : ''} avec valeurs`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" onClick={() => { setStep(1); setRows([]); setAugCols([]); setFilename(''); }}
                    sx={{ borderRadius: '9px', textTransform: 'none', fontSize: 12 }}>
                    Changer de fichier
                  </Button>
                </Box>

                {augCols.length > 0 && (
                  <Box sx={{ px: 3, py: 1.25, bgcolor: '#ECFDF5', borderBottom: '1px solid #D1FAE5',
                    display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#065F46', mr: 0.5 }}>
                      Augmentations détectées :
                    </Typography>
                    {augCols.map(col => (
                      <Chip key={col} label={col} size="small"
                        sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 600, fontSize: 11 }} />
                    ))}
                  </Box>
                )}

                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#0D2137', color: '#fff', fontWeight: 700, fontSize: 11,
                          textAlign: 'center', width: 45, py: 1 }}>N°</TableCell>
                        {STD_COLS.map(c => (
                          <TableCell key={c.key} sx={{ bgcolor: '#0D2137', color: '#fff', fontWeight: 700,
                            fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>
                            {c.header}
                          </TableCell>
                        ))}
                        {augCols.map(col => (
                          <TableCell key={col} sx={{ bgcolor: '#064E3B', color: '#A7F3D0', fontWeight: 700,
                            fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.slice(0, 200).map((row, i) => (
                        <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          <TableCell sx={{ textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>{row.hierarchy_code}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#1E3A5F', fontWeight: 800 }}>{row.valeur.toLocaleString('fr-FR')}</TableCell>
                          <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B' }}>
                            {row.valeur_point != null ? row.valeur_point.toLocaleString('fr-FR') : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                            {row.solde_mensuelle != null ? row.solde_mensuelle.toLocaleString('fr-FR') : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#64748B', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.garde ?? '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{row.classe ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{row.echelon_label ?? '—'}</TableCell>
                          {augCols.map(col => (
                            <TableCell key={col} sx={{ fontSize: 11, fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                              {row.augmentations?.[col] != null
                                ? row.augmentations[col].toLocaleString('fr-FR')
                                : <span style={{ color: '#CBD5E1' }}>—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {rows.length > 200 && (
                        <TableRow>
                          <TableCell colSpan={STD_COLS.length + augCols.length + 1}
                            sx={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, py: 1.5, fontStyle: 'italic' }}>
                            … {rows.length - 200} lignes supplémentaires non affichées (toutes seront importées)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>

          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handleClose} sx={{ borderRadius: '9px', textTransform: 'none' }}>
              Annuler
            </Button>
            {step === 2 && (
              <>
                {importError && (
                  <Alert severity="error" onClose={() => setImportError('')}
                    sx={{ flexGrow: 1, py: 0.25, fontSize: 12, borderRadius: 2 }}>
                    {importError}
                  </Alert>
                )}
                <Button variant="contained" disabled={rows.length === 0}
                  onClick={() => { setImportError(''); importMutation.mutate(); }}
                  startIcon={<Upload />}
                  sx={{ bgcolor: '#0D2137', borderRadius: '9px', textTransform: 'none', fontWeight: 700, minWidth: 200 }}>
                  Importer {rows.length} indice{rows.length > 1 ? 's' : ''}
                  {augCols.length > 0 && ` + ${augCols.length} aug.`}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
