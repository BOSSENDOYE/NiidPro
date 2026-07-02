import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Alert, Chip, CircularProgress, Divider, LinearProgress, Stack,
} from '@mui/material';
import {
  Download, Upload, CheckCircle, FileUpload,
  AccountTree, Category, LinearScale,
} from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';

const TH = '#0D2137';
const ACT = '#E85D04';

// ── Colonnes par feuille ────────────────────────────────────────────────────
const HIER_COLS  = ['ordre', 'code', 'libelle', 'description'] as const;
const CLASS_COLS = ['code_hierarchie', 'code', 'libelle', 'description'] as const;
const ECHO_COLS  = ['code_hierarchie', 'code_classe', 'numero', 'libelle', 'description'] as const;

type HierRow  = { ordre?: number; code: string; libelle: string; description?: string };
type ClassRow = { code_hierarchie: string; code: string; libelle: string; description?: string };
type EchoRow  = { code_hierarchie: string; code_classe: string; numero: number; libelle?: string; description?: string };

// ── Étapes jauge ───────────────────────────────────────────────────────────
const IMPORT_STEPS = [
  { label: 'Lecture du fichier',    pct: 0  },
  { label: 'Import hiérarchies',    pct: 22 },
  { label: 'Import classes',        pct: 55 },
  { label: 'Import échelons',       pct: 80 },
  { label: 'Finalisation',          pct: 92 },
];

interface ParsedData {
  hierarchies: HierRow[];
  classes:     ClassRow[];
  echelons:    EchoRow[];
}

interface ImportResult {
  hierarchies: number;
  classes:     number;
  echelons:    number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Normalise une clé de colonne Excel ─────────────────────────────────────
function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/\s+/g, '_');
}

