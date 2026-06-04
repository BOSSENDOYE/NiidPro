import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Button, IconButton, Tooltip,
  Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Skeleton, Stack, Autocomplete, Select,
  LinearProgress, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, Flag, Person, AssignmentInd,
  CheckCircle, HourglassTop, RadioButtonUnchecked, Cancel, Warning, NotificationsActive,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { tasksApi, type Task } from '../../api/tasks';
import { employeesApi } from '../../api/employees';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/format';
import type { Employee } from '../../types';

// ─── Config statuts ───────────────────────────────────────────────────────────
const STATUS_CFG: Record<Task['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo:        { label: 'À faire',  color: '#64748B', bg: '#F1F5F9', icon: <RadioButtonUnchecked sx={{ fontSize: 13 }} /> },
  in_progress: { label: 'En cours', color: '#D97706', bg: '#FEF3C7', icon: <HourglassTop sx={{ fontSize: 13 }} /> },
  done:        { label: 'Terminé',  color: '#059669', bg: '#D1FAE5', icon: <CheckCircle sx={{ fontSize: 13 }} /> },
  cancelled:   { label: 'Annulé',   color: '#DC2626', bg: '#FEE2E2', icon: <Cancel sx={{ fontSize: 13 }} /> },
};

const COLUMNS: { key: Task['status']; label: string; color: string; bg: string }[] = [
  { key: 'todo',        label: 'À faire',  color: '#64748B', bg: '#F8FAFC' },
  { key: 'in_progress', label: 'En cours', color: '#D97706', bg: '#FFFBEB' },
  { key: 'done',        label: 'Terminé',  color: '#059669', bg: '#ECFDF5' },
  { key: 'cancelled',   label: 'Annulé',   color: '#DC2626', bg: '#FEF2F2' },
];

