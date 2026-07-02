import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, LinearProgress,
  Chip, CircularProgress,
} from '@mui/material';
import {
  Download, UploadFile, CheckCircle, Warning,
} from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';

// ── Constantes ────────────────────────────────────────────────────────────────
const NAV = '#0D2137';
const GRN = '#059669';

const VALID_TYPES = ['indiciaire', 'indemnitaire', 'prime', 'autre'] as const;
const VALID_UNITES = ['pourcentage', 'montant'] as const;

// Normalisation des en-têtes Excel
const ALIASES: Record<string, string> = {
  libelle: 'libelle', libellé: 'libelle', 'nom augmentation': 'libelle',
  nom: 'libelle', designation: 'libelle', désignation: 'libelle',
  type: 'type',
  taux: 'taux', valeur: 'taux', montant: 'taux', 'valeur/taux': 'taux',
  unite: 'unite', unité: 'unite', 'unité/mode': 'unite',
  'date effet': 'date_effet', "date d'effet": 'date_effet', date_effet: 'date_effet',
  description: 'description',
};

type ParsedRow = {
  libelle: string;
  type: string;
  taux: number | null;
  unite: string | null;
  date_effet: string | null;
  description: string | null;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\-]/g, ' ');
}

function parseRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw
    .map((r) => {
      const mapped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        const norm = normalizeHeader(String(k));
        const field = ALIASES[norm];
        if (field) mapped[field] = v;
      }
      const libelle = String(mapped['libelle'] ?? '').trim();
      if (!libelle) return null;

      const rawType = String(mapped['type'] ?? '').toLowerCase().trim();
      const type = VALID_TYPES.includes(rawType as typeof VALID_TYPES[number]) ? rawType : 'indemnitaire';

      const rawTaux = mapped['taux'];
      const taux = rawTaux !== '' && rawTaux != null && !isNaN(Number(rawTaux)) ? Number(rawTaux) : null;

      const rawUnite = String(mapped['unite'] ?? '').toLowerCase().trim();
      const unite = VALID_UNITES.includes(rawUnite as typeof VALID_UNITES[number]) ? rawUnite : null;

      const rawDate = String(mapped['date_effet'] ?? '').trim();
      let date_effet: string | null = null;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          date_effet = d.toISOString().slice(0, 10);
        }
      }

      return {
        libelle,
        type,
        taux,
        unite,
        date_effet,
        description: String(mapped['description'] ?? '').trim() || null,
      } as ParsedRow;
    })
    .filter((r): r is ParsedRow => r !== null);
}