// ═══════════════════════════════════════════════════════════════════════════
export default function HierarchieImportDialog({ open, onClose, onSuccess }: Props) {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<0 | 1 | 2>(0);
  const [parsed,      setParsed]      = useState<ParsedData>({ hierarchies: [], classes: [], echelons: [] });
  const [filename,    setFilename]    = useState('');
  const [parseError,  setParseError]  = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone,  setImportDone]  = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [previewTab,  setPreviewTab]  = useState<0 | 1 | 2>(0);

  const reset = () => {
    setStep(0);
    setParsed({ hierarchies: [], classes: [], echelons: [] });
    setFilename('');
    setParseError('');
    setIsDragging(false);
    setImportError('');
    setImportDone(false);
    setImportResult(null);
    setProgress(0);
    setPreviewTab(0);
  };
  const handleClose = () => { reset(); onClose(); };

  // ── Mutation ────────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: () => recruitmentApi.importHierarchieClassesEchelons(parsed),
    onSuccess: (res) => {
      setProgress(100);
      setImportResult(res.data);
      setTimeout(() => setImportDone(true), 450);
      qc.invalidateQueries({ queryKey: ['payroll', 'params', 'hierarchies'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'params', 'classes'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'params', 'echelons'] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setImportError(
        e?.response?.data?.message ?? e?.message ?? "Une erreur est survenue lors de l'importation.",
      );
    },
  });

  // ── Progression simulée ─────────────────────────────────────────────────
  useEffect(() => {
    if (!importMutation.isPending) return;
    setProgress(5);
    const timers = [
      setTimeout(() => setProgress(25), 400),
      setTimeout(() => setProgress(50), 1200),
      setTimeout(() => setProgress(72), 2600),
      setTimeout(() => setProgress(85), 4200),
      setTimeout(() => setProgress(93), 6800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [importMutation.isPending]);

  // ── Template ────────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Feuille 1 — Hiérarchies
    const wsH = XLSX.utils.aoa_to_sheet([
      ['ordre', 'code', 'libelle', 'description'],
      [1, 'DIR', 'Direction Générale', 'Catégorie directeur'],
      [2, 'ADM', 'Administration', 'Service administratif'],
      [3, 'TECH', 'Technique', 'Personnel technique'],
    ]);
    wsH['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsH, 'Hiérarchies');

    // Feuille 2 — Classes
    const wsC = XLSX.utils.aoa_to_sheet([
      ['code_hierarchie', 'code', 'libelle', 'description'],
      ['DIR', 'A', 'Classe A', 'Hors-classe'],
      ['DIR', 'B', 'Classe B', 'Classe principale'],
      ['ADM', 'A', 'Classe A', ''],
      ['ADM', 'B', 'Classe B', ''],
    ]);
    wsC['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 24 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsC, 'Classes');

    // Feuille 3 — Échelons
    const wsE = XLSX.utils.aoa_to_sheet([
      ['code_hierarchie', 'code_classe', 'numero', 'libelle', 'description'],
      ['DIR', 'A', 1, '1er échelon', ''],
      ['DIR', 'A', 2, '2ème échelon', ''],
      ['DIR', 'A', 3, '3ème échelon', ''],
      ['DIR', 'B', 1, '1er échelon', ''],
      ['ADM', 'A', 1, '1er échelon', ''],
    ]);
    wsE['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsE, 'Échelons');

    XLSX.writeFile(wb, 'modele_hierarchie_classes_echelons.xlsx');
  };

  // ── Parse feuille en tableau d'objets ───────────────────────────────────
  function parseSheet<T extends object>(ws: XLSX.WorkSheet): T[] {
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    return raw.map((row) => {
      const out: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => { out[normalizeKey(k)] = v; });
      return out as T;
    });
  }

  // ── Parse fichier ───────────────────────────────────────────────────────
  const parseFile = (file: File) => {
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });

        const findSheet = (names: string[]) => {
          for (const name of names) {
            const found = wb.SheetNames.find(
              (s) => s.toLowerCase().trim() === name.toLowerCase().trim(),
            );
            if (found) return wb.Sheets[found];
          }
          return null;
        };

        const wsH = findSheet(['Hiérarchies', 'Hierarchies', 'hierarchies', 'hierachies', 'Hierachies']);
        const wsC = findSheet(['Classes', 'classes']);
        const wsE = findSheet(['Échelons', 'Echelons', 'echelons']);

        const hierarchies: HierRow[] = wsH
          ? parseSheet<HierRow>(wsH).filter((r) => r.code && r.libelle)
          : [];
        const classes: ClassRow[] = wsC
          ? parseSheet<ClassRow>(wsC).filter((r) => r.code_hierarchie && r.code && r.libelle)
          : [];
        const echelons: EchoRow[] = wsE
          ? parseSheet<EchoRow>(wsE).filter((r) => r.code_hierarchie && r.code_classe && r.numero != null && String(r.numero).trim() !== '')
          : [];

        const total = hierarchies.length + classes.length + echelons.length;
        if (total === 0) {
          setParseError(
            'Aucune donnée valide trouvée. Vérifiez que le fichier contient les feuilles "Hiérarchies", "Classes" et/ou "Échelons" avec les colonnes requises.',
          );
          return;
        }

        setParsed({ hierarchies, classes, echelons });
        setFilename(file.name);
        setStep(2);
      } catch {
        setParseError("Impossible de lire le fichier. Assurez-vous qu'il s'agit d'un .xlsx ou .xls valide.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileSelected = (f: File | undefined) => { if (f) parseFile(f); };

  // ── État jauge ──────────────────────────────────────────────────────────
  let activeImportStep = 0;
  for (let i = IMPORT_STEPS.length - 1; i >= 0; i--) {
    if (progress >= IMPORT_STEPS[i].pct) { activeImportStep = i; break; }
  }

  const isPending   = importMutation.isPending;
  const showOverlay = isPending || importDone;
  const totalRows   = parsed.hierarchies.length + parsed.classes.length + parsed.echelons.length;

  // ── Onglet actif dans l'aperçu ──────────────────────────────────────────
  const previewSections = [
    { label: 'Hiérarchies', icon: <AccountTree sx={{ fontSize: 14 }} />, count: parsed.hierarchies.length, cols: HIER_COLS, rows: parsed.hierarchies as Record<string, unknown>[] },
    { label: 'Classes',     icon: <Category    sx={{ fontSize: 14 }} />, count: parsed.classes.length,     cols: CLASS_COLS, rows: parsed.classes as Record<string, unknown>[] },
    { label: 'Échelons',    icon: <LinearScale  sx={{ fontSize: 14 }} />, count: parsed.echelons.length,    cols: ECHO_COLS,  rows: parsed.echelons as Record<string, unknown>[] },
  ];

  // ── Labels colonnes ─────────────────────────────────────────────────────
  const colLabel: Record<string, string> = {
    ordre: 'Ordre', code: 'Code', libelle: 'Libellé', description: 'Description',
    code_hierarchie: 'Hiérarchie', code_classe: 'Classe', numero: 'N°',
  };

  return (
    <Dialog
      open={open}
      onClose={showOverlay ? undefined : handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── Header ── */}
      <Box sx={{ bgcolor: TH, px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Importation — Hiérarchies / Classes / Échelons
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(['Modèle', 'Fichier', 'Aperçu'] as const).map((label, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: step === i ? ACT : (step > i ? '#059669' : 'rgba(255,255,255,0.2)'),
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {showOverlay ? (
        <Box sx={{
          minHeight: 420, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: importDone ? '#059669' : '#0B1E32',
          px: 5, py: 6, transition: 'background-color 0.5s ease',
        }}>
          {importDone ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{
                width: 88, height: 88, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5,
              }}>
                <CheckCircle sx={{ fontSize: 56, color: '#fff' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 24, mb: 1 }}>
                Importation réussie !
              </Typography>
              {importResult && (
                <Stack direction="row" spacing={2.5} justifyContent="center" sx={{ mb: 4 }}>
                  {[
                    { label: 'Hiérarchies', value: importResult.hierarchies, icon: <AccountTree sx={{ fontSize: 18 }} /> },
                    { label: 'Classes',     value: importResult.classes,     icon: <Category    sx={{ fontSize: 18 }} /> },
                    { label: 'Échelons',    value: importResult.echelons,    icon: <LinearScale  sx={{ fontSize: 18 }} /> },
                  ].map((s) => (
                    <Box key={s.label} sx={{
                      bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 2,
                      px: 2.5, py: 1.5, textAlign: 'center', minWidth: 100,
                    }}>
                      <Box sx={{ color: '#fff', mb: 0.5 }}>{s.icon}</Box>
                      <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{s.value}</Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{ bgcolor: '#fff', color: '#059669', fontWeight: 800, borderRadius: '10px', textTransform: 'none', px: 5, py: 1, fontSize: 14, '&:hover': { bgcolor: '#F0FDF4' } }}
              >
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
                {totalRows} enregistrement{totalRows > 1 ? 's' : ''} en traitement
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Progression</Typography>
                  <Typography sx={{ color: '#ff7631', fontWeight: 700, fontSize: 12 }}>{progress}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 9, borderRadius: 5,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#ff7631', borderRadius: 5,
                      transition: 'transform 0.7s cubic-bezier(.4,0,.2,1)',
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, textAlign: 'left' }}>
                {IMPORT_STEPS.map((s, i) => {
                  const done    = i < activeImportStep;
                  const current = i === activeImportStep;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: done ? '#059669' : current ? '#ff7631' : 'rgba(255,255,255,0.08)',
                        transition: 'background-color 0.35s',
                      }}>
                        {done
                          ? <CheckCircle sx={{ fontSize: 16, color: '#fff' }} />
                          : current
                            ? <CircularProgress size={12} sx={{ color: '#fff' }} thickness={5} />
                            : null}
                      </Box>
                      <Typography sx={{
                        fontSize: 13.5,
                        color: done ? '#86EFAC' : current ? '#fff' : 'rgba(255,255,255,0.28)',
                        fontWeight: current ? 700 : 400,
                        transition: 'color 0.35s',
                      }}>
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
                  Préparez votre fichier Excel
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3, lineHeight: 1.7 }}>
                  Le fichier modèle contient <strong>3 feuilles</strong> : une par type de données. Remplissez les feuilles
                  souhaitées puis importez le fichier. Les feuilles vides sont ignorées.
                </Typography>

                {/* 3 feuilles */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  {[
                    {
                      title: 'Feuille 1 — Hiérarchies',
                      icon: <AccountTree sx={{ fontSize: 20, color: '#4338CA' }} />,
                      bg: '#EEF2FF',
                      border: '#C7D2FE',
                      cols: HIER_COLS,
                      req: ['code', 'libelle'],
                      sample: [
                        { ordre: 1, code: 'DIR', libelle: 'Direction', description: '' },
                        { ordre: 2, code: 'ADM', libelle: 'Administration', description: '' },
                      ],
                    },
                    {
                      title: 'Feuille 2 — Classes',
                      icon: <Category sx={{ fontSize: 20, color: '#0369A1' }} />,
                      bg: '#E0F2FE',
                      border: '#BAE6FD',
                      cols: CLASS_COLS,
                      req: ['code_hierarchie', 'code', 'libelle'],
                      sample: [
                        { code_hierarchie: 'DIR', code: 'A', libelle: 'Classe A', description: '' },
                        { code_hierarchie: 'ADM', code: 'B', libelle: 'Classe B', description: '' },
                      ],
                    },
                    {
                      title: 'Feuille 3 — Échelons',
                      icon: <LinearScale sx={{ fontSize: 20, color: '#0D6A5E' }} />,
                      bg: '#D1FAE5',
                      border: '#6EE7B7',
                      cols: ECHO_COLS,
                      req: ['code_hierarchie', 'code_classe', 'numero'],
                      sample: [
                        { code_hierarchie: 'DIR', code_classe: 'A', numero: 1, libelle: '1er éch.', description: '' },
                        { code_hierarchie: 'DIR', code_classe: 'A', numero: 2, libelle: '2ème éch.', description: '' },
                      ],
                    },
                  ].map((sheet) => (
                    <Box key={sheet.title} sx={{
                      flex: 1, border: `1.5px solid ${sheet.border}`,
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      <Box sx={{ bgcolor: sheet.bg, px: 2, py: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {sheet.icon}
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>{sheet.title}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                          {sheet.cols.map((c) => (
                            <Chip key={c} label={c} size="small"
                              sx={{
                                bgcolor: sheet.req.includes(c) ? '#DBEAFE' : '#F1F5F9',
                                color:   sheet.req.includes(c) ? '#1D4ED8' : '#475569',
                                fontWeight: sheet.req.includes(c) ? 700 : 500,
                                fontSize: 10,
                                border: sheet.req.includes(c) ? '1px solid #93C5FD' : 'none',
                              }} />
                          ))}
                        </Box>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {sheet.cols.map((c) => (
                                <TableCell key={c} sx={{ py: 0.4, fontSize: 9.5, fontWeight: 700, color: '#64748B', bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                  {colLabel[c] ?? c}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(sheet.sample as Record<string, unknown>[]).map((row, i) => (
                              <TableRow key={i}>
                                {sheet.cols.map((c) => (
                                  <TableCell key={c} sx={{ py: 0.3, fontSize: 10, fontFamily: 'monospace', color: '#334155', borderBottom: i === sheet.sample.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                                    {String(row[c] ?? '')}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>
                  ))}
                </Stack>

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
                  Formats acceptés : <strong>.xlsx</strong>, <strong>.xls</strong>
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
                  <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Fichier Excel (.xlsx, .xls)</Typography>
                </Box>

                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
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
                {/* Résumé */}
                <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', bgcolor: '#F0FDF4' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 22 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{filename}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                        {previewSections.map((s) => s.count > 0 && (
                          <Chip key={s.label} icon={s.icon} label={`${s.count} ${s.label}`} size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#D1FAE5', color: '#065F46' }} />
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" onClick={() => { setStep(1); setParsed({ hierarchies: [], classes: [], echelons: [] }); setFilename(''); }}
                    sx={{ borderRadius: '9px', textTransform: 'none', fontSize: 12 }}>
                    Changer de fichier
                  </Button>
                </Box>

                {/* Onglets aperçu */}
                <Box sx={{ display: 'flex', gap: 0, px: 0, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
                  {previewSections.map((s, i) => (
                    <Box key={i}
                      onClick={() => setPreviewTab(i as 0 | 1 | 2)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 2.5, py: 1.25, cursor: 'pointer', borderBottom: '3px solid',
                        borderBottomColor: previewTab === i ? ACT : 'transparent',
                        color: previewTab === i ? ACT : '#64748B',
                        fontWeight: previewTab === i ? 700 : 500,
                        fontSize: 12.5,
                        '&:hover': { bgcolor: '#EFF6FF' },
                        transition: 'all 0.15s',
                      }}>
                      {s.icon}
                      {s.label}
                      <Chip label={s.count} size="small"
                        sx={{
                          height: 18, fontSize: 10, fontWeight: 700,
                          bgcolor: s.count > 0 ? (previewTab === i ? '#FFF0E8' : '#E2E8F0') : '#FEE2E2',
                          color:   s.count > 0 ? (previewTab === i ? ACT : '#64748B') : '#991B1B',
                        }} />
                    </Box>
                  ))}
                </Box>

                {/* Table aperçu */}
                {previewSections.map((section, i) => previewTab === i && (
                  <TableContainer key={i} sx={{ maxHeight: 320 }}>
                    {section.count === 0 ? (
                      <Box sx={{ py: 5, textAlign: 'center', color: '#94A3B8' }}>
                        <Typography sx={{ fontSize: 13 }}>Aucune donnée pour {section.label}</Typography>
                        <Typography sx={{ fontSize: 11, mt: 0.5 }}>La feuille sera ignorée lors de l'import</Typography>
                      </Box>
                    ) : (
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'center', width: 45, py: 1 }}>N°</TableCell>
                            {section.cols.map((c) => (
                              <TableCell key={c} sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', py: 1 }}>
                                {colLabel[c] ?? c}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {section.rows.slice(0, 150).map((row, ri) => (
                            <TableRow key={ri} hover sx={{ bgcolor: ri % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                              <TableCell sx={{ textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>{ri + 1}</TableCell>
                              {section.cols.map((c) => (
                                <TableCell key={c} sx={{ fontSize: 12, color: '#1E293B', py: 0.75 }}>
                                  {String(row[c] ?? '—')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          {section.count > 150 && (
                            <TableRow>
                              <TableCell colSpan={section.cols.length + 1}
                                sx={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, py: 1.5, fontStyle: 'italic' }}>
                                … {section.count - 150} lignes supplémentaires (toutes importées)
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </TableContainer>
                ))}
              </Box>
            )}
          </DialogContent>

          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handleClose}
              sx={{ borderRadius: '9px', textTransform: 'none' }}>
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
                <Button
                  variant="contained"
                  disabled={totalRows === 0}
                  onClick={() => { setImportError(''); importMutation.mutate(); }}
                  startIcon={<Upload />}
                  sx={{ bgcolor: TH, borderRadius: '9px', textTransform: 'none', fontWeight: 700, minWidth: 200 }}
                >
                  Importer {totalRows} enregistrement{totalRows > 1 ? 's' : ''}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
