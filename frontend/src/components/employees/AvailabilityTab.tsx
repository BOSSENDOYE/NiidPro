import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Table, TableBody,
  TableCell, TableHead, TableRow, Skeleton, Avatar,
  InputAdornment, alpha, Autocomplete, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  AccessTime, CheckCircle, HourglassBottom,
  Block, CalendarMonth, DescriptionOutlined, LocationOn,
  ChevronLeft, ChevronRight, CalendarViewMonth, ViewList,
  Wifi, FlightTakeoff, School, SwapHoriz, Person, Gavel,
  ThumbUp,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { availabilitiesApi } from '../../api/availabilities';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';
import type { Availability, Employee } from '../../types';

/* ─────────────────────── constantes ── */

const ACCENT = '#06B6D4';

const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_LABELS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const TYPE_META: Record<Availability['type'], { label: string; color: string; icon: React.ReactNode }> = {
  remote:      { label: 'Télétravail',           color: '#06B6D4', icon: <Wifi sx={{ fontSize: 13 }} /> },
  mission:     { label: 'Mission externe',        color: '#F97316', icon: <FlightTakeoff sx={{ fontSize: 13 }} /> },
  training:    { label: 'Formation',              color: '#A855F7', icon: <School sx={{ fontSize: 13 }} /> },
  secondment:  { label: 'Détachement',            color: '#14B8A6', icon: <SwapHoriz sx={{ fontSize: 13 }} /> },
  personal:    { label: 'Disponibilité perso.',   color: '#64748B', icon: <Person sx={{ fontSize: 13 }} /> },
  suspension:  { label: 'Suspension admin.',      color: '#DC2626', icon: <Gavel sx={{ fontSize: 13 }} /> },
};

const STATUS_META: Record<Availability['status'], { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.28)',   icon: <HourglassBottom sx={{ fontSize: 12 }} /> },
  approved:  { label: 'Approuvé',  color: '#059669', bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.28)',   icon: <CheckCircle sx={{ fontSize: 12 }} /> },
  active:    { label: 'En cours',  color: '#06B6D4', bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.28)',   icon: <AccessTime sx={{ fontSize: 12 }} /> },
  ended:     { label: 'Terminé',   color: '#64748B', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.28)', icon: <CheckCircle sx={{ fontSize: 12 }} /> },
  cancelled: { label: 'Annulé',   color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.28)',   icon: <Block sx={{ fontSize: 12 }} /> },
};

