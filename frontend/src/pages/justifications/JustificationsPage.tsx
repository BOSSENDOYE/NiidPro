import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, IconButton, Tooltip, Avatar, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Tabs, Tab,
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { justificationsApi, type Justification } from '../../api/justifications';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatDate } from '../../utils/format';

export default function JustificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState<{ item: Justification; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const { data: all, isLoading } = useQuery({
    queryKey: ['justifications'],
    queryFn: () => justificationsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { data: pending } = useQuery({
    queryKey: ['justifications', 'pending'],
    queryFn: () => justificationsApi.pending().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      justificationsApi.approve(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['justifications'] }); closeDialog(); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      justificationsApi.reject(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['justifications'] }); closeDialog(); },
  });

  const closeDialog = () => { setDialog(null); setComment(''); };

  const handleAction = () => {
    if (!dialog) return;
    if (dialog.action === 'approve') approveMutation.mutate({ id: dialog.item.id, comment });
    else rejectMutation.mutate({ id: dialog.item.id, comment });
  };

  const displayed = tab === 0 ? (all ?? []) : (pending ?? []);

  return (
    <Box>
      <PageHeader
        title="Justifications"
        subtitle={`${pending?.length ?? 0} justification(s) en attente`}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        <Tab label={`Toutes (${all?.length ?? 0})`} />
        <Tab label={`En attente (${pending?.length ?? 0})`} />
      </Tabs>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Date d'absence</TableCell>
                <TableCell>Motif</TableCell>
                <TableCell>Soumis le</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : displayed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
                        Aucune justification
                      </TableCell>
                    </TableRow>
                  )
                : displayed.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                          <Avatar sx={{
                            width: 32, height: 32,
                            background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {item.employee?.first_name?.[0]}{item.employee?.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                              {item.employee?.first_name} {item.employee?.last_name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                              {item.employee?.department?.name}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13 }}>{formatDate(item.date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: '#64748B', maxWidth: 200 }} noWrap>
                          {item.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: '#64748B' }}>
                          {formatDate(item.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={item.status} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Voir détail">
                          <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                        </Tooltip>
                        {item.status === 'pending' && (
                          <>
                            <Tooltip title="Approuver">
                              <IconButton
                                size="small"
                                onClick={() => setDialog({ item, action: 'approve' })}
                                sx={{ color: '#059669' }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Refuser">
                              <IconButton
                                size="small"
                                onClick={() => setDialog({ item, action: 'reject' })}
                                sx={{ color: '#DC2626' }}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {dialog?.action === 'approve' ? 'Approuver la justification' : 'Refuser la justification'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>
            {dialog?.item.employee?.first_name} {dialog?.item.employee?.last_name} — Absence du {formatDate(dialog?.item.date)}
          </Typography>
          <TextField
            label="Commentaire (optionnel)"
            fullWidth multiline rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} sx={{ color: '#64748B' }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            sx={{
              bgcolor: dialog?.action === 'approve' ? '#059669' : '#DC2626',
              '&:hover': { bgcolor: dialog?.action === 'approve' ? '#047857' : '#B91C1C' },
            }}
          >
            {dialog?.action === 'approve' ? 'Approuver' : 'Refuser'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
