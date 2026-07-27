import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Skeleton, Alert, Snackbar, Collapse,
  Select, MenuItem, FormControl, InputLabel, LinearProgress,
} from '@mui/material';
import {
  Add, Edit, Delete, Circle, ExpandMore, ExpandLess,
  Download, Gavel, CheckCircle, InfoOutlined,
} from '@mui/icons-material';
import { leaveTypesApi } from '../../api/leaves';
import type { LeaveType } from '../../types';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

/* ─── Palette ─── */
const NAV = '#002f59';
const ACT = '#E85D04';
const TH  = '#1A3A5C';

/* ─── Couleurs prédéfinies ─── */
const PRESET_COLORS = [
  '#EC4899', '#10B981', '#64748B', '#0EA5E9', '#8B5CF6',
  '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316',
];

/* ─── Référentiel ANASER / CCNI — Art. L.156 du Code du travail ─── */
const LEGAL_TYPES = [
  { name: 'Mariage du travailleur',                       code: 'ABS_MAR_TRV',  max_days: 3, color: '#EC4899', justif: 'Acte de mariage ou certificat de mariage' },
  { name: "Mariage d'un enfant",                          code: 'ABS_MAR_ENF',  max_days: 1, color: '#EC4899', justif: "Acte de mariage de l'enfant" },
  { name: "Naissance d'un enfant",                        code: 'ABS_NAIS',     max_days: 3, color: '#10B981', justif: 'Acte de naissance ou bulletin de naissance' },
  { name: 'Décès du conjoint',                            code: 'ABS_DEC_CONJ', max_days: 3, color: '#64748B', justif: 'Acte de décès' },
  { name: "Décès d'un enfant",                            code: 'ABS_DEC_ENF',  max_days: 3, color: '#64748B', justif: 'Acte de décès' },
  { name: 'Décès du père ou de la mère',                  code: 'ABS_DEC_PAR',  max_days: 3, color: '#64748B', justif: 'Acte de décès' },
  { name: "Décès d'un frère ou d'une sœur",               code: 'ABS_DEC_FRA',  max_days: 1, color: '#64748B', justif: 'Acte de décès' },
  { name: 'Décès du beau-père ou de la belle-mère',       code: 'ABS_DEC_BPM',  max_days: 1, color: '#64748B', justif: 'Acte de décès' },
  { name: 'Déménagement du foyer',                        code: 'ABS_DEM',      max_days: 1, color: '#0EA5E9', justif: 'Justificatif de déménagement (quittance, bail…)' },
  { name: "Hospitalisation du conjoint ou d'un enfant",   code: 'ABS_HOSP',     max_days: 1, color: '#8B5CF6', justif: "Certificat d'hospitalisation" },
] as const;

/* ─── Type form ─── */
interface AbsForm {
  name:                   string;
  code:                   string;
  color:                  string;
  max_days_per_year:      string;
  requires_justification: boolean;
  paid:                   boolean;
  is_active:              boolean;
}

const EMPTY_FORM: AbsForm = {
  name: '', code: '', color: '#EC4899',
  max_days_per_year: '', requires_justification: true, paid: true, is_active: true,
};

