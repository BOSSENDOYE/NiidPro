import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Tabs, Tab, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, Card,
  IconButton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Select, FormControl,
  InputLabel, CircularProgress, Divider, Stack, Switch, FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { recruitmentApi } from '../../api/recruitment';
import type {
  RecruitmentIndice, RecruitmentHierarchy,
  RecruitmentAugmentation, RecruitmentBareme,
} from '../../types';

const thStyle = {
  fontWeight: 700, fontSize: 12, color: '#64748B', borderBottom: '2px solid #E2E8F0',
};

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
        {label}
      </TableCell>
    </TableRow>
  );
}

export default function RecruitmentParamsPage() {
  const qc = useQueryClient();
  const [paramTab, setParamTab] = useState(0);

  // ── Queries ──
  const { data: indices = [], isLoading: loadingIndices } = useQuery({
    queryKey: ['recruitment', 'params', 'indices'],
    queryFn: () => recruitmentApi.getIndices().then((r) => r.data),
  });
  const { data: hierarchies = [], isLoading: loadingHierarchies } = useQuery({
    queryKey: ['recruitment', 'params', 'hierarchies'],
    queryFn: () => recruitmentApi.getHierarchies().then((r) => r.data),
  });
  const { data: augmentations = [], isLoading: loadingAugmentations } = useQuery({
    queryKey: ['recruitment', 'params', 'augmentations'],
    queryFn: () => recruitmentApi.getAugmentations().then((r) => r.data),
  });
  const { data: baremes = [], isLoading: loadingBaremes } = useQuery({
    queryKey: ['recruitment', 'params', 'baremes'],
    queryFn: () => recruitmentApi.getBaremes().then((r) => r.data),
  });

  // ── Dialog states ──
  const [indiceDialog, setIndiceDialog]   = useState<{ open: boolean; item: RecruitmentIndice | null }>({ open: false, item: null });
  const [hierDialog, setHierDialog]       = useState<{ open: boolean; item: RecruitmentHierarchy | null }>({ open: false, item: null });
  const [augDialog, setAugDialog]         = useState<{ open: boolean; item: RecruitmentAugmentation | null }>({ open: false, item: null });
  const [baremeDialog, setBaremeDialog]   = useState<{ open: boolean; item: RecruitmentBareme | null }>({ open: false, item: null });

  // ── Forms ──
  const [indiceForm, setIndiceForm]   = useState({ code: '', valeur: '', description: '', is_active: true });
  const [hierForm, setHierForm]       = useState({ code: '', libelle: '', description: '', ordre: '0', is_active: true });
  const [augForm, setAugForm]         = useState({ libelle: '', type: 'indiciaire', taux: '', unite: 'pourcentage', date_effet: '', description: '', is_active: true });
  const [baremeForm, setBaremeForm]   = useState({ hierarchy_id: '', indice_id: '', echelon: '1', salaire_base: '', date_application: '', is_active: true });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['recruitment', 'params'] });

  // ── Mutations : Indice ──
  const saveIndice = useMutation({
    mutationFn: (d: typeof indiceForm) =>
      indiceDialog.item
        ? recruitmentApi.updateIndice(indiceDialog.item.id, { ...d, valeur: Number(d.valeur) })
        : recruitmentApi.createIndice({ ...d, valeur: Number(d.valeur) }),
    onSuccess: () => {
      invalidate();
      setIndiceDialog({ open: false, item: null });
      setIndiceForm({ code: '', valeur: '', description: '', is_active: true });
    },
  });
  const deleteIndice = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteIndice(id),
    onSuccess: () => invalidate(),
  });

  // ── Mutations : Hiérarchie ──
  const saveHier = useMutation({
    mutationFn: (d: typeof hierForm) =>
      hierDialog.item
        ? recruitmentApi.updateHierarchy(hierDialog.item.id, { ...d, ordre: Number(d.ordre) })
        : recruitmentApi.createHierarchy({ ...d, ordre: Number(d.ordre) }),
    onSuccess: () => {
      invalidate();
      setHierDialog({ open: false, item: null });
      setHierForm({ code: '', libelle: '', description: '', ordre: '0', is_active: true });
    },
  });
  const deleteHier = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteHierarchy(id),
    onSuccess: () => invalidate(),
  });

  // ── Mutations : Augmentation ──
  const saveAug = useMutation({
    mutationFn: (d: typeof augForm) =>
      augDialog.item
        ? recruitmentApi.updateAugmentation(augDialog.item.id, { ...d, taux: Number(d.taux) })
        : recruitmentApi.createAugmentation({ ...d, taux: Number(d.taux) }),
    onSuccess: () => {
      invalidate();
      setAugDialog({ open: false, item: null });
      setAugForm({ libelle: '', type: 'indiciaire', taux: '', unite: 'pourcentage', date_effet: '', description: '', is_active: true });
    },
  });
  const deleteAug = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteAugmentation(id),
    onSuccess: () => invalidate(),
  });

  // ── Mutations : Barème ──
  const saveBareme = useMutation({
    mutationFn: (d: typeof baremeForm) =>
      baremeDialog.item
        ? recruitmentApi.updateBareme(baremeDialog.item.id, {
            ...d,
            hierarchy_id: Number(d.hierarchy_id), indice_id: Number(d.indice_id),
            echelon: Number(d.echelon), salaire_base: Number(d.salaire_base),
          })
        : recruitmentApi.createBareme({
            ...d,
            hierarchy_id: Number(d.hierarchy_id), indice_id: Number(d.indice_id),
            echelon: Number(d.echelon), salaire_base: Number(d.salaire_base),
          }),
    onSuccess: () => {
      invalidate();
      setBaremeDialog({ open: false, item: null });
      setBaremeForm({ hierarchy_id: '', indice_id: '', echelon: '1', salaire_base: '', date_application: '', is_active: true });
    },
  });
  const deleteBareme = useMutation({
    mutationFn: (id: number) => recruitmentApi.deleteBareme(id),
    onSuccess: () => invalidate(),
  });

  const openIndice = (item?: RecruitmentIndice) => {
    setIndiceDialog({ open: true, item: item ?? null });
    setIndiceForm(item
      ? { code: item.code, valeur: String(item.valeur), description: item.description ?? '', is_active: item.is_active }
      : { code: '', valeur: '', description: '', is_active: true });
  };
  const openHier = (item?: RecruitmentHierarchy) => {
    setHierDialog({ open: true, item: item ?? null });
    setHierForm(item
      ? { code: item.code, libelle: item.libelle, description: item.description ?? '', ordre: String(item.ordre), is_active: item.is_active }
      : { code: '', libelle: '', description: '', ordre: '0', is_active: true });
  };
  const openAug = (item?: RecruitmentAugmentation) => {
    setAugDialog({ open: true, item: item ?? null });
    setAugForm(item
      ? { libelle: item.libelle, type: item.type, taux: String(item.taux), unite: item.unite, date_effet: item.date_effet ?? '', description: item.description ?? '', is_active: item.is_active }
      : { libelle: '', type: 'indiciaire', taux: '', unite: 'pourcentage', date_effet: '', description: '', is_active: true });
  };
  const openBareme = (item?: RecruitmentBareme) => {
    setBaremeDialog({ open: true, item: item ?? null });
    setBaremeForm(item
      ? { hierarchy_id: String(item.hierarchy_id), indice_id: String(item.indice_id), echelon: String(item.echelon), salaire_base: String(item.salaire_base), date_application: item.date_application ?? '', is_active: item.is_active }
      : { hierarchy_id: '', indice_id: '', echelon: '1', salaire_base: '', date_application: '', is_active: true });
  };

  // ── Tab configs ──
  const tabs = [
    { label: 'Indice',       color: '#2563EB' },
    { label: 'Augmentation', color: '#059669' },
    { label: 'Hiérarchies',  color: '#7C3AED' },
    { label: 'Barème',       color: '#D97706' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
          Paramètres de Recrutement
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5 }}>
          Indices, augmentations, hiérarchies et barèmes salariaux
        </Typography>
      </Box>

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
        {/* Tabs */}
        <Tabs
          value={paramTab}
          onChange={(_, v) => setParamTab(v)}
          sx={{
            borderBottom: '1px solid #E2E8F0',
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 52 },
            '& .MuiTabs-indicator': { bgcolor: tabs[paramTab]?.color ?? '#2563EB', height: 3, borderRadius: 2 },
          }}
        >
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>

          {/* ════ INDICE ════ */}
          {paramTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>
                  Liste des indices ({indices.length})
                </Typography>
                <Button size="small" variant="contained" startIcon={<Add />}
                  onClick={() => openIndice()}
                  sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
                  Nouvel indice
                </Button>
              </Box>
              {loadingIndices ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': thStyle }}>
                        <TableCell>Code</TableCell>
                        <TableCell>Valeur</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {indices.length === 0 && <EmptyRow cols={5} label="Aucun indice enregistré" />}
                      {indices.map((row: RecruitmentIndice) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#2563EB' }}>{row.code}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{row.valeur}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{row.description ?? '—'}</TableCell>
                          <TableCell>
                            <Chip label={row.is_active ? 'Actif' : 'Inactif'} size="small"
                              color={row.is_active ? 'success' : 'default'}
                              sx={{ fontWeight: 600, fontSize: 11 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Modifier">
                                <IconButton size="small" color="primary" onClick={() => openIndice(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" color="error" onClick={() => deleteIndice.mutate(row.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {/* ════ AUGMENTATION ════ */}
          {paramTab === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>
                  Liste des augmentations ({augmentations.length})
                </Typography>
                <Button size="small" variant="contained" startIcon={<Add />}
                  onClick={() => openAug()}
                  sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#059669' }}>
                  Nouvelle augmentation
                </Button>
              </Box>
              {loadingAugmentations ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': thStyle }}>
                        <TableCell>Libellé</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Valeur</TableCell>
                        <TableCell>Date d'effet</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {augmentations.length === 0 && <EmptyRow cols={6} label="Aucune augmentation enregistrée" />}
                      {augmentations.map((row: RecruitmentAugmentation) => {
                        const typeMap: Record<string, string> = { indiciaire: 'Indiciaire', indemnitaire: 'Indemnitaire', prime: 'Prime', autre: 'Autre' };
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{row.libelle}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>
                              <Chip label={typeMap[row.type] ?? row.type} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                              {row.unite === 'pourcentage' ? `${row.taux} %` : `${Number(row.taux).toLocaleString('fr-FR')} FCFA`}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>
                              {row.date_effet ? new Date(row.date_effet).toLocaleDateString('fr-FR') : '—'}
                            </TableCell>
                            <TableCell>
                              <Chip label={row.is_active ? 'Actif' : 'Inactif'} size="small"
                                color={row.is_active ? 'success' : 'default'}
                                sx={{ fontWeight: 600, fontSize: 11 }} />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <Tooltip title="Modifier">
                                  <IconButton size="small" color="primary" onClick={() => openAug(row)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer">
                                  <IconButton size="small" color="error" onClick={() => deleteAug.mutate(row.id)}>
                                    <Delete fontSize="small" />
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
            </>
          )}

          {/* ════ HIÉRARCHIES ════ */}
          {paramTab === 2 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>
                  Liste des hiérarchies ({hierarchies.length})
                </Typography>
                <Button size="small" variant="contained" startIcon={<Add />}
                  onClick={() => openHier()}
                  sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#7C3AED' }}>
                  Nouvelle hiérarchie
                </Button>
              </Box>
              {loadingHierarchies ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': thStyle }}>
                        <TableCell>Code</TableCell>
                        <TableCell>Libellé</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Ordre</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hierarchies.length === 0 && <EmptyRow cols={6} label="Aucune hiérarchie enregistrée" />}
                      {hierarchies.map((row: RecruitmentHierarchy) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#7C3AED' }}>{row.code}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{row.libelle}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{row.description ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{row.ordre}</TableCell>
                          <TableCell>
                            <Chip label={row.is_active ? 'Actif' : 'Inactif'} size="small"
                              color={row.is_active ? 'success' : 'default'}
                              sx={{ fontWeight: 600, fontSize: 11 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Modifier">
                                <IconButton size="small" color="primary" onClick={() => openHier(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" color="error" onClick={() => deleteHier.mutate(row.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {/* ════ BARÈME ════ */}
          {paramTab === 3 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>
                  Grille des barèmes ({baremes.length})
                </Typography>
                <Button size="small" variant="contained" startIcon={<Add />}
                  onClick={() => openBareme()}
                  sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#D97706' }}>
                  Nouveau barème
                </Button>
              </Box>
              {loadingBaremes ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': thStyle }}>
                        <TableCell>Hiérarchie</TableCell>
                        <TableCell>Indice</TableCell>
                        <TableCell>Échelon</TableCell>
                        <TableCell>Salaire de base</TableCell>
                        <TableCell>Date d'application</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {baremes.length === 0 && <EmptyRow cols={7} label="Aucun barème enregistré" />}
                      {baremes.map((row: RecruitmentBareme) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                            {row.hierarchy ? `${row.hierarchy.code} — ${row.hierarchy.libelle}` : `#${row.hierarchy_id}`}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13 }}>
                            {row.indice ? `${row.indice.code} (${row.indice.valeur})` : `#${row.indice_id}`}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{row.echelon}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                            {Number(row.salaire_base).toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.date_application ? new Date(row.date_application).toLocaleDateString('fr-FR') : '—'}
                          </TableCell>
                          <TableCell>
                            <Chip label={row.is_active ? 'Actif' : 'Inactif'} size="small"
                              color={row.is_active ? 'success' : 'default'}
                              sx={{ fontWeight: 600, fontSize: 11 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Modifier">
                                <IconButton size="small" color="primary" onClick={() => openBareme(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton size="small" color="error" onClick={() => deleteBareme.mutate(row.id)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

        </Box>
      </Card>

      {/* ════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════ */}

      {/* ── Dialog Indice ── */}
      <Dialog open={indiceDialog.open} onClose={() => setIndiceDialog({ open: false, item: null })}
        maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {indiceDialog.item ? 'Modifier l\'indice' : 'Nouvel indice'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Code *" value={indiceForm.code}
                onChange={(e) => setIndiceForm((f) => ({ ...f, code: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Valeur *" type="number" value={indiceForm.valeur}
                onChange={(e) => setIndiceForm((f) => ({ ...f, valeur: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" value={indiceForm.description}
                onChange={(e) => setIndiceForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={indiceForm.is_active} onChange={(e) => setIndiceForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setIndiceDialog({ open: false, item: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={saveIndice.isPending || !indiceForm.code || !indiceForm.valeur}
            onClick={() => saveIndice.mutate(indiceForm)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {indiceDialog.item ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Hiérarchie ── */}
      <Dialog open={hierDialog.open} onClose={() => setHierDialog({ open: false, item: null })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {hierDialog.item ? 'Modifier la hiérarchie' : 'Nouvelle hiérarchie'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Code *" value={hierForm.code}
                onChange={(e) => setHierForm((f) => ({ ...f, code: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Libellé *" value={hierForm.libelle}
                onChange={(e) => setHierForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Grid>
            <Grid item xs={2}>
              <TextField fullWidth size="small" label="Ordre" type="number" value={hierForm.ordre}
                onChange={(e) => setHierForm((f) => ({ ...f, ordre: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2} value={hierForm.description}
                onChange={(e) => setHierForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={hierForm.is_active} onChange={(e) => setHierForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setHierDialog({ open: false, item: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={saveHier.isPending || !hierForm.code || !hierForm.libelle}
            onClick={() => saveHier.mutate(hierForm)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#7C3AED' }}>
            {hierDialog.item ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Augmentation ── */}
      <Dialog open={augDialog.open} onClose={() => setAugDialog({ open: false, item: null })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {augDialog.item ? 'Modifier l\'augmentation' : 'Nouvelle augmentation'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Libellé *" value={augForm.libelle}
                onChange={(e) => setAugForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select label="Type *" value={augForm.type}
                  onChange={(e) => setAugForm((f) => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="indiciaire">Indiciaire</MenuItem>
                  <MenuItem value="indemnitaire">Indemnitaire</MenuItem>
                  <MenuItem value="prime">Prime</MenuItem>
                  <MenuItem value="autre">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Unité *</InputLabel>
                <Select label="Unité *" value={augForm.unite}
                  onChange={(e) => setAugForm((f) => ({ ...f, unite: e.target.value }))}>
                  <MenuItem value="pourcentage">Pourcentage (%)</MenuItem>
                  <MenuItem value="montant">Montant (FCFA)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small"
                label={augForm.unite === 'pourcentage' ? 'Taux (%) *' : 'Montant (FCFA) *'}
                type="number" value={augForm.taux}
                onChange={(e) => setAugForm((f) => ({ ...f, taux: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date d'effet" type="date"
                InputLabelProps={{ shrink: true }} value={augForm.date_effet}
                onChange={(e) => setAugForm((f) => ({ ...f, date_effet: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2}
                value={augForm.description}
                onChange={(e) => setAugForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={augForm.is_active} onChange={(e) => setAugForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setAugDialog({ open: false, item: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={saveAug.isPending || !augForm.libelle || !augForm.taux}
            onClick={() => saveAug.mutate(augForm)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#059669' }}>
            {augDialog.item ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Barème ── */}
      <Dialog open={baremeDialog.open} onClose={() => setBaremeDialog({ open: false, item: null })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {baremeDialog.item ? 'Modifier le barème' : 'Nouveau barème'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Hiérarchie *</InputLabel>
                <Select label="Hiérarchie *" value={baremeForm.hierarchy_id}
                  onChange={(e) => setBaremeForm((f) => ({ ...f, hierarchy_id: String(e.target.value) }))}>
                  {hierarchies.map((h: RecruitmentHierarchy) => (
                    <MenuItem key={h.id} value={h.id}>{h.code} — {h.libelle}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Indice *</InputLabel>
                <Select label="Indice *" value={baremeForm.indice_id}
                  onChange={(e) => setBaremeForm((f) => ({ ...f, indice_id: String(e.target.value) }))}>
                  {indices.map((i: RecruitmentIndice) => (
                    <MenuItem key={i.id} value={i.id}>{i.code} ({i.valeur})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Échelon *" type="number"
                value={baremeForm.echelon}
                onChange={(e) => setBaremeForm((f) => ({ ...f, echelon: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Salaire de base (FCFA) *" type="number"
                value={baremeForm.salaire_base}
                onChange={(e) => setBaremeForm((f) => ({ ...f, salaire_base: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date d'application" type="date"
                InputLabelProps={{ shrink: true }} value={baremeForm.date_application}
                onChange={(e) => setBaremeForm((f) => ({ ...f, date_application: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={<Switch checked={baremeForm.is_active} onChange={(e) => setBaremeForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setBaremeDialog({ open: false, item: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={saveBareme.isPending || !baremeForm.hierarchy_id || !baremeForm.indice_id || !baremeForm.salaire_base}
            onClick={() => saveBareme.mutate(baremeForm)}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#D97706' }}>
            {baremeDialog.item ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
