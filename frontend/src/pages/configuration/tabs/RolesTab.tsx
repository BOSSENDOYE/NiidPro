import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Chip, IconButton, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Checkbox, CircularProgress, Tooltip, Alert, Divider,
} from '@mui/material';
import { Add, Edit, Delete, Security, AdminPanelSettings } from '@mui/icons-material';
import { rolesApi, type AppRole } from '../../../api/roles';
import SectionCard from '../SectionCard';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin_rh: 'Admin RH', manager: 'Manager', employe: 'Employé',
};

export default function RolesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppRole | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data),
  });
  const roles = data?.roles ?? [];
  const allPermissions = data?.permissions ?? [];

  const openCreate = () => { setEditing(null); setName(''); setSelected(new Set()); setError(null); setDialogOpen(true); };
  const openEdit = (r: AppRole) => {
    setEditing(r); setName(r.name); setSelected(new Set(r.permissions)); setError(null); setDialogOpen(true);
  };

  const togglePerm = (p: string) =>
    setSelected((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

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
      alert(e.response?.data?.message ?? 'Suppression impossible.'),
  });

  return (
    <SectionCard
      icon={<Security sx={{ fontSize: 20 }} />}
      title="Profils & droits"
      subtitle={`${roles.length} profil(s) · ${allPermissions.length} permissions disponibles`}
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
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{ROLE_LABEL[r.name] ?? r.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.users_count} utilisateur(s)</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Modifier les droits"><IconButton size="small" onClick={() => openEdit(r)}><Edit sx={{ fontSize: 15, color: '#2563EB' }} /></IconButton></Tooltip>
                    <Tooltip title="Supprimer"><IconButton size="small" onClick={() => { if (confirm(`Supprimer le profil ${r.name} ?`)) deleteMut.mutate(r.id); }}><Delete sx={{ fontSize: 15, color: '#EF4444' }} /></IconButton></Tooltip>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {r.permissions.length === 0
                    ? <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Aucune permission</Typography>
                    : r.permissions.slice(0, 6).map((p) => (
                        <Chip key={p} label={p} size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'action.hover' }} />
                      ))}
                  {r.permissions.length > 6 && (
                    <Chip label={`+${r.permissions.length - 6}`} size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 700 }} />
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog édition droits */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {editing ? `Droits du profil « ${ROLE_LABEL[editing.name] ?? editing.name} »` : 'Nouveau profil'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
            <TextField label="Nom du profil *" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)}
              disabled={!!editing && ['super_admin', 'admin_rh', 'manager', 'employe'].includes(editing.name)} />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                Permissions ({selected.size}/{allPermissions.length})
              </Typography>
              <Box sx={{ maxHeight: 320, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: 1 }}>
                <Grid container>
                  {allPermissions.map((p) => (
                    <Grid item xs={12} sm={6} key={p}>
                      <FormControlLabel
                        control={<Checkbox size="small" checked={selected.has(p)} onChange={() => togglePerm(p)} />}
                        label={<Typography sx={{ fontSize: 12.5 }}>{p}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Security />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}
