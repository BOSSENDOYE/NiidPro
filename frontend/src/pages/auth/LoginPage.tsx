import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, TextField, Button, Typography,
  Alert, InputAdornment, IconButton, CircularProgress, Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, MailOutline, LockOutlined, ArrowForward } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../../api/auth';
import { settingsApi } from '../../api/settings';
import { useAuthStore } from '../../store/auth.store';

// ── Charte ──
const NAVY = '#002f59';
const ORANGE = '#ff7631';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;

// ── Logo de l'entreprise (image si configurée, sinon initiale) ──
function CompanyLogo({ logoUrl, name, size = 88 }: { logoUrl?: string | null; name: string; size?: number }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '24px', flexShrink: 0,
      bgcolor: '#fff', p: logoUrl ? '8px' : 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 12px 30px rgba(0,47,89,0.28)`,
      border: '4px solid #fff',
      ...(!logoUrl && { background: `linear-gradient(140deg, ${NAVY} 0%, #013b73 100%)` }),
    }}>
      {logoUrl
        ? <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: size * 0.42, letterSpacing: '-1px' }}>
            {name?.[0]?.toUpperCase() ?? 'N'}
          </Typography>}
    </Box>
  );
}

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { data: company } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const companyName = company?.name || 'RH+PAIE';
  const tagline = company?.description || 'Plateforme de gestion des ressources humaines';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.data.user, res.data.token);
      const roles = res.data.user.roles ?? [];
      const isEmployee = roles.includes('employe') && !roles.some((r) => ['super_admin', 'admin_rh', 'manager'].includes(r));
      navigate(isEmployee ? '/portail' : '/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Identifiants incorrects');
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#F7F9FC', borderRadius: '13px',
      transition: 'all .2s',
      '& fieldset': { borderColor: '#E6EBF2' },
      '&:hover fieldset': { borderColor: '#FFD2BC' },
      '&:hover': { bgcolor: '#fff' },
      '&.Mui-focused': { bgcolor: '#fff', boxShadow: `0 0 0 4px ${ORANGE}22` },
      '&.Mui-focused fieldset': { borderColor: ORANGE, borderWidth: 2 },
    },
    '& label.Mui-focused': { color: ORANGE },
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 2, position: 'relative', overflow: 'hidden', bgcolor: '#F4F7FB',
    }}>
      {/* ══ Décor de fond ══ */}
      <Box sx={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', top: -220, right: -150, background: `radial-gradient(circle, ${ORANGE}1F 0%, transparent 70%)` }} />
      <Box sx={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', bottom: -260, left: -180, background: `radial-gradient(circle, rgba(0,47,89,0.16) 0%, transparent 70%)` }} />
      <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '10%', left: '6%', background: `radial-gradient(circle, ${ORANGE}14 0%, transparent 70%)` }} />
      <Box sx={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,47,89,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,47,89,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 60% at center, #000 0%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at center, #000 0%, transparent 80%)',
      }} />

      {/* ══ Carte centrée ══ */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        <Box sx={{
          bgcolor: '#fff', borderRadius: '28px', overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,47,89,0.22), 0 8px 20px rgba(0,47,89,0.08)',
          border: '1px solid #EDF1F7',
        }}>
          {/* ── En-tête navy ── */}
          <Box sx={{
            position: 'relative',
            background: `linear-gradient(150deg, ${NAVY} 0%, #013b73 60%, #014a8f 100%)`,
            px: 4, pt: 4.5, pb: 8, textAlign: 'center', overflow: 'hidden',
          }}>
            {/* Décor en-tête */}
            <Box sx={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', top: -90, right: -60, border: '1px solid rgba(255,255,255,0.07)' }} />
            <Box sx={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', bottom: -40, left: -30, background: `radial-gradient(circle, ${ORANGE}40 0%, transparent 70%)` }} />
            {/* Barre d'accent orange */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${ORANGE} 0%, #ffb088 100%)` }} />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography sx={{
                display: 'inline-block', px: 1.5, py: 0.4, mb: 2, borderRadius: '20px',
                bgcolor: 'rgba(255,118,49,0.18)', border: `1px solid ${ORANGE}66`,
                color: '#FFD9C6', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                Espace sécurisé
              </Typography>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 26, letterSpacing: '-0.6px', lineHeight: 1.2 }}>
                {companyName}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mt: 0.5, maxWidth: 300, mx: 'auto' }}>
                {company?.legal_name || tagline}
              </Typography>
            </Box>
          </Box>

          {/* ── Logo chevauchant ── */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: '-44px', position: 'relative', zIndex: 2 }}>
            <CompanyLogo logoUrl={company?.logo_url} name={companyName} size={88} />
          </Box>

          {/* ── Corps : formulaire ── */}
          <Box sx={{ px: { xs: 3, sm: 4.5 }, pt: 2.5, pb: 4.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: NAVY, letterSpacing: '-0.5px', textAlign: 'center', mb: 0.5 }}>
              Bon retour 👋
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: 13.5, textAlign: 'center', mb: 3.5 }}>
              Connectez-vous à votre espace de gestion
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', fontSize: 13 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2.25}>
                <TextField
                  {...register('email')}
                  label="Adresse email"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutline sx={{ fontSize: 19, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ fontSize: 19, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">
                          {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  endIcon={!isSubmitting && <ArrowForward />}
                  sx={{
                    py: 1.6, mt: 0.5, borderRadius: '13px', fontSize: 15, fontWeight: 700, textTransform: 'none',
                    background: `linear-gradient(135deg, ${ORANGE} 0%, #ff5e3a 100%)`,
                    boxShadow: `0 12px 28px ${ORANGE}66`,
                    transition: 'all .2s',
                    '&:hover': { background: 'linear-gradient(135deg, #ff6a1f 0%, #f24e2a 100%)', boxShadow: `0 16px 36px ${ORANGE}80`, transform: 'translateY(-1px)' },
                    '&:disabled': { background: '#FFC4A8', color: '#fff' },
                  }}
                >
                  {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Se connecter'}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* Pied */}
        <Typography sx={{ textAlign: 'center', color: '#8499AE', fontSize: 12, mt: 3 }}>
          © {new Date().getFullYear()} {companyName} — Tous droits réservés
        </Typography>
      </Box>
    </Box>
  );
}
