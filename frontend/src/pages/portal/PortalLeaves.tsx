import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Card, Stack, Chip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider,
} from '@mui/material';
import { Add, BeachAccess } from '@mui/icons-material';
import { meApi } from '../../api/me';
import { leavesApi } from '../../api/leaves';
import StatusChip from '../../components/common/StatusChip';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PortalLeaves() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: leaves, isLoading } = useQuery({ queryKey: ['me', 'leaves'], queryFn: () => meApi.leaves().then((r) => r.data) });
  const { data: balance } = useQuery({ queryKey: ['me', 'leave-balance'], queryFn: () => meApi.leaveBalance().then((r) => r.data) });
  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => leavesApi.types().then((r) => r.data) });

  const createMut = useMutation({
    mutationFn: () => meApi.createLeave({
      leave_type_id: Number(form.leave_type_id),
      start_date: form.start_date, end_date: form.end_date, reason: form.reason || undefined,
    }),
    onMutate: () => setError(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'leaves'] });
      qc.invalidateQueries({ queryKey: ['me', 'leave-balance'] });
      setOpen(false); setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
    },
    onError: (e: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errs = e.response?.data?.errors;
      setError(errs ? Object.values(errs).flat()[0] : (e.response?.data?.message ?? 'Échec de la demande.'));
    },
  });

  const remaining = (balance?.base_restant ?? balance?.solde ?? null) as number | null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Mes congés</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setError(null); setOpen(true); }}
          sx={{ borderRadius: '11px', fontWeight: 700, bgcolor: '#ff7631', '&:hover': { bgcolor: '#ff5e3a' } }}>
          Demander
        </Button>
      </Stack>

      {/* Solde */}
      <Card sx={{ borderRadius: '18px', p: 2.5, mb: 2.5, background: 'linear-gradient(135deg,#002f59,#014a8f)', color: '#fff' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <BeachAccess sx={{ fontSize: 38, opacity: 0.85 }} />
          <Box>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Solde de congés restant</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800 }}>
              {remaining != null ? `${remaining} jours` : '—'}
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* Historique */}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Mes demandes</Typography>
      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} /></Box>
      ) : (leaves?.length ?? 0) === 0 ? (
        <Card sx={{ borderRadius: '16px', p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <BeachAccess sx={{ fontSize: 40, color: 'divider', mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucune demande de congé</Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {leaves!.map((l) => (
            <Card key={l.id} sx={{ borderRadius: '14px', p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {l.leaveType?.name ?? 'Congé'} · {l.days_count} j
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                  </Typography>
                </Box>
                <StatusChip status={l.status} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {/* Dialog demande */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Nouvelle demande de congé</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
            <TextField select label="Type de congé *" size="small" fullWidth value={form.leave_type_id}
              onChange={(e) => setForm((f) => ({ ...f, leave_type_id: e.target.value }))}>
              {(types ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField type="date" label="Du *" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            <TextField type="date" label="Au *" size="small" fullWidth InputLabelProps={{ shrink: true }}
              value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            <TextField label="Motif" size="small" fullWidth multiline rows={2}
              value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary' }}>Annuler</Button>
          <Button variant="contained" onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.leave_type_id || !form.start_date || !form.end_date}
            startIcon={createMut.isPending ? <CircularProgress size={15} color="inherit" /> : <Add />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: '#ff7631', '&:hover': { bgcolor: '#ff5e3a' } }}>
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
