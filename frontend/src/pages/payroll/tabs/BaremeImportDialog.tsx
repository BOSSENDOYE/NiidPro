import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Alert, Chip, CircularProgress, Divider, LinearProgress,
} from '@mui/material';
import { Download, Upload, CheckCircle, FileUpload } from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';

// ── Colonnes ─────────────────────────────────────────────────────────
const COLS = [
  { header: 'Revenu Brut', key: 'revenu_brut', required: true },
  { header: 'TRIMF/Pers',  key: 'trimf_pers',  required: false },
  { header: '1 Part',      key: 'part_1',       required: false },
  { header: '1,5 Parts',   key: 'part_1_5',     required: false },
  { header: '2 Parts',     key: 'part_2',       required: false },
  { header: '2,5 Parts',   key: 'part_2_5',     required: false },
  { header: '3 Parts',     key: 'part_3',       required: false },
  { header: '3,5 Parts',   key: 'part_3_5',     required: false },
  { header: '4 Parts',     key: 'part_4',       required: false },
  { header: '4,5 Parts',   key: 'part_4_5',     required: false },
  { header: '5 Parts',     key: 'part_5',       required: false },
];

const HEADER_MAP: Record<string, string> = {};
COLS.forEach((c) => {
  HEADER_MAP[c.header.toLowerCase().trim()] = c.key;
  HEADER_MAP[c.key.toLowerCase()]           = c.key;
});

// ── Étapes de la jauge ────────────────────────────────────────────────
const IMPORT_STEPS = [
  { label: 'Lecture du fichier', pct: 0  },
  { label: 'Envoi des données',  pct: 20 },
  { label: 'Insertion en base',  pct: 65 },
  { label: 'Finalisation',       pct: 91 },
];

