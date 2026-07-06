import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, IconButton, Tooltip, Chip, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Skeleton, Alert, Snackbar,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { Add, Edit, Delete, Circle } from '@mui/icons-material';
import { leaveTypesApi } from '../../api/leaves';
import type { LeaveType } from '../../types';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

/* ─── Palette ─── */
const NAV = '#0D2137';
const ACT = '#E85D04';

/* ─── Couleurs prédéfinies ─── */
const PRESET_COLORS = [
  '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B',
];

/* ─── Catégories disponibles ─── */
const CATEGORIES = [
  'Congés',
  'Autorisations spéciales',
  'Service',
  'Représentation',
  'Autres',
];

/* Couleur de badge par catégorie */
const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  'Congés':                   { bg: '#EFF6FF', color: '#2563EB' },
  'Autorisations spéciales':  { bg: '#FFF7ED', color: '#C2410C' },
  'Service':                  { bg: '#F0FDF4', color: '#15803D' },
  'Représentation':           { bg: '#FDF4FF', color: '#7E22CE' },
  'Autres':                   { bg: '#F8FAFC', color: '#475569' },
};

interface TypeForm {
  name: string;
  code: string;
  category: string;
  color: string;
  paid: boolean;
  requires_justification: boolean;
  max_days_per_year: string;
  is_active: boolean;
}

const EMPTY: TypeForm = {
  name: '', code: '', category: 'Congés', color: '#6366F1',
  paid: true, requires_justification: false,
  max_days_per_year: '', is_active: true,
};

/* ─── Sous-onglets ─── */
const SUB_TABS = ['Types de congé / Absence'];