export default function AbsenceParamsTab() {
  const qc = useQueryClient();

  /* ── UI state ── */
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<LeaveType | null>(null);
  const [form,         setForm]         = useState<AbsForm>(EMPTY_FORM);
  const [formError,    setFormError]    = useState('');
  const [confirmDel,   setConfirmDel]   = useState<LeaveType | null>(null);
  const [snackMsg,     setSnackMsg]     = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);
  const [refExpanded,  setRefExpanded]  = useState(false);
  const [importing,    setImporting]    = useState(false);

  /* ── Query ── */
  const { data: allTypes = [], isLoading } = useQuery({
    queryKey: ['leave-types', 'all'],
    queryFn: () => leaveTypesApi.list().then(r => r.data),
  });

  const absenceTypes = allTypes.filter(t => t.category === 'absence');
  const existingCodes = new Set(absenceTypes.map(t => t.code));

  /* ── Mutations ── */
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leave-types'] });
    qc.invalidateQueries({ queryKey: ['leaves', 'types'] });
  };

  const createMut = useMutation({
    mutationFn: (d: Partial<LeaveType>) => leaveTypesApi.create(d),
    onSuccess: () => { invalidate(); closeDialog(); setSnackMsg({ msg: 'Type créé avec succès.', sev: 'success' }); },
    onError:   (e: unknown) => setFormError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur lors de la création.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LeaveType> }) => leaveTypesApi.update(id, data),
    onSuccess: () => { invalidate(); closeDialog(); setSnackMsg({ msg: 'Type modifié.', sev: 'success' }); },
    onError:   (e: unknown) => setFormError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => leaveTypesApi.delete(id),
    onSuccess: () => { invalidate(); setSnackMsg({ msg: 'Type supprimé.', sev: 'success' }); },
    onError:   (e: unknown) => setSnackMsg({ msg: (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Impossible de supprimer.', sev: 'error' }),
  });

  /* ── Import ANASER ── */
  const handleImportLegal = async () => {
    setImporting(true);
    const missing = LEGAL_TYPES.filter(t => !existingCodes.has(t.code));
    if (missing.length === 0) {
      setSnackMsg({ msg: 'Tous les motifs légaux sont déjà configurés.', sev: 'success' });
      setImporting(false);
      return;
    }
    let created = 0;
    for (const t of missing) {
      try {
        await leaveTypesApi.create({
          name:                   t.name,
          code:                   t.code,
          category:               'absence',
          color:                  t.color,
          max_days_per_year:      t.max_days,
          requires_justification: true,
          paid:                   true,
          is_active:              true,
        });
        created++;
      } catch {}
    }
    invalidate();
    setSnackMsg({ msg: `${created} motif(s) légal(aux) importé(s) avec succès.`, sev: 'success' });
    setImporting(false);
  };

  /* ── Helpers ── */
  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setDialogOpen(true); };

  const openEdit = (t: LeaveType) => {
    setEditTarget(t);
    setForm({
      name:                   t.name,
      code:                   t.code,
      color:                  t.color || '#EC4899',
      max_days_per_year:      t.max_days_per_year != null ? String(t.max_days_per_year) : '',
      requires_justification: t.requires_justification ?? true,
      paid:                   t.paid ?? true,
      is_active:              t.is_active ?? true,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); };

  const setF = <K extends keyof AbsForm>(k: K, v: AbsForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) { setFormError('Nom et code sont obligatoires.'); return; }
    const payload: Partial<LeaveType> = {
      name:                   form.name.trim(),
      code:                   form.code.trim().toUpperCase(),
      category:               'absence',
      color:                  form.color,
      max_days_per_year:      form.max_days_per_year ? Number(form.max_days_per_year) : null,
      requires_justification: form.requires_justification,
      paid:                   form.paid,
      is_active:              form.is_active,
    };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const missingCount = LEGAL_TYPES.filter(t => !existingCodes.has(t.code)).length;

  /* ─── Rendu ─────────────────────────────────────────────────── */
  return (
    <Box>
      {/* ══ Header ══ */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Paramètres — Motifs d'absence autorisés
        </Typography>
      </Box>

      <Box sx={{ p: 2.5 }}>

        {/* ══ Encart légal ══ */}
        <Box sx={{ mb: 2.5, border: '1px solid #93C5FD', borderRadius: '10px', overflow: 'hidden' }}>
          {/* Titre encart */}
          <Box
            onClick={() => setRefExpanded(v => !v)}
            sx={{
              bgcolor: '#EFF6FF', px: 2, py: 1.25, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              '&:hover': { bgcolor: '#DBEAFE' }, transition: 'background 0.15s',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Gavel sx={{ fontSize: 16, color: '#1D4ED8' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>
                ANASER — Absences autorisées par le Code du travail et la CCNI
              </Typography>
              <Chip label="Art. L.156" size="small"
                sx={{ fontSize: 10, height: 18, bgcolor: '#1D4ED8', color: '#fff', fontWeight: 700 }} />
            </Stack>
            {refExpanded
              ? <ExpandLess sx={{ fontSize: 18, color: '#1D4ED8' }} />
              : <ExpandMore sx={{ fontSize: 18, color: '#1D4ED8' }} />}
          </Box>

          <Collapse in={refExpanded}>
            {/* Note légale */}
            <Box sx={{ px: 2, py: 1, bgcolor: '#F0F9FF', borderBottom: '1px solid #BAE6FD' }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <InfoOutlined sx={{ fontSize: 14, color: '#0369A1' }} />
                <Typography sx={{ fontSize: 12, color: '#0369A1', fontStyle: 'italic' }}>
                  Ces jours s'ajoutent au congé annuel et ne peuvent être imputés dessus (Art. L.156 du Code du travail)
                </Typography>
              </Stack>
            </Box>

            {/* Tableau référence */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                    {['N°', 'Événement', 'Durée autorisée', 'Justificatif requis'].map(h => (
                      <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                    ))}
                    <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1, textAlign: 'center' }}>
                      Importé
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {LEGAL_TYPES.map((t, i) => (
                    <TableRow key={t.code}
                      sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC', '&:hover': { bgcolor: '#EFF6FF' } }}>
                      <TableCell sx={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, width: 40 }}>
                        {i + 1}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Circle sx={{ fontSize: 10, color: t.color }} />
                          {t.name}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${t.max_days} jour${t.max_days > 1 ? 's' : ''} ouvrable${t.max_days > 1 ? 's' : ''}`}
                          size="small"
                          sx={{ fontSize: 11, height: 20, bgcolor: t.max_days >= 3 ? '#FEF3C7' : '#F0FDF4',
                            color: t.max_days >= 3 ? '#92400E' : '#065F46', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#475569' }}>{t.justif}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {existingCodes.has(t.code)
                          ? <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />
                          : <Box sx={{ width: 16, height: 16, border: '2px solid #CBD5E1', borderRadius: '50%', mx: 'auto' }} />
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>

        {/* ══ Actions header ══ */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: NAV }}>
              Motifs d'absence configurés
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.25 }}>
              {absenceTypes.length} motif{absenceTypes.length !== 1 ? 's' : ''} actif{absenceTypes.length !== 1 ? 's' : ''} •
              {' '}catégorie <strong>absence</strong>
              {missingCount > 0 && (
                <Box component="span" sx={{ color: '#B45309', fontWeight: 600 }}>
                  {' '}— {missingCount} motif{missingCount > 1 ? 's' : ''} légal{missingCount > 1 ? 'aux' : ''} manquant{missingCount > 1 ? 's' : ''}
                </Box>
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {missingCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleImportLegal}
                disabled={importing}
                sx={{
                  borderRadius: '8px', fontSize: 12, fontWeight: 700,
                  borderColor: '#1D4ED8', color: '#1D4ED8',
                  '&:hover': { bgcolor: '#EFF6FF', borderColor: '#1D4ED8' },
                }}
              >
                {importing ? 'Import en cours…' : `Importer ${missingCount} motif${missingCount > 1 ? 's' : ''} légal${missingCount > 1 ? 'aux' : ''}`}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '8px', fontSize: 13, fontWeight: 700 }}
            >
              Nouveau motif
            </Button>
          </Stack>
        </Box>

        {importing && <LinearProgress sx={{ mb: 1.5, borderRadius: 2 }} />}

        {/* ══ Tableau motifs ══ */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: TH }}>
                  {['', 'Événement / Motif', 'Code', 'Durée max', 'Justificatif', 'Statut', ''].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1.25 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton height={18} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : absenceTypes.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 6, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          <Stack alignItems="center" spacing={1}>
                            <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>
                              Aucun motif d'absence configuré.
                            </Typography>
                            <Button size="small" variant="outlined"
                              startIcon={<Download />}
                              onClick={handleImportLegal}
                              sx={{ fontSize: 12, borderColor: '#1D4ED8', color: '#1D4ED8' }}>
                              Importer les 10 motifs légaux ANASER
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  : absenceTypes.map((t, idx) => {
                      const legalRef = LEGAL_TYPES.find(l => l.code === t.code);
                      return (
                        <TableRow key={t.id}
                          sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#FAFAFA', '&:hover': { bgcolor: '#EFF6FF' },
                            opacity: t.is_active === false ? 0.55 : 1 }}>

                          <TableCell sx={{ py: 1, pl: 2 }}>
                            <Circle sx={{ fontSize: 18, color: t.color || '#EC4899' }} />
                          </TableCell>

                          <TableCell sx={{ py: 1, maxWidth: 260 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                              {t.name}
                            </Typography>
                            {legalRef && (
                              <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.25 }}>
                                {legalRef.justif}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ py: 1 }}>
                            <Chip label={t.code} size="small"
                              sx={{ height: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                                bgcolor: `${t.color || '#EC4899'}18`, color: t.color || '#EC4899' }} />
                          </TableCell>

                          <TableCell sx={{ py: 1 }}>
                            {t.max_days_per_year != null ? (
                              <Chip
                                label={`${t.max_days_per_year}j`}
                                size="small"
                                sx={{ height: 20, fontSize: 11, fontWeight: 700,
                                  bgcolor: (t.max_days_per_year ?? 0) >= 3 ? '#FEF3C7' : '#F0FDF4',
                                  color:   (t.max_days_per_year ?? 0) >= 3 ? '#92400E' : '#065F46' }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>—</Typography>
                            )}
                          </TableCell>

                          <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>
                            {t.requires_justification
                              ? <Chip label="Oui" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E' }} />
                              : <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Non</Typography>}
                          </TableCell>

                          <TableCell sx={{ py: 1 }}>
                            <Chip label={t.is_active !== false ? 'Actif' : 'Inactif'} size="small"
                              sx={{ height: 20, fontSize: 11, fontWeight: 700,
                                bgcolor: t.is_active !== false ? '#ECFDF5' : '#F8FAFC',
                                color:   t.is_active !== false ? '#059669' : '#64748B' }} />
                          </TableCell>

                          <TableCell sx={{ py: 1 }}>
                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title="Modifier">
                                <IconButton size="small" onClick={() => openEdit(t)} sx={{ p: 0.5 }}>
                                  <Edit sx={{ fontSize: 15, color: '#64748B' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" onClick={() => setConfirmDel(t)} sx={{ p: 0.5 }}>
                                  <Delete sx={{ fontSize: 15, color: '#EF4444' }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

      </Box>

      {/* ── Confirm suppression ── */}
      <ConfirmDialog
        open={confirmDel !== null}
        title="Supprimer ce motif d'absence"
        message={confirmDel ? `Voulez-vous vraiment supprimer « ${confirmDel.name} » ? Cette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        onConfirm={() => confirmDel && deleteMut.mutate(confirmDel.id)}
        onClose={() => setConfirmDel(null)}
      />

      {/* ── Snackbar ── */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackMsg?.sev ?? 'success'} onClose={() => setSnackMsg(null)} sx={{ borderRadius: '10px' }}>
          {snackMsg?.msg}
        </Alert>
      </Snackbar>

      {/* ══ Dialog Créer / Modifier ══ */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ bgcolor: TH, color: '#fff', fontWeight: 700, fontSize: 15, py: 1.75 }}>
          {editTarget ? 'Modifier le motif d\'absence' : 'Nouveau motif d\'absence'}
        </DialogTitle>

        <DialogContent sx={{ pt: '20px !important' }}>
          <Stack spacing={2.5}>

            {formError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{formError}</Alert>}

            {/* Catégorie fixe : absence */}
            <Box sx={{ px: 1.5, py: 1, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoOutlined sx={{ fontSize: 15, color: '#1D4ED8' }} />
              <Typography sx={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>
                Ce motif sera automatiquement classé dans la section <strong>Absences</strong>
              </Typography>
            </Box>

            {/* Nom */}
            <TextField label="Événement / Motif *" size="small" fullWidth
              value={form.name} onChange={e => setF('name', e.target.value)}
              placeholder="ex : Décès du conjoint, Mariage d'un enfant…" />

            {/* Code */}
            <TextField label="Code court *" size="small" fullWidth
              value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())}
              placeholder="ex : ABS_DEC_CONJ, ABS_MAR…"
              inputProps={{ maxLength: 30 }}
              helperText="Abréviation unique (majuscules, max 30 caractères)" />

            {/* Durée max */}
            <FormControl size="small" fullWidth>
              <InputLabel>Durée maximale autorisée (jours)</InputLabel>
              <Select
                label="Durée maximale autorisée (jours)"
                value={form.max_days_per_year}
                onChange={e => setF('max_days_per_year', String(e.target.value))}
              >
                <MenuItem value="">Pas de limite</MenuItem>
                {[1, 2, 3, 4, 5, 6, 7, 10, 15].map(d => (
                  <MenuItem key={d} value={String(d)}>{d} jour{d > 1 ? 's' : ''} ouvrable{d > 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Couleur */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1 }}>Couleur</Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {PRESET_COLORS.map(c => (
                  <Box key={c} onClick={() => setF('color', c)}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #0F172A' : '3px solid transparent',
                      transition: 'border 0.15s', '&:hover': { transform: 'scale(1.15)' },
                    }} />
                ))}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: form.color, border: '2px solid #CBD5E1', flexShrink: 0 }} />
                  <TextField size="small" value={form.color} onChange={e => setF('color', e.target.value)}
                    inputProps={{ maxLength: 20 }}
                    sx={{ width: 110, '& input': { fontSize: 12, fontFamily: 'monospace' } }} />
                </Box>
              </Stack>
            </Box>

            {/* Toggles */}
            <Stack spacing={1}>
              {([
                ['requires_justification', 'Justificatif requis', "Un document (acte, certificat…) est demandé à l'agent"],
                ['paid',                  'Absence payée',       'Le salaire est maintenu pendant cette absence'],
                ['is_active',             'Actif',               'Visible lors de la saisie d\'une demande'],
              ] as const).map(([key, label, desc]) => (
                <Stack key={key} direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ px: 1.5, py: 1, border: '1px solid #E2E8F0', borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{label}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#64748B' }}>{desc}</Typography>
                  </Box>
                  <Switch
                    checked={form[key] as boolean}
                    onChange={e => setF(key, e.target.checked)}
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: form[key] ? ACT : undefined } }}
                  />
                </Stack>
              ))}
            </Stack>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeDialog} variant="outlined"
            sx={{ borderRadius: '8px', borderColor: '#CBD5E1', color: '#64748B' }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isPending}
            sx={{ bgcolor: TH, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '8px', fontWeight: 700, px: 3 }}>
            {isPending ? 'Enregistrement…' : editTarget ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