type ParsedRow = Record<string, number>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ═══════════════════════════════════════════════════════════════════════
export default function BaremeImportDialog({ open, onClose, onSuccess }: Props) {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<0 | 1 | 2>(0);
  const [rows,        setRows]        = useState<ParsedRow[]>([]);
  const [filename,    setFilename]    = useState('');
  const [parseError,  setParseError]  = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone,  setImportDone]  = useState(false);
  const [progress,    setProgress]    = useState(0);

  const reset = () => {
    setStep(0); setRows([]); setFilename(''); setParseError('');
    setIsDragging(false); setImportError(''); setImportDone(false); setProgress(0);
  };
  const handleClose = () => { reset(); onClose(); };

  // ── Mutation ──────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: () => recruitmentApi.importBaremes(rows),
    onSuccess: () => {
      setProgress(100);
      setTimeout(() => setImportDone(true), 450);
      qc.invalidateQueries({ queryKey: ['payroll', 'params', 'baremes'] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setImportError(
        e?.response?.data?.message ?? e?.message ?? "Une erreur est survenue lors de l'importation.",
      );
    },
  });

  // ── Progression simulée pendant l'appel API ───────────────────────────
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

  // ── Template Excel ────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const sampleRows = [
      [100000, 300, 4200,  3150,  6300,  4725,  8400,  6300,  10500, 7875,  12600],
      [120000, 300, 5040,  3780,  7560,  5670,  10080, 7560,  12600, 9450,  15120],
      [150000, 300, 6300,  4725,  9450,  7087,  12600, 9450,  15750, 11812, 18900],
      [200000, 300, 8400,  6300,  12600, 9450,  16800, 12600, 21000, 15750, 25200],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([COLS.map((c) => c.header), ...sampleRows]);
    ws['!cols'] = COLS.map((_, i) => ({ wch: i === 0 ? 14 : 12 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Barème');
    XLSX.writeFile(wb, 'modele_bareme.xlsx');
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
        const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: 0 });
        if (raw.length === 0) { setParseError('Le fichier ne contient aucune ligne de données.'); return; }
        const parsed = raw
          .map((row) => {
            const out: ParsedRow = {};
            Object.entries(row).forEach(([k, v]) => {
              const mapped = HEADER_MAP[k.trim().toLowerCase()];
              if (mapped) out[mapped] = Number(v) || 0;
            });
            return out;
          })
          .filter((r) => (r.revenu_brut ?? 0) > 0);
        if (parsed.length === 0) {
          setParseError('Aucune ligne valide trouvée. Vérifiez que "Revenu Brut" est présent et > 0.');
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

  // ── État courant de la jauge ──────────────────────────────────────────
  let activeImportStep = 0;
  for (let i = IMPORT_STEPS.length - 1; i >= 0; i--) {
    if (progress >= IMPORT_STEPS[i].pct) { activeImportStep = i; break; }
  }

  const isPending   = importMutation.isPending;
  const showOverlay = isPending || importDone;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={showOverlay ? undefined : handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── Header / indicateur d'étapes ── */}
      <Box sx={{ bgcolor: '#0D2137', px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Importation du Barème
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {showOverlay ? (
        /* ── Overlay progression / succès ── */
        <Box sx={{
          minHeight: 400, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: importDone ? '#059669' : '#0B1E32',
          px: 5, py: 6,
          transition: 'background-color 0.5s ease',
        }}>
          {importDone ? (
            /* ── Succès ── */
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
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, mb: 4 }}>
                <strong style={{ color: '#fff', fontSize: 28 }}>{rows.length}</strong>{' '}
                ligne{rows.length > 1 ? 's' : ''} importée{rows.length > 1 ? 's' : ''} avec succès
              </Typography>
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{ bgcolor: '#fff', color: '#059669', fontWeight: 800, borderRadius: '10px', textTransform: 'none', px: 5, py: 1, fontSize: 14, '&:hover': { bgcolor: '#F0FDF4' } }}
              >
                Fermer
              </Button>
            </Box>
          ) : (
            /* ── En cours ── */
            <Box sx={{ width: 380, textAlign: 'center' }}>
              <CircularProgress size={58} sx={{ color: '#ff7631', mb: 3 }} thickness={3} />
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 19, mb: 0.5 }}>
                Importation en cours…
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, mb: 4 }}>
                {rows.length} ligne{rows.length > 1 ? 's' : ''} en traitement
              </Typography>

              {/* Barre de progression */}
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

              {/* Étapes */}
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
                      {done && (
                        <Typography sx={{ ml: 'auto', color: '#86EFAC', fontSize: 12, fontWeight: 700 }}>✓</Typography>
                      )}
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
                  Préparez votre fichier
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3, lineHeight: 1.7 }}>
                  Téléchargez le modèle Excel ci-dessous, renseignez vos données de barème ligne par ligne, puis
                  passez à l'étape suivante pour importer le fichier rempli.
                </Typography>

                <Box sx={{ border: '1.5px solid #E2E8F0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                  <Box sx={{ bgcolor: '#F8FAFC', px: 2.5, py: 1.2, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Colonnes du fichier</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>11 colonnes</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, p: 2 }}>
                    {COLS.map((c) => (
                      <Chip key={c.key} label={c.header} size="small"
                        sx={{
                          bgcolor: c.required ? '#DBEAFE' : '#F1F5F9',
                          color:   c.required ? '#1D4ED8' : '#475569',
                          fontWeight: c.required ? 700 : 500, fontSize: 11,
                          border: c.required ? '1px solid #93C5FD' : 'none',
                        }} />
                    ))}
                  </Box>
                  <Box sx={{ px: 2.5, pb: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      La colonne <strong style={{ color: '#1D4ED8' }}>Revenu Brut</strong> est obligatoire.
                      Les lignes sans valeur de revenu brut seront ignorées.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'auto', mb: 3 }}>
                  <Box sx={{ bgcolor: '#F8FAFC', px: 2.5, py: 1, borderBottom: '1px solid #E2E8F0' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Aperçu du modèle</Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#0D2137' }}>
                        {COLS.map((c) => (
                          <TableCell key={c.key} sx={{ color: '#fff', fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap', py: 0.75 }}>
                            {c.header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        [100000, 300, 4200, 3150, 6300, 4725, 8400, 6300, 10500, 7875, 12600],
                        [120000, 300, 5040, 3780, 7560, 5670, 10080, 7560, 12600, 9450, 15120],
                      ].map((row, i) => (
                        <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          {row.map((v, j) => (
                            <TableCell key={j} sx={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', py: 0.5 }}>
                              {v.toLocaleString('fr-FR')}
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
                <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', bgcolor: '#F0FDF4' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 22 }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{filename}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#16A34A' }}>
                        {rows.length} ligne{rows.length > 1 ? 's' : ''} valide{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" onClick={() => { setStep(1); setRows([]); setFilename(''); }}
                    sx={{ borderRadius: '9px', textTransform: 'none', fontSize: 12 }}>
                    Changer de fichier
                  </Button>
                </Box>

                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#0D2137', color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'center', width: 50, py: 1 }}>N°</TableCell>
                        {COLS.map((c) => (
                          <TableCell key={c.key} sx={{ bgcolor: '#0D2137', color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap', py: 1 }}>
                            {c.header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.slice(0, 200).map((row, i) => (
                        <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          <TableCell sx={{ textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>{i + 1}</TableCell>
                          {COLS.map((c) => (
                            <TableCell key={c.key} sx={{ textAlign: 'right', fontSize: 12, fontFamily: 'monospace', color: '#1E293B', py: 0.75 }}>
                              {row[c.key] != null ? Number(row[c.key]).toLocaleString('fr-FR') : '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {rows.length > 200 && (
                        <TableRow>
                          <TableCell colSpan={COLS.length + 1}
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
                  disabled={rows.length === 0}
                  onClick={() => { setImportError(''); importMutation.mutate(); }}
                  startIcon={<Upload />}
                  sx={{ bgcolor: '#0D2137', borderRadius: '9px', textTransform: 'none', fontWeight: 700, minWidth: 180 }}
                >
                  Importer {rows.length} ligne{rows.length > 1 ? 's' : ''}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