/* ─────────────────────── helpers calendrier ── */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstWeekday(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function isAvailabilityOnDate(av: Availability, ds: string): boolean {
  return av.start_date <= ds && av.end_date >= ds;
}

/* ─────────────────────── schéma ── */

const schema = z.object({
  employee_id:  z.number().min(1),
  type:         z.enum(['remote','mission','training','secondment','personal','suspension']),
  start_date:   z.string().min(1, 'Date de début requise'),
  end_date:     z.string().min(1, 'Date de fin requise'),
  location:     z.string().optional(),
  description:  z.string().optional(),
  status:       z.enum(['pending','approved','active','ended','cancelled']),
  approved_by:  z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─────────────────────── Modal ── */

function AvailabilityModal({ open, onClose, availability, employees }: {
  open: boolean; onClose: () => void; availability?: Availability; employees: Employee[];
}) {
  const qc   = useQueryClient();
  const mode = availability ? 'edit' : 'create';

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: availability ? {
      employee_id: availability.employee_id,
      type:        availability.type,
      start_date:  availability.start_date,
      end_date:    availability.end_date,
      location:    availability.location ?? '',
      description: availability.description ?? '',
      status:      availability.status,
      approved_by: availability.approved_by ?? '',
    } : { status: 'pending', type: 'remote' },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => availabilitiesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availabilities'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) => availabilitiesApi.update(availability!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availabilities'] }); handleClose(); },
  });

  const mutation  = mode === 'edit' ? updateMut : createMut;
  const mutError  = mutation.error as { response?: { data?: { message?: string } } } | null;
  const handleClose = () => { reset(); onClose(); };

  const watchType = watch('type');
  const typeColor = TYPE_META[watchType]?.color ?? ACCENT;
  const defaultEmp = availability ? (employees.find(e => e.id === availability.employee_id) ?? null) : null;

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '9px', fontSize: 13,
      '&:hover fieldset': { borderColor: typeColor },
      '&.Mui-focused fieldset': { borderColor: typeColor, borderWidth: 2 },
    },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.28)' } }}>

      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #164E63 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(6,182,212,0.18) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #0891B2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <AccessTime sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouvelle disponibilité' : 'Modifier la disponibilité'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Enregistrer un statut de disponibilité' : `#${availability?.id} · ${TYPE_META[availability?.type ?? 'remote']?.label}`}
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
        <Box component="form" id="avail-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container spacing={2}>

            {/* Agent */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Agent</Typography>
              <Controller name="employee_id" control={control} render={({ field }) => (
                <Autocomplete
                  options={employees} defaultValue={defaultEmp}
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
                  renderOption={(props, emp) => {
                    const { key, ...optProps } = props as typeof props & { key: React.Key };
                    return (
                    <Box key={key} component="li" {...optProps} sx={{ py: '8px !important' }}>
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
                    );
                  }}
                  renderInput={params => (
                    <TextField {...params} size="small" placeholder="Taper un nom ou un matricule…"
                      error={!!errors.employee_id} helperText={errors.employee_id?.message} sx={inputSx} />
                  )}
                  slotProps={{ paper: { sx: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(15,23,42,0.14)', border: '1px solid #E2E8F0', mt: 0.5 } } }}
                />
              )} />
            </Grid>

            {/* Type */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Type</Typography>
              <Controller name="type" control={control} render={({ field }) => (
                <FormControl fullWidth size="small">
                  <Select {...field} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    renderValue={val => {
                      const tm = TYPE_META[val as Availability['type']];
                      return tm ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ color: tm.color, display: 'flex' }}>{tm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{tm.label}</Typography>
                        </Stack>
                      ) : val;
                    }}>
                    {Object.entries(TYPE_META).map(([k, tm]) => (
                      <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ color: tm.color, display: 'flex' }}>{tm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{tm.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Statut</Typography>
              <Controller name="status" control={control} render={({ field }) => (
                <FormControl fullWidth size="small">
                  <Select {...field} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    renderValue={val => {
                      const sm = STATUS_META[val as Availability['status']];
                      return sm ? (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Box sx={{ color: sm.color, display: 'flex' }}>{sm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{sm.label}</Typography>
                        </Stack>
                      ) : val;
                    }}>
                    {Object.entries(STATUS_META).map(([k, sm]) => (
                      <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ color: sm.color, display: 'flex' }}>{sm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{sm.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Début</Typography>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                {...register('start_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.start_date} helperText={errors.start_date?.message} sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Fin</Typography>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                {...register('end_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.end_date} helperText={errors.end_date?.message} sx={inputSx}
              />
            </Grid>

            {/* Lieu */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Lieu / Organisme <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" {...register('location')}
                placeholder="Ex : Centre de formation ENSP, Mission à Dakar…"
                InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>

            {/* Approuvé par */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Approuvé par <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" {...register('approved_by')}
                placeholder="Nom du responsable…"
                InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Description <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" multiline rows={2} {...register('description')}
                placeholder="Détails complémentaires…"
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><DescriptionOutlined sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600 }}>
          Annuler
        </Button>
        <Button type="submit" form="avail-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #0891B2)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#0891B2,#0E7490)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────── DeleteDialog ── */

function DeleteDialog({ availability, onConfirm, onCancel }: {
  availability: Availability; onConfirm: () => void; onCancel: () => void;
}) {
  const emp = availability.employee;
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer la disponibilité</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Supprimer la disponibilité de&nbsp;
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `#${availability.employee_id}`}
          </Box>&nbsp;?
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '9px', bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
            {TYPE_META[availability.type]?.label} · {formatDate(availability.start_date)} → {formatDate(availability.end_date)}
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

/* ─────────────────────── Calendrier disponibilité ── */

interface CalProps {
  availabilities: Availability[];
  year: number; month: number;
  onEdit: (a: Availability) => void;
}

function AvailCalendar({ availabilities, year, month, onEdit }: CalProps) {
  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const daysCount = getDaysInMonth(year, month);
  const startWday = firstWeekday(year, month);

  const cells = useMemo(() => {
    const result: Array<{ day: number|null; ds: string|null }> = [];
    for (let i = 0; i < startWday; i++) result.push({ day: null, ds: null });
    for (let d = 1; d <= daysCount; d++) result.push({ day: d, ds: dateStr(year, month, d) });
    return result;
  }, [year, month, daysCount, startWday]);

  const byDate = useMemo(() => {
    const map: Record<string, Availability[]> = {};
    availabilities.forEach(av => {
      if (av.status === 'cancelled') return;
      for (let d = 1; d <= daysCount; d++) {
        const ds = dateStr(year, month, d);
        if (isAvailabilityOnDate(av, ds)) {
          if (!map[ds]) map[ds] = [];
          map[ds].push(av);
        }
      }
    });
    return map;
  }, [availabilities, year, month, daysCount]);

  const MAX_VISIBLE = 3;

  /* légende types actifs ce mois */
  const activeTypes = Object.entries(TYPE_META).filter(([key]) =>
    availabilities.some(av => av.type === key && av.status !== 'cancelled' && (
      av.start_date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`) ||
      av.end_date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`) ||
      (av.start_date <= dateStr(year,month,1) && av.end_date >= dateStr(year,month,daysCount))
    ))
  );

  return (
    <Box>
      {activeTypes.length > 0 && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" px={2} pb={1.5} pt={0.5}>
          {activeTypes.map(([, tm]) => (
            <Stack key={tm.label} direction="row" alignItems="center" spacing={0.6}>
              <Box sx={{ color: tm.color, display: 'flex', fontSize: 12 }}>{tm.icon}</Box>
              <Typography sx={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{tm.label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}

      <Box sx={{ px: 1.5, pb: 2 }}>
        {/* En-têtes */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', mb: '3px' }}>
          {DAY_LABELS.map((dl, i) => (
            <Box key={dl} sx={{ py: 0.75, textAlign: 'center', borderRadius: '7px', bgcolor: i >= 5 ? 'rgba(148,163,184,0.12)' : 'transparent' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: i >= 5 ? '#94A3B8' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dl}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Cellules */}
        {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, rowIdx) => (
          <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', mb: '3px' }}>
            {cells.slice(rowIdx*7, rowIdx*7+7).map((cell, colIdx) => {
              const gIdx = rowIdx*7+colIdx;
              if (!cell.day || !cell.ds) return <Box key={gIdx} sx={{ height: 90, borderRadius: '8px', bgcolor: '#F8FAFC' }} />;
              const isToday   = cell.ds === todayStr;
              const isWeekend = (startWday + cell.day - 1) % 7 >= 5;
              const dayAvails = byDate[cell.ds] ?? [];
              const visible   = dayAvails.slice(0, MAX_VISIBLE);
              const overflow  = dayAvails.length - MAX_VISIBLE;

              return (
                <Box key={cell.day} sx={{
                  height: 90, borderRadius: '8px', overflow: 'hidden',
                  border: isToday ? '2px solid #06B6D4' : '1px solid #E2E8F0',
                  bgcolor: isWeekend ? '#F8FAFC' : '#fff',
                  display: 'flex', flexDirection: 'column', p: '5px 6px 4px',
                  transition: 'box-shadow 0.15s',
                  '&:hover': { boxShadow: '0 2px 8px rgba(15,23,42,0.10)' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '6px', mb: 0.5, flexShrink: 0,
                    bgcolor: isToday ? '#06B6D4' : 'transparent' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: isToday ? 800 : 600, lineHeight: 1,
                      color: isToday ? '#fff' : isWeekend ? '#94A3B8' : '#1E293B' }}>
                      {cell.day}
                    </Typography>
                  </Box>
                  <Stack spacing="2px" sx={{ overflow: 'hidden', flex: 1 }}>
                    {visible.map(av => {
                      const emp  = av.employee;
                      const tm   = TYPE_META[av.type];
                      const clr  = tm?.color ?? '#64748B';
                      const isPending = av.status === 'pending';
                      return (
                        <Tooltip key={av.id} arrow title={
                          <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                              {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${av.employee_id}`}
                            </Typography>
                            <Typography sx={{ fontSize: 11, opacity: 0.8 }}>
                              {tm?.label} · {STATUS_META[av.status]?.label}
                            </Typography>
                            {av.location && <Typography sx={{ fontSize: 11, opacity: 0.7 }}>{av.location}</Typography>}
                          </Box>
                        }>
                          <Box onClick={() => onEdit(av)} sx={{
                            px: '5px', py: '1px', borderRadius: '4px',
                            bgcolor: isPending ? 'transparent' : alpha(clr, 0.15),
                            border: isPending ? `1px dashed ${alpha(clr, 0.6)}` : `1px solid ${alpha(clr, 0.25)}`,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden',
                            '&:hover': { bgcolor: alpha(clr, isPending ? 0.08 : 0.28) },
                          }}>
                            <Box sx={{ color: clr, display: 'flex', flexShrink: 0, '& svg': { fontSize: '9px !important' } }}>{tm?.icon}</Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 600, color: clr,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                              {emp ? `${emp.first_name[0]}. ${emp.last_name}` : `#${av.employee_id}`}
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

/* ─────────────────────── AvailabilityTab principal ── */

export default function AvailabilityTab() {
  const qc = useQueryClient();

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<'calendar'|'table'>('calendar');

  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<Availability['type']|'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Availability['status']|'all'>('all');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState<Availability|undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Availability|null>(null);
  const [, setApproveTarget] = useState<Availability|null>(null);

  const { data: availabilities = [], isLoading, refetch } = useQuery({
    queryKey: ['availabilities'],
    queryFn: () => availabilitiesApi.list().then(r => r.data),
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

  const deleteMut = useMutation({
    mutationFn: (id: number) => availabilitiesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availabilities'] }); setDeleteTarget(null); },
  });
  const approveMut = useMutation({
    mutationFn: (id: number) => availabilitiesApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availabilities'] }); setApproveTarget(null); },
  });

  const openCreate = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit   = (a: Availability) => { setEditItem(a); setModalOpen(true); };

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y=>y-1); setCalMonth(11); } else setCalMonth(m=>m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y=>y+1); setCalMonth(0); } else setCalMonth(m=>m+1); };

  const pending = availabilities.filter(a => a.status === 'pending');

  const filtered = availabilities.filter(a => {
    const emp = a.employee;
    const q   = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q)) ||
      (emp?.employee_number?.toLowerCase().includes(q)) ||
      (a.location?.toLowerCase().includes(q));
    return matchSearch &&
      (typeFilter === 'all' || a.type === typeFilter) &&
      (statusFilter === 'all' || a.status === statusFilter);
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map(k => [k, availabilities.filter(a => a.status === k).length])
  );

  return (
    <>
      {/* ════ DEMANDES EN ATTENTE ════ */}
      {pending.length > 0 && (
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Box sx={{ borderRadius: '14px', border: '1.5px solid rgba(6,182,212,0.3)',
            bgcolor: '#ECFEFF', overflow: 'hidden', boxShadow: '0 2px 12px rgba(6,182,212,0.08)' }}>
            <Box sx={{ px: 2.5, py: 1.5, background: 'linear-gradient(135deg,#164E63,#0891B2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HourglassBottom sx={{ color: '#A5F3FC', fontSize: 17 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: '#CFFAFE', fontWeight: 800, fontSize: 13.5 }}>
                    Disponibilités en attente d'approbation
                  </Typography>
                  <Typography sx={{ color: 'rgba(207,250,254,0.65)', fontSize: 11 }}>
                    {pending.length} demande{pending.length > 1 ? 's' : ''} à traiter
                  </Typography>
                </Box>
              </Stack>
              <Chip label={pending.length} size="small"
                sx={{ bgcolor: '#06B6D4', color: '#fff', fontWeight: 800, fontSize: 12, height: 24 }} />
            </Box>
            <Stack spacing={0} divider={<Divider sx={{ borderColor: 'rgba(6,182,212,0.15)' }} />}>
              {pending.map(av => {
                const emp  = av.employee;
                const tm   = TYPE_META[av.type];
                const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                return (
                  <Box key={av.id} sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                    '&:hover': { bgcolor: 'rgba(6,182,212,0.04)' }, transition: 'background 0.15s' }}>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 180 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 800,
                        background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>{initials}</Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#164E63', lineHeight: 1.2 }}>
                          {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${av.employee_id}`}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: '#0891B2', fontFamily: 'monospace' }}>
                          {emp?.employee_number ?? '—'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                      <Box sx={{ color: tm.color, display: 'flex' }}>{tm.icon}</Box>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#164E63' }}>{tm.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#0891B2' }}>
                        · {formatDate(av.start_date)} → {formatDate(av.end_date)}
                      </Typography>
                      {av.location && (
                        <Typography sx={{ fontSize: 11.5, color: '#0891B2', fontStyle: 'italic' }}>· {av.location}</Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ ml: 'auto', flexShrink: 0 }}>
                      <Button size="small" variant="contained" startIcon={<ThumbUp sx={{ fontSize: '13px !important' }} />}
                        onClick={() => approveMut.mutate(av.id)}
                        sx={{ bgcolor: '#0891B2', fontSize: 12, fontWeight: 700, borderRadius: '8px', px: 1.75,
                          '&:hover': { bgcolor: '#0E7490' }, transition: 'all 0.15s' }}>
                        Approuver
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<Edit sx={{ fontSize: '13px !important' }} />}
                        onClick={() => openEdit(av)}
                        sx={{ borderColor: '#06B6D4', color: '#06B6D4', fontSize: 12, fontWeight: 700,
                          borderRadius: '8px', px: 1.75, '&:hover': { bgcolor: '#ECFEFF' }, transition: 'all 0.15s' }}>
                        Modifier
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}

      {/* ════ EN-TÊTE ════ */}
      <Box sx={{
        px: 2, py: 1.25, mt: pending.length > 0 ? 2 : 0,
        background: 'linear-gradient(135deg, #0F172A 0%, #164E63 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': { content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(6,182,212,0.14) 0%, transparent 55%)', pointerEvents: 'none' },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            {viewMode === 'calendar' && (
              <>
                <IconButton size="small" onClick={prevMonth}
                  sx={{ color: '#94A3B8', borderRadius: '8px', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                  <ChevronLeft fontSize="small" />
                </IconButton>
                <Box sx={{ textAlign: 'center', minWidth: 140 }}>
                  <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15 }}>
                    {MONTH_FR[calMonth]} {calYear}
                  </Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 11 }}>
                    {availabilities.filter(a => {
                      const m = String(calMonth+1).padStart(2,'0');
                      return (a.start_date.startsWith(`${calYear}-${m}`) || a.end_date.startsWith(`${calYear}-${m}`) ||
                        (a.start_date <= `${calYear}-${m}-01` && a.end_date >= `${calYear}-${m}-28`)) && a.status !== 'cancelled';
                    }).length} statut(s) ce mois
                  </Typography>
                </Box>
                <IconButton size="small" onClick={nextMonth}
                  sx={{ color: '#94A3B8', borderRadius: '8px', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                  <ChevronRight fontSize="small" />
                </IconButton>
              </>
            )}
            {viewMode === 'table' && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 34, height: 34, borderRadius: '9px',
                  background: `linear-gradient(135deg, ${ACCENT}, #0891B2)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}` }}>
                  <AccessTime sx={{ color: '#fff', fontSize: 17 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14.5 }}>Disponibilités — Vue liste</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 11 }}>{availabilities.length} entrée{availabilities.length > 1 ? 's' : ''}</Typography>
                </Box>
              </Stack>
            )}
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            {/* Toggle vue */}
            <Stack direction="row" sx={{ bgcolor: 'rgba(255,255,255,0.07)', borderRadius: '9px', p: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {([['calendar', <CalendarViewMonth sx={{ fontSize: 16 }} />, 'Calendrier'], ['table', <ViewList sx={{ fontSize: 16 }} />, 'Liste']] as const).map(([mode, icon, label]) => (
                <Tooltip key={mode} title={label} arrow>
                  <IconButton size="small" onClick={() => setViewMode(mode)}
                    sx={{ borderRadius: '7px', width: 30, height: 30,
                      bgcolor: viewMode === mode ? ACCENT : 'transparent',
                      color: viewMode === mode ? '#fff' : '#94A3B8',
                      '&:hover': { color: '#fff', bgcolor: viewMode === mode ? ACCENT : 'rgba(255,255,255,0.1)' },
                      transition: 'all 0.15s' }}>
                    {icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { color: ACCENT, bgcolor: 'rgba(6,182,212,0.1)', borderColor: alpha(ACCENT, 0.4) } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<Add sx={{ fontSize: '15px !important' }} />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #0891B2)`,
                color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.5)}`,
                '&:hover': { background: 'linear-gradient(135deg,#0891B2,#0E7490)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}>
              Nouvelle disponibilité
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ════ STATS ════ */}
      <Stack direction="row" alignItems="center" px={2.5} py={0.875}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {Object.entries(STATUS_META).map(([key, sm]) => (
            <Stack key={key} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sm.color }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                {sm.label}&nbsp;<Box component="span" sx={{ fontWeight: 800, color: sm.color }}>{counts[key] ?? 0}</Box>
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      {/* ════ CONTENU ════ */}
      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={90} sx={{ borderRadius: '8px' }} />
            ))}
          </Box>
        </Box>
      ) : viewMode === 'calendar' ? (
        <Box sx={{ bgcolor: '#F1F5F9', pt: 1.5 }}>
          <AvailCalendar availabilities={availabilities} year={calYear} month={calMonth} onEdit={openEdit} />
        </Box>
      ) : (
        <>
          {/* Barre filtres liste */}
          <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0',
            background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField placeholder="Rechercher un agent ou un lieu…" size="small" value={search}
                onChange={e => setSearch(e.target.value)} sx={{ bgcolor: '#fff', width: 250 }}
                InputProps={{ sx: { fontSize: 12 },
                  startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }} />

              {/* Filtre type */}
              <FormControl size="small" sx={{ minWidth: 170, bgcolor: '#fff' }}>
                <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value as Availability['type']|'all')}
                  displayEmpty sx={{ fontSize: 12, borderRadius: '8px' }}>
                  <MenuItem value="all" sx={{ fontSize: 12 }}>Tous les types</MenuItem>
                  {Object.entries(TYPE_META).map(([k, tm]) => (
                    <MenuItem key={k} value={k} sx={{ fontSize: 12 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ color: tm.color, display: 'flex' }}>{tm.icon}</Box>
                        <Typography sx={{ fontSize: 12 }}>{tm.label}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Filtre statut */}
              <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
                {([
                  ['all','Tous','#475569'],['pending','En attente','#D97706'],['approved','Approuvés','#059669'],
                  ['active','En cours','#06B6D4'],['ended','Terminés','#64748B'],['cancelled','Annulés','#DC2626'],
                ] as const).map(([val, lbl, clr]) => (
                  <Box key={val} onClick={() => setStatusFilter(val as Availability['status']|'all')}
                    sx={{ px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      bgcolor: statusFilter === val ? clr : 'transparent', color: statusFilter === val ? '#fff' : clr,
                      transition: 'all .15s', '&:hover': { bgcolor: statusFilter === val ? clr : `${clr}18` } }}>
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
                    <AccessTime sx={{ fontSize: 36, color: '#CBD5E1' }} />
                  </Box>
                  <Typography fontWeight={700} color="text.secondary" fontSize={15}>Aucune disponibilité trouvée</Typography>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      {['Agent','Type','Début','Fin','Lieu / Organisme','Approuvé par','Statut','Actions'].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '2px solid #E2E8F0', py: 1.25, px: 2 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((av, idx) => {
                      const emp     = av.employee;
                      const tm      = TYPE_META[av.type];
                      const sm      = STATUS_META[av.status];
                      const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                      return (
                        <TableRow key={av.id} sx={{
                          bgcolor: idx%2===0?'#fff':'#FAFBFC', '&:hover':{bgcolor:'#ECFEFF'},
                          '&:last-child td':{border:0}, transition:'background 0.15s' }}>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Avatar sx={{ width:34, height:34, fontSize:12.5, fontWeight:800,
                                background:'linear-gradient(135deg,#1D4ED8,#7C3AED)', boxShadow:'0 3px 10px rgba(37,99,235,0.25)' }}>
                                {initials}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontSize:13, fontWeight:700, color:'#0F172A', lineHeight:1.2 }}>
                                  {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${av.employee_id}`}
                                </Typography>
                                {emp?.employee_number && (
                                  <Typography sx={{ fontSize:10.5, color:'#94A3B8', fontFamily:'monospace' }}>{emp.employee_number}</Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <Box sx={{ color:tm.color, display:'flex' }}>{tm.icon}</Box>
                              <Typography sx={{ fontSize:12.5, fontWeight:600, color:'#334155' }}>{tm.label}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize:12.5, color:'#334155' }}>{formatDate(av.start_date)}</Typography>
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize:12.5, color:'#334155' }}>{formatDate(av.end_date)}</Typography>
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9', maxWidth:160 }}>
                            {av.location ? (
                              <Tooltip title={av.location} arrow>
                                <Typography sx={{ fontSize:12, color:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{av.location}</Typography>
                              </Tooltip>
                            ) : <Typography sx={{ fontSize:12, color:'#CBD5E1', fontStyle:'italic' }}>—</Typography>}
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize:12.5, color:'#64748B' }}>{av.approved_by || <Box component="span" sx={{ color:'#CBD5E1', fontStyle:'italic' }}>—</Box>}</Typography>
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Chip icon={<Box sx={{ display:'flex', alignItems:'center', color:`${sm.color} !important` }}>{sm.icon}</Box>}
                              label={sm.label} size="small"
                              sx={{ height:22, fontSize:11, fontWeight:700, color:sm.color, bgcolor:sm.bg, border:`1px solid ${sm.border}` }} />
                          </TableCell>
                          <TableCell sx={{ px:2, py:1.25, borderBottom:'1px solid #F1F5F9' }}>
                            <Stack direction="row" spacing={0.5}>
                              {av.status === 'pending' && (
                                <Tooltip title="Approuver" arrow>
                                  <IconButton size="small" onClick={() => approveMut.mutate(av.id)}
                                    sx={{ width:30, height:30, borderRadius:'8px', bgcolor:'#ECFEFF', color:'#0891B2',
                                      '&:hover':{bgcolor:'#CFFAFE', transform:'scale(1.1)'}, transition:'all .15s' }}>
                                    <CheckCircle sx={{ fontSize:13 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Modifier" arrow>
                                <IconButton size="small" onClick={() => openEdit(av)}
                                  sx={{ width:30, height:30, borderRadius:'8px', bgcolor:'#FFF7ED', color:'#F97316',
                                    '&:hover':{bgcolor:'#FED7AA', transform:'scale(1.1)'}, transition:'all .15s' }}>
                                  <Edit sx={{ fontSize:13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer" arrow>
                                <IconButton size="small" onClick={() => setDeleteTarget(av)}
                                  sx={{ width:30, height:30, borderRadius:'8px', bgcolor:'#FFF1F2', color:'#E11D48',
                                    '&:hover':{bgcolor:'#FFE4E6', transform:'scale(1.1)'}, transition:'all .15s' }}>
                                  <Delete sx={{ fontSize:13 }} />
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
        <AvailabilityModal open={modalOpen} onClose={() => setModalOpen(false)}
          availability={editItem} employees={employees} />
      )}
      {deleteTarget && (
        <DeleteDialog availability={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