const PRIORITY: Record<Task['priority'], { label: string; color: string }> = {
  low:    { label: 'Faible',  color: '#64748B' },
  medium: { label: 'Moyen',   color: '#2563EB' },
  high:   { label: 'Élevé',   color: '#D97706' },
  urgent: { label: 'Urgent',  color: '#DC2626' },
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

function isSoonDue(task: Task): boolean {
  if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return false;
  const today = new Date(new Date().toDateString());
  const due   = new Date(task.due_date);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 && diff <= 2;
}

// ─── Carte tâche ─────────────────────────────────────────────────────────────
function TaskCard({
  task, onEdit, onDelete, onStatusChange,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: Task['status']) => void;
}) {
  const p    = PRIORITY[task.priority];
  const s    = STATUS_CFG[task.status];
  const late = isOverdue(task);
  const soon = !late && isSoonDue(task);

  return (
    <Card sx={{
      borderLeft: `3px solid ${s.color}`,
      transition: 'transform 150ms, box-shadow 150ms',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>

        {/* Ligne 1 : titre + actions */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flexGrow: 1, pr: 1, lineHeight: 1.4 }}>
            {task.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
            <Tooltip title="Modifier">
              <IconButton size="small" onClick={() => onEdit(task)} sx={{ p: 0.25 }}>
                <Edit sx={{ fontSize: 14, color: '#94A3B8' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Supprimer">
              <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.25 }}>
                <Delete sx={{ fontSize: 14, color: '#94A3B8' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Description */}
        {task.description && (
          <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1, lineHeight: 1.5 }} noWrap>
            {task.description}
          </Typography>
        )}

        {/* Alerte échéance proche */}
        {soon && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
            borderRadius: '6px', px: 1, py: 0.5, mb: 1,
          }}>
            <NotificationsActive sx={{ fontSize: 13, color: '#EA580C' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EA580C' }}>
              Échéance dans ≤ 2 jours !
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Statut actuel + sélecteur */}
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Suivi
          </Typography>
          <Select
            value={task.status}
            size="small"
            onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
            sx={{
              width: '100%', fontSize: 12, fontWeight: 700,
              color: s.color, bgcolor: s.bg,
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: `${s.color}40` },
              '& .MuiSelect-icon': { color: s.color },
            }}
            renderValue={(v) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {STATUS_CFG[v as Task['status']].icon}
                <span>{STATUS_CFG[v as Task['status']].label}</span>
              </Box>
            )}
          >
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <MenuItem key={key} value={key} sx={{ fontSize: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Priorité + Délai */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Flag sx={{ fontSize: 12, color: p.color }} />
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.label}</Typography>
          </Box>
          {task.due_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {late && <Warning sx={{ fontSize: 11, color: '#DC2626' }} />}
              {soon && !late && <NotificationsActive sx={{ fontSize: 11, color: '#EA580C' }} />}
              <Typography sx={{
                fontSize: 11,
                color: late ? '#DC2626' : soon ? '#EA580C' : '#94A3B8',
                fontWeight: (late || soon) ? 700 : 400,
              }}>
                {late ? 'En retard · ' : soon ? 'Bientôt · ' : '📅 '}{formatDate(task.due_date)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Attributeur / Destinataire */}
        {(task.creator || task.assignee) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, pt: 0.5, borderTop: '1px dashed #E2E8F0' }}>
            {task.creator && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AssignmentInd sx={{ fontSize: 11, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>
                  Par : <strong>{task.creator.name}</strong>
                </Typography>
              </Box>
            )}
            {task.assignee && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Person sx={{ fontSize: 11, color: '#2563EB' }} />
                <Typography sx={{ fontSize: 10.5, color: '#2563EB', fontWeight: 700 }}>
                  → {task.assignee.name}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TasksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask]     = useState<Task | null>(null);
  const [assignee, setAssignee]     = useState<Employee | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Task[];
    }),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ page: 1, per_page: 200 }).then((r) => r.data.data ?? []),
  });
  const employees: Employee[] = empData ?? [];

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
    setAssignee(null);
    setEditTask(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    reset({ title: t.title, description: t.description, status: t.status, priority: t.priority, due_date: t.due_date });
    setAssignee(t.assigned_to ? employees.find((e) => e.id === t.assigned_to) ?? null : null);
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditTask(null); setAssignee(null); reset({}); };

  const onSubmit = (data: Partial<Task>) => {
    const payload = { ...data, assigned_to: assignee?.id ?? undefined };
    if (editTask) updateMutation.mutate({ id: editTask.id, data: payload });
    else createMutation.mutate(payload);
  };

  // Statistiques suivi
  const total     = tasks.length;
  const done      = tasks.filter((t) => t.status === 'done').length;
  const inProg    = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue   = tasks.filter(isOverdue).length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Box>
      <PageHeader
        title="Gestion des Tâches"
        subtitle={`${total} tâche(s) · ${done} terminée(s) · ${inProg} en cours${overdue > 0 ? ` · ⚠️ ${overdue} en retard` : ''}`}
        action={{ label: 'Nouvelle tâche', icon: <Add />, onClick: openCreate }}
      />

      {/* ── Barre de progression globale ── */}
      {total > 0 && (
        <Box sx={{ mb: 3, p: 2.5, bgcolor: '#fff', borderRadius: '14px', border: '1px solid #E8EDF2' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              Avancement global
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: progress === 100 ? '#059669' : '#2563EB' }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate" value={progress}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: '#E2E8F0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: progress === 100 ? '#059669' : '#2563EB',
              },
            }}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => {
              const count = tasks.filter((t) => t.status === key).length;
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color }} />
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                    {cfg.label} <strong style={{ color: cfg.color }}>{count}</strong>
                  </Typography>
                </Box>
              );
            })}
            {overdue > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                <Warning sx={{ fontSize: 12, color: '#DC2626' }} />
                <Typography sx={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>
                  {overdue} en retard
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* ── Kanban ── */}
      <Grid container spacing={2.5}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <Grid item xs={12} sm={6} lg={3} key={col.key}>
              {/* En-tête colonne */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, px: 1,
                pb: 1.5, borderBottom: `2px solid ${col.color}30`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ color: col.color }}>{STATUS_CFG[col.key].icon}</Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                    {col.label}
                  </Typography>
                </Box>
                <Chip
                  label={colTasks.length}
                  size="small"
                  sx={{ ml: 'auto', height: 20, fontSize: 11, fontWeight: 800,
                    bgcolor: col.bg, color: col.color, border: `1px solid ${col.color}40` }}
                />
              </Box>

              {/* Cartes */}
              <Stack spacing={1.5}>
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i}><CardContent><Skeleton height={120} /></CardContent></Card>
                    ))
                  : colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={openEdit}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                      />
                    ))
                }
                {!isLoading && colTasks.length === 0 && (
                  <Box sx={{ border: '2px dashed #E2E8F0', borderRadius: '12px', py: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 12, color: '#CBD5E1' }}>Aucune tâche</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Dialog créer / modifier ── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" id="task-form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField {...register('title')} label="Titre *" fullWidth size="small" />
              <TextField {...register('description')} label="Description" fullWidth multiline rows={2} size="small" />

              {/* Destinataire */}
              <Autocomplete
                options={employees}
                getOptionLabel={(e) => `${e.employee_number} — ${e.first_name} ${e.last_name}`}
                value={assignee}
                onChange={(_, v) => setAssignee(v)}
                size="small"
                renderOption={(props, e) => {
                  const { key, ...optProps } = props as typeof props & { key: React.Key };
                  return (
                    <Box key={key} component="li" {...optProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#2563EB' }}>
                        {e.first_name?.[0]}{e.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{e.first_name} {e.last_name}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#64748B' }}>{e.employee_number} · {e.position?.title ?? '—'}</Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Destinataire (agent concerné)" placeholder="Sélectionner un agent…"
                    InputProps={{ ...params.InputProps, startAdornment: <><Person sx={{ fontSize: 16, color: '#94A3B8', mr: 0.5 }} />{params.InputProps.startAdornment}</> }}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller name="priority" control={control} render={({ field }) => (
                    <TextField {...field} select label="Priorité" fullWidth size="small" value={field.value ?? 'medium'}>
                      <MenuItem value="low">Faible</MenuItem>
                      <MenuItem value="medium">Moyen</MenuItem>
                      <MenuItem value="high">Élevé</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={6}>
                  <Controller name="status" control={control} render={({ field }) => (
                    <TextField {...field} select label="Statut" fullWidth size="small" value={field.value ?? 'todo'}>
                      {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                            <span style={{ fontSize: 13 }}>{cfg.label}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  )} />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    {...register('due_date')} label="Délai d'exécution"
                    type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} sx={{ color: '#64748B', textTransform: 'none' }}>Annuler</Button>
          <Button form="task-form" type="submit" variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>
            {editTask ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
