import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, IconButton, Tooltip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Avatar, Stack,
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { leavesApi } from '../../api/leaves';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatDate } from '../../utils/format';
import type { Leave } from '../../types';

export default function LeavesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [commentDialog, setCommentDialog] = useState<{ leave: Leave; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const { data: allLeaves, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => r.data),
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leavesApi.pending().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.approve(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); closeDialog(); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.reject(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); closeDialog(); },
  });

  const closeDialog = () => { setCommentDialog(null); setComment(''); };

  const handleAction = () => {
    if (!commentDialog) return;
    if (commentDialog.action === 'approve') approveMutation.mutate({ id: commentDialog.leave.id, comment });
    else rejectMutation.mutate({ id: commentDialog.leave.id, comment });
  };

  const displayed = tab === 0 ? (allLeaves ?? []) : (pendingLeaves ?? []);

  return (
    <Box>
      <PageHeader
        title="Congés"
        subtitle={`${pendingLeaves?.length ?? 0} demande(s) en attente`}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Tous les congés (${allLeaves?.length ?? 0})`} />
        <Tab label={`En attente (${pendingLeaves?.length ?? 0})`} />
      </Tabs>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Début</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Jours</TableCell>
                <TableCell>Motif</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : displayed.map((leave) => (
                    <TableRow key={leave.id} hover>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366F1', fontSize: 12 }}>
                            {leave.employee?.first_name?.[0]}{leave.employee?.last_name?.[0]}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {leave.employee?.first_name} {leave.employee?.last_name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box sx={{
                          display: 'inline-block', px: 1, py: 0.25, borderRadius: 1,
                          bgcolor: leave.leaveType?.color ? `${leave.leaveType.color}20` : '#EEF2FF',
                          color: leave.leaveType?.color ?? '#6366F1',
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {leave.leaveType?.name ?? '—'}
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(leave.start_date)}</TableCell>
                      <TableCell>{formatDate(leave.end_date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{leave.days_count}j</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                          {leave.reason ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={leave.status} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Voir">
                          <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                        </Tooltip>
                        {leave.status === 'pending' && (
                          <>
                            <Tooltip title="Approuver">
                              <IconButton
                                size="small" color="success"
                                onClick={() => setCommentDialog({ leave, action: 'approve' })}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Refuser">
                              <IconButton
                                size="small" color="error"
                                onClick={() => setCommentDialog({ leave, action: 'reject' })}
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

      {/* Approve/Reject dialog */}
      <Dialog open={Boolean(commentDialog)} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {commentDialog?.action === 'approve' ? 'Approuver le congé' : 'Refuser le congé'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {commentDialog?.leave.employee?.first_name} {commentDialog?.leave.employee?.last_name} —{' '}
            {formatDate(commentDialog?.leave.start_date)} au {formatDate(commentDialog?.leave.end_date)}
            {' '}({commentDialog?.leave.days_count} jour(s))
          </Typography>
          <TextField
            label="Commentaire (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button
            variant="contained"
            color={commentDialog?.action === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {commentDialog?.action === 'approve' ? 'Approuver' : 'Refuser'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
