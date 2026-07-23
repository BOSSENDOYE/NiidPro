import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Typography, TextField, Button, Grid, CircularProgress,
  Alert, Paper, Divider, InputAdornment, Avatar, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Person, Badge, Cake, LocationOn, Work, Phone, Email,
  CalendarMonth, CheckCircle, ErrorOutline, CameraAlt, DeleteOutline,
  AccountTree, Home,
} from '@mui/icons-material';
import axios from 'axios';
import PhotoCropperModal from './PhotoCropperModal';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

interface OrgUnit { id: number; code: string; libelle: string; type: string; niveau: number; parent_id: number | null; }

const EMPTY = {
  matricule: '', first_name: '', last_name: '',
  date_naissance: '', lieu_naissance: '', date_embauche: '',
  fonction: '', telephone: '', email: '',
  categorie_emploi: '', qualification: '', adresse: '',
};

export default function EnrollmentPage() {
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('ANASER');

  /* Photo */
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc]   = useState<string | null>(null);
  const [cropperOpen, setCropperOpen]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Org units */
  const [orgUnits, setOrgUnits]       = useState<OrgUnit[]>([]);
  const [directionId, setDirectionId] = useState<number | ''>('');
  const [divisionId, setDivisionId]   = useState<number | ''>('');

  /* Charger settings + org units au montage */
  useEffect(() => {
    axios.get(`${API}/settings`).then(res => {
      const s = res.data ?? {};
      if (s.logo_url) setLogoUrl(s.logo_url);
      if (s.name)    setCompanyName(s.name);
    }).catch(() => {});

    axios.get(`${API}/enroll/organisation-units`).then(res => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setOrgUnits(data);
    }).catch(() => {});
  }, []);

  /* Directions = unités sans parent ou dont le parent est de type gouvernance */
  const directions = useMemo(() => {
    const govIds = new Set(orgUnits.filter(u => u.type === 'gouvernance').map(u => u.id));
    return orgUnits.filter(u => u.parent_id === null || govIds.has(u.parent_id));
  }, [orgUnits]);

  /* Divisions = enfants directs de la direction sélectionnée */
  const divisions = useMemo(
    () => directionId ? orgUnits.filter(u => u.parent_id === directionId) : [],
    [orgUnits, directionId],
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  /* Photo */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'La photo ne doit pas dépasser 10 Mo.' }));
      return;
    }
    setErrors(prev => { const { photo: _, ...rest } = prev; return rest; });
    const reader = new FileReader();
    reader.onload = ev => { setRawImageSrc(ev.target?.result as string); setCropperOpen(true); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleCropConfirm = (file: File, previewUrl: string) => {
    setPhotoFile(file); setPhotoPreview(previewUrl); setCropperOpen(false); setRawImageSrc(null);
  };
  const handleCropCancel = () => { setCropperOpen(false); setRawImageSrc(null); };
  const removePhoto = () => {
    setPhotoFile(null); setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* Validation locale */
  const validateForm = () => {
    const req = ['matricule','first_name','last_name','date_naissance','lieu_naissance',
                 'date_embauche','fonction','telephone','email'];
    const errs: Record<string, string> = {};
    req.forEach(k => { if (!form[k as keyof typeof form]?.trim()) errs[k] = 'Champ obligatoire'; });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* Soumission */
  const submit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      // org unit : division si sélectionnée, sinon direction
      const unitId = divisionId || directionId;
      if (unitId) fd.append('organisation_unit_id', String(unitId));
      if (photoFile) fd.append('photo', photoFile);

      const res = await axios.post(`${API}/enroll/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
      setResult('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
      setMessage(msg);
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(EMPTY); setErrors({}); setResult(null); setMessage('');
    setDirectionId(''); setDivisionId('');
    removePhoto();
  };

  /* ── Styles partagés ── */
  const adornSx = { fontSize: 18, color: '#94A3B8' };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #002f59 0%, #004080 60%, #0056A3 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      py: 4, px: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 720 }}>

        {/* ── Header ── */}
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

          {/* ── Succès ── */}
          {result === 'success' && (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                Demande soumise avec succès !
              </Typography>
              <Typography sx={{ color: '#64748B', mb: 3, maxWidth: 420, mx: 'auto' }}>{message}</Typography>
              <Button variant="outlined" onClick={reset} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Soumettre une autre demande
              </Button>
            </Box>
          )}

          {/* ── Erreur ── */}
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

          {/* ── Formulaire ── */}
          {result === null && (
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                Informations personnelles
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#64748B', mb: 3 }}>
                Tous les champs marqués <span style={{ color: '#DC2626' }}>*</span> sont obligatoires.
              </Typography>

              {/* ── Photo ── */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={photoPreview ?? undefined} sx={{
                    width: 90, height: 90, border: '3px solid',
                    borderColor: errors.photo ? '#DC2626' : '#E2E8F0', bgcolor: '#F1F5F9',
                  }}>
                    <Person sx={{ fontSize: 40, color: '#94A3B8' }} />
                  </Avatar>
                  {photoPreview && (
                    <Tooltip title="Supprimer la photo">
                      <IconButton size="small" onClick={removePhoto} sx={{
                        position: 'absolute', top: -6, right: -6,
                        bgcolor: '#fff', border: '1px solid #E2E8F0', width: 22, height: 22,
                        '&:hover': { bgcolor: '#FEE2E2' },
                      }}>
                        <DeleteOutline sx={{ fontSize: 14, color: '#DC2626' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Box>
                  <input ref={fileInputRef} type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    style={{ display: 'none' }} onChange={handlePhotoChange} />
                  <Button variant="outlined" startIcon={<CameraAlt />} size="small"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      borderRadius: 2, textTransform: 'none', fontWeight: 600, mb: 0.5,
                      borderColor: errors.photo ? '#DC2626' : '#CBD5E1',
                      color: errors.photo ? '#DC2626' : '#334155',
                    }}>
                    {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                  </Button>
                  <Typography sx={{ fontSize: 12, color: errors.photo ? '#DC2626' : '#94A3B8' }}>
                    {errors.photo ?? 'JPG, PNG ou WEBP — recadrage possible après sélection'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', mb: 3 }} />

              <Grid container spacing={2.5}>

                {/* ── Identité ── */}
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Matricule *" value={form.matricule} onChange={set('matricule')}
                    error={!!errors.matricule} helperText={errors.matricule} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Badge sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Prénom(s) *" value={form.first_name} onChange={set('first_name')}
                    error={!!errors.first_name} helperText={errors.first_name} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Nom *" value={form.last_name} onChange={set('last_name')}
                    error={!!errors.last_name} helperText={errors.last_name} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>

                {/* ── Naissance ── */}
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="Date de naissance *" type="date" value={form.date_naissance}
                    onChange={set('date_naissance')} error={!!errors.date_naissance}
                    helperText={errors.date_naissance} size="small" InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Cake sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth label="Lieu de naissance *" value={form.lieu_naissance}
                    onChange={set('lieu_naissance')} error={!!errors.lieu_naissance}
                    helperText={errors.lieu_naissance} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>

                <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                {/* ── Emploi ── */}
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth label="Date d'embauche *" type="date" value={form.date_embauche}
                    onChange={set('date_embauche')} error={!!errors.date_embauche}
                    helperText={errors.date_embauche} size="small" InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth label="Fonction *" value={form.fonction} onChange={set('fonction')}
                    error={!!errors.fonction} helperText={errors.fonction} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Work sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Catégorie" value={form.categorie_emploi}
                    onChange={set('categorie_emploi')} size="small" placeholder="Ex : 9A, 8B…" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Qualification" value={form.qualification}
                    onChange={set('qualification')} size="small" />
                </Grid>

                <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                {/* ── Rattachement organisationnel ── */}
                {directions.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B',
                        textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex',
                        alignItems: 'center', gap: 0.75 }}>
                        <AccountTree sx={{ fontSize: 14 }} /> Rattachement organisationnel
                      </Typography>
                    </Grid>

                    {/* Direction / Entité */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Direction / Entité</InputLabel>
                        <Select
                          value={directionId}
                          label="Direction / Entité"
                          onChange={e => { setDirectionId(e.target.value as number | ''); setDivisionId(''); }}
                        >
                          <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
                          {directions.map(d => (
                            <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Division / Service */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" disabled={!directionId || divisions.length === 0}>
                        <InputLabel>Division / Service</InputLabel>
                        <Select
                          value={divisionId}
                          label="Division / Service"
                          onChange={e => setDivisionId(e.target.value as number | '')}
                        >
                          <MenuItem value=""><em>— Sélectionner —</em></MenuItem>
                          {divisions.map(d => (
                            <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>
                  </>
                )}

                {/* ── Contact & Adresse ── */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Téléphone *" value={form.telephone} onChange={set('telephone')}
                    error={!!errors.telephone} helperText={errors.telephone} size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email *" type="email" value={form.email} onChange={set('email')}
                    error={!!errors.email} helperText={errors.email ?? 'Utilisé pour vous notifier de la décision RH'}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: errors.email ? '#DC2626' : '#002f59' }} /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: errors.email ? undefined : '#93C5FD' } } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Adresse" value={form.adresse} onChange={set('adresse')}
                    size="small" placeholder="Quartier, rue, ville…"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Home sx={adornSx} /></InputAdornment> }}
                  />
                </Grid>

                {/* ── Soumettre ── */}
                <Grid item xs={12}>
                  <Button fullWidth variant="contained" size="large" onClick={submit} disabled={loading}
                    sx={{
                      borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 15,
                      bgcolor: '#002f59', '&:hover': { bgcolor: '#003d73' }, py: 1.5, mt: 1,
                    }}>
                    {loading
                      ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                      : 'Soumettre ma demande d\'enrôlement'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 3 }}>
          Plateforme RH {companyName} — Vos données sont traitées de manière confidentielle
        </Typography>
      </Box>

      {/* Recadreur photo */}
      {rawImageSrc && (
        <PhotoCropperModal open={cropperOpen} imageSrc={rawImageSrc}
          onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      )}
    </Box>
  );
}
