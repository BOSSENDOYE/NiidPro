import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, Stack, Chip, CircularProgress, Button, Divider,
} from '@mui/material';
import { Assignment, PlayArrow, CheckCircle } from '@mui/icons-material';
import { meApi, type MeTask } from '../../api/me';

const STATUS_META: Record<MeTask['status'], { label: string; color: string; bg: string }> = {
  todo:        { label: 'À faire',    color: '#64748B', bg: '#F1F5F9' },
  in_progress: { label: 'En cours',   color: '#2563EB', bg: '#EFF6FF' },
  done:        { label: 'Terminée',   color: '#059669', bg: '#ECFDF5' },
  cancelled:   { label: 'Annulée',    color: '#DC2626', bg: '#FEF2F2' },
};
const PRIORITY_META: Record<MeTask['priority'], { label: string; color: string }> = {
  low:    { label: 'Basse',   color: '#94A3B8' },
  medium: { label: 'Moyenne', color: '#2563EB' },
  high:   { label: 'Haute',   color: '#D97706' },
  urgent: { label: 'Urgente', color: '#DC2626' },
};

export default function PortalTasks() {
  const qc = useQueryClient();
  const { data: tasks, isLoading } = useQuery({ queryKey: ['me', 'tasks'], queryFn: () => meApi.tasks().then((r) => r.data) });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MeTask['status'] }) => meApi.updateTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'tasks'] }),
  });

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 0.5 }}>Mes tâches</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>Tâches qui vous ont été affectées.</Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={22} /></Box>
      ) : (tasks?.length ?? 0) === 0 ? (
        <Card sx={{ borderRadius: '16px', p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Assignment sx={{ fontSize: 40, color: 'divider', mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucune tâche affectée</Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {tasks!.map((t) => {
            const s = STATUS_META[t.status];
            const p = PRIORITY_META[t.priority];
            return (
              <Card key={t.id} sx={{ borderRadius: '14px', p: 2 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.title}</Typography>
                    {t.description && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{t.description}</Typography>}
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={s.label} sx={{ fontSize: 10, height: 20, bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                      <Chip size="small" label={p.label} variant="outlined" sx={{ fontSize: 10, height: 20, color: p.color, borderColor: p.color }} />
                      {t.due_date && <Chip size="small" label={`Échéance ${new Date(t.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`} sx={{ fontSize: 10, height: 20, bgcolor: '#FFFBEB', color: '#D97706' }} />}
                    </Stack>
                  </Box>
                </Stack>

                {(t.status === 'todo' || t.status === 'in_progress') && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {t.status === 'todo' && (
                        <Button size="small" startIcon={<PlayArrow />} disabled={statusMut.isPending}
                          onClick={() => statusMut.mutate({ id: t.id, status: 'in_progress' })}
                          sx={{ textTransform: 'none', fontWeight: 700, color: '#2563EB' }}>
                          Démarrer
                        </Button>
                      )}
                      <Button size="small" variant="contained" startIcon={<CheckCircle />} disabled={statusMut.isPending}
                        onClick={() => statusMut.mutate({ id: t.id, status: 'done' })}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '9px', bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                        Terminer
                      </Button>
                    </Stack>
                  </>
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
