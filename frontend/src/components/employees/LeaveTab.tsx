import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Table, TableBody,
  TableCell, TableHead, TableRow, Skeleton, Avatar,
  InputAdornment, alpha, Divider, Autocomplete,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  EventBusy, CheckCircle, Cancel, HourglassBottom,
  Block, CalendarMonth, DescriptionOutlined,
  ThumbUp, ThumbDown, Notifications,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { leavesApi } from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';
import type { Leave, LeaveType, Employee } from '../../types';

/* ─────────────────────────── constantes ── */

const ACCENT = '#22C55E';

const MONTH_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.28)',   icon: <HourglassBottom sx={{ fontSize: 12 }} /> },
  approved:  { label: 'Approuvé',  color: '#059669', bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.28)',   icon: <CheckCircle sx={{ fontSize: 12 }} />     },
  rejected:  { label: 'Refusé',    color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.28)',   icon: <Cancel sx={{ fontSize: 12 }} />          },
  cancelled: { label: 'Annulé',    color: '#64748B', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.28)', icon: <Block sx={{ fontSize: 12 }} />           },
};

/* ─────────────────────────── helpers calendrier ── */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Retourne 0=Lundi … 6=Dimanche */
function firstWeekday(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isLeaveOnDate(leave: Leave, ds: string): boolean {
  return leave.start_date <= ds && leave.end_date >= ds;
}

/* ─────────────────────────── schéma form ── */

const schema = z.object({
  employee_id:   z.number({ required_error: 'Agent requis' }).min(1, 'Agent requis'),
  leave_type_id: z.number({ required_error: 'Type requis' }).min(1, 'Type requis'),
  start_date:    z.string().min(1, 'Date de début requise'),
  end_date:      z.string().min(1, 'Date de fin requise'),
  reason:        z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─────────────────────────── LeaveModal ── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  leave?: Leave;
  employees: Employee[];
  leaveTypes: LeaveType[];
}

function LeaveModal({ open, onClose, leave, employees, leaveTypes }: ModalProps) {
  const qc   = useQueryClient();
  const mode = leave ? 'edit' : 'create';

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: leave ? {
      employee_id:   leave.employee_id,
      leave_type_id: leave.leave_type_id,
      start_date:    leave.start_date,
      end_date:      leave.end_date,
      reason:        leave.reason ?? '',
    } : {},
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => leavesApi.create(d as Partial<Leave>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) => leavesApi.update(leave!.id, d as Partial<Leave>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); handleClose(); },
  });

  const mutation = mode === 'edit' ? updateMut : createMut;
  const mutError = mutation.error as { response?: { data?: { message?: string } } } | null;
  const handleClose = () => { reset(); onClose(); };

  const defaultEmp = leave ? (employees.find(e => e.id === leave.employee_id) ?? null) : null;

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '9px', fontSize: 13,
      '&:hover fieldset': { borderColor: ACCENT },
      '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 2 },
    },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.28)' } }}>

      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #14532D 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(34,197,94,0.18) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #16A34A)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <EventBusy sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouvelle demande de congé' : 'Modifier le congé'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Saisir les informations du congé' : `Congé #${leave?.id}`}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: '#F8FAFC' }}>
        {mutError && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: '9px', bgcolor: '#FFF1F2', border: '1px solid #FECDD3' }}>
            <Typography sx={{ fontSize: 12.5, color: '#BE123C' }}>
              {mutError.response?.data?.message ?? 'Une erreur est survenue'}
            </Typography>
          </Box>
        )}

        <Box component="form" id="leave-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container spacing={2}>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Agent
              </Typography>
              <Controller name="employee_id" control={control} render={({ field }) => (
                <Autocomplete
                  options={employees}
                  defaultValue={defaultEmp}
                  getOptionLabel={emp => `${emp.first_name} ${emp.last_name} — ${emp.employee_number}`}
                  filterOptions={(opts, { inputValue }) => {
                    const q = inputValue.toLowerCase();
                    return opts.filter(e =>
                      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                      e.employee_number.toLowerCase().includes(q) ||
                      (e.department?.name ?? '').toLowerCase().includes(q)
                    );
                  }}
                  onChange={(_, val) => field.onChange(val ? val.id : null)}
                  noOptionsText="Aucun agent trouvé"
                  renderOption={(props, emp) => (
                    <Box component="li" {...props} sx={{ py: '8px !important' }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 800,
                          background: 'linear-gradient(135deg,#2563EB,#7C3AED)', flexShrink: 0 }}>
                          {emp.first_name[0]}{emp.last_name[0]}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: '#0F172A' }}>
                            {emp.first_name} {emp.last_name}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                            {emp.employee_number}{emp.department?.name ? ` · ${emp.department.name}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={params => (
                    <TextField {...params} size="small"
                      placeholder="Taper un nom ou un matricule…"
                      error={!!errors.employee_id}
                      helperText={errors.employee_id?.message}
                      sx={inputSx}
                    />
                  )}
                  slotProps={{ paper: { sx: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(15,23,42,0.14)', border: '1px solid #E2E8F0', mt: 0.5 } } }}
                />
              )} />
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Type de congé
              </Typography>
              <Controller name="leave_type_id" control={control} render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.leave_type_id}>
                  <Select {...field} value={field.value ?? ''} onChange={e => field.onChange(Number(e.target.value))}
                    displayEmpty
                    renderValue={val => {
                      if (!val) return <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Sélectionner un type…</Typography>;
                      const lt = leaveTypes.find(t => t.id === val);
                      return lt ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: lt.color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 13 }}>{lt.name}</Typography>
                          {lt.paid && <Chip label="Payé" size="small" sx={{ height: 16, fontSize: 10, fontWeight: 700, color: '#059669', bgcolor: 'rgba(5,150,105,0.1)' }} />}
                        </Stack>
                      ) : val;
                    }}
                    sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}>
                    {leaveTypes.map(lt => (
                      <MenuItem key={lt.id} value={lt.id} sx={{ fontSize: 13 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: lt.color, flexShrink: 0 }} />
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{lt.name}</Typography>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              {lt.paid && <Typography sx={{ fontSize: 10.5, color: '#059669', fontWeight: 600 }}>Payé</Typography>}
                              {lt.max_days_per_year && <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>· max {lt.max_days_per_year}j/an</Typography>}
                            </Stack>
                          </Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.leave_type_id && <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.3 }}>{errors.leave_type_id.message}</Typography>}
                </FormControl>
              )} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Date de début
              </Typography>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                {...register('start_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.start_date} helperText={errors.start_date?.message} sx={inputSx}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Date de fin
              </Typography>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                {...register('end_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.end_date} helperText={errors.end_date?.message} sx={inputSx}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Motif <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" multiline rows={2}
                {...register('reason')}
                placeholder="Raison de la demande…"
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><DescriptionOutlined sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600,
            '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' } }}>
          Annuler
        </Button>
        <Button type="submit" form="leave-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #16A34A)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#16A34A,#15803D)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Soumettre la demande' : 'Enregistrer'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────── CommentDialog ── */

function CommentDialog({ title, accentColor, onConfirm, onCancel }: {
  title: string; accentColor: string;
  onConfirm: (comment: string) => void; onCancel: () => void;
}) {
  const [comment, setComment] = useState('');
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: `linear-gradient(135deg,#0F172A,${accentColor}88)`, px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{title}</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <TextField fullWidth multiline rows={2} size="small"
          placeholder="Commentaire (optionnel)…"
          value={comment} onChange={e => setComment(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 13 } }}
        />
      </Box>
      <Box sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13 }}>Annuler</Button>
        <Button onClick={() => onConfirm(comment)} variant="contained" size="small"
          sx={{ borderRadius: '9px', fontSize: 13, fontWeight: 700, bgcolor: accentColor,
            '&:hover': { bgcolor: accentColor, filter: 'brightness(0.9)' } }}>Confirmer</Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────── DeleteDialog ── */

