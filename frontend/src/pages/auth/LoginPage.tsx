import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography,
  Alert, InputAdornment, IconButton, CircularProgress, Stack,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;


export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Identifiants incorrects');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — Brand panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '45%',
        background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)',
        p: 5,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <Box sx={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)',
          top: -100, right: -100,
        }} />
        <Box sx={{
          position: 'absolute', width: 600, height: 600,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)',
          bottom: -200, left: -200,
        }} />
        <Box sx={{
          position: 'absolute', width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)',
          top: '40%', left: '60%',
        }} />

        {/* Logo */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,99,235,0.5)',
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>N</Typography>
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>
              NiidPro
            </Typography>
          </Box>
        </Box>

        {/* Center content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{
            fontSize: 36, fontWeight: 800, color: '#F8FAFC',
            letterSpacing: '-1px', lineHeight: 1.2, mb: 2,
          }}>
            Gérez vos<br />
            ressources<br />
            <Box component="span" sx={{
              background: 'linear-gradient(90deg, #60A5FA, #A78BFA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              humaines
            </Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
            Plateforme RH complète : pointage, congés, contrats, paie et organigramme en un seul endroit.
          </Typography>
        </Box>

        {/* Footer stats */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', gap: 4 }}>
            {[
              { value: '500+', label: 'Entreprises' },
              { value: '50k+', label: 'Employés gérés' },
              { value: '99.9%', label: 'Disponibilité' },
            ].map((s) => (
              <Box key={s.label}>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 22 }}>{s.value}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right — Login form */}
      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F8FAFC',
        p: 3,
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>N</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>NiidPro</Typography>
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: 26, color: '#0F172A', letterSpacing: '-0.5px', mb: 0.5 }}>
            Connexion
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: 14, mb: 3.5 }}>
            Accédez à votre espace de gestion RH
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                {...register('email')}
                label="Adresse email"
                type="email"
                fullWidth
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '10px' },
                }}
              />
              <TextField
                {...register('password')}
                label="Mot de passe"
                type={showPwd ? 'text' : 'password'}
                fullWidth
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '10px' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting}
                sx={{ py: 1.5, borderRadius: '10px', fontSize: 15 }}
              >
                {isSubmitting
                  ? <CircularProgress size={20} color="inherit" />
                  : 'Se connecter'}
              </Button>
            </Stack>
          </Box>

        </Box>
      </Box>
    </Box>
  );
}
