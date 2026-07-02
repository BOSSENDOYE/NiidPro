import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Avatar, IconButton, Chip, Switch,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Tooltip, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Group, PersonAdd } from '@mui/icons-material';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { usersApi, type ManagedUser, type UserPayload } from '../../../api/users';
import { rolesApi } from '../../../api/roles';
import SectionCard from '../SectionCard';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin_rh: 'Admin RH', manager: 'Manager', employe: 'Employé',
};

const EMPTY: UserPayload = { name: '', email: '', password: '', role: '', is_active: true };

export default function UsersTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserPayload>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toDel, setToDel] = useState<{ id: number; name: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data),
  });
  const roles = rolesData?.roles.map((r) => r.name) ?? Object.keys(ROLE_LABEL);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setDialogOpen(true); };
  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role ?? '', is_active: u.is_active });
    setError(null);
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => editing ? usersApi.update(editing.id, form) : usersApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDialogOpen(false); },
    onError: (e: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errs = e.response?.data?.errors;
      setError(errs ? Object.values(errs).flat()[0] : (e.response?.data?.message ?? "Échec de l'enregistrement."));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const set = (k: keyof UserPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <SectionCard
      icon={<Group sx={{ fontSize: 20 }} />}
      title="Utilisateurs"
      subtitle={`${users.length} compte(s) · gérez les accès à la plateforme`}
      action={
        <Button variant="contained" startIcon={<PersonAdd />} onClick={openCreate}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
          Nouvel utilisateur
        </Button>
      }
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Actions'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar src={u.photo_url ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{u.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, color: 'text.secondary' }}>{u.email}</TableCell>
                  <TableCell>
                    {u.role
                      ? <Chip size="small" label={ROLE_LABEL[u.role] ?? u.role}
                          sx={{ fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }} />
                      : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.is_active ? 'Actif' : 'Inactif'}
                      sx={{ fontWeight: 700, bgcolor: u.is_active ? '#ECFDF5' : '#FEF2F2', color: u.is_active ? '#059669' : '#DC2626' }} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="Modifier"><IconButton size="small" onClick={() => openEdit(u)}><Edit sx={{ fontSize: 16, color: '#2563EB' }} /></IconButton></Tooltip>
                      <Tooltip title="Supprimer"><IconButton size="small" onClick={() => setToDel({ id: u.id, name: u.name })}><Delete sx={{ fontSize: 16, color: '#EF4444' }} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
            <TextField label="Nom complet *" fullWidth size="small" value={form.name} onChange={set('name')} />
            <TextField label="Email *" type="email" fullWidth size="small" value={form.email} onChange={set('email')} />
            <TextField label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'} type="password"
              fullWidth size="small" value={form.password ?? ''} onChange={set('password')} />
            <TextField label="Rôle" select fullWidth size="small" value={form.role ?? ''} onChange={set('role')}>
              <MenuItem value="">— Aucun —</MenuItem>
              {roles.map((r) => <MenuItem key={r} value={r}>{ROLE_LABEL[r] ?? r}</MenuItem>)}
            </TextField>
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', px: 1.5, py: 0.5 }}>
              <Typography sx={{ fontSize: 13 }}>Compte actif</Typography>
              <Switch checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.name || !form.email || (!editing && !form.password)}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Add />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            {editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDel !== null}
        message={toDel ? `Supprimer l'utilisateur « ${toDel.name} » ?` : ''}
        onConfirm={() => toDel && deleteMut.mutate(toDel.id)}
        onClose={() => setToDel(null)}
      />
    </SectionCard>
  );
}
