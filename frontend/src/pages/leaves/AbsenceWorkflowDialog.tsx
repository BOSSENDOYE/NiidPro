import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Stack, Typography, TextField, CircularProgress, Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle, Cancel, HourglassEmpty, LockClock, Print,
  EventBusy, BeachAccess, Assignment,
} from '@mui/icons-material';
import { leavesApi } from '../../api/leaves';
import { workflowConfigApi } from '../../api/workflowConfig';
import type { Leave, AbsApprovalEntry } from '../../types';
import { formatDate } from '../../utils/format';

const NAV = '#0D2137';
const ACT = '#E85D04';

const CATEGORY_LABELS: Record<string, string> = {
  absence:       'Absence',
  conge:         'Congé',
  conge_special: 'Congé spécial',
  mission:       'Ordre de mission',
};

interface Props {
  leave: Leave;
  onClose: () => void;
  onPrintAttestation?: () => void;
}

function levelEntry(approvals: AbsApprovalEntry[], level: number): AbsApprovalEntry | undefined {
  return approvals.find(a => a.level === level);
}

export default function AbsenceWorkflowDialog({ leave: initialLeave, onClose, onPrintAttestation }: Props) {
  const qc = useQueryClient();
  const [leave, setLeave]     = useState<Leave>(initialLeave);
  const [comment, setComment] = useState('');

  const workflowKey   = leave.leaveType?.category ?? 'absence';
  const categoryLabel = CATEGORY_LABELS[workflowKey] ?? workflowKey;
  const isConge       = workflowKey !== 'absence';

  /* ── Charger la config workflow ── */
  const { data: workflowGroups = [] } = useQuery({
    queryKey: ['workflow-configs'],
    queryFn:  () => workflowConfigApi.list(),
    staleTime: 60_000,
  });

  const workflowGroup = workflowGroups.find(g => g.key === workflowKey);
  const activeLevels  = (workflowGroup?.levels ?? []).filter(l => l.is_active);

  /* Niveaux par défaut si la config n'est pas encore chargée */
  const levels = activeLevels.length > 0
    ? activeLevels
    : [1, 2, 3, 4, 5].map(n => ({
        level: n, label: `Niveau ${n}`,
        workflow_key: workflowKey, workflow_label: categoryLabel,
        role_name: '', is_active: true,
      }));

  const lastLevel = levels[levels.length - 1]?.level ?? 5;

  const approvals      = leave.abs_approvals ?? [];
  const doneLevel      = leave.abs_approval_level ?? 0;
  const nextActive     = levels.find(l => l.level > doneLevel);
  const canProcess     = leave.status === 'pending' && !!nextActive;

  const mutation = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' }) =>
      leavesApi.approveLevel(leave.id, action, comment.trim() || undefined),
    onSuccess: (updated) => {
      setLeave(updated);
      setComment('');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  const TitleIcon = workflowKey === 'absence' ? EventBusy
                  : workflowKey === 'mission' ? Assignment
                  : BeachAccess;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{
        bgcolor: NAV, color: '#fff', fontWeight: 700, fontSize: 15, py: 1.75,
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <TitleIcon sx={{ fontSize: 18, opacity: 0.85 }} />
        Workflow {categoryLabel} — #{leave.id}
      </DialogTitle>

      <DialogContent sx={{ pt: '20px !important', pb: 1 }}>
        {/* Info demande */}
        <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: NAV }}>
                {leave.employee?.first_name} {leave.employee?.last_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {leave.employee?.employee_number} · {leave.leaveType?.name ?? '—'}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
              </Typography>
              <Chip label={`${leave.days_count} jour(s)`} size="small"
                sx={{ fontSize: 11, height: 20, bgcolor: '#EFF6FF', color: NAV, fontWeight: 700 }} />
            </Stack>
          </Stack>
        </Box>

        {/* Stepper dynamique */}
        <Stack spacing={0}>
          {levels.map((levelConfig, idx) => {
            const levelNum = levelConfig.level;
            const entry    = levelEntry(approvals, levelNum);
            const isDone   = !!entry;
            const isActive = canProcess && nextActive?.level === levelNum;
            const isLast   = levelNum === lastLevel;

            return (
              <Box key={levelNum}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.5 }}>
                  {/* Icône */}
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isDone
                      ? (entry!.status === 'approved' ? '#D1FAE5' : '#FEE2E2')
                      : isActive ? '#FFF7ED' : '#F1F5F9',
                    border: `2px solid ${
                      isDone
                        ? (entry!.status === 'approved' ? '#059669' : '#DC2626')
                        : isActive ? ACT : '#CBD5E1'
                    }`,
                  }}>
                    {isDone ? (
                      entry!.status === 'approved'
                        ? <CheckCircle sx={{ fontSize: 18, color: '#059669' }} />
                        : <Cancel sx={{ fontSize: 18, color: '#DC2626' }} />
                    ) : isActive ? (
                      <HourglassEmpty sx={{ fontSize: 16, color: ACT }} />
                    ) : (
                      <LockClock sx={{ fontSize: 16, color: '#94A3B8' }} />
                    )}
                  </Box>

                  {/* Contenu */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography sx={{
                        fontSize: 13, fontWeight: 700,
                        color: isDone
                          ? (entry!.status === 'approved' ? '#065F46' : '#991B1B')
                          : isActive ? '#92400E' : '#94A3B8',
                      }}>
                        Niveau {idx + 1} — {levelConfig.label}
                      </Typography>
                      {isDone && (
                        <Chip
                          label={entry!.status === 'approved' ? 'Approuvé' : 'Refusé'}
                          size="small"
                          sx={{
                            fontSize: 10, height: 18, fontWeight: 700,
                            bgcolor: entry!.status === 'approved' ? '#D1FAE5' : '#FEE2E2',
                            color:   entry!.status === 'approved' ? '#065F46' : '#991B1B',
                          }}
                        />
                      )}
                      {isActive && (
                        <Chip label="En attente" size="small"
                          sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E' }} />
                      )}
                    </Stack>

                    {isDone && (
                      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                          {new Date(entry!.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          {entry!.by ? ` · ${entry!.by}` : ''}
                        </Typography>
                        {entry!.comment && (
                          <Typography sx={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                            "{entry!.comment}"
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {/* Zone action pour le niveau courant */}
                    {isActive && (
                      <Box sx={{ mt: 1.5 }}>
                        <TextField
                          label="Commentaire (optionnel)"
                          size="small" fullWidth multiline rows={2}
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          sx={{ mb: 1, bgcolor: '#fff' }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" size="small" color="success"
                            disabled={mutation.isPending}
                            startIcon={mutation.isPending
                              ? <CircularProgress size={12} color="inherit" />
                              : <CheckCircle sx={{ fontSize: '14px !important' }} />}
                            onClick={() => mutation.mutate({ action: 'approve' })}
                            sx={{ fontSize: 12, fontWeight: 700, borderRadius: '6px' }}>
                            {isLast ? 'Validation finale' : 'Approuver'}
                          </Button>
                          <Button variant="contained" size="small" color="error"
                            disabled={mutation.isPending}
                            startIcon={<Cancel sx={{ fontSize: '14px !important' }} />}
                            onClick={() => mutation.mutate({ action: 'reject' })}
                            sx={{ fontSize: 12, fontWeight: 700, borderRadius: '6px' }}>
                            Refuser
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Stack>
                {idx < levels.length - 1 && <Divider sx={{ ml: 5.5 }} />}
              </Box>
            );
          })}
        </Stack>

        {/* Résultat final : approuvé */}
        {leave.status === 'approved' && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircle sx={{ color: '#059669', fontSize: 22 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#065F46' }}>
                {categoryLabel} approuvé{workflowKey === 'absence' ? 'e' : ''} — tous les niveaux validés
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#047857' }}>
                L'attestation peut maintenant être générée.
              </Typography>
            </Box>
            {onPrintAttestation && (
              <Button size="small" variant="outlined"
                startIcon={<Print sx={{ fontSize: '13px !important' }} />}
                onClick={() => { onClose(); onPrintAttestation(); }}
                sx={{ ml: 'auto', borderRadius: '6px', fontSize: 12, fontWeight: 700, borderColor: '#059669', color: '#059669', flexShrink: 0 }}>
                Attestation
              </Button>
            )}
          </Box>
        )}

        {/* Résultat final : refusé */}
        {leave.status === 'rejected' && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Cancel sx={{ color: '#DC2626', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#991B1B' }}>
              Demande refusée au niveau {doneLevel}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
