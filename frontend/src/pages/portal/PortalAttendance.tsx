import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, Stack, Chip, Alert, CircularProgress,
  Table, TableBody, TableRow, TableCell, Divider,
} from '@mui/material';
import { Login, Logout, MyLocation, CheckCircle, Schedule } from '@mui/icons-material';
import { meApi } from '../../api/me';

function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function PortalAttendance() {
  const qc = useQueryClient();
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'attendances'],
    queryFn: () => meApi.attendances().then((r) => r.data),
  });
  const today = data?.today;

  const getCoords = () => new Promise<{ latitude: number; longitude: number } | undefined>((resolve) => {
    if (!('geolocation' in navigator)) { resolve(undefined); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => { setLocating(false); resolve(undefined); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

  const punch = useMutation({
    mutationFn: async (action: 'in' | 'out') => {
      setError(null); setGeoMsg('Localisation en cours…');
      const coords = await getCoords();
      setGeoMsg(coords ? 'Position obtenue, envoi…' : 'Position indisponible, envoi sans GPS…');
      return action === 'in' ? meApi.checkIn(coords) : meApi.checkOut(coords);
    },
    onSuccess: () => { setGeoMsg(null); qc.invalidateQueries({ queryKey: ['me', 'attendances'] }); },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setGeoMsg(null);
      setError(e.response?.data?.message ?? 'Échec du pointage.');
    },
  });

  const canIn = !today?.check_in;
  const canOut = !!today?.check_in && !today?.check_out;

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 0.5 }}>Pointage</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>
        Pointez votre arrivée et votre départ si vous êtes dans la zone de l'entreprise.
      </Typography>

      {/* Carte du jour */}
      <Card sx={{ borderRadius: '18px', p: 3, mb: 2.5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Aujourd'hui
        </Typography>
        <Stack direction="row" justifyContent="center" spacing={4} sx={{ my: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Arrivée</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: today?.check_in ? '#059669' : 'text.disabled' }}>{fmtTime(today?.check_in ?? null)}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Départ</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: today?.check_out ? '#DC2626' : 'text.disabled' }}>{fmtTime(today?.check_out ?? null)}</Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', textAlign: 'left' }} onClose={() => setError(null)}>{error}</Alert>}
        {geoMsg && (
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            {(locating || punch.isPending) && <CircularProgress size={16} />}
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{geoMsg}</Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button variant="contained" size="large" startIcon={<Login />} disabled={!canIn || punch.isPending}
            onClick={() => punch.mutate('in')}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 3, py: 1.3, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
            Pointer l'arrivée
          </Button>
          <Button variant="contained" size="large" startIcon={<Logout />} disabled={!canOut || punch.isPending}
            onClick={() => punch.mutate('out')}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 3, py: 1.3, bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}>
            Pointer le départ
          </Button>
        </Stack>
        {today?.distance_metres != null && (
          <Chip icon={<MyLocation sx={{ fontSize: '14px !important' }} />} size="small"
            label={`Pointé à ≈ ${today.distance_metres} m du siège`}
            sx={{ mt: 2, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />
        )}
      </Card>

      {/* Historique */}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Historique récent</Typography>
      <Card sx={{ borderRadius: '16px' }}>
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <Table size="small">
            <TableBody>
              {(data?.history ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12.5, textTransform: 'capitalize' }}>{fmtDate(a.date)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CheckCircle sx={{ fontSize: 14, color: '#059669' }} /> {fmtTime(a.check_in)}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Schedule sx={{ fontSize: 14, color: '#DC2626' }} /> {fmtTime(a.check_out)}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={a.status}
                      sx={{ fontSize: 10, height: 20, bgcolor: a.status === 'present' ? '#ECFDF5' : a.status === 'late' ? '#FFFBEB' : '#F1F5F9',
                        color: a.status === 'present' ? '#059669' : a.status === 'late' ? '#D97706' : '#64748B' }} />
                  </TableCell>
                </TableRow>
              ))}
              {(data?.history?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 13 }}>Aucun pointage</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </Box>
  );
}
