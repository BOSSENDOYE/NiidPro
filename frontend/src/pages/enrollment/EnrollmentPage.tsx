import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Grid, CircularProgress,
  Alert, Paper, Divider, InputAdornment, Avatar, IconButton, Tooltip,
} from '@mui/material';
import {
  Person, Badge, Cake, LocationOn, Work, Phone, Email,
  CalendarMonth, CheckCircle, ErrorOutline, CameraAlt, DeleteOutline,
} from '@mui/icons-material';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const EMPTY = {
  matricule: '', first_name: '', last_name: '',
  date_naissance: '', lieu_naissance: '', date_embauche: '',
  fonction: '', telephone: '', email: '',
  categorie_emploi: '', qualification: '',
};

export default function EnrollmentPage() {
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl]     = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('ANASER');
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get(`${API}/settings`).then(res => {
      const s = res.data ?? {};
      if (s.logo_url) setLogoUrl(s.logo_url);
      if (s.name) setCompanyName(s.name);
    }).catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'La photo ne doit pas dépasser 3 Mo.' }));
      return;
    }
    setErrors(prev => { const { photo: _, ...rest } = prev; return rest; });
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const req = ['matricule','first_name','last_name','date_naissance','lieu_naissance','date_embauche','fonction','telephone','email'];
    const errs: Record<string, string> = {};
    req.forEach(k => {
      if (!form[k as keyof typeof form]?.trim()) errs[k] = 'Champ obligatoire';
    });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email invalide';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);

      const res = await axios.post(`${API}/enroll/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
      setResult('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
      setMessage(msg);
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setErrors({});
    setResult(null);
    setMessage('');
    removePhoto();
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #002f59 0%, #004080 60%, #0056A3 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      py: 4, px: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 700 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 88, height: 88, borderRadius: '22px',
            bgcolor: '#fff', p: logoUrl ? '10px' : 0, overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)', mb: 2,
            ...(!logoUrl && { background: 'linear-gradient(140deg, #002f59 0%, #013b73 100%)' }),
          }}>
            {logoUrl
              ? <img src={logoUrl} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Badge sx={{ fontSize: 40, color: '#ff7631' }} />
            }
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {companyName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, mt: 0.5 }}>
            Formulaire d'enrôlement agent
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>

          {/* Success */}
          {result === 'success' && (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                Demande soumise avec succès !
              </Typography>
              <Typography sx={{ color: '#64748B', mb: 3, maxWidth: 420, mx: 'auto' }}>
                {message}
              </Typography>
              <Button variant="outlined" onClick={reset} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Soumettre une autre demande
              </Button>
            </Box>
          )}

          {/* Error */}
          {result === 'error' && (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <ErrorOutline sx={{ fontSize: 64, color: '#DC2626', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                Erreur de soumission
              </Typography>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>{message}</Alert>
              <Button variant="contained" onClick={() => setResult(null)}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#002f59' }}>
                Réessayer
              </Button>
            </Box>
          )}

          {/* Form */}
          {result === null && (
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                Informations personnelles
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3 }}>
                Tous les champs marqués <span style={{ color: '#DC2626' }}>*</span> sont obligatoires.
              </Typography>

              {/* Photo */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={photoPreview ?? undefined}
                    sx={{
                      width: 90, height: 90,
                      border: '3px solid',
                      borderColor: errors.photo ? '#DC2626' : '#E2E8F0',
                      bgcolor: '#F1F5F9',
                      fontSize: 36,
                    }}
                  >
                    <Person sx={{ fontSize: 40, color: '#94A3B8' }} />
                  </Avatar>
                  {photoPreview && (
                    <Tooltip title="Supprimer la photo">
                      <IconButton
                        size="small"
                        onClick={removePhoto}
                        sx={{
                          position: 'absolute', top: -6, right: -6,
                          bgcolor: '#fff', border: '1px solid #E2E8F0',
                          width: 22, height: 22,
                          '&:hover': { bgcolor: '#FEE2E2' },
                        }}
                      >
                        <DeleteOutline sx={{ fontSize: 14, color: '#DC2626' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CameraAlt />}
                    onClick={() => fileInputRef.current?.click()}
                    size="small"
                    sx={{
                      borderRadius: 2, textTransform: 'none', fontWeight: 600,
                      borderColor: errors.photo ? '#DC2626' : '#CBD5E1',
                      color: errors.photo ? '#DC2626' : '#334155',
                      mb: 0.5,
                    }}
                  >
                    {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                  </Button>
                  <Typography sx={{ fontSize: 12, color: errors.photo ? '#DC2626' : '#94A3B8' }}>
                    {errors.photo ?? 'JPG, PNG ou WEBP — max 3 Mo (facultatif)'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />

              <Grid container spacing={2.5}>
                {/* Matricule */}
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Matricule *" value={form.matricule} onChange={set('matricule')}
                    error={!!errors.matricule} helperText={errors.matricule}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Badge sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Prénom(s) *" value={form.first_name} onChange={set('first_name')}
                    error={!!errors.first_name} helperText={errors.first_name}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Nom *" value={form.last_name} onChange={set('last_name')}
                    error={!!errors.last_name} helperText={errors.last_name}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>

                {/* Naissance */}
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="Date de naissance *" type="date" value={form.date_naissance} onChange={set('date_naissance')}
                    error={!!errors.date_naissance} helperText={errors.date_naissance}
                    size="small" InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Cake sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth label="Lieu de naissance *" value={form.lieu_naissance} onChange={set('lieu_naissance')}
                    error={!!errors.lieu_naissance} helperText={errors.lieu_naissance}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>

                <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                {/* Emploi */}
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="Date d'embauche *" type="date" value={form.date_embauche} onChange={set('date_embauche')}
                    error={!!errors.date_embauche} helperText={errors.date_embauche}
                    size="small" InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth label="Fonction *" value={form.fonction} onChange={set('fonction')}
                    error={!!errors.fonction} helperText={errors.fonction}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Work sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Catégorie" value={form.categorie_emploi} onChange={set('categorie_emploi')}
                    size="small" placeholder="Ex : 9A, 8B…"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Qualification" value={form.qualification} onChange={set('qualification')}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                {/* Contact */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Téléphone *" value={form.telephone} onChange={set('telephone')}
                    error={!!errors.telephone} helperText={errors.telephone}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email *" type="email" value={form.email} onChange={set('email')}
                    error={!!errors.email} helperText={errors.email}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button fullWidth variant="contained" size="large" onClick={submit} disabled={loading}
                    sx={{
                      borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 15,
                      bgcolor: '#002f59', '&:hover': { bgcolor: '#003d73' },
                      py: 1.5, mt: 1,
                    }}>
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Soumettre ma demande d\'enrôlement'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 3 }}>
          Plateforme RH ANASER — Vos données sont traitées de manière confidentielle
        </Typography>
      </Box>
    </Box>
  );
}
