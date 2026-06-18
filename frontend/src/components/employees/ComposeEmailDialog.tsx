import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, TextField, Button, Typography, Avatar, Alert, CircularProgress, IconButton,
} from '@mui/material';
import { Send, Close, Email as EmailIcon } from '@mui/icons-material';
import { emailsApi } from '../../api/emails';
import type { Employee } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function ComposeEmailDialog({ open, onClose, employee }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Pré-remplir le destinataire à l'ouverture
  useEffect(() => {
    if (open && employee) {
      setTo(employee.professional_email ?? employee.personal_email ?? '');
      setSubject('');
      setBody(`Bonjour ${employee.first_name ?? ''},\n\n`);
    }
  }, [open, employee]);

  const sendMutation = useMutation({
    mutationFn: () => emailsApi.send({
      to_email: to,
      to_name: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
      subject,
      body,
      employee_id: employee?.id,
    }),
    onSuccess: () => {
      setTimeout(onClose, 900);
    },
  });

  const initials = employee
    ? `${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}`.toUpperCase()
    : '';

  const canSend = !!to && !!subject && !!body && !sendMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#16A34A', color: '#fff', fontWeight: 700, py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <EmailIcon sx={{ fontSize: 20 }} />
          <span>Nouveau message</span>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {/* Destinataire */}
          {employee && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <Avatar src={employee.photo_url ?? undefined} sx={{ width: 38, height: 38, bgcolor: '#16A34A', fontSize: 14, fontWeight: 700 }}>
                {initials}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#14532D' }} noWrap>
                  {employee.first_name} {employee.last_name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#15803D' }} noWrap>
                  {employee.employee_number} · {employee.position?.title ?? '—'}
                </Typography>
              </Box>
            </Box>
          )}

          <TextField label="Destinataire *" size="small" fullWidth type="email"
            value={to} onChange={e => setTo(e.target.value)} />
          <TextField label="Objet *" size="small" fullWidth
            value={subject} onChange={e => setSubject(e.target.value)} />
          <TextField label="Message *" size="small" fullWidth multiline rows={8}
            value={body} onChange={e => setBody(e.target.value)} />

          {sendMutation.isSuccess && <Alert severity="success">Email envoyé avec succès.</Alert>}
          {sendMutation.isError && (
            <Alert severity="error">
              {((sendMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message) ?? "Échec de l'envoi."}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#64748B', textTransform: 'none' }}>Annuler</Button>
        <Button variant="contained" disabled={!canSend}
          startIcon={sendMutation.isPending ? <CircularProgress size={15} color="inherit" /> : <Send sx={{ fontSize: '16px !important' }} />}
          onClick={() => sendMutation.mutate()}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>
          {sendMutation.isPending ? 'Envoi…' : 'Envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
