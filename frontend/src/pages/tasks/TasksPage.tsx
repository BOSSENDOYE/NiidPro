import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Button, IconButton, Tooltip,
  Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Skeleton, Stack,
} from '@mui/material';
import { Add, Edit, Delete, Flag } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { tasksApi, type Task } from '../../api/tasks';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/format';

const COLUMNS: { key: Task['status']; label: string; color: string; bg: string }[] = [
  { key: 'todo',        label: 'À faire',      color: '#64748B', bg: '#F8FAFC' },
  { key: 'in_progress', label: 'En cours',     color: '#D97706', bg: '#FFFBEB' },
  { key: 'done',        label: 'Terminé',      color: '#059669', bg: '#ECFDF5' },
  { key: 'cancelled',   label: 'Annulé',       color: '#DC2626', bg: '#FEF2F2' },
];

const PRIORITY: Record<Task['priority'], { label: string; color: string }> = {
  low:    { label: 'Faible',  color: '#64748B' },
  medium: { label: 'Moyen',   color: '#2563EB' },
  high:   { label: 'Élevé',   color: '#D97706' },
  urgent: { label: 'Urgent',  color: '#DC2626' },
};

export default function TasksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { register, handleSubmit, control, reset } = useForm<Partial<Task>>({
    defaultValues: { status: 'todo', priority: 'medium' },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => tasksApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task['status'] }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const openCreate = () => {
    reset({ status: 'todo', priority: 'medium' });
    setEditTask(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    reset({ title: t.title, description: t.description, status: t.status, priority: t.priority, due_date: t.due_date });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditTask(null); reset({}); };

  const onSubmit = (data: Partial<Task>) => {
    if (editTask) updateMutation.mutate({ id: editTask.id, data });
    else createMutation.mutate(data);
  };

  return (
    <Box>
      <PageHeader
        title="Gestion des Tâches"
        subtitle={`${tasks?.length ?? 0} tâche(s) au total`}
        action={{ label: 'Nouvelle tâche', icon: <Add />, onClick: openCreate }}
      />

      {/* Kanban columns */}
      <Grid container spacing={2.5}>
        {COLUMNS.map((col) => {
          const colTasks = tasks?.filter((t) => t.status === col.key) ?? [];
          return (
            <Grid item xs={12} sm={6} lg={3} key={col.key}>
              {/* Column header */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
                px: 1,
              }}>
                <Box sx={{
                  width: 10, height: 10, borderRadius: '50%', bgcolor: col.color,
                }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                  {col.label}
                </Typography>
                <Box sx={{
                  ml: 'auto', px: 1, py: 0.25, borderRadius: '6px',
                  bgcolor: col.bg, border: `1px solid ${col.color}30`,
                }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: col.color }}>
                    {colTasks.length}
                  </Typography>
                </Box>
              </Box>

              {/* Task cards */}
              <Stack spacing={1.5}>
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i}><CardContent><Skeleton height={80} /></CardContent></Card>
                    ))
                  : colTasks.map((task) => {
                      const p = PRIORITY[task.priority];
                      return (
                        <Card
                          key={task.id}
                          sx={{
                            borderLeft: `3px solid ${col.color}`,
                            transition: 'transform 150ms, box-shadow 150ms',
                            '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A', flexGrow: 1, pr: 1 }}>
                                {task.title}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                                <Tooltip title="Modifier">
                                  <IconButton size="small" onClick={() => openEdit(task)} sx={{ p: 0.25 }}>
                                    <Edit sx={{ fontSize: 14, color: '#94A3B8' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer">
                                  <IconButton size="small" onClick={() => deleteMutation.mutate(task.id)} sx={{ p: 0.25 }}>
                                    <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>

                            {task.description && (
                              <Typography sx={{ fontSize: 12, color: '#64748B', mb: 1.5 }} noWrap>
                                {task.description}
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Flag sx={{ fontSize: 12, color: p.color }} />
                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: p.color }}>
                                  {p.label}
                                </Typography>
                              </Box>
                              {task.due_date && (
                                <Typography sx={{ fontSize: 11, color: '#94A3B8', ml: 'auto' }}>
                                  📅 {formatDate(task.due_date)}
                                </Typography>
                              )}
                            </Box>

                            {/* Move to next status */}
                            {col.key !== 'done' && col.key !== 'cancelled' && (
                              <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
                                {col.key === 'todo' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}
                                    sx={{ fontSize: 10, px: 1, py: 0.25, borderRadius: '6px', borderColor: '#E2E8F0', color: '#64748B' }}
                                  >
                                    Démarrer →
                                  </Button>
                                )}
                                {col.key === 'in_progress' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => statusMutation.mutate({ id: task.id, status: 'done' })}
                                    sx={{ fontSize: 10, px: 1, py: 0.25, borderRadius: '6px', borderColor: '#059669', color: '#059669' }}
                                  >
                                    Terminer ✓
                                  </Button>
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                {/* Empty state */}
                {!isLoading && colTasks.length === 0 && (
                  <Box sx={{
                    border: '2px dashed #E2E8F0', borderRadius: '12px',
                    py: 4, textAlign: 'center',
                  }}>
                    <Typography sx={{ fontSize: 12, color: '#CBD5E1' }}>Aucune tâche</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" id="task-form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField {...register('title')} label="Titre *" fullWidth />
              <TextField {...register('description')} label="Description" fullWidth multiline rows={3} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Priorité" fullWidth value={field.value ?? 'medium'}>
                        <MenuItem value="low">Faible</MenuItem>
                        <MenuItem value="medium">Moyen</MenuItem>
                        <MenuItem value="high">Élevé</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Statut" fullWidth value={field.value ?? 'todo'}>
                        <MenuItem value="todo">À faire</MenuItem>
                        <MenuItem value="in_progress">En cours</MenuItem>
                        <MenuItem value="done">Terminé</MenuItem>
                        <MenuItem value="cancelled">Annulé</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    {...register('due_date')}
                    label="Échéance"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} sx={{ color: '#64748B' }}>Annuler</Button>
          <Button form="task-form" type="submit" variant="contained">
            {editTask ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
