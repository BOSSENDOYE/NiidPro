import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Grid, TextField,
  Button, Stack, Alert, CircularProgress,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin_rh: 'Admin RH',
    manager: 'Manager',
    employe: 'Employé',
  };

  const handleSavePwd = async () => {
    setPwdError('');
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwdForm.next.length < 8) {
      setPwdError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setSavingPwd(true);
    try {
      await authApi.changePassword({ current_password: pwdForm.current, password: pwdForm.next, password_confirmation: pwdForm.confirm });
      setPwdSuccess('Mot de passe modifié avec succès');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setPwdError(err.response?.data?.message ?? 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px', mb: 3 }}>
        Mon profil
      </Typography>

      <Grid container spacing={2.5}>
        {/* Profile header card */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{
                    width: 80, height: 80,
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    fontSize: 28, fontWeight: 800,
                  }}>
                    {initials}
                  </Avatar>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    {user?.name}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#64748B', mb: 1 }}>{user?.email}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {user?.roles?.map((r) => (
                      <Box key={r} sx={{
                        px: 1.5, py: 0.25, borderRadius: '6px',
                        bgcolor: '#EFF6FF', border: '1px solid #BFDBFE',
                      }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                          {roleLabel[r] ?? r}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee info (read-only) */}
        {user?.employee && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 2 }}>
                  Informations professionnelles
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    { label: 'Matricule', value: user.employee.employee_number },
                    { label: 'Direction', value: user.employee.department?.name },
                    { label: 'Poste', value: user.employee.position?.title },
                    { label: 'Email pro.', value: user.employee.professional_email },
                  ].map((row) => (
                    <Box key={row.label} sx={{ display: 'flex', gap: 2, py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                      <Typography sx={{ fontSize: 13, color: '#64748B', minWidth: 120 }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{row.value ?? '—'}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Change password */}
        <Grid item xs={12} md={user?.employee ? 6 : 12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock sx={{ fontSize: 16, color: '#7C3AED' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                  Changer le mot de passe
                </Typography>
              </Box>

              {pwdError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>{pwdError}</Alert>}
              {pwdSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '10px', fontSize: 13 }}>{pwdSuccess}</Alert>}

              <Stack spacing={2}>
                <TextField
                  label="Mot de passe actuel"
                  type="password"
                  fullWidth
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm((p) => ({ ...p, current: e.target.value }))}
                />
                <TextField
                  label="Nouveau mot de passe"
                  type="password"
                  fullWidth
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm((p) => ({ ...p, next: e.target.value }))}
                  helperText="Minimum 8 caractères"
                />
                <TextField
                  label="Confirmer le nouveau mot de passe"
                  type="password"
                  fullWidth
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))}
                  error={pwdForm.confirm.length > 0 && pwdForm.next !== pwdForm.confirm}
                  helperText={pwdForm.confirm.length > 0 && pwdForm.next !== pwdForm.confirm ? 'Ne correspond pas' : ''}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={savingPwd ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    disabled={savingPwd || !pwdForm.current || !pwdForm.next}
                    onClick={handleSavePwd}
                    sx={{ borderRadius: '8px' }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
