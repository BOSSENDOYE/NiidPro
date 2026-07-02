import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, TextField, Button, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Divider, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Payments, AccountBalance, Category } from '@mui/icons-material';
import { recruitmentApi } from '../../../api/recruitment';
import type { RecruitmentAugmentation, PayrollCotisation, PayrollAutreRubrique } from '../../../types';
import AugmentationImportDialog from './AugmentationImportDialog';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';

const NAV = '#0D2137';
const TH_CELL = { color: '#fff', fontWeight: 700, fontSize: 11, py: 1 } as const;

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{
      px: 2, py: 0.75, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
      borderBottom: `2.5px solid ${active ? '#2563EB' : 'transparent'}`,
      color: active ? '#2563EB' : '#64748B',
      '&:hover': { color: '#2563EB' },
      transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      {label}
    </Box>
  );
}

function EmptyPlaceholder({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: '#CBD5E1', mb: 1.5, '& svg': { fontSize: 52 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#94A3B8', mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5, color: '#CBD5E1' }}>{subtitle}</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Sous-onglet 0 — Augmentations
// ═══════════════════════════════════════════════════════════════════
const AUG_TYPES = ['indiciaire', 'indemnitaire', 'prime', 'autre'] as const;

function AugmentationsTab() {
  const qc = useQueryClient();

  const { data: augmentations = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'augmentations'],
    queryFn: () => recruitmentApi.getAugmentations().then((r) => r.data),
  });

  const [search, setSearch] = useState('');
  const [dlg, setDlg] = useState<{ open: boolean; item: RecruitmentAugmentation | null }>({ open: false, item: null });
  const [impOpen, setImpOpen] = useState(false);
  const [toDel, setToDel] = useState<number | null>(null);
  const [form, setForm] = useState({ libelle: '', type: 'indiciaire', taux: '', unite: '', date_effet: '', description: '', is_active: true });
  const [augCustomType, setAugCustomType] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'augmentations'] });

  const openDlg = (item?: RecruitmentAugmentation) => {
    setDlg({ open: true, item: item ?? null });
    const predefined = AUG_TYPES.includes(item?.type as typeof AUG_TYPES[number]);
    setAugCustomType(!predefined && item?.type ? item.type : '');
    setForm(item ? {
      libelle: item.libelle,
      type: predefined ? item.type : '__custom__',
      taux: item.taux != null ? String(item.taux) : '',
      unite: item.unite ?? '',
      date_effet: item.date_effet ?? '',
      description: item.description ?? '',
      is_active: item.is_active,
    } : { libelle: '', type: 'indiciaire', taux: '', unite: '', date_effet: '', description: '', is_active: true });
  };
  const closeDlg = () => { setDlg({ open: false, item: null }); setAugCustomType(''); };

  const save = useMutation({
    mutationFn: () => {
      const effectiveType = form.type === '__custom__' ? augCustomType.trim() : form.type;
      const d = {
        ...form,
        taux:  form.taux  ? Number(form.taux)  : null,
        unite: form.unite ? (form.unite as RecruitmentAugmentation['unite']) : null,
        type:  effectiveType as RecruitmentAugmentation['type'],
      };
      return dlg.item?.id
        ? recruitmentApi.updateAugmentation(dlg.item.id, d)
        : recruitmentApi.createAugmentation(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });

  const del = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteAugmentation(id), onSuccess: invalidate });

  const filtered = augmentations.filter((r: RecruitmentAugmentation) =>
    r.libelle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      {/* Barre de recherche */}
      <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#EAF0F6', px: 2, py: 1, borderBottom: '1px solid #CBD5E1' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Nom Augmentation</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
          <TextField
            size="small" fullWidth value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }}
          />
          <Button variant="outlined" size="small"
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 90, color: '#2563EB', borderColor: '#2563EB', whiteSpace: 'nowrap' }}>
            Chercher
          </Button>
          <Button variant="outlined" size="small" onClick={() => setSearch('')}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 80, color: '#E85D04', borderColor: '#E85D04', whiteSpace: 'nowrap' }}>
            Effacer
          </Button>
        </Box>
      </Box>

      {/* Tableau */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5, gap: 0.75, alignItems: 'center' }}>
          <Button variant="outlined" size="small" onClick={() => setImpOpen(true)}
            startIcon={<span style={{ fontSize: 15 }}>⬆</span>}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12,
              color: '#059669', borderColor: '#059669',
              '&:hover': { bgcolor: '#F0FDF4', borderColor: '#047857' } }}>
            Importer depuis Excel
          </Button>
          <Tooltip title="Ajouter">
            <IconButton size="small" onClick={() => openDlg()}
              sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer sélection">
            <IconButton size="small"
              sx={{ bgcolor: '#EF4444', color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#DC2626' } }}>
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : filtered.length === 0 ? (
          <EmptyPlaceholder icon={<Payments />} title="Aucune augmentation" subtitle={search ? `Aucun résultat pour « ${search} »` : 'Cliquez sur + pour en ajouter une'} />
        ) : (
          <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#0D2137' }}>
                  <TableCell sx={{ ...TH_CELL, width: 60, textAlign: 'center' }}>N° Sr</TableCell>
                  <TableCell sx={TH_CELL}>Nom Libellé</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center' }}>Type</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Valeur</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 80 }}>Statut</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 70 }}>Voir</TableCell>
                  <TableCell sx={{ ...TH_CELL, width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r: RecruitmentAugmentation, i: number) => (
                  <TableRow key={r.id} hover sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#F0F4F8' } }}>
                    <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{r.libelle}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box component="span" sx={{
                        display: 'inline-block', px: 1, py: 0.2, borderRadius: '4px', fontSize: 10.5, fontWeight: 700,
                        bgcolor: r.type === 'prime' ? '#FEF9C3' : r.type === 'indemnitaire' ? '#EEF2FF' : '#ECFDF5',
                        color:   r.type === 'prime' ? '#92400E' : r.type === 'indemnitaire' ? '#4338CA' : '#065F46',
                      }}>
                        {r.type}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#1E293B', textAlign: 'right', fontFamily: 'monospace' }}>
                      {r.taux != null ? Number(r.taux).toLocaleString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box component="span" sx={{
                        display: 'inline-block', width: 16, height: 16,
                        border: '2px solid #475569', borderRadius: '3px',
                        bgcolor: r.is_active ? '#1E3A5F' : 'transparent',
                        position: 'relative', cursor: 'default',
                        '&::after': r.is_active ? { content: '"✓"', position: 'absolute', top: -3, left: 1, fontSize: 12, color: '#fff', fontWeight: 900 } : {},
                      }} />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => openDlg(r)}>
                          <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => setToDel(r.id)}>
                          <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialog import Excel */}
      <AugmentationImportDialog
        open={impOpen}
        onClose={() => setImpOpen(false)}
        onSuccess={() => invalidate()}
      />

      {/* Dialog création / modification */}
      <Dialog open={dlg.open} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {dlg.item?.id ? 'Modifier l\'augmentation' : 'Nouvelle augmentation'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Libellé *"
                value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select label="Type *" value={form.type}
                  onChange={(e) => { setForm((f) => ({ ...f, type: e.target.value })); if (e.target.value !== '__custom__') setAugCustomType(''); }}>
                  {AUG_TYPES.map((v) => (
                    <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>
                  ))}
                  <MenuItem value="__custom__" sx={{ color: '#2563EB', fontWeight: 700 }}>➕ Nouveau type…</MenuItem>
                </Select>
              </FormControl>
              {form.type === '__custom__' && (
                <TextField fullWidth size="small" placeholder="Nom du nouveau type" value={augCustomType}
                  onChange={(e) => setAugCustomType(e.target.value)}
                  sx={{ mt: 1 }} />
              )}
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Unité</InputLabel>
                <Select label="Unité" value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}>
                  <MenuItem value=""><em>— Non défini —</em></MenuItem>
                  <MenuItem value="pourcentage">Pourcentage (%)</MenuItem>
                  <MenuItem value="montant">Montant (FCFA)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small"
                label={form.unite === 'pourcentage' ? 'Taux (%)' : form.unite === 'montant' ? 'Montant (FCFA)' : 'Valeur'}
                type="number" value={form.taux}
                onChange={(e) => setForm((f) => ({ ...f, taux: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date d'effet" type="date"
                InputLabelProps={{ shrink: true }} value={form.date_effet}
                onChange={(e) => setForm((f) => ({ ...f, date_effet: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2}
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={save.isPending || !form.libelle || (form.type === '__custom__' && !augCustomType.trim())}
            onClick={() => save.mutate()}
            sx={{ bgcolor: '#059669', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {dlg.item?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cette augmentation ?"
        onConfirm={() => toDel !== null && del.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Sous-onglet 1 — Cotisations
// ═══════════════════════════════════════════════════════════════════
const COTI_TYPES = ['IPRES', 'CSS', 'IPM', 'IR', 'TRIMF', 'autre'] as const;
const ASSIETTES  = ['brut', 'net', 'autre'] as const;

const cotiTypeColor = (t: string) => {
  if (t === 'IPRES')  return { bg: '#EEF2FF', fg: '#4338CA' };
  if (t === 'CSS')    return { bg: '#FEF9C3', fg: '#92400E' };
  if (t === 'IPM')    return { bg: '#ECFDF5', fg: '#065F46' };
  if (t === 'IR')     return { bg: '#EFF6FF', fg: '#1D4ED8' };
  if (t === 'TRIMF')  return { bg: '#FFF7ED', fg: '#9A3412' };
  return { bg: '#F1F5F9', fg: '#475569' };
};

const COTI_EMPTY = { libelle: '', code: '', type: 'autre' as PayrollCotisation['type'],
  taux_salarial: '', taux_patronal: '', plafond: '', assiette: 'brut' as PayrollCotisation['assiette'],
  description: '', is_active: true };

function CotisationsTab() {
  const qc = useQueryClient();

  const { data: cotisations = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'cotisations'],
    queryFn: () => recruitmentApi.getCotisations().then((r) => r.data),
  });

  const [search, setSearch] = useState('');
  const [dlg, setDlg] = useState<{ open: boolean; item: PayrollCotisation | null }>({ open: false, item: null });
  const [form, setForm] = useState({ ...COTI_EMPTY });
  const [cotiCustomType, setCotiCustomType] = useState('');
  const [toDel, setToDel] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'cotisations'] });

  const openDlg = (item?: PayrollCotisation) => {
    setDlg({ open: true, item: item ?? null });
    const predefined = item ? COTI_TYPES.includes(item.type as typeof COTI_TYPES[number]) : true;
    setCotiCustomType(!predefined && item?.type ? item.type : '');
    setForm(item ? {
      libelle:        item.libelle,
      code:           item.code ?? '',
      type:           predefined ? item.type : '__custom__' as PayrollCotisation['type'],
      taux_salarial:  item.taux_salarial != null ? String(item.taux_salarial) : '',
      taux_patronal:  item.taux_patronal != null ? String(item.taux_patronal) : '',
      plafond:        item.plafond != null ? String(item.plafond) : '',
      assiette:       item.assiette,
      description:    item.description ?? '',
      is_active:      item.is_active,
    } : { ...COTI_EMPTY });
  };
  const closeDlg = () => { setDlg({ open: false, item: null }); setCotiCustomType(''); };

  const save = useMutation({
    mutationFn: () => {
      const effectiveType = form.type === '__custom__' ? cotiCustomType.trim() : form.type;
      const d = {
        ...form,
        type:          effectiveType as PayrollCotisation['type'],
        code:          form.code || null,
        taux_salarial: form.taux_salarial ? Number(form.taux_salarial) : null,
        taux_patronal: form.taux_patronal ? Number(form.taux_patronal) : null,
        plafond:       form.plafond       ? Number(form.plafond)       : null,
      };
      return dlg.item?.id
        ? recruitmentApi.updateCotisation(dlg.item.id, d)
        : recruitmentApi.createCotisation(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });

  const del = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteCotisation(id), onSuccess: invalidate });

  const filtered = cotisations.filter((r: PayrollCotisation) =>
    r.libelle.toLowerCase().includes(search.toLowerCase()) ||
    (r.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#EAF0F6', px: 2, py: 1, borderBottom: '1px solid #CBD5E1' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Recherche</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
          <TextField size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
          <Button variant="outlined" size="small" onClick={() => setSearch('')}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 80, color: '#E85D04', borderColor: '#E85D04', whiteSpace: 'nowrap' }}>
            Effacer
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5, gap: 0.5 }}>
          <Tooltip title="Ajouter">
            <IconButton size="small" onClick={() => openDlg()}
              sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : filtered.length === 0 ? (
          <EmptyPlaceholder icon={<AccountBalance />}
            title="Aucune cotisation"
            subtitle={search ? `Aucun résultat pour « ${search} »` : 'Cliquez sur + pour en ajouter une'} />
        ) : (
          <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#0D2137' }}>
                  <TableCell sx={{ ...TH_CELL, width: 50, textAlign: 'center' }}>N°</TableCell>
                  <TableCell sx={{ ...TH_CELL, width: 90 }}>Code</TableCell>
                  <TableCell sx={TH_CELL}>Libellé</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center' }}>Type</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Tx Sal. (%)</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Tx Pat. (%)</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Plafond</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 80 }}>Statut</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 60 }}>Voir</TableCell>
                  <TableCell sx={{ ...TH_CELL, width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r: PayrollCotisation, i: number) => {
                  const chip = cotiTypeColor(r.type);
                  return (
                    <TableRow key={r.id} hover sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#F0F4F8' } }}>
                      <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{r.code ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{r.libelle}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: '4px', fontSize: 10.5, fontWeight: 700, bgcolor: chip.bg, color: chip.fg }}>
                          {r.type}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#0369A1' }}>
                        {r.taux_salarial != null ? `${Number(r.taux_salarial).toFixed(2)} %` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#7C3AED' }}>
                        {r.taux_patronal != null ? `${Number(r.taux_patronal).toFixed(2)} %` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#1E293B' }}>
                        {r.plafond != null ? Number(r.plafond).toLocaleString('fr-FR') : '—'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #475569', borderRadius: '3px',
                          bgcolor: r.is_active ? '#1E3A5F' : 'transparent', position: 'relative', cursor: 'default',
                          '&::after': r.is_active ? { content: '"✓"', position: 'absolute', top: -3, left: 1, fontSize: 12, color: '#fff', fontWeight: 900 } : {} }} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => openDlg(r)}>
                            <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => setToDel(r.id)}>
                            <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={dlg.open} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {dlg.item?.id ? 'Modifier la cotisation' : 'Nouvelle cotisation'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Libellé *"
                value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Code"
                value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select label="Type *" value={form.type}
                  onChange={(e) => { setForm((f) => ({ ...f, type: e.target.value as PayrollCotisation['type'] })); if (e.target.value !== '__custom__') setCotiCustomType(''); }}>
                  {COTI_TYPES.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  <MenuItem value="__custom__" sx={{ color: '#2563EB', fontWeight: 700 }}>➕ Nouveau type…</MenuItem>
                </Select>
              </FormControl>
              {form.type === '__custom__' && (
                <TextField fullWidth size="small" placeholder="Nom du nouveau type" value={cotiCustomType}
                  onChange={(e) => setCotiCustomType(e.target.value)}
                  sx={{ mt: 1 }} />
              )}
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Assiette</InputLabel>
                <Select label="Assiette" value={form.assiette} onChange={(e) => setForm((f) => ({ ...f, assiette: e.target.value as PayrollCotisation['assiette'] }))}>
                  {ASSIETTES.map((v) => <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Taux salarial (%)" type="number"
                value={form.taux_salarial} onChange={(e) => setForm((f) => ({ ...f, taux_salarial: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Taux patronal (%)" type="number"
                value={form.taux_patronal} onChange={(e) => setForm((f) => ({ ...f, taux_patronal: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Plafond (FCFA)" type="number"
                value={form.plafond} onChange={(e) => setForm((f) => ({ ...f, plafond: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2}
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={save.isPending || !form.libelle || (form.type === '__custom__' && !cotiCustomType.trim())}
            onClick={() => save.mutate()}
            sx={{ bgcolor: '#059669', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {dlg.item?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cette cotisation ?"
        onConfirm={() => toDel !== null && del.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Sous-onglet 2 — Autres rubriques
// ═══════════════════════════════════════════════════════════════════
const AUTRE_TYPES = ['prime', 'avantage_nature', 'deduction', 'retenue', 'allocation', 'autre'] as const;

const autreTypeLabel = (t: string) => ({ prime: 'Prime', avantage_nature: 'Avantage nature', deduction: 'Déduction', retenue: 'Retenue', allocation: 'Allocation', autre: 'Autre' }[t] ?? t);

const autreTypeColor = (t: string) => {
  if (t === 'prime')           return { bg: '#FEF9C3', fg: '#92400E' };
  if (t === 'avantage_nature') return { bg: '#ECFDF5', fg: '#065F46' };
  if (t === 'deduction')       return { bg: '#FEE2E2', fg: '#991B1B' };
  if (t === 'retenue')         return { bg: '#FFF7ED', fg: '#9A3412' };
  if (t === 'allocation')      return { bg: '#EEF2FF', fg: '#4338CA' };
  return { bg: '#F1F5F9', fg: '#475569' };
};

const AUTRE_EMPTY = { libelle: '', code: '', type: 'autre' as PayrollAutreRubrique['type'],
  sens: 'gain' as PayrollAutreRubrique['sens'], unite: '' as string, valeur: '', description: '', is_active: true };

function AutresRubriquesTab() {
  const qc = useQueryClient();

  const { data: rubriques = [], isLoading } = useQuery({
    queryKey: ['payroll', 'params', 'autres-rubriques'],
    queryFn: () => recruitmentApi.getAutresRubriques().then((r) => r.data),
  });

  const [search, setSearch] = useState('');
  const [dlg, setDlg] = useState<{ open: boolean; item: PayrollAutreRubrique | null }>({ open: false, item: null });
  const [form, setForm] = useState({ ...AUTRE_EMPTY });
  const [autreCustomType, setAutreCustomType] = useState('');
  const [toDel, setToDel] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['payroll', 'params', 'autres-rubriques'] });

  const openDlg = (item?: PayrollAutreRubrique) => {
    setDlg({ open: true, item: item ?? null });
    const predefined = item ? AUTRE_TYPES.includes(item.type as typeof AUTRE_TYPES[number]) : true;
    setAutreCustomType(!predefined && item?.type ? item.type : '');
    setForm(item ? {
      libelle:     item.libelle,
      code:        item.code ?? '',
      type:        predefined ? item.type : '__custom__' as PayrollAutreRubrique['type'],
      sens:        item.sens,
      unite:       item.unite ?? '',
      valeur:      item.valeur != null ? String(item.valeur) : '',
      description: item.description ?? '',
      is_active:   item.is_active,
    } : { ...AUTRE_EMPTY });
  };
  const closeDlg = () => { setDlg({ open: false, item: null }); setAutreCustomType(''); };

  const save = useMutation({
    mutationFn: () => {
      const effectiveType = form.type === '__custom__' ? autreCustomType.trim() : form.type;
      const d = {
        ...form,
        type:  effectiveType as PayrollAutreRubrique['type'],
        code:  form.code  || null,
        unite: form.unite || null,
        valeur: form.valeur ? Number(form.valeur) : null,
      };
      return dlg.item?.id
        ? recruitmentApi.updateAutreRubrique(dlg.item.id, d)
        : recruitmentApi.createAutreRubrique(d);
    },
    onSuccess: () => { invalidate(); closeDlg(); },
  });

  const del = useMutation({ mutationFn: (id: number) => recruitmentApi.deleteAutreRubrique(id), onSuccess: invalidate });

  const filtered = rubriques.filter((r: PayrollAutreRubrique) =>
    r.libelle.toLowerCase().includes(search.toLowerCase()) ||
    (r.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ m: 2, border: '1.5px solid #CBD5E1', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#EAF0F6', px: 2, py: 1, borderBottom: '1px solid #CBD5E1' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Recherche</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
          <TextField size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 } }} />
          <Button variant="outlined" size="small" onClick={() => setSearch('')}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, fontSize: 12, minWidth: 80, color: '#E85D04', borderColor: '#E85D04', whiteSpace: 'nowrap' }}>
            Effacer
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5, gap: 0.5 }}>
          <Tooltip title="Ajouter">
            <IconButton size="small" onClick={() => openDlg()}
              sx={{ bgcolor: NAV, color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: '#0D2A40' } }}>
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : filtered.length === 0 ? (
          <EmptyPlaceholder icon={<Category />}
            title="Aucune rubrique"
            subtitle={search ? `Aucun résultat pour « ${search} »` : 'Cliquez sur + pour en ajouter une'} />
        ) : (
          <TableContainer sx={{ border: '1px solid #CBD5E1', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#0D2137' }}>
                  <TableCell sx={{ ...TH_CELL, width: 50, textAlign: 'center' }}>N°</TableCell>
                  <TableCell sx={{ ...TH_CELL, width: 90 }}>Code</TableCell>
                  <TableCell sx={TH_CELL}>Libellé</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center' }}>Type</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center' }}>Sens</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'right' }}>Valeur</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 80 }}>Statut</TableCell>
                  <TableCell sx={{ ...TH_CELL, textAlign: 'center', width: 60 }}>Voir</TableCell>
                  <TableCell sx={{ ...TH_CELL, width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r: PayrollAutreRubrique, i: number) => {
                  const chip = autreTypeColor(r.type);
                  const isGain = r.sens === 'gain';
                  return (
                    <TableRow key={r.id} hover sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#F0F4F8' } }}>
                      <TableCell sx={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{r.code ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{r.libelle}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: '4px', fontSize: 10.5, fontWeight: 700, bgcolor: chip.bg, color: chip.fg }}>
                          {autreTypeLabel(r.type)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: '4px', fontSize: 10.5, fontWeight: 700,
                          bgcolor: isGain ? '#DCFCE7' : '#FEE2E2', color: isGain ? '#166534' : '#991B1B' }}>
                          {isGain ? '+ Gain' : '− Retenue'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#1E293B' }}>
                        {r.valeur != null
                          ? `${Number(r.valeur).toLocaleString('fr-FR')} ${r.unite === 'pourcentage' ? '%' : 'FCFA'}`
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #475569', borderRadius: '3px',
                          bgcolor: r.is_active ? '#1E3A5F' : 'transparent', position: 'relative', cursor: 'default',
                          '&::after': r.is_active ? { content: '"✓"', position: 'absolute', top: -3, left: 1, fontSize: 12, color: '#fff', fontWeight: 900 } : {} }} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => openDlg(r)}>
                            <Edit sx={{ fontSize: 15, color: '#E85D04' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => setToDel(r.id)}>
                            <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={dlg.open} onClose={closeDlg} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {dlg.item?.id ? 'Modifier la rubrique' : 'Nouvelle rubrique'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Libellé *"
                value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Code"
                value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type *</InputLabel>
                <Select label="Type *" value={form.type}
                  onChange={(e) => { setForm((f) => ({ ...f, type: e.target.value as PayrollAutreRubrique['type'] })); if (e.target.value !== '__custom__') setAutreCustomType(''); }}>
                  {AUTRE_TYPES.map((v) => <MenuItem key={v} value={v}>{autreTypeLabel(v)}</MenuItem>)}
                  <MenuItem value="__custom__" sx={{ color: '#2563EB', fontWeight: 700 }}>➕ Nouveau type…</MenuItem>
                </Select>
              </FormControl>
              {form.type === '__custom__' && (
                <TextField fullWidth size="small" placeholder="Nom du nouveau type" value={autreCustomType}
                  onChange={(e) => setAutreCustomType(e.target.value)}
                  sx={{ mt: 1 }} />
              )}
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Sens *</InputLabel>
                <Select label="Sens *" value={form.sens} onChange={(e) => setForm((f) => ({ ...f, sens: e.target.value as PayrollAutreRubrique['sens'] }))}>
                  <MenuItem value="gain">+ Gain</MenuItem>
                  <MenuItem value="retenue">− Retenue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Unité</InputLabel>
                <Select label="Unité" value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}>
                  <MenuItem value=""><em>— Non défini —</em></MenuItem>
                  <MenuItem value="pourcentage">Pourcentage (%)</MenuItem>
                  <MenuItem value="montant">Montant (FCFA)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small"
                label={form.unite === 'pourcentage' ? 'Valeur (%)' : form.unite === 'montant' ? 'Montant (FCFA)' : 'Valeur'}
                type="number" value={form.valeur}
                onChange={(e) => setForm((f) => ({ ...f, valeur: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={2}
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label="Actif" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={closeDlg} sx={{ borderRadius: '9px', textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained"
            disabled={save.isPending || !form.libelle || (form.type === '__custom__' && !autreCustomType.trim())}
            onClick={() => save.mutate()}
            sx={{ bgcolor: '#059669', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            {dlg.item?.id ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message="Supprimer cette rubrique ?"
        onConfirm={() => toDel !== null && del.mutate(toDel)}
        onClose={() => setToDel(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Panel principal
// ═══════════════════════════════════════════════════════════════════
export default function RubriquesPanel() {
  const [sub, setSub] = useState(0);
  const subTabs = ['Augmentations', 'Cotisations', 'Autres rubriques'];

  return (
    <Box>
      {/* Sous-onglets */}
      <Box sx={{ display: 'flex', px: 2.5, pt: 1.5, gap: 0, borderBottom: '2px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        {subTabs.map((s, i) => (
          <SubTab key={i} label={s} active={sub === i} onClick={() => setSub(i)} />
        ))}
      </Box>

      <Box>
        {sub === 0 && <AugmentationsTab />}
        {sub === 1 && <CotisationsTab />}
        {sub === 2 && <AutresRubriquesTab />}
      </Box>
    </Box>
  );
}
