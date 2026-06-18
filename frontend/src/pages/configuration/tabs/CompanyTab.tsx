import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, TextField, Button, Stack, Avatar, IconButton,
  Grid, CircularProgress, Alert, Snackbar, Divider, Tooltip,
} from '@mui/material';
import {
  CloudUpload, Delete, Save, Business, Image as ImageIcon, Palette,
  MyLocation, Map as MapIcon, Place,
} from '@mui/icons-material';
import { settingsApi } from '../../../api/settings';
import SectionCard from '../SectionCard';

type FormState = {
  name: string; legal_name: string; email: string; phone: string; website: string;
  address: string; city: string; country: string; latitude: string; longitude: string;
  pointage_radius: string;
  rccm: string; ninea: string; primary_color: string; description: string;
};

const EMPTY: FormState = {
  name: '', legal_name: '', email: '', phone: '', website: '',
  address: '', city: '', country: '', latitude: '', longitude: '',
  pointage_radius: '200',
  rccm: '', ninea: '', primary_color: '#2563EB', description: '',
};

export default function CompanyTab() {
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '', legal_name: data.legal_name ?? '', email: data.email ?? '',
        phone: data.phone ?? '', website: data.website ?? '', address: data.address ?? '',
        city: data.city ?? '', country: data.country ?? '',
        latitude: data.latitude != null ? String(data.latitude) : '',
        longitude: data.longitude != null ? String(data.longitude) : '',
        pointage_radius: data.pointage_radius != null ? String(data.pointage_radius) : '200',
        rccm: data.rccm ?? '',
        ninea: data.ninea ?? '', primary_color: data.primary_color ?? '#2563EB',
        description: data.description ?? '',
      });
    }
  }, [data]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogoPick = (file: File) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const captureLocation = () => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Autorisation refusée. Activez la localisation pour ce site.'
            : 'Impossible de récupérer la position. Réessayez.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (logoFile) fd.append('logo', logoFile);
      return settingsApi.update(fd).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setLogoFile(null);
      setLogoPreview(null);
      setSavedToast(true);
    },
  });

  const removeLogoMut = useMutation({
    mutationFn: () => settingsApi.deleteLogo().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setLogoFile(null);
      setLogoPreview(null);
    },
  });

  const currentLogo = logoPreview ?? data?.logo_url ?? null;

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {saveMut.isError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          Échec de l'enregistrement. Vérifiez les champs et réessayez.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Logo & identité */}
        <Grid item xs={12} md={4}>
          <SectionCard icon={<ImageIcon sx={{ fontSize: 20 }} />} title="Logo" subtitle="PNG / JPG · 4 Mo max">
            <Stack alignItems="center" spacing={2}>
              <Avatar src={currentLogo ?? undefined} variant="rounded"
                sx={{ width: 150, height: 150, borderRadius: '20px', bgcolor: 'action.hover', border: '2px dashed', borderColor: 'divider', fontSize: 48, fontWeight: 900, color: 'text.secondary', '& img': { objectFit: 'contain' } }}>
                {form.name?.[0]?.toUpperCase() ?? <Business sx={{ fontSize: 48 }} />}
              </Avatar>

              <input ref={logoInputRef} type="file" accept="image/*" hidden
                onChange={(e) => { if (e.target.files?.[0]) handleLogoPick(e.target.files[0]); }} />

              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" startIcon={<CloudUpload />}
                  onClick={() => logoInputRef.current?.click()}
                  sx={{ textTransform: 'none', borderRadius: '9px', fontWeight: 700 }}>
                  Choisir
                </Button>
                {currentLogo && (
                  <Tooltip title="Retirer le logo">
                    <IconButton size="small"
                      onClick={() => { logoFile ? (setLogoFile(null), setLogoPreview(null)) : removeLogoMut.mutate(); }}
                      sx={{ border: '1px solid #FECACA', color: '#DC2626', borderRadius: '9px' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              {logoFile && (
                <Typography sx={{ fontSize: 11, color: 'primary.main', textAlign: 'center' }}>
                  Nouveau logo prêt — cliquez sur « Enregistrer »
                </Typography>
              )}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Palette sx={{ fontSize: 15 }} /> Couleur de l'entreprise
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <input type="color" value={form.primary_color || '#2563EB'}
                  onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                  style={{ width: 42, height: 36, border: 'none', borderRadius: 8, background: 'none', cursor: 'pointer' }} />
                <TextField size="small" value={form.primary_color ?? ''} onChange={set('primary_color')}
                  sx={{ width: 130 }} InputProps={{ sx: { fontSize: 13 } }} />
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        {/* Informations */}
        <Grid item xs={12} md={8}>
          <SectionCard icon={<Business sx={{ fontSize: 20 }} />} title="Informations de l'entreprise">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField label="Nom / sigle *" fullWidth size="small" value={form.name} onChange={set('name')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Raison sociale" fullWidth size="small" value={form.legal_name} onChange={set('legal_name')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Email" fullWidth size="small" value={form.email} onChange={set('email')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Téléphone" fullWidth size="small" value={form.phone} onChange={set('phone')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Site web" fullWidth size="small" value={form.website} onChange={set('website')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Ville" fullWidth size="small" value={form.city} onChange={set('city')} /></Grid>
              <Grid item xs={12}><TextField label="Adresse" fullWidth size="small" multiline minRows={2} value={form.address} onChange={set('address')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Pays" fullWidth size="small" value={form.country} onChange={set('country')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="RCCM" fullWidth size="small" value={form.rccm} onChange={set('rccm')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="NINEA" fullWidth size="small" value={form.ninea} onChange={set('ninea')} /></Grid>
              <Grid item xs={12}><TextField label="Description / slogan" fullWidth size="small" multiline minRows={2} value={form.description} onChange={set('description')} /></Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" startIcon={saveMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name}
                sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, px: 3 }}>
                Enregistrer les modifications
              </Button>
            </Box>
          </SectionCard>
        </Grid>

        {/* Localisation */}
        <Grid item xs={12}>
          <SectionCard icon={<Place sx={{ fontSize: 20 }} />} title="Localisation de l'entreprise"
            subtitle="Coordonnées GPS du siège — utilisées pour la carte et le pointage géolocalisé des agents">
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={3}><TextField label="Latitude" fullWidth size="small" value={form.latitude} onChange={set('latitude')} placeholder="14.6928" /></Grid>
              <Grid item xs={6} sm={3}><TextField label="Longitude" fullWidth size="small" value={form.longitude} onChange={set('longitude')} placeholder="-17.4467" /></Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Rayon de pointage (m)" type="number" fullWidth size="small"
                  value={form.pointage_radius} onChange={set('pointage_radius')}
                  helperText="Distance max. autorisée" />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={geoLoading ? <CircularProgress size={16} color="inherit" /> : <MyLocation />}
                    onClick={captureLocation} disabled={geoLoading}
                    sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, bgcolor: '#002f59', '&:hover': { bgcolor: '#013b73' } }}>
                    {geoLoading ? 'Localisation…' : 'Récupérer ma position'}
                  </Button>
                  {form.latitude && form.longitude && (
                    <Button variant="outlined" startIcon={<MapIcon />} component="a" target="_blank" rel="noopener"
                      href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                      sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, borderColor: '#ff7631', color: '#ff7631', '&:hover': { borderColor: '#ff5e3a', bgcolor: '#FFF4EE' } }}>
                      Voir sur la carte
                    </Button>
                  )}
                </Stack>
              </Grid>
              {geoError && <Grid item xs={12}><Alert severity="warning" sx={{ borderRadius: '10px' }}>{geoError}</Alert></Grid>}
            </Grid>

            {form.latitude && form.longitude && (
              <Box sx={{ mt: 2, borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <iframe title="Carte du siège" width="100%" height="260" style={{ border: 0, display: 'block' }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=16&output=embed`} />
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <Snackbar open={savedToast} autoHideDuration={3000} onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ borderRadius: '10px' }}>Configuration enregistrée avec succès</Alert>
      </Snackbar>
    </Box>
  );
}
