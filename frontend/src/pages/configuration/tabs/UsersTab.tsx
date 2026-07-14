import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, Avatar, IconButton, Chip, Switch,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Tooltip, Alert, Autocomplete, Divider,
} from '@mui/material';
import { Add, Edit, Delete, Group, PersonAdd, AccountTree, Badge } from '@mui/icons-material';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { usersApi, type ManagedUser, type UserPayload } from '../../../api/users';
import { rolesApi } from '../../../api/roles';
import { employeesApi } from '../../../api/employees';
import { departmentsApi } from '../../../api/departments';
import SectionCard from '../SectionCard';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin_rh: 'Admin RH', manager: 'Manager', employe: 'Employé',
};

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: '#FEF3C7', color: '#B45309' },
  admin_rh:    { bg: '#DBEAFE', color: '#1D4ED8' },
  manager:     { bg: '#F3E8FF', color: '#7C3AED' },
  employe:     { bg: '#ECFDF5', color: '#059669' },
};

const FULL_ACCESS_ROLES = ['super_admin', 'admin_rh'];

const EMPTY: UserPayload = { name: '', email: '', password: '', role: '', is_active: true, employee_id: null, department_id: null };

interface EmployeeOption { id: number; label: string; employee_number: string; department_id: number | null; department_name?: string }

export default function UsersTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserPayload>(EMPTY);
  const [empOption, setEmpOption] = useState<EmployeeOption | null>(null);
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

  const { data: employeesRaw } = useQuery({
    queryKey: ['employees', 'all-for-user-link'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then((r) => {
      const d = r.data as { data?: unknown[] } | unknown[];
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const roles = rolesData?.roles.map((r) => r.name) ?? Object.keys(ROLE_LABEL);

  const employeeOptions: EmployeeOption[] = useMemo(() => {
    if (!employeesRaw) return [];
    return (employeesRaw as { id: number; first_name: string; last_name: string; employee_number: string; department_id: number | null; department?: { name: string } }[])
      .map(e => ({
        id: e.id,
        label: `${e.first_name} ${e.last_name}`,
        employee_number: e.employee_number,
        department_id: e.department_id,
        department_name: e.department?.name,
      }));
  }, [employeesRaw]);

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setEmpOption(null); setError(null); setDialogOpen(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, password: '', role: u.role ?? '',
      is_active: u.is_active, employee_id: u.employee_id, department_id: u.department_id,
    });
    const opt = u.employee_id ? employeeOptions.find(e => e.id === u.employee_id) ?? null : null;
    setEmpOption(opt);
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

  const isFullAccess = (role: string | null | undefined) => FULL_ACCESS_ROLES.includes(role ?? '');

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
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Utilisateur', 'Email', 'Agent lié', 'Périmètre', 'Rôle', 'Statut', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const roleChip = ROLE_COLOR[u.role ?? ''] ?? { bg: '#F1F5F9', color: '#475569' };
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar src={u.photo_url ?? undefined} sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 700, bgcolor: '#002f59', color: '#fff' }}>
                          {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{u.name}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{u.created_at?.slice(0, 10)}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: 'text.secondary' }}>{u.email}</TableCell>
                    <TableCell>
                      {u.employee_name
                        ? (
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Badge sx={{ fontSize: 14, color: '#002f59' }} />
                            <Box>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{u.employee_name}</Typography>
                              <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>{u.employee_number}</Typography>
                            </Box>
                          </Stack>
                        )
                        : <Typography sx={{ fontSize: 12, color: '#CBD5E1' }}>—</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      {isFullAccess(u.role)
                        ? <Chip size="small" label="Tous les agents" sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#EFF6FF', color: '#2563EB' }} />
                        : u.department_name
                          ? <Chip size="small" icon={<AccountTree sx={{ fontSize: '13px !important' }} />} label={u.department_name} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#F0FDF4', color: '#059669' }} />
                          : <Typography sx={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Non défini</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      {u.role
                        ? <Chip size="small" label={ROLE_LABEL[u.role] ?? u.role} sx={{ fontWeight: 700, bgcolor: roleChip.bg, color: roleChip.color }} />
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
                );
              })}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 0 }}>
          {editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}

            {/* ── Infos compte ── */}
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25 }}>
                Informations du compte
              </Typography>
              <Stack spacing={1.5}>
                <TextField label="Nom complet *" fullWidth size="small" value={form.name} onChange={set('name')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                <TextField label="Email *" type="email" fullWidth size="small" value={form.email} onChange={set('email')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                <TextField label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'} type="password"
                  fullWidth size="small" value={form.password ?? ''} onChange={set('password')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                <TextField label="Rôle" select fullWidth size="small" value={form.role ?? ''}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
                  <MenuItem value="">— Aucun —</MenuItem>
                  {roles.map((r) => <MenuItem key={r} value={r}>{ROLE_LABEL[r] ?? r}</MenuItem>)}
                </TextField>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', px: 1.5, py: 0.5 }}>
                  <Typography sx={{ fontSize: 13 }}>Compte actif</Typography>
                  <Switch checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                </Stack>
              </Stack>
            </Box>

            <Divider />

            {/* ── Périmètre ── */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Périmètre d'accès
                </Typography>
                {isFullAccess(form.role) && (
                  <Chip size="small" label="Accès complet automatique" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: '#EFF6FF', color: '#2563EB' }} />
                )}
              </Stack>

              {isFullAccess(form.role) ? (
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: 12 }}>
                  Le rôle <strong>{ROLE_LABEL[form.role ?? ''] ?? form.role}</strong> a accès à tous les agents sans restriction de département.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {/* Autocomplete agent */}
                  <Autocomplete
                    options={employeeOptions}
                    value={empOption}
                    onChange={(_, newVal) => {
                      setEmpOption(newVal);
                      setForm(f => ({
                        ...f,
                        employee_id: newVal?.id ?? null,
                        department_id: newVal?.department_id ?? f.department_id,
                      }));
                    }}
                    getOptionLabel={(o) => `${o.label} (${o.employee_number})`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    renderOption={(props, o) => (
                      <Box component="li" {...props} key={o.id}>
                        <Stack>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{o.label}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{o.employee_number} · {o.department_name ?? '—'}</Typography>
                        </Stack>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Agent lié (optionnel)" size="small" placeholder="Rechercher par nom ou matricule…"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                    )}
                    noOptionsText="Aucun agent trouvé"
                    clearOnEscape
                  />

                  {/* Département scope */}
                  <TextField label="Périmètre département" select fullWidth size="small"
                    value={form.department_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value === '' ? null : Number(e.target.value) }))}
                    helperText="Cet utilisateur ne verra que les agents de ce département"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
                    <MenuItem value="">— Tous (non restreint) —</MenuItem>
                    {(departments as { id: number; name: string }[]).map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: '10px' }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.name || !form.email || (!editing && !form.password)}
            startIcon={saveMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Add />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3 }}>
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
