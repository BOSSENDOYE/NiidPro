import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Checkbox, CircularProgress, Tooltip, Alert, Divider,
  Accordion, AccordionSummary, AccordionDetails, Badge, Snackbar,
} from '@mui/material';
import {
  Add, Edit, Delete, Security, AdminPanelSettings, ExpandMore,
  SelectAll, DeselectOutlined,
} from '@mui/icons-material';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { rolesApi, type AppRole, type PermModule } from '../../../api/roles';
import SectionCard from '../SectionCard';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_rh:    'Admin RH',
  manager:     'Manager',
  employe:     'Employé',
};

// Libellé court pour les chips dans la carte de rôle
function permLabel(name: string, modules: PermModule[]): string {
  for (const mod of modules) {
    const found = mod.perms.find((p) => p.name === name);
    if (found) return found.label;
  }
  return name;
}

export default function RolesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppRole | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toDel,    setToDel]    = useState<{ id: number; label: string } | null>(null);
  const [snackErr, setSnackErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data),
  });
  const roles   = data?.roles   ?? [];
  const modules = data?.modules ?? [];
  const totalPerms = modules.reduce((acc, m) => acc + m.perms.length, 0);

  const openCreate = () => {
    setEditing(null); setName(''); setSelected(new Set()); setError(null); setDialogOpen(true);
  };
  const openEdit = (r: AppRole) => {
    setEditing(r); setName(r.name); setSelected(new Set(r.permissions)); setError(null); setDialogOpen(true);
  };

  const togglePerm = (p: string) =>
    setSelected((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const toggleModule = (mod: PermModule) => {
    const keys = mod.perms.map((p) => p.name);
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((s) => {
      const n = new Set(s);
      if (allSelected) keys.forEach((k) => n.delete(k));
      else keys.forEach((k) => n.add(k));
      return n;
    });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { name, permissions: [...selected] };
      return editing ? rolesApi.update(editing.id, payload) : rolesApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setDialogOpen(false); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message ?? "Échec de l'enregistrement."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => rolesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setSnackErr(e.response?.data?.message ?? 'Suppression impossible.'),
  });

  return (
    <SectionCard
      icon={<Security sx={{ fontSize: 20 }} />}
      title="Profils & droits"
      subtitle={`${roles.length} profil(s) · ${totalPerms} permissions disponibles`}
      action={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouveau profil
        </Button>
      }
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {roles.map((r) => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, height: '100%' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AdminPanelSettings sx={{ fontSize: 18, color: '#4338CA' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>
                        {ROLE_LABEL[r.name] ?? r.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {r.users_count} utilisateur(s)
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Modifier les droits">
                      <IconButton size="small" onClick={() => openEdit(r)}>
                        <Edit sx={{ fontSize: 15, color: '#2563EB' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" onClick={() => setToDel({ id: r.id, label: ROLE_LABEL[r.name] ?? r.name })}>
                        <Delete sx={{ fontSize: 15, color: '#EF4444' }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {r.permissions.length === 0
                    ? <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Aucune permission</Typography>
                    : r.permissions.slice(0, 5).map((p) => (
                        <Chip key={p} label={permLabel(p, modules)} size="small"
                          sx={{ fontSize: 10, height: 20, bgcolor: 'action.hover', maxWidth: 160 }} />
                      ))}
                  {r.permissions.length > 5 && (
                    <Chip label={`+${r.permissions.length - 5}`} size="small"
                      sx={{ fontSize: 10, height: 20, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }} />
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog édition droits */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {editing
            ? `Droits du profil « ${ROLE_LABEL[editing.name] ?? editing.name} »`
            : 'Nouveau profil'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}

            <TextField label="Nom du profil *" fullWidth size="small" value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!editing && ['super_admin', 'admin_rh', 'manager', 'employe'].includes(editing.name)} />

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                  Permissions ({selected.size}/{totalPerms})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<SelectAll sx={{ fontSize: 14 }} />}
                    onClick={() => setSelected(new Set(modules.flatMap((m) => m.perms.map((p) => p.name))))}
                    sx={{ textTransform: 'none', fontSize: 11 }}>
                    Tout sélectionner
                  </Button>
                  <Button size="small" startIcon={<DeselectOutlined sx={{ fontSize: 14 }} />}
                    onClick={() => setSelected(new Set())}
                    sx={{ textTransform: 'none', fontSize: 11 }}>
                    Tout désélectionner
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ maxHeight: 460, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                {modules.map((mod) => {
                  const modKeys = mod.perms.map((p) => p.name);
                  const checkedCount = modKeys.filter((k) => selected.has(k)).length;
                  const allChecked = checkedCount === modKeys.length;
                  const someChecked = checkedCount > 0 && !allChecked;

                  return (
                    <Accordion key={mod.label} disableGutters elevation={0}
                      sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <AccordionSummary expandIcon={<ExpandMore sx={{ fontSize: 18 }} />}
                        sx={{ minHeight: 42, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, mr: 1 }}>
                          <Checkbox
                            size="small"
                            checked={allChecked}
                            indeterminate={someChecked}
                            onChange={() => toggleModule(mod)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ p: 0.25 }}
                          />
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{mod.label}</Typography>
                          <Badge badgeContent={checkedCount > 0 ? `${checkedCount}/${modKeys.length}` : null}
                            sx={{ '& .MuiBadge-badge': { fontSize: 10, bgcolor: checkedCount > 0 ? '#4338CA' : 'transparent', color: 'white', position: 'relative', transform: 'none', ml: 1 } }}>
                            <span />
                          </Badge>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 1, px: 2, bgcolor: 'action.hover' }}>
                        <Grid container>
                          {mod.perms.map((p) => (
                            <Grid item xs={12} sm={6} key={p.name}>
                              <FormControlLabel
                                control={
                                  <Checkbox size="small" checked={selected.has(p.name)}
                                    onChange={() => togglePerm(p.name)} />
                                }
                                label={<Typography sx={{ fontSize: 12.5 }}>{p.label}</Typography>}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !name}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Security />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        title="Supprimer ce profil"
        message={toDel ? `Voulez-vous vraiment supprimer le profil « ${toDel.label} » ? Cette action est irréversible.` : ''}
        onConfirm={() => toDel && deleteMut.mutate(toDel.id)}
        onClose={() => setToDel(null)}
      />

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
    </SectionCard>
  );
}
