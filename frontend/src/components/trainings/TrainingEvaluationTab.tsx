import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, TextField, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Rating, Slider, IconButton, Tooltip,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { trainingsApi } from '../../api/trainings';
import type { Training, TrainingEvaluation } from '../../types';

interface Props {
  training: Training;
}

export default function TrainingEvaluationTab({ training }: Props) {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [formScore, setFormScore] = useState(0);
  const [formFeedback, setFormFeedback] = useState('');

  const participants = training.participants ?? [];

  const { data: evaluations = [] } = useQuery({
    queryKey: ['trainings', training.id, 'evaluations'],
    queryFn: () => trainingsApi.evaluations(training.id).then((r) => r.data),
    enabled: !!training.id,
  });

  const evaluateMutation = useMutation({
    mutationFn: ({ employeeId, score, feedback }: { employeeId: number; score: number; feedback: string }) =>
      trainingsApi.evaluate(training.id, employeeId, score, feedback),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings', training.id, 'evaluations'] });
      setEditTarget(null);
    },
  });

  const handleEditEvaluation = (employeeId: number, score?: number, feedback?: string) => {
    setEditTarget(employeeId);
    setFormScore(score ?? 0);
    setFormFeedback(feedback ?? '');
  };

  const handleSaveEvaluation = () => {
    if (editTarget === null) return;
    evaluateMutation.mutate({ employeeId: editTarget, score: formScore, feedback: formFeedback });
  };

  const getEvaluationForEmployee = (employeeId: number): TrainingEvaluation | undefined => {
    return evaluations.find((e) => e.employee_id === employeeId);
  };

  return (
    <Box sx={{ p: 2.5 }}>
      {training.status !== 'completed' && training.status !== 'archived' && (
        <Box sx={{ bgcolor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
            ℹ Les évaluations sont disponibles une fois la formation réalisée.
          </Typography>
        </Box>
      )}

      {/* ── Tableau évaluations ── */}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F1F5F9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Matricule</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Nom & Prénom</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Score</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Feedback</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#0F172A', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#64748B' }}>
                  Aucun participant
                </TableCell>
              </TableRow>
            ) : (
              participants.map((p) => {
                const eval_ = getEvaluationForEmployee(p.employee_id);

                return (
                  <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' } }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                      {p.employee?.employee_number ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {p.employee?.first_name} {p.employee?.last_name}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {eval_?.score ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Rating value={eval_.score / 20} readOnly size="small" />
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6' }}>
                            {eval_.score}/100
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#64748B', maxWidth: 200 }}>
                      {eval_?.feedback ? (
                        <Tooltip title={eval_.feedback}>
                          <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {eval_.feedback}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ color: '#94A3B8' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      <Chip
                        label={eval_?.status === 'completed' ? 'Évaluée' : 'En attente'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          color: eval_?.status === 'completed' ? '#059669' : '#D97706',
                          bgcolor: eval_?.status === 'completed' ? '#ECFDF5' : '#FFFBEB',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Évaluer">
                        <IconButton
                          size="small"
                          onClick={() => handleEditEvaluation(p.employee_id, eval_?.score, eval_?.feedback)}
                          sx={{ color: '#8B5CF6' }}
                          disabled={training.status !== 'completed' && training.status !== 'archived'}
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Dialog Évaluation ── */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#8B5CF6', color: '#fff', fontWeight: 700 }}>
          Évaluation de la formation
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', mb: 1 }}>
                Score (0-100)
              </Typography>
              <Slider
                value={formScore}
                onChange={(_, v) => setFormScore(v as number)}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', mb: 1 }}>
                Évaluation visuelle ({(formScore / 20).toFixed(1)}/5)
              </Typography>
              <Rating value={formScore / 20} onChange={(_, v) => setFormScore((v ?? 0) * 20)} size="large" />
            </Box>

            <TextField
              label="Commentaires et observations"
              fullWidth
              multiline
              rows={4}
              size="small"
              value={formFeedback}
              onChange={(e) => setFormFeedback(e.target.value)}
              placeholder="Points forts, points à améliorer, remarques..."
            />

            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', p: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#065F46', mb: 1 }}>
                Résumé évaluation
              </Typography>
              <Stack spacing={0.5}>
                <Typography sx={{ fontSize: 11, color: '#065F46' }}>
                  • Score : <strong>{formScore}/100</strong>
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#065F46' }}>
                  • Étoiles : <strong>{(formScore / 20).toFixed(1)}/5</strong>
                </Typography>
                {formFeedback && (
                  <Typography sx={{ fontSize: 11, color: '#065F46' }}>
                    • Commentaire : <strong>{formFeedback.substring(0, 50)}...</strong>
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditTarget(null)}>Annuler</Button>
          <Button variant="contained" sx={{ bgcolor: '#8B5CF6' }} onClick={handleSaveEvaluation}
            disabled={evaluateMutation.isPending}>
            Enregistrer évaluation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
