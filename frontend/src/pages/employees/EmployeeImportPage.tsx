import { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, LinearProgress,
  Stack, Divider, Tooltip, IconButton, Badge,
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Error as ErrorIcon, Warning,
  NavigateNext, NavigateBefore, FileDownload, Close, Info,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import client from '../../api/client';

// ── Mapping colonnes Excel → champs internes ─────────────────────────────────
const COLUMN_MAP: Record<string, string> = {
  'matr':            'employee_number',
  'matr.':           'employee_number',
  'matricule':       'employee_number',
  'prénom':          'first_name',
  'prenom':          'first_name',
  'prénom(s)':       'first_name',
  'prenom(s)':       'first_name',
  'nom':             'last_name',
  'date naiss':      'birth_date',
  'date naiss.':     'birth_date',
  'date naissance':  'birth_date',
  'lieu naiss':      'birth_place',
  'lieu naiss.':     'birth_place',
  'lieu naissance':  'birth_place',
  'date emb':        'hire_date',
  'date emb.':       'hire_date',
  'date embauche':   'hire_date',
  'ancienneté':      '_skip',
  'anciennete':      '_skip',
  'ancienneté (ans)':'_skip',
  'âge':             '_skip',
  'age':             '_skip',
  'fonction':        'fonction',
  'catégorie':       'categorie_emploi',
  'categorie':       'categorie_emploi',
  'qualification':   'qualification',
  'niveau rh':       'niveau_rh',
  'parts fisc':      'part_ir',
  'parts fisc.':     'part_ir',
  'parts fiscales':  'part_ir',
  'part ir':         'part_ir',
  'femme':           'nombre_femmes',
  'femme(s)':        'nombre_femmes',
  'femmes':          'nombre_femmes',
  'enfant':          'nombre_enfants_charge',
  'enfant(s)':       'nombre_enfants_charge',
  'enfants':         'nombre_enfants_charge',
  'email':           'professional_email',
  'département':     'department',
  'departement':     'department',
  'genre':           'gender',
  'sexe':            'gender',
};

const FIELD_LABELS: Record<string, string> = {
  employee_number:       'Matricule',
  first_name:            'Prénom(s)',
  last_name:             'Nom',
  birth_date:            'Date Naiss.',
  birth_place:           'Lieu Naiss.',
  hire_date:             'Date Emb.',
  categorie_emploi:      'Catégorie',
  fonction:              'Fonction',
  qualification:         'Qualification',
  niveau_rh:             'Niveau RH',
  part_ir:               'Parts Fisc.',
  nombre_femmes:         'Femme(s)',
  nombre_enfants_charge: 'Enfant(s)',
  professional_email:    'Email',
  department:            'Département',
  gender:                'Genre',
};

const REQUIRED_FIELDS = ['first_name', 'last_name'];

type ImportRow = Record<string, string | number | null> & { _errors?: string[]; _valid?: boolean };

// ── Utilitaires ──────────────────────────────────────────────────────────────
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Numéro de série Excel
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(val).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function validateRow(row: ImportRow): string[] {
  const errors: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    if (!row[f] || String(row[f]).trim() === '') errors.push(`${FIELD_LABELS[f] ?? f} obligatoire`);
  }
  if (row.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.birth_date))) errors.push('Date naissance invalide');
  if (row.hire_date  && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.hire_date)))  errors.push('Date embauche invalide');
  if (row.part_ir && isNaN(Number(row.part_ir))) errors.push('Parts fiscales invalides');
  return errors;
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function EmployeeImportPage() {
  const [step, setStep]         = useState<0 | 1 | 2>(0);
  const [rows, setRows]         = useState<ImportRow[]>([]);
  const [headers, setHeaders]   = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<{ created: number; skipped: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows   = rows.filter(r => r._valid);
  const invalidRows = rows.filter(r => !r._valid);

  // ── Parsing Excel ────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb   = XLSX.read(data, { type: 'array', cellDates: false });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

      if (raw.length < 2) return;

      const headerRow  = raw[0].map(String);
      const fieldKeys: string[] = headerRow.map(h => COLUMN_MAP[normalizeHeader(h)] ?? `_unknown_${h}`);
      const displayHeaders = fieldKeys
        .filter(k => k !== '_skip' && !k.startsWith('_unknown'))
        .map(k => FIELD_LABELS[k] ?? k);

      setHeaders(displayHeaders);

      const parsed: ImportRow[] = [];
      for (let i = 1; i < raw.length; i++) {
        const cells = raw[i];
        if (cells.every(c => c === '' || c == null)) continue;

        const row: ImportRow = {};
        fieldKeys.forEach((key, idx) => {
          if (key === '_skip' || key.startsWith('_unknown')) return;
          const val = cells[idx];
          if (key === 'birth_date' || key === 'hire_date') {
            row[key] = parseDate(val);
          } else if (key === 'part_ir' || key === 'nombre_femmes' || key === 'nombre_enfants_charge') {
            row[key] = val !== '' && val != null ? Number(val) : null;
          } else {
            row[key] = val !== '' && val != null ? String(val).trim() : null;
          }
        });

        const errors = validateRow(row);
        row._errors = errors;
        row._valid  = errors.length === 0;
        parsed.push(row);
      }

      setRows(parsed);
      setFileName(file.name);
      setStep(1);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const doImport = async () => {
    setImporting(true);
    try {
      const payload = validRows.map(({ _errors, _valid, ...rest }) => rest);
      const res = await client.post('/employees/import-json', { rows: payload });
      setResult(res.data);
      setStep(2);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> }; status?: number } };
      const msg = axiosErr.response?.data?.message
        || (axiosErr.response?.status ? `Erreur HTTP ${axiosErr.response.status}` : 'Erreur réseau ou serveur');
      setResult({ created: 0, skipped: [msg] });
      setStep(2);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setStep(0); setRows([]); setHeaders([]); setFileName(''); setResult(null); };

  // ── Step 0 : Upload ──────────────────────────────────────────────────────
  const StepUpload = () => (
    <Box sx={{ maxWidth: 640, mx: 'auto', mt: 4 }}>
      <Paper
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        sx={{
          border: `2px dashed ${dragOver ? '#002f59' : '#ccc'}`,
          borderRadius: 3, p: 6, textAlign: 'center', cursor: 'pointer',
          bgcolor: dragOver ? 'rgba(0,47,89,0.04)' : 'background.paper',
          transition: 'all .2s',
          '&:hover': { borderColor: '#002f59', bgcolor: 'rgba(0,47,89,0.03)' },
        }}
      >
        <CloudUpload sx={{ fontSize: 64, color: '#002f59', mb: 2 }} />
        <Typography variant="h6" fontWeight={700} color="#002f59">
          Glissez votre fichier Excel ici
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          ou cliquez pour sélectionner (.xlsx, .xls, .csv)
        </Typography>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFileChange} />
      </Paper>

      <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600} mb={0.5}>Colonnes reconnues automatiquement :</Typography>
        <Typography variant="body2">
          Matr. · Prénom(s) · Nom · Date Naiss. · Lieu Naiss. · Date Emb. · Fonction · Catégorie · Qualification · Niveau RH · Parts Fisc. · Femme(s) · Enfant(s)
        </Typography>
      </Alert>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={e => { e.stopPropagation(); downloadTemplate(); }}
          sx={{ borderColor: '#002f59', color: '#002f59' }}
        >
          Télécharger le modèle Excel
        </Button>
      </Box>
    </Box>
  );

  // ── Step 1 : Prévisualisation ────────────────────────────────────────────
  const StepPreview = () => (
    <Box>
      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper sx={{ p: 2, flex: 1, minWidth: 140, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Typography variant="h4" fontWeight={800} color="#15803d">{validRows.length}</Typography>
          <Typography variant="body2" color="#15803d">Lignes valides</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 140, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
          <Typography variant="h4" fontWeight={800} color="#dc2626">{invalidRows.length}</Typography>
          <Typography variant="body2" color="#dc2626">Lignes avec erreurs</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 140, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Typography variant="h4" fontWeight={800} color="#1d4ed8">{rows.length}</Typography>
          <Typography variant="body2" color="#1d4ed8">Total lignes</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 200, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: '#16a34a' }} />
          <Box>
            <Typography variant="body2" fontWeight={600}>{fileName}</Typography>
            <Typography variant="caption" color="text.secondary">Fichier chargé</Typography>
          </Box>
          <IconButton size="small" onClick={reset} sx={{ ml: 'auto' }}>
            <Close fontSize="small" />
          </IconButton>
        </Paper>
      </Stack>

      {/* Erreurs globales */}
      {invalidRows.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {invalidRows.length} ligne(s) avec erreurs — elles seront ignorées lors de l'import.
          </Typography>
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: 480 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: '#002f59', color: '#fff', fontWeight: 700, width: 40 }}>#</TableCell>
              <TableCell sx={{ bgcolor: '#002f59', color: '#fff', fontWeight: 700, width: 80 }}>État</TableCell>
              {headers.map(h => (
                <TableCell key={h} sx={{ bgcolor: '#002f59', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={idx}
                sx={{
                  bgcolor: row._valid ? 'transparent' : 'rgba(220,38,38,0.04)',
                  '&:hover': { bgcolor: row._valid ? 'rgba(0,47,89,0.03)' : 'rgba(220,38,38,0.08)' },
                }}
              >
                <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>{idx + 2}</TableCell>
                <TableCell>
                  {row._valid ? (
                    <CheckCircle sx={{ color: '#16a34a', fontSize: 18 }} />
                  ) : (
                    <Tooltip title={row._errors?.join(' · ')} arrow>
                      <Badge badgeContent={row._errors?.length} color="error" sx={{ cursor: 'help' }}>
                        <ErrorIcon sx={{ color: '#dc2626', fontSize: 18 }} />
                      </Badge>
                    </Tooltip>
                  )}
                </TableCell>
                {Object.keys(FIELD_LABELS)
                  .filter(k => headers.includes(FIELD_LABELS[k]))
                  .map(key => (
                    <TableCell
                      key={key}
                      sx={{
                        fontSize: 12,
                        color: (!row[key] && REQUIRED_FIELDS.includes(key)) ? '#dc2626' : 'text.primary',
                        fontWeight: key === 'employee_number' ? 700 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row[key] != null ? String(row[key]) : (
                        REQUIRED_FIELDS.includes(key)
                          ? <Typography component="span" sx={{ color: '#dc2626', fontSize: 11 }}>manquant</Typography>
                          : <Typography component="span" sx={{ color: '#aaa', fontSize: 11 }}>—</Typography>
                      )}
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ── Step 2 : Résultats ───────────────────────────────────────────────────
  const StepResult = () => (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, textAlign: 'center' }}>
      <CheckCircle sx={{ fontSize: 72, color: '#16a34a', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} color="#002f59" mb={1}>
        Import terminé
      </Typography>

      <Stack direction="row" spacing={3} justifyContent="center" mb={4}>
        <Paper sx={{ p: 3, minWidth: 130, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Typography variant="h3" fontWeight={800} color="#15803d">{result?.created}</Typography>
          <Typography variant="body2" color="#15803d">Importé(s)</Typography>
        </Paper>
        {(result?.skipped?.length ?? 0) > 0 && (
          <Paper sx={{ p: 3, minWidth: 130, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
            <Typography variant="h3" fontWeight={800} color="#dc2626">{result?.skipped.length}</Typography>
            <Typography variant="body2" color="#dc2626">Ignoré(s)</Typography>
          </Paper>
        )}
      </Stack>

      {(result?.skipped?.length ?? 0) > 0 && (
        <Alert severity="warning" sx={{ textAlign: 'left', mb: 3, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600} mb={1}>Lignes ignorées :</Typography>
          {result?.skipped.map((s, i) => (
            <Typography key={i} variant="body2">• {s}</Typography>
          ))}
        </Alert>
      )}

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="outlined" onClick={reset} sx={{ borderColor: '#002f59', color: '#002f59' }}>
          Nouvel import
        </Button>
        <Button variant="contained" onClick={() => window.location.href = '/agents'}
          sx={{ bgcolor: '#002f59', '&:hover': { bgcolor: '#001f3f' } }}>
          Voir les agents
        </Button>
      </Stack>
    </Box>
  );

  // ── Stepper header ───────────────────────────────────────────────────────
  const STEPS = ['Chargement fichier', 'Vérification des données', 'Résultat import'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#002f59">
          Import des agents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Importez vos agents depuis un fichier Excel avec vérification des données avant import
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={0} alignItems="center">
          {STEPS.map((label, i) => (
            <Stack key={i} direction="row" alignItems="center" flex={i < STEPS.length - 1 ? 1 : 'none'}>
              <Stack alignItems="center" direction="row" spacing={1}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: 14,
                  bgcolor: step === i ? '#002f59' : step > i ? '#16a34a' : '#e5e7eb',
                  color: step >= i ? '#fff' : '#6b7280',
                }}>
                  {step > i ? '✓' : i + 1}
                </Box>
                <Typography variant="body2" fontWeight={step === i ? 700 : 400}
                  color={step === i ? '#002f59' : step > i ? '#15803d' : 'text.secondary'}
                  sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {label}
                </Typography>
              </Stack>
              {i < STEPS.length - 1 && (
                <Box sx={{ flex: 1, height: 2, bgcolor: step > i ? '#16a34a' : '#e5e7eb', mx: 1 }} />
              )}
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* Content */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        {step === 0 && <StepUpload />}
        {step === 1 && <StepPreview />}
        {step === 2 && <StepResult />}

        {/* Actions */}
        {step === 1 && (
          <>
            <Divider sx={{ my: 3 }} />
            {importing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button startIcon={<NavigateBefore />} onClick={reset} disabled={importing}>
                Retour
              </Button>
              <Stack direction="row" spacing={1} alignItems="center">
                {invalidRows.length > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Warning sx={{ color: '#f59e0b', fontSize: 16 }} />
                    <Typography variant="caption" color="#92400e">
                      {invalidRows.length} ligne(s) ignorée(s)
                    </Typography>
                  </Stack>
                )}
                <Tooltip title={validRows.length === 0 ? 'Aucune ligne valide à importer' : ''}>
                  <span>
                    <Button
                      variant="contained"
                      endIcon={<NavigateNext />}
                      onClick={doImport}
                      disabled={importing || validRows.length === 0}
                      sx={{ bgcolor: '#002f59', '&:hover': { bgcolor: '#001f3f' }, px: 3 }}
                    >
                      Importer {validRows.length} agent{validRows.length > 1 ? 's' : ''}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
}

// ── Télécharger modèle Excel ──────────────────────────────────────────────────
function downloadTemplate() {
  const headers = ['Matr.','Prénom(s)','Nom','Date Naiss.','Lieu Naiss.','Date Emb.','Fonction','Catégorie','Qualification','Niveau RH','Parts Fisc.','Femme(s)','Enfant(s)'];
  const example = ['0001','PRÉNOM','NOM','01/01/1990','DAKAR','01/01/2020','CHEF DE BUREAU','9A','Agent technique','N2 - Encadrement','2','0','1'];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agents');
  XLSX.writeFile(wb, 'modele_import_agents.xlsx');
}