function DeleteDialog({ leave, onConfirm, onCancel }: { leave: Leave; onConfirm: () => void; onCancel: () => void }) {
  const emp = leave.employee;
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer le congé</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Supprimer la demande de congé de&nbsp;
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `#${leave.id}`}
          </Box>&nbsp;?
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '9px', bgcolor: '#FFF1F2', border: '1px solid #FECDD3' }}>
          <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
            {formatDate(leave.start_date)} → {formatDate(leave.end_date)} · {leave.days_count}j
          </Typography>
        </Box>
      </Box>
      <Box sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13 }}>Annuler</Button>
        <Button onClick={onConfirm} variant="contained" color="error" size="small"
          sx={{ borderRadius: '9px', fontSize: 13, fontWeight: 700 }}>Supprimer</Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────── LeaveCalendar ── */

interface CalendarProps {
  leaves: Leave[];
  leaveTypes: LeaveType[];
  year: number;
  month: number;
  onEditLeave: (l: Leave) => void;
}

export function LeaveCalendar({ leaves, leaveTypes, year, month, onEditLeave }: CalendarProps) {
  const today = new Date();
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const daysCount  = getDaysInMonth(year, month);
  const startWday  = firstWeekday(year, month); // 0=Lun…6=Dim

  /* toutes les cellules (vides en début + jours du mois) */
  const cells = useMemo(() => {
    const result: Array<{ day: number | null; ds: string | null }> = [];
    for (let i = 0; i < startWday; i++) result.push({ day: null, ds: null });
    for (let d = 1; d <= daysCount; d++) result.push({ day: d, ds: dateStr(year, month, d) });
    return result;
  }, [year, month, daysCount, startWday]);

  /* grouper les congés approuvés + en attente par date */
  const leavesByDate = useMemo(() => {
    const map: Record<string, Leave[]> = {};
    leaves.forEach(lv => {
      if (lv.status === 'rejected' || lv.status === 'cancelled') return;
      for (let d = 1; d <= daysCount; d++) {
        const ds = dateStr(year, month, d);
        if (isLeaveOnDate(lv, ds)) {
          if (!map[ds]) map[ds] = [];
          map[ds].push(lv);
        }
      }
    });
    return map;
  }, [leaves, year, month, daysCount]);

  const MAX_VISIBLE = 3;

  /* ── Légende types ── */
  const activeTypes = leaveTypes.filter(lt =>
    leaves.some(lv => lv.leave_type_id === lt.id && (lv.status === 'approved' || lv.status === 'pending'))
  );

  return (
    <Box>
      {/* Légende */}
      {activeTypes.length > 0 && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" px={2} pb={1.5} pt={0.5}>
          {activeTypes.map(lt => (
            <Stack key={lt.id} direction="row" alignItems="center" spacing={0.6}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: lt.color }} />
              <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{lt.name}</Typography>
            </Stack>
          ))}
          <Stack direction="row" alignItems="center" spacing={0.6}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#D97706', opacity: 0.5, border: '1px dashed #D97706' }} />
            <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>En attente</Typography>
          </Stack>
        </Stack>
      )}

      {/* Grille 7 colonnes */}
      <Box sx={{ px: 1.5, pb: 2 }}>
        {/* En-têtes jours */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', mb: '3px' }}>
          {DAY_LABELS.map((dl, i) => (
            <Box key={dl} sx={{
              py: 0.75, textAlign: 'center', borderRadius: '7px',
              bgcolor: i >= 5 ? 'rgba(148,163,184,0.12)' : 'transparent',
            }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: i >= 5 ? '#94A3B8' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dl}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Cellules */}
        {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, rowIdx) => (
          <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', mb: '3px' }}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell, colIdx) => {
              const globalIdx = rowIdx * 7 + colIdx;
              if (!cell.day || !cell.ds) {
                return <Box key={globalIdx} sx={{ height: 90, borderRadius: '8px', bgcolor: '#F8FAFC' }} />;
              }
              const isToday    = cell.ds === todayStr;
              const isWeekend  = (startWday + cell.day - 1) % 7 >= 5;
              const dayLeaves  = leavesByDate[cell.ds] ?? [];
              const visible    = dayLeaves.slice(0, MAX_VISIBLE);
              const overflow   = dayLeaves.length - MAX_VISIBLE;

              return (
                <Box key={cell.day} sx={{
                  height: 90, borderRadius: '8px', overflow: 'hidden',
                  border: isToday ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                  bgcolor: isWeekend ? '#F8FAFC' : '#fff',
                  display: 'flex', flexDirection: 'column', p: '5px 6px 4px',
                  position: 'relative',
                  transition: 'box-shadow 0.15s',
                  '&:hover': { boxShadow: '0 2px 8px rgba(15,23,42,0.10)' },
                }}>
                  {/* Numéro du jour */}
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '6px', mb: 0.5, flexShrink: 0,
                    bgcolor: isToday ? '#3B82F6' : 'transparent',
                  }}>
                    <Typography sx={{
                      fontSize: 12, fontWeight: isToday ? 800 : 600,
                      color: isToday ? '#fff' : isWeekend ? '#94A3B8' : '#1E293B',
                      lineHeight: 1,
                    }}>
                      {cell.day}
                    </Typography>
                  </Box>

                  {/* Barres de congé */}
                  <Stack spacing="2px" sx={{ overflow: 'hidden', flex: 1 }}>
                    {visible.map(lv => {
                      const emp = lv.employee;
                      const lt  = leaveTypes.find(t => t.id === lv.leave_type_id);
                      const color = lt?.color ?? '#64748B';
                      const isPending = lv.status === 'pending';
                      return (
                        <Tooltip
                          key={lv.id}
                          arrow
                          title={
                            <Box>
                              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                                {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${lv.employee_id}`}
                              </Typography>
                              <Typography sx={{ fontSize: 11, opacity: 0.8 }}>
                                {lt?.name} · {lv.days_count}j · {STATUS_META[lv.status]?.label}
                              </Typography>
                              {lv.reason && <Typography sx={{ fontSize: 11, opacity: 0.7, fontStyle: 'italic' }}>"{lv.reason}"</Typography>}
                            </Box>
                          }
                        >
                          <Box
                            onClick={() => onEditLeave(lv)}
                            sx={{
                              px: '5px', py: '1px', borderRadius: '4px',
                              bgcolor: isPending ? 'transparent' : alpha(color, 0.18),
                              border: isPending ? `1px dashed ${alpha(color, 0.6)}` : `1px solid ${alpha(color, 0.25)}`,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              overflow: 'hidden',
                              '&:hover': { bgcolor: alpha(color, isPending ? 0.08 : 0.28) },
                            }}
                          >
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                            <Typography sx={{
                              fontSize: 10, fontWeight: 600,
                              color: isPending ? alpha(color, 0.8) : color,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              lineHeight: 1.3,
                            }}>
                              {emp ? `${emp.first_name[0]}. ${emp.last_name}` : `#${lv.employee_id}`}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                    {overflow > 0 && (
                      <Typography sx={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, lineHeight: 1.2, pl: '5px' }}>
                        +{overflow} autre{overflow > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ─────────────────────────── LeaveTab (principal) ── */

export default function LeaveTab() {
  const qc = useQueryClient();

  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter]   = useState<Leave['status'] | 'all'>('all');
  const [modalOpen, setModalOpen]         = useState(false);
  const [editLeave, setEditLeave]         = useState<Leave | undefined>(undefined);
  const [deleteTarget, setDeleteTarget]   = useState<Leave | null>(null);
  const [approveTarget, setApproveTarget] = useState<Leave | null>(null);
  const [rejectTarget, setRejectTarget]   = useState<Leave | null>(null);

  /* ── Données ── */
  const { data: leaves = [], isLoading, refetch } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then(r => r.data),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leavesApi.types().then(r => r.data),
  });

  const { data: rawEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r => {
      const d = r.data as unknown;
      if (Array.isArray(d)) return d as Employee[];
      return (d as { data?: Employee[] }).data ?? [];
    }),
  });
  const employees = (rawEmployees ?? []) as Employee[];

  /* ── Mutations ── */
  const deleteMut = useMutation({
    mutationFn: (id: number) => leavesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setDeleteTarget(null); },
  });
  const approveMut = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.approve(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setApproveTarget(null); },
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => leavesApi.reject(id, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setRejectTarget(null); },
  });

  const openCreate = () => { setEditLeave(undefined); setModalOpen(true); };
  const openEdit   = (l: Leave) => { setEditLeave(l); setModalOpen(true); };

  /* ── Filtrage table ── */
  const filtered = leaves.filter(l => {
    const emp = l.employee;
    const q   = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q)) ||
      (emp?.employee_number?.toLowerCase().includes(q));
    const matchType   = typeFilter === 'all' || l.leave_type_id === typeFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const pending = leaves.filter(l => l.status === 'pending');
  const counts  = {
    pending:   pending.length,
    approved:  leaves.filter(l => l.status === 'approved').length,
    rejected:  leaves.filter(l => l.status === 'rejected').length,
    cancelled: leaves.filter(l => l.status === 'cancelled').length,
  };

  return (
    <>
      {/* ════ SUPERVISEUR — DEMANDES EN ATTENTE ════ */}
      {pending.length > 0 && (
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Box sx={{
            borderRadius: '14px', border: '1.5px solid rgba(217,119,6,0.3)',
            bgcolor: '#FFFBEB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(217,119,6,0.08)',
          }}>
            <Box sx={{ px: 2.5, py: 1.5, background: 'linear-gradient(135deg,#78350F 0%,#B45309 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Notifications sx={{ color: '#FDE68A', fontSize: 17 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: '#FEF3C7', fontWeight: 800, fontSize: 13.5, letterSpacing: '-0.2px' }}>
                    Demandes en attente d'approbation
                  </Typography>
                  <Typography sx={{ color: 'rgba(254,243,199,0.65)', fontSize: 11 }}>
                    {pending.length} demande{pending.length > 1 ? 's' : ''} nécessite{pending.length === 1 ? '' : 'nt'} votre décision
                  </Typography>
                </Box>
              </Stack>
              <Chip label={pending.length} size="small"
                sx={{ bgcolor: '#F97316', color: '#fff', fontWeight: 800, fontSize: 12,
                  height: 24, minWidth: 24, boxShadow: '0 2px 8px rgba(249,115,22,0.5)' }} />
            </Box>

            <Stack spacing={0} divider={<Divider sx={{ borderColor: 'rgba(217,119,6,0.15)' }} />}>
              {pending.map(leave => {
                const emp = leave.employee;
                const lt  = leave.leaveType;
                const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                return (
                  <Box key={leave.id} sx={{
                    px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                    '&:hover': { bgcolor: 'rgba(217,119,6,0.04)' }, transition: 'background 0.15s',
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 180 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 800,
                        background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', boxShadow: '0 3px 8px rgba(37,99,235,0.3)' }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400E', lineHeight: 1.2 }}>
                          {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${leave.employee_id}`}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: '#B45309', fontFamily: 'monospace' }}>
                          {emp?.employee_number ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                      {lt && <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: lt.color, flexShrink: 0 }} />}
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#78350F' }}>{lt?.name ?? '—'}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#B45309' }}>
                        · {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </Typography>
                      <Chip label={`${leave.days_count}j`} size="small"
                        sx={{ height: 18, fontSize: 10.5, fontWeight: 800, color: '#92400E',
                          bgcolor: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }} />
                    </Stack>
                    {leave.reason && (
                      <Tooltip title={leave.reason} arrow>
                        <Typography sx={{ fontSize: 11.5, color: '#B45309', fontStyle: 'italic',
                          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>
                          "{leave.reason}"
                        </Typography>
                      </Tooltip>
                    )}
                    <Stack direction="row" spacing={0.75} sx={{ ml: 'auto', flexShrink: 0 }}>
                      <Button size="small" variant="contained" startIcon={<ThumbUp sx={{ fontSize: '13px !important' }} />}
                        onClick={() => setApproveTarget(leave)}
                        sx={{ bgcolor: '#16A34A', fontSize: 12, fontWeight: 700, borderRadius: '8px', px: 1.75,
                          boxShadow: '0 3px 8px rgba(22,163,74,0.35)',
                          '&:hover': { bgcolor: '#15803D', transform: 'translateY(-1px)' }, transition: 'all 0.15s' }}>
                        Approuver
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<ThumbDown sx={{ fontSize: '13px !important' }} />}
                        onClick={() => setRejectTarget(leave)}
                        sx={{ borderColor: '#DC2626', color: '#DC2626', fontSize: 12, fontWeight: 700,
                          borderRadius: '8px', px: 1.75,
                          '&:hover': { bgcolor: '#FFF1F2', borderColor: '#B91C1C', transform: 'translateY(-1px)' },
                          transition: 'all 0.15s' }}>
                        Refuser
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}

      {/* ════ EN-TÊTE VUE LISTE ════ */}
      <Box sx={{
        px: 2, py: 1.25, mt: pending.length > 0 ? 2 : 0,
        background: 'linear-gradient(135deg, #0F172A 0%, #14532D 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(34,197,94,0.14) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 34, height: 34, borderRadius: '9px',
              background: `linear-gradient(135deg, ${ACCENT}, #16A34A)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}` }}>
              <EventBusy sx={{ color: '#fff', fontSize: 17 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14.5 }}>Congés — Vue liste</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>{leaves.length} demande{leaves.length > 1 ? 's' : ''} au total</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { color: ACCENT, bgcolor: 'rgba(34,197,94,0.1)', borderColor: alpha(ACCENT, 0.4) } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<Add sx={{ fontSize: '15px !important' }} />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #16A34A)`,
                color: '#fff', fontWeight: 700, fontSize: 12,
                borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.5)}`,
                '&:hover': { background: 'linear-gradient(135deg,#16A34A,#15803D)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}>
              Nouvelle demande
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Compteurs ── */}
      <Stack direction="row" alignItems="center" px={2.5} py={0.875}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {[
            { color: '#D97706', count: counts.pending,   label: 'En attente' },
            { color: '#059669', count: counts.approved,  label: 'Approuvés'  },
            { color: '#DC2626', count: counts.rejected,  label: 'Refusés'    },
            { color: '#64748B', count: counts.cancelled, label: 'Annulés'    },
          ].map(({ color, count, label }) => (
            <Stack key={label} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                {label}&nbsp;<Box component="span" sx={{ fontWeight: 800, color }}>{count}</Box>
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      {/* ════ CONTENU PRINCIPAL ════ */}
      {isLoading ? (
        <Box sx={{ p: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={48} sx={{ mb: 0.5, borderRadius: '8px' }} />
          ))}
        </Box>
      ) : (
        /* ── Vue liste ── */
        <>
          {/* Barre filtres liste */}
          <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0',
            background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField placeholder="Rechercher un agent…" size="small" value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ bgcolor: '#fff', width: 220 }}
                InputProps={{ sx: { fontSize: 12 },
                  startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
              />
              <FormControl size="small" sx={{ minWidth: 160, bgcolor: '#fff' }}>
                <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as number | 'all')}
                  displayEmpty sx={{ fontSize: 12, borderRadius: '8px' }}
                  renderValue={val => {
                    if (val === 'all') return <Typography sx={{ fontSize: 12, color: '#64748B' }}>Tous les types</Typography>;
                    const lt = leaveTypes.find(t => t.id === val);
                    return lt ? (
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: lt.color }} />
                        <Typography sx={{ fontSize: 12 }}>{lt.name}</Typography>
                      </Stack>
                    ) : val;
                  }}>
                  <MenuItem value="all" sx={{ fontSize: 12 }}>Tous les types</MenuItem>
                  {leaveTypes.map(lt => (
                    <MenuItem key={lt.id} value={lt.id} sx={{ fontSize: 12 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: lt.color }} />
                        <Typography sx={{ fontSize: 12 }}>{lt.name}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
                {([
                  ['all', 'Tous', '#475569'],
                  ['pending', 'En attente', '#D97706'],
                  ['approved', 'Approuvés', '#059669'],
                  ['rejected', 'Refusés', '#DC2626'],
                  ['cancelled', 'Annulés', '#64748B'],
                ] as const).map(([val, lbl, clr]) => (
                  <Box key={val} onClick={() => setStatusFilter(val as Leave['status'] | 'all')}
                    sx={{
                      px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      bgcolor: statusFilter === val ? clr : 'transparent',
                      color: statusFilter === val ? '#fff' : clr,
                      transition: 'all .15s',
                      '&:hover': { bgcolor: statusFilter === val ? clr : `${clr}18` },
                    }}>
                    {lbl}
                  </Box>
                ))}
              </Stack>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ bgcolor: '#F1F5F9', minHeight: 300, p: 2 }}>
            {filtered.length === 0 ? (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Stack alignItems="center" spacing={2}>
                  <Box sx={{ width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
                    <EventBusy sx={{ fontSize: 36, color: '#CBD5E1' }} />
                  </Box>
                  <Box textAlign="center">
                    <Typography fontWeight={700} color="text.secondary" fontSize={15}>Aucun congé trouvé</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {leaves.length === 0 ? 'Créez la première demande' : 'Modifiez vos critères de recherche'}
                    </Typography>
                  </Box>
                  {leaves.length === 0 && (
                    <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={openCreate}
                      sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600, borderColor: ACCENT, color: ACCENT }}>
                      Nouvelle demande
                    </Button>
                  )}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['Agent', 'Type de congé', 'Début', 'Fin', 'Durée', 'Motif', 'Statut', 'Actions'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '2px solid #E2E8F0', py: 1.25, px: 2 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((leave, idx) => {
                      const emp      = leave.employee;
                      const lt       = leave.leaveType;
                      const smeta    = STATUS_META[leave.status] ?? STATUS_META.pending;
                      const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                      const isPending = leave.status === 'pending';
                      return (
                        <TableRow key={leave.id} sx={{
                          bgcolor: idx % 2 === 0 ? '#fff' : '#FAFBFC',
                          '&:hover': { bgcolor: '#F0FDF4' }, '&:last-child td': { border: 0 },
                          transition: 'background 0.15s',
                        }}>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Avatar sx={{ width: 34, height: 34, fontSize: 12.5, fontWeight: 800,
                                background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', boxShadow: '0 3px 10px rgba(37,99,235,0.25)' }}>
                                {initials}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                                  {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${leave.employee_id}`}
                                </Typography>
                                {emp?.employee_number && (
                                  <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                                    {emp.employee_number}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            {lt ? (
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: lt.color, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{lt.name}</Typography>
                                {lt.paid && <Chip label="Payé" size="small" sx={{ height: 16, fontSize: 9.5, fontWeight: 700, color: '#059669', bgcolor: 'rgba(5,150,105,0.09)', border: '1px solid rgba(5,150,105,0.2)' }} />}
                              </Stack>
                            ) : <Typography sx={{ fontSize: 12.5, color: '#94A3B8' }}>—</Typography>}
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{formatDate(leave.start_date)}</Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{formatDate(leave.end_date)}</Typography>
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Chip label={`${leave.days_count}j`} size="small"
                              sx={{ height: 20, fontSize: 11, fontWeight: 800, color: '#1E40AF', bgcolor: 'rgba(37,99,235,0.09)', border: '1px solid rgba(37,99,235,0.2)' }} />
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9', maxWidth: 160 }}>
                            {leave.reason ? (
                              <Tooltip title={leave.reason} arrow>
                                <Typography sx={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, cursor: 'default' }}>
                                  {leave.reason}
                                </Typography>
                              </Tooltip>
                            ) : <Typography sx={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' }}>—</Typography>}
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Chip
                              icon={<Box sx={{ display: 'flex', alignItems: 'center', color: `${smeta.color} !important` }}>{smeta.icon}</Box>}
                              label={smeta.label} size="small"
                              sx={{ height: 22, fontSize: 11, fontWeight: 700, color: smeta.color, bgcolor: smeta.bg, border: `1px solid ${smeta.border}` }} />
                          </TableCell>
                          <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                            <Stack direction="row" spacing={0.5}>
                              {isPending && (
                                <>
                                  <Tooltip title="Approuver" arrow>
                                    <IconButton size="small" onClick={() => setApproveTarget(leave)}
                                      sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#F0FDF4', color: '#16A34A',
                                        '&:hover': { bgcolor: '#DCFCE7', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                      <ThumbUp sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Refuser" arrow>
                                    <IconButton size="small" onClick={() => setRejectTarget(leave)}
                                      sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF1F2', color: '#DC2626',
                                        '&:hover': { bgcolor: '#FFE4E6', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                      <ThumbDown sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              <Tooltip title="Modifier" arrow>
                                <IconButton size="small" onClick={() => openEdit(leave)}
                                  sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF7ED', color: '#F97316',
                                    '&:hover': { bgcolor: '#FED7AA', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Edit sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer" arrow>
                                <IconButton size="small" onClick={() => setDeleteTarget(leave)}
                                  sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF1F2', color: '#E11D48',
                                    '&:hover': { bgcolor: '#FFE4E6', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Delete sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* ── Dialogs ── */}
      {modalOpen && (
        <LeaveModal open={modalOpen} onClose={() => setModalOpen(false)}
          leave={editLeave} employees={employees} leaveTypes={leaveTypes} />
      )}
      {deleteTarget && (
        <DeleteDialog leave={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
      {approveTarget && (
        <CommentDialog title="Approuver la demande de congé" accentColor="#16A34A"
          onConfirm={comment => approveMut.mutate({ id: approveTarget.id, comment })}
          onCancel={() => setApproveTarget(null)} />
      )}
      {rejectTarget && (
        <CommentDialog title="Refuser la demande de congé" accentColor="#DC2626"
          onConfirm={comment => rejectMut.mutate({ id: rejectTarget.id, comment })}
          onCancel={() => setRejectTarget(null)} />
      )}
    </>
  );
}