export default function LeaveParamsTab() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState(0);

  return (
    <Box>
      {/* ── En-tête section ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Paramètres — Gestion des congés
        </Typography>
      </Box>

      {/* ── Sous-onglets ── */}
      <Box sx={{ bgcolor: '#F8FAFC', px: 2, pt: 1.5, pb: 0, display: 'flex', gap: 1, borderBottom: '2px solid #E2E8F0' }}>
        {SUB_TABS.map((label, i) => (
          <Box
            key={i}
            onClick={() => setSubTab(i)}
            sx={{
              px: 2, py: 0.9, cursor: 'pointer', borderRadius: '8px 8px 0 0',
              fontWeight: 700, fontSize: 12.5, userSelect: 'none',
              bgcolor:      subTab === i ? '#fff' : 'transparent',
              color:        subTab === i ? ACT    : '#64748B',
              borderBottom: subTab === i ? `2.5px solid ${ACT}` : '2.5px solid transparent',
              transition:   'all 0.15s',
              '&:hover':    { color: ACT },
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      {/* ── Contenu sous-onglet ── */}
      <Box sx={{ p: 2.5 }}>
        {subTab === 0 && <LeaveTypesPanel qc={qc} />}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Panel CRUD Types de congé
═══════════════════════════════════════════════════════════════════ */
function LeaveTypesPanel({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [form,       setForm]       = useState<TypeForm>(EMPTY);
  const [error,      setError]      = useState('');
  const [confirmDel, setConfirmDel] = useState<LeaveType | null>(null);
  const [snackErr,   setSnackErr]   = useState('');

  /* ── Requêtes ── */
  const { data: types = [], isLoading } = useQuery({
    queryKey: ['leave-types', 'all'],
    queryFn: () => leaveTypesApi.list().then((r) => r.data),
  });

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (d: Partial<LeaveType>) => leaveTypesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); qc.invalidateQueries({ queryKey: ['leaves', 'types'] }); close(); },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LeaveType> }) => leaveTypesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); qc.invalidateQueries({ queryKey: ['leaves', 'types'] }); close(); },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => leaveTypesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); qc.invalidateQueries({ queryKey: ['leaves', 'types'] }); },
    onError: (e: unknown) => setSnackErr((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Impossible de supprimer.'),
  });

  /* ── Helpers ── */
  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setError(''); setDialogOpen(true); };

  const openEdit = (t: LeaveType) => {
    setEditTarget(t);
    setForm({
      name:                   t.name,
      code:                   t.code,
      category:               t.category || 'Autres',
      color:                  t.color || '#6366F1',
      paid:                   t.paid ?? true,
      requires_justification: t.requires_justification ?? false,
      max_days_per_year:      t.max_days_per_year != null ? String(t.max_days_per_year) : '',
      is_active:              t.is_active ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const close = () => { setDialogOpen(false); setEditTarget(null); setForm(EMPTY); setError(''); };

  const setF = <K extends keyof TypeForm>(k: K, v: TypeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) { setError('Nom et code sont obligatoires.'); return; }
    const payload: Partial<LeaveType> = {
      name:                   form.name.trim(),
      code:                   form.code.trim().toUpperCase(),
      category:               form.category,
      color:                  form.color,
      paid:                   form.paid,
      requires_justification: form.requires_justification,
      max_days_per_year:      form.max_days_per_year ? Number(form.max_days_per_year) : null,
      is_active:              form.is_active,
    };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  /* ── Regroupement par catégorie ── */
  const grouped: Record<string, LeaveType[]> = {};
  for (const cat of CATEGORIES) grouped[cat] = [];
  for (const t of types) {
    const cat = t.category || 'Autres';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  return (
    <>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: NAV }}>Types de congé / Absence</Typography>
          <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.25 }}>
            {types.length} type{types.length !== 1 ? 's' : ''} dans {CATEGORIES.filter((c) => (grouped[c]?.length ?? 0) > 0).length} catégorie{CATEGORIES.filter((c) => (grouped[c]?.length ?? 0) > 0).length > 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '8px', fontSize: 13, fontWeight: 700 }}
        >
          Nouveau type
        </Button>
      </Box>

      {/* ── Table regroupée ── */}
      <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: NAV }}>
                {['Couleur', 'Nom', 'Code', 'Payé', 'Justificatif', 'Max jours/an', 'Statut', ''].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', py: 1.25 }}>
                    {h}
                  </TableCell>
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
                : types.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 5, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        Aucun type de congé configuré
                      </TableCell>
                    </TableRow>
                  )
                  : CATEGORIES.map((cat) => {
                      const rows = grouped[cat] ?? [];
                      if (rows.length === 0) return null;
                      const { bg, color } = CAT_COLOR[cat] ?? CAT_COLOR['Autres'];
                      return (
                        <>
                          {/* Ligne de séparation catégorie */}
                          <TableRow key={`cat-${cat}`}>
                            <TableCell
                              colSpan={8}
                              sx={{ bgcolor: bg, py: 0.75, px: 2, borderBottom: `2px solid ${color}30` }}
                            >
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{
                                  width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                                }} />
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  {cat}
                                </Typography>
                                <Chip
                                  label={rows.length}
                                  size="small"
                                  sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: `${color}18`, color }}
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {/* Lignes de types */}
                          {rows.map((t, idx) => (
                            <TableRow
                              key={t.id}
                              sx={{
                                bgcolor: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                                '&:hover': { bgcolor: '#EFF6FF' },
                                opacity: t.is_active === false ? 0.55 : 1,
                              }}
                            >
                              <TableCell sx={{ py: 1, pl: 3.5 }}>
                                <Circle sx={{ fontSize: 18, color: t.color || '#6366F1' }} />
                              </TableCell>

                              <TableCell sx={{ py: 1, fontWeight: 600, fontSize: 13, color: '#0F172A', maxWidth: 280 }}>
                                {t.name}
                              </TableCell>

                              <TableCell sx={{ py: 1 }}>
                                <Chip
                                  label={t.code}
                                  size="small"
                                  sx={{
                                    height: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                                    bgcolor: `${t.color || '#6366F1'}18`,
                                    color: t.color || '#6366F1',
                                  }}
                                />
                              </TableCell>

                              <TableCell sx={{ py: 1 }}>
                                <Chip
                                  label={t.paid ? 'Oui' : 'Non'}
                                  size="small"
                                  sx={{
                                    height: 20, fontSize: 11, fontWeight: 700,
                                    bgcolor: t.paid ? '#ECFDF5' : '#FEF2F2',
                                    color:   t.paid ? '#059669' : '#DC2626',
                                  }}
                                />
                              </TableCell>

                              <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B' }}>
                                {t.requires_justification ? 'Oui' : '—'}
                              </TableCell>

                              <TableCell sx={{ py: 1, fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                                {t.max_days_per_year ?? '—'}
                              </TableCell>

                              <TableCell sx={{ py: 1 }}>
                                <Chip
                                  label={t.is_active !== false ? 'Actif' : 'Inactif'}
                                  size="small"
                                  sx={{
                                    height: 20, fontSize: 11, fontWeight: 700,
                                    bgcolor: t.is_active !== false ? '#ECFDF5' : '#F8FAFC',
                                    color:   t.is_active !== false ? '#059669' : '#64748B',
                                  }}
                                />
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
                          ))}
                        </>
                      );
                    })
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── Confirm suppression ── */}
      <ConfirmDialog
        open={confirmDel !== null}
        title="Supprimer ce type de congé"
        message={confirmDel ? `Voulez-vous vraiment supprimer le type « ${confirmDel.name} » ? Cette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        onConfirm={() => confirmDel && deleteMut.mutate(confirmDel.id)}
        onClose={() => setConfirmDel(null)}
      />

      {/* ── Snackbar erreur ── */}
      <Snackbar
        open={!!snackErr}
        autoHideDuration={5000}
        onClose={() => setSnackErr('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackErr('')} sx={{ borderRadius: '10px' }}>
          {snackErr}
        </Alert>
      </Snackbar>

      {/* ══ Dialog Créer / Modifier ══ */}
      <Dialog open={dialogOpen} onClose={close} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', fontWeight: 700, fontSize: 15, py: 1.75 }}>
          {editTarget ? 'Modifier le type de congé' : 'Nouveau type de congé / Absence'}
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>

            {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

            {/* Catégorie */}
            <FormControl fullWidth size="small">
              <InputLabel>Catégorie *</InputLabel>
              <Select
                label="Catégorie *"
                value={form.category}
                onChange={(e) => setF('category', e.target.value)}
              >
                {CATEGORIES.map((cat) => {
                  const { bg, color } = CAT_COLOR[cat] ?? CAT_COLOR['Autres'];
                  return (
                    <MenuItem key={cat} value={cat}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                        <Typography sx={{ fontSize: 13 }}>{cat}</Typography>
                        <Chip label={cat} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: bg, color, display: 'none' }} />
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Nom */}
            <TextField
              label="Nom du type *"
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => setF('name', e.target.value)}
              placeholder="ex : Congé de maladie, Décès du conjoint…"
            />

            {/* Code */}
            <TextField
              label="Code court *"
              size="small"
              fullWidth
              value={form.code}
              onChange={(e) => setF('code', e.target.value.toUpperCase())}
              placeholder="ex : CM, DEC_CONJ…"
              inputProps={{ maxLength: 30 }}
              helperText="Abréviation unique (majuscules, max 30 caractères)"
            />

            {/* Couleur */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 1 }}>Couleur</Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {PRESET_COLORS.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setF('color', c)}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #0F172A' : '3px solid transparent',
                      transition: 'border 0.15s',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: form.color, border: '2px solid #CBD5E1', flexShrink: 0 }} />
                  <TextField
                    size="small"
                    value={form.color}
                    onChange={(e) => setF('color', e.target.value)}
                    inputProps={{ maxLength: 20 }}
                    sx={{ width: 110, '& input': { fontSize: 12, fontFamily: 'monospace' } }}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Max jours */}
            <TextField
              label="Nombre max de jours / an"
              size="small"
              type="number"
              fullWidth
              value={form.max_days_per_year}
              onChange={(e) => setF('max_days_per_year', e.target.value)}
              inputProps={{ min: 1 }}
              helperText="Laisser vide si pas de limite"
            />

            {/* Toggles */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 1.5, py: 1, border: '1px solid #E2E8F0', borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Congé payé</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>Le salaire est maintenu pendant ce congé</Typography>
                </Box>
                <Switch checked={form.paid} onChange={(e) => setF('paid', e.target.checked)} />
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 1.5, py: 1, border: '1px solid #E2E8F0', borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Justificatif requis</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>Un document médical ou autre est demandé</Typography>
                </Box>
                <Switch checked={form.requires_justification}
                  onChange={(e) => setF('requires_justification', e.target.checked)} />
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 1.5, py: 1, border: '1px solid #E2E8F0', borderRadius: '8px', bgcolor: '#F8FAFC' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Actif</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>Visible lors de la création d'une demande</Typography>
                </Box>
                <Switch checked={form.is_active} onChange={(e) => setF('is_active', e.target.checked)} />
              </Stack>
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={close} variant="outlined"
            sx={{ borderRadius: '8px', borderColor: '#CBD5E1', color: '#64748B' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isPending}
            sx={{ bgcolor: NAV, '&:hover': { bgcolor: '#0D2A40' }, borderRadius: '8px', fontWeight: 700, px: 3 }}
          >
            {isPending ? 'Enregistrement…' : editTarget ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
