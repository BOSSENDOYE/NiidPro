import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Button, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, AccountTree, Category, LinearScale, GridView, Upload } from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';
import type { RecruitmentHierarchy, PaieClasse, PaieEchelon } from '../../../types';
import HierarchieImportDialog from './HierarchieImportDialog';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';

const NAV = '#0D2137';
const TH  = '#1A3A5C';
const ACT = '#E85D04';
const TH_CELL = { color: '#fff', fontWeight: 700, fontSize: 11, py: 1 };

// ─── Mini-onglet interne ──────────────────────────────────────────────────────
function SubTab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: '5px',
        px: 2, py: 0.75, cursor: 'pointer', borderRadius: '6px',
        fontWeight: 700, fontSize: 12, userSelect: 'none',
        bgcolor: active ? TH : '#F1F5F9',
        color: active ? '#fff' : '#64748B',
        border: `1.5px solid ${active ? TH : '#E2E8F0'}`,
        transition: 'all 0.15s',
        '&:hover': { bgcolor: active ? TH : '#E2E8F0' },
        '& svg': { fontSize: 14 },
      }}
    >
      {icon}{label}
    </Box>
  );
}

// ─── Statut chip ─────────────────────────────────────────────────────────────
function StatusChip({ active }: { active: boolean }) {
  return (
    <Chip
      label={active ? 'Actif' : 'Inactif'}
      size="small"
      sx={{
        height: 20, fontSize: 10, fontWeight: 700,
        bgcolor: active ? '#D1FAE5' : '#FEE2E2',
        color:   active ? '#065F46' : '#991B1B',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SOUS-ONGLET 0 — Hiérarchies
// ═══════════════════════════════════════════════════════════════════
function HierarchiesTab() {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<{ open: boolean; item?: RecruitmentHierarchy }>({ open: false });
  const [form, setForm] = useState({ code: '', libelle: '', description: '', ordre: '0', is_active: true });
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: hierarchies = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'hierarchies'] });

  const openDlg = (item?: RecruitmentHierarchy) => {
    setForm(item
      ? { code: item.code, libelle: item.libelle, description: item.description ?? '', ordre: String(item.ordre), is_active: item.is_active }
      : { code: '', libelle: '', description: '', ordre: '0', is_active: true });
    setDlg({ open: true, item });
  };

  const saveMut = useMutation({
    mutationFn: () => dlg.item
      ? recruitmentApi.updateHierarchy(dlg.item.id, { ...form, ordre: Number(form.ordre) })
      : recruitmentApi.createHierarchy({ ...form, ordre: Number(form.ordre) }),
    onSuccess: () => { invalidate(); setDlg({ open: false }); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteHierarchy(id),
    onSuccess: invalidate,
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: ACT, fontSize: 12, fontWeight: 700 }}
          onClick={() => openDlg()}>
          Nouvelle hiérarchie
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : hierarchies.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
          <AccountTree sx={{ fontSize: 40, mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucune hiérarchie configurée</Typography>
        </Box>
      ) : (
        <TableContainer><Table size="small">
          <TableHead><TableRow sx={{ bgcolor: TH }}>
            {['Ordre', 'Code', 'Libellé', 'Description', 'Statut', 'Actions'].map((h) => (
              <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
            ))}
          </TableRow></TableHead>
          <TableBody>
            {hierarchies.map((r: RecruitmentHierarchy, i: number) => (
              <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textAlign: 'center', width: 50 }}>{r.ordre}</TableCell>
                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: TH }}>{r.code}</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.libelle}</TableCell>
                <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{r.description ?? '—'}</TableCell>
                <TableCell><StatusChip active={r.is_active} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Modifier"><IconButton size="small" onClick={() => openDlg(r)} sx={{ color: TH }}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="Supprimer"><IconButton size="small" onClick={() => setToDel(r.id)} sx={{ color: '#DC2626' }}><Delete sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      )}

      <Dialog open={dlg.open} onClose={() => setDlg({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, color: TH }}>
          {dlg.item ? 'Modifier la hiérarchie' : 'Nouvelle hiérarchie'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="Code *" size="small" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} sx={{ flex: 1 }} />
              <TextField label="Ordre" type="number" size="small" value={form.ordre} onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} sx={{ width: 100 }} />
            </Stack>
            <TextField label="Libellé *" size="small" value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            <TextField label="Description" size="small" multiline rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
              label="Actif"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDlg({ open: false })}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: ACT }}
            disabled={!form.code || !form.libelle || saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? <CircularProgress size={16} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cette hiérarchie ?"
        onConfirm={() => toDel !== null && delMut.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SOUS-ONGLET 1 — Classes
// ═══════════════════════════════════════════════════════════════════
function ClassesTab() {
  const qc = useQueryClient();
  const [filterHier, setFilterHier] = useState<number | ''>('');
  const [dlg, setDlg] = useState<{ open: boolean; item?: PaieClasse }>({ open: false });
  const [form, setForm] = useState({ hierarchy_id: '', code: '', libelle: '', description: '', is_active: true });
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: hierarchies = [] } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'classes', filterHier],
    queryFn: () => recruitmentApi.getClasses(filterHier || undefined).then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'classes'] });

  const openDlg = (item?: PaieClasse) => {
    setForm(item
      ? { hierarchy_id: String(item.hierarchy_id), code: item.code, libelle: item.libelle, description: item.description ?? '', is_active: item.is_active }
      : { hierarchy_id: filterHier ? String(filterHier) : '', code: '', libelle: '', description: '', is_active: true });
    setDlg({ open: true, item });
  };

  const saveMut = useMutation({
    mutationFn: () => dlg.item
      ? recruitmentApi.updateClasse(dlg.item.id, { ...form, hierarchy_id: Number(form.hierarchy_id) })
      : recruitmentApi.createClasse({ ...form, hierarchy_id: Number(form.hierarchy_id) }),
    onSuccess: () => { invalidate(); setDlg({ open: false }); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteClasse(id),
    onSuccess: invalidate,
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid #E2E8F0', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel sx={{ fontSize: 12 }}>Filtrer par hiérarchie</InputLabel>
          <Select label="Filtrer par hiérarchie" value={filterHier} onChange={(e) => setFilterHier(e.target.value as number | '')} sx={{ fontSize: 12 }}>
            <MenuItem value=""><em>Toutes</em></MenuItem>
            {hierarchies.map((h: RecruitmentHierarchy) => <MenuItem key={h.id} value={h.id}>{h.code} — {h.libelle}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: ACT, fontSize: 12, fontWeight: 700 }}
          onClick={() => openDlg()}>
          Nouvelle classe
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : classes.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
          <Category sx={{ fontSize: 40, mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucune classe configurée</Typography>
        </Box>
      ) : (
        <TableContainer><Table size="small">
          <TableHead><TableRow sx={{ bgcolor: TH }}>
            {['Hiérarchie', 'Code', 'Libellé', 'Description', 'Statut', 'Actions'].map((h) => (
              <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
            ))}
          </TableRow></TableHead>
          <TableBody>
            {classes.map((r: PaieClasse, i: number) => (
              <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                <TableCell>
                  <Chip label={r.hierarchy?.code ?? '—'} size="small"
                    sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} />
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: TH }}>{r.code}</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.libelle}</TableCell>
                <TableCell sx={{ fontSize: 11, color: '#64748B' }}>{r.description ?? '—'}</TableCell>
                <TableCell><StatusChip active={r.is_active} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Modifier"><IconButton size="small" onClick={() => openDlg(r)} sx={{ color: TH }}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="Supprimer"><IconButton size="small" onClick={() => setToDel(r.id)} sx={{ color: '#DC2626' }}><Delete sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      )}

      <Dialog open={dlg.open} onClose={() => setDlg({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, color: TH }}>
          {dlg.item ? 'Modifier la classe' : 'Nouvelle classe'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Hiérarchie *</InputLabel>
              <Select label="Hiérarchie *" value={form.hierarchy_id}
                onChange={(e) => setForm((f) => ({ ...f, hierarchy_id: String(e.target.value) }))}>
                <MenuItem value=""><em>Sélectionner</em></MenuItem>
                {hierarchies.map((h: RecruitmentHierarchy) => (
                  <MenuItem key={h.id} value={h.id}>{h.code} — {h.libelle}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Code *" size="small" value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Libellé *" size="small" value={form.libelle}
              onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            <TextField label="Description" size="small" multiline rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
              label="Actif"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDlg({ open: false })}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: ACT }}
            disabled={!form.hierarchy_id || !form.code || !form.libelle || saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? <CircularProgress size={16} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cette classe ?"
        onConfirm={() => toDel !== null && delMut.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SOUS-ONGLET 2 — Échelons
// ═══════════════════════════════════════════════════════════════════
function EchelonsTab() {
  const qc = useQueryClient();
  const [filterHier, setFilterHier] = useState<number | ''>('');
  const [filterClass, setFilterClass] = useState<number | ''>('');
  const [dlg, setDlg] = useState<{ open: boolean; item?: PaieEchelon }>({ open: false });
  const [form, setForm] = useState({ class_id: '', numero: '', libelle: '', description: '', is_active: true });
  const [toDel, setToDel] = useState<number | null>(null);

  const { data: hierarchies = [] } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['payroll', 'params', 'classes', filterHier],
    queryFn: () => recruitmentApi.getClasses(filterHier || undefined).then((r) => r.data),
  });

  const { data: echelons = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'echelons', filterClass, filterHier],
    queryFn: () => recruitmentApi.getEchelons({
      class_id: filterClass || undefined,
      hierarchy_id: (!filterClass && filterHier) ? filterHier : undefined,
    }).then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'echelons'] });

  const openDlg = (item?: PaieEchelon) => {
    setForm(item
      ? { class_id: String(item.class_id), numero: String(item.numero), libelle: item.libelle ?? '', description: item.description ?? '', is_active: item.is_active }
      : { class_id: filterClass ? String(filterClass) : '', numero: '', libelle: '', description: '', is_active: true });
    setDlg({ open: true, item });
  };

  const saveMut = useMutation({
    mutationFn: () => dlg.item
      ? recruitmentApi.updateEchelon(dlg.item.id, { ...form, class_id: Number(form.class_id), numero: Number(form.numero) })
      : recruitmentApi.createEchelon({ ...form, class_id: Number(form.class_id), numero: Number(form.numero) }),
    onSuccess: () => { invalidate(); setDlg({ open: false }); },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteEchelon(id),
    onSuccess: invalidate,
  });

  const dialogClasses = filterHier
    ? (classes as PaieClasse[])
    : form.class_id
      ? (classes as PaieClasse[])
      : (classes as PaieClasse[]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid #E2E8F0', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: 12 }}>Hiérarchie</InputLabel>
            <Select label="Hiérarchie" value={filterHier}
              onChange={(e) => { setFilterHier(e.target.value as number | ''); setFilterClass(''); }}
              sx={{ fontSize: 12 }}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {hierarchies.map((h: RecruitmentHierarchy) => <MenuItem key={h.id} value={h.id}>{h.code}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: 12 }}>Classe</InputLabel>
            <Select label="Classe" value={filterClass}
              onChange={(e) => setFilterClass(e.target.value as number | '')}
              sx={{ fontSize: 12 }}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {(classes as PaieClasse[]).map((c) => <MenuItem key={c.id} value={c.id}>{c.code} — {c.libelle}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Button size="small" variant="contained" startIcon={<Add />}
          sx={{ bgcolor: ACT, fontSize: 12, fontWeight: 700 }}
          onClick={() => openDlg()}>
          Nouvel échelon
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : echelons.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
          <LinearScale sx={{ fontSize: 40, mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucun échelon configuré</Typography>
        </Box>
      ) : (
        <TableContainer><Table size="small">
          <TableHead><TableRow sx={{ bgcolor: TH }}>
            {['Hiérarchie', 'Classe', 'N°', 'Libellé', 'Grade', 'Statut', 'Actions'].map((h) => (
              <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
            ))}
          </TableRow></TableHead>
          <TableBody>
            {echelons.map((r: PaieEchelon, i: number) => {
              const grade = `${r.classe?.hierarchy?.code ?? ''}${r.classe?.code ?? ''}_${r.numero}`;
              return (
                <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell>
                    <Chip label={r.classe?.hierarchy?.code ?? '—'} size="small"
                      sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: TH }}>
                    {r.classe?.code ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'center', width: 50 }}>
                    {r.numero}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.libelle ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={grade} size="small"
                      sx={{ fontSize: 10, height: 20, fontWeight: 700, fontFamily: 'monospace', bgcolor: '#FEF3C7', color: '#92400E' }} />
                  </TableCell>
                  <TableCell><StatusChip active={r.is_active} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Modifier"><IconButton size="small" onClick={() => openDlg(r)} sx={{ color: TH }}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="Supprimer"><IconButton size="small" onClick={() => setToDel(r.id)} sx={{ color: '#DC2626' }}><Delete sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></TableContainer>
      )}

      <Dialog open={dlg.open} onClose={() => setDlg({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, color: TH }}>
          {dlg.item ? 'Modifier l\'échelon' : 'Nouvel échelon'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Classe *</InputLabel>
              <Select label="Classe *" value={form.class_id}
                onChange={(e) => setForm((f) => ({ ...f, class_id: String(e.target.value) }))}>
                <MenuItem value=""><em>Sélectionner</em></MenuItem>
                {(dialogClasses as PaieClasse[]).map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.hierarchy?.code} — {c.code} / {c.libelle}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Numéro *" type="number" size="small" value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} sx={{ width: 120 }}
                inputProps={{ min: 1 }} />
              <TextField label="Libellé" size="small" value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} sx={{ flex: 1 }} />
            </Stack>
            <TextField label="Description" size="small" multiline rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
              label="Actif"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDlg({ open: false })}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: ACT }}
            disabled={!form.class_id || !form.numero || saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? <CircularProgress size={16} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cet échelon ?"
        onConfirm={() => toDel !== null && delMut.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SOUS-ONGLET 3 — Grades (récapitulatif)
// ═══════════════════════════════════════════════════════════════════
function GradesTab() {
  const [filterHier, setFilterHier] = useState<number | ''>('');
  const [filterClass, setFilterClass] = useState<number | ''>('');

  const { data: hierarchies = [] } = useQuery({
    queryKey: ['payroll', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['payroll', 'params', 'classes', filterHier],
    queryFn: () => recruitmentApi.getClasses(filterHier || undefined).then((r) => r.data),
  });

  const { data: echelons = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'echelons', filterClass, filterHier],
    queryFn: () => recruitmentApi.getEchelons({
      class_id: filterClass || undefined,
      hierarchy_id: (!filterClass && filterHier) ? filterHier : undefined,
    }).then((r) => r.data),
  });

  return (
    <Box>
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 12, color: '#64748B', mr: 1 }}>Filtrer :</Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: 12 }}>Hiérarchie</InputLabel>
            <Select label="Hiérarchie" value={filterHier}
              onChange={(e) => { setFilterHier(e.target.value as number | ''); setFilterClass(''); }}
              sx={{ fontSize: 12 }}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {hierarchies.map((h: RecruitmentHierarchy) => <MenuItem key={h.id} value={h.id}>{h.code}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: 12 }}>Classe</InputLabel>
            <Select label="Classe" value={filterClass}
              onChange={(e) => setFilterClass(e.target.value as number | '')}
              sx={{ fontSize: 12 }}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {(classes as PaieClasse[]).map((c) => <MenuItem key={c.id} value={c.id}>{c.code}</MenuItem>)}
            </Select>
          </FormControl>
          <Chip label={`${echelons.length} grade(s)`} size="small"
            sx={{ fontSize: 11, fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E' }} />
        </Stack>
      </Box>

      {isLoading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : echelons.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: '#94A3B8' }}>
          <GridView sx={{ fontSize: 40, mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucun grade disponible</Typography>
          <Typography sx={{ fontSize: 11, mt: 0.5 }}>Créez des hiérarchies, classes et échelons d'abord</Typography>
        </Box>
      ) : (
        <TableContainer><Table size="small">
          <TableHead><TableRow sx={{ bgcolor: TH }}>
            {['Grade', 'Hiérarchie', 'Classe', 'Échelon', 'Libellé échelon', 'Statut'].map((h) => (
              <TableCell key={h} sx={TH_CELL}>{h}</TableCell>
            ))}
          </TableRow></TableHead>
          <TableBody>
            {echelons.map((r: PaieEchelon, i: number) => {
              const grade = `${r.classe?.hierarchy?.code ?? ''}${r.classe?.code ?? ''}_${r.numero}`;
              return (
                <TableRow key={r.id} hover sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <TableCell>
                    <Chip label={grade} size="small"
                      sx={{ fontSize: 11, height: 22, fontWeight: 800, fontFamily: 'monospace', bgcolor: '#FEF3C7', color: '#92400E' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#4338CA' }}>
                    {r.classe?.hierarchy?.code ?? '—'} — {r.classe?.hierarchy?.libelle ?? ''}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: TH }}>
                    {r.classe?.code ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'center' }}>
                    {r.numero}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{r.libelle ?? '—'}</TableCell>
                  <TableCell><StatusChip active={r.is_active} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></TableContainer>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PANNEAU PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function HierarchiePanel() {
  const [sub,       setSub]       = useState(0);
  const [importDlg, setImportDlg] = useState(false);

  const subTabs = [
    { label: 'Hiérarchies', icon: <AccountTree /> },
    { label: 'Classes',     icon: <Category /> },
    { label: 'Échelons',    icon: <LinearScale /> },
    { label: 'Grades',      icon: <GridView /> },
  ];

  return (
    <Box>
      {/* ── En-tête ── */}
      <Box sx={{ bgcolor: TH, px: 2.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
          Hiérarchie — Classes — Échelons — Grades
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Upload sx={{ fontSize: 14 }} />}
          onClick={() => setImportDlg(true)}
          sx={{
            color: '#fff', borderColor: 'rgba(255,255,255,0.45)',
            fontSize: 11, fontWeight: 700, textTransform: 'none',
            borderRadius: '7px', py: 0.4,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
          }}
        >
          Importer Excel
        </Button>
      </Box>

      {/* ── Sous-onglets ── */}
      <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        {subTabs.map((t, idx) => (
          <SubTab key={idx} label={t.label} icon={t.icon} active={sub === idx} onClick={() => setSub(idx)} />
        ))}
      </Box>

      {/* ── Contenu ── */}
      {sub === 0 && <HierarchiesTab />}
      {sub === 1 && <ClassesTab />}
      {sub === 2 && <EchelonsTab />}
      {sub === 3 && <GradesTab />}

      {/* ── Dialog import ── */}
      <HierarchieImportDialog
        open={importDlg}
        onClose={() => setImportDlg(false)}
        onSuccess={() => setImportDlg(false)}
      />
    </Box>
  );
}