// ── Template Excel ────────────────────────────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Libellé', 'Type', 'Valeur/Taux', 'Unité', 'Date effet', 'Description'],
    ['Indemnité de résidence', 'indemnitaire', 15000, 'montant', '2026-01-01', ''],
    ['Prime de transport', 'prime', 5000, 'montant', '2026-01-01', ''],
    ['Augmentation indiciaire 2026', 'indiciaire', 3, 'pourcentage', '2026-01-01', 'Revalorisation annuelle'],
  ]);
  ws['!cols'] = [{ wch: 35 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Augmentations');
  XLSX.writeFile(wb, 'modele_augmentations.xlsx');
}

// ── Type chip ─────────────────────────────────────────────────────────────────
const typeChip = (t: string) => {
  const m: Record<string, { bg: string; fg: string }> = {
    prime:       { bg: '#FEF9C3', fg: '#92400E' },
    indemnitaire:{ bg: '#EEF2FF', fg: '#4338CA' },
    indiciaire:  { bg: '#ECFDF5', fg: '#065F46' },
    autre:       { bg: '#F1F5F9', fg: '#475569' },
  };
  return m[t] ?? m.autre;
};

// ══════════════════════════════════════════════════════════════════════════════
//  Dialog principal
// ══════════════════════════════════════════════════════════════════════════════
export default function AugmentationImportDialog({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]       = useState<0 | 1 | 2>(0);
  const [rows, setRows]       = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone]       = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setStep(0); setRows([]); setDone(null); };
  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = parseRows(ws);
      setRows(parsed);
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const importMut = useMutation({
    mutationFn: () => recruitmentApi.importAugmentations(rows).then(r => r.data),
    onSuccess: (data) => {
      setDone(data);
      onSuccess();
    },
  });

  const TH = { color: '#fff', fontWeight: 700, fontSize: 11, py: 1 };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

      {/* ── En-tête ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ bgcolor: NAV, px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
              Import d'augmentations depuis Excel
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11.5 }}>
              {step === 0 ? 'Étape 1 — Télécharger le modèle' : step === 1 ? 'Étape 2 — Choisir le fichier' : 'Étape 3 — Aperçu & import'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[0, 1, 2].map((s) => (
              <Box key={s} sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: step >= s ? '#E85D04' : 'rgba(255,255,255,0.15)',
                border: `2px solid ${step >= s ? '#E85D04' : 'rgba(255,255,255,0.3)'}`,
                fontSize: 12, fontWeight: 800, color: '#fff' }}>
                {s + 1}
              </Box>
            ))}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>

        {/* ═══ ÉTAPE 0 — Modèle ═══ */}
        {step === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <Download sx={{ fontSize: 56, color: NAV, mb: 1.5 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1E293B', mb: 1 }}>
                Téléchargez le modèle Excel
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#64748B', maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}>
                Le fichier contient les colonnes : <strong>Libellé</strong>, Type, Valeur/Taux, Unité, Date effet, Description.
              </Typography>
            </Box>

            {/* Aperçu colonnes */}
            <Box sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2, overflow: 'hidden', maxWidth: 600, mx: 'auto' }}>
              <Box sx={{ bgcolor: NAV, px: 2, py: 0.75 }}>
                <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Colonnes du fichier modèle</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1.5 }}>
                {[
                  { label: 'Libellé *', color: '#DC2626' },
                  { label: 'Type', color: '#4338CA' },
                  { label: 'Valeur/Taux', color: '#059669' },
                  { label: 'Unité', color: '#0369A1' },
                  { label: 'Date effet', color: '#D97706' },
                  { label: 'Description', color: '#64748B' },
                ].map(({ label, color }) => (
                  <Chip key={label} label={label} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: `${color}15`, color, border: `1px solid ${color}40` }} />
                ))}
              </Box>
              <Box sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                  Type : <code>indiciaire</code> | <code>indemnitaire</code> | <code>prime</code> | <code>autre</code>
                  &nbsp;·&nbsp;
                  Unité : <code>pourcentage</code> | <code>montant</code>
                </Typography>
              </Box>
            </Box>

            <Button variant="contained" startIcon={<Download />} onClick={downloadTemplate}
              sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#1A3A5C' }, borderRadius: '9px', fontWeight: 700, px: 4, py: 1.25, fontSize: 13 }}>
              Télécharger modele_augmentations.xlsx
            </Button>
          </Box>
        )}

        {/* ═══ ÉTAPE 1 — Upload ═══ */}
        {step === 1 && (
          <Box sx={{ p: 4 }}>
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? '#E85D04' : '#CBD5E1'}`,
                borderRadius: 3, p: 6, textAlign: 'center', cursor: 'pointer',
                bgcolor: dragOver ? '#FFF7ED' : '#F8FAFC',
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#E85D04', bgcolor: '#FFF7ED' },
              }}>
              <UploadFile sx={{ fontSize: 52, color: dragOver ? '#E85D04' : '#94A3B8', mb: 1.5 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
                Glissez-déposez votre fichier ici
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>
                ou cliquez pour parcourir
              </Typography>
              <Chip label=".xlsx  .xls" size="small" sx={{ bgcolor: '#E2E8F0', color: '#475569', fontWeight: 600 }} />
            </Box>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
          </Box>
        )}

        {/* ═══ ÉTAPE 2 — Aperçu ═══ */}
        {step === 2 && (
          <Box sx={{ position: 'relative' }}>
            {importMut.isPending && (
              <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={42} sx={{ color: GRN }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: GRN }}>Import en cours…</Typography>
                <LinearProgress sx={{ width: 260, bgcolor: '#D1FAE5', '& .MuiLinearProgress-bar': { bgcolor: GRN } }} />
              </Box>
            )}

            {/* Succès */}
            {done && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 56, color: GRN, mb: 1.5 }} />
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B', mb: 2 }}>Import terminé</Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Box sx={{ bgcolor: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 2, px: 3, py: 1.5, minWidth: 130, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 26, fontWeight: 900, color: GRN }}>{done.imported}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#065F46' }}>augmentations importées</Typography>
                  </Box>
                  {done.skipped > 0 && (
                    <Box sx={{ bgcolor: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 2, px: 3, py: 1.5, minWidth: 130, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#D97706' }}>{done.skipped}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#92400E' }}>lignes ignorées</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Tableau aperçu */}
            {!done && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 0.5 }}>
                  <Chip label={`${rows.length} ligne${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}`}
                    size="small" sx={{ bgcolor: '#ECFDF5', color: GRN, fontWeight: 700, fontSize: 11 }} />
                  {rows.length === 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#D97706' }}>
                      <Warning sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: 12 }}>Aucune ligne valide détectée</Typography>
                    </Box>
                  )}
                </Box>

                <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1, maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['N°', 'Libellé', 'Type', 'Valeur/Taux', 'Unité', 'Date effet', 'Description'].map((h) => (
                          <TableCell key={h} sx={{ ...TH, bgcolor: NAV, whiteSpace: 'nowrap' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94A3B8', py: 3, fontSize: 12 }}>
                            Fichier vide ou colonnes non reconnues
                          </TableCell>
                        </TableRow>
                      ) : rows.map((r, i) => {
                        const chip = typeChip(r.type);
                        return (
                          <TableRow key={i} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                            <TableCell sx={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', width: 40 }}>{i + 1}</TableCell>
                            <TableCell sx={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B' }}>{r.libelle}</TableCell>
                            <TableCell>
                              <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: '4px', fontSize: 10.5, fontWeight: 700, bgcolor: chip.bg, color: chip.fg }}>
                                {r.type}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {r.taux != null ? r.taux.toLocaleString('fr-FR') : '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
                              {r.unite ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
                              {r.date_effet ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#64748B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.description ?? '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* ── Actions ── */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC', gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} sx={{ borderRadius: '9px', textTransform: 'none', borderColor: '#CBD5E1', color: '#64748B' }}>
          Fermer
        </Button>

        <Box sx={{ flex: 1 }} />

        {step === 0 && (
          <Button variant="contained" onClick={() => setStep(1)}
            sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#1A3A5C' }, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            Suivant →
          </Button>
        )}
        {step === 1 && (
          <Button variant="outlined" onClick={() => setStep(0)}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>
            ← Retour
          </Button>
        )}
        {step === 2 && !done && (
          <>
            <Button variant="outlined" onClick={() => setStep(1)}
              sx={{ borderRadius: '9px', textTransform: 'none' }}>
              ← Retour
            </Button>
            <Button variant="contained" disabled={rows.length === 0 || importMut.isPending}
              onClick={() => importMut.mutate()}
              sx={{ bgcolor: GRN, '&:hover': { bgcolor: '#047857' }, borderRadius: '9px', textTransform: 'none', fontWeight: 700, minWidth: 160 }}>
              {importMut.isPending ? 'Import…' : `Importer ${rows.length} augmentation${rows.length > 1 ? 's' : ''}`}
            </Button>
          </>
        )}
        {step === 2 && done && (
          <Button variant="contained" onClick={handleClose}
            sx={{ bgcolor: GRN, '&:hover': { bgcolor: '#047857' }, borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            Terminer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
