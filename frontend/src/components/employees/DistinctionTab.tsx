import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Skeleton, Avatar,
  InputAdornment, alpha, Autocomplete, Card,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  EmojiEvents, DescriptionOutlined, CalendarMonth,
  LocationOn, WorkspacePremium, MilitaryTech,
  Stars, CardMembership, VerifiedUser,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { distinctionsApi } from '../../api/distinctions';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';
import type { Distinction, Employee } from '../../types';

/* ─────────────────────── constantes ── */

const ACCENT = '#A855F7';

const TYPE_META: Record<Distinction['type'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  medal:        { label: 'Médaille',        color: '#D97706', bg: 'rgba(217,119,6,0.1)',   icon: <MilitaryTech /> },
  commendation: { label: 'Félicitation',    color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: <Stars /> },
  award:        { label: "Prix d'excellence", color: '#A855F7', bg: 'rgba(168,85,247,0.1)', icon: <WorkspacePremium /> },
  diploma:      { label: "Diplôme d'honneur", color: '#059669', bg: 'rgba(5,150,105,0.1)', icon: <CardMembership /> },
  certificate:  { label: 'Certificat',      color: '#0891B2', bg: 'rgba(8,145,178,0.1)',  icon: <VerifiedUser /> },
};

const LEVEL_META: Record<NonNullable<Distinction['level']>, { label: string; color: string }> = {
  national:  { label: 'National',  color: '#DC2626' },
  regional:  { label: 'Régional',  color: '#D97706' },
  local:     { label: 'Local',     color: '#3B82F6' },
  internal:  { label: 'Interne',   color: '#64748B' },
};

/* ─────────────────────── schéma ── */

const schema = z.object({
  employee_id:       z.number().min(1),
  type:              z.enum(['medal','commendation','award','diploma','certificate']),
  name:              z.string().min(1, 'Intitulé requis'),
  issuing_authority: z.string().optional(),
  award_date:        z.string().min(1, 'Date requise'),
  level:             z.enum(['national','regional','local','internal']).optional(),
  description:       z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─────────────────────── Modal ── */

function DistinctionModal({ open, onClose, distinction, employees }: {
  open: boolean; onClose: () => void; distinction?: Distinction; employees: Employee[];
}) {
  const qc   = useQueryClient();
  const mode = distinction ? 'edit' : 'create';

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: distinction ? {
      employee_id:       distinction.employee_id,
      type:              distinction.type,
      name:              distinction.name,
      issuing_authority: distinction.issuing_authority ?? '',
      award_date:        distinction.award_date,
      level:             distinction.level,
      description:       distinction.description ?? '',
    } : { type: 'medal', award_date: new Date().toISOString().split('T')[0] },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => distinctionsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distinctions'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) => distinctionsApi.update(distinction!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distinctions'] }); handleClose(); },
  });

  const mutation  = mode === 'edit' ? updateMut : createMut;
  const mutError  = mutation.error as { response?: { data?: { message?: string } } } | null;
  const handleClose = () => { reset(); onClose(); };

  const watchType = watch('type');
  const typeColor = TYPE_META[watchType]?.color ?? ACCENT;
  const defaultEmp = distinction ? (employees.find(e => e.id === distinction.employee_id) ?? null) : null;

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
        background: 'linear-gradient(135deg, #0F172A 0%, #4A1D96 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(168,85,247,0.2) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #7C3AED)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <EmojiEvents sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouvelle distinction' : 'Modifier la distinction'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Enregistrer une récompense ou une distinction' : `#${distinction?.id} · ${distinction?.name}`}
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
        <Box component="form" id="distinction-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container spacing={2}>

            {/* Agent */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Agent récompensé</Typography>
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
                      const tm = TYPE_META[val as Distinction['type']];
                      return tm ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ color: tm.color, display: 'flex', '& svg': { fontSize: '15px !important' } }}>{tm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{tm.label}</Typography>
                        </Stack>
                      ) : val;
                    }}>
                    {Object.entries(TYPE_META).map(([k, tm]) => (
                      <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ color: tm.color, display: 'flex', '& svg': { fontSize: '18px !important' } }}>{tm.icon}</Box>
                          <Typography sx={{ fontSize: 13 }}>{tm.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Grid>

            {/* Niveau */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Niveau <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <Controller name="level" control={control} render={({ field }) => (
                <FormControl fullWidth size="small">
                  <Select {...field} value={field.value ?? ''} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    displayEmpty
                    renderValue={val => {
                      if (!val) return <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Sélectionner…</Typography>;
                      const lm = LEVEL_META[val as NonNullable<Distinction['level']>];
                      return lm ? <Chip label={lm.label} size="small" sx={{ height: 18, fontSize: 11, fontWeight: 700, color: lm.color, bgcolor: alpha(lm.color, 0.1) }} /> : val;
                    }}>
                    <MenuItem value="" sx={{ fontSize: 13 }}><Typography sx={{ color: '#94A3B8', fontSize: 13 }}>—</Typography></MenuItem>
                    {Object.entries(LEVEL_META).map(([k, lm]) => (
                      <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>
                        <Chip label={lm.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: lm.color, bgcolor: alpha(lm.color, 0.1) }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )} />
            </Grid>

            {/* Intitulé */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Intitulé</Typography>
              <TextField fullWidth size="small" {...register('name')}
                placeholder="Ex : Médaille d'Or du Travail, Prix du Mérite National…"
                error={!!errors.name} helperText={errors.name?.message}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmojiEvents sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>

            {/* Date + Autorité */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Date d'attribution</Typography>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }}
                {...register('award_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.award_date} helperText={errors.award_date?.message}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Autorité décernante <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" {...register('issuing_authority')}
                placeholder="Ex : Ministère de la Fonction Publique…"
                InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Description <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <TextField fullWidth size="small" multiline rows={3} {...register('description')}
                placeholder="Motif, circonstances de la distinction…"
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><DescriptionOutlined sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600 }}>Annuler</Button>
        <Button type="submit" form="distinction-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #7C3AED)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Attribuer la distinction' : 'Enregistrer'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────── DeleteDialog ── */

function DeleteDialog({ distinction, onConfirm, onCancel }: {
  distinction: Distinction; onConfirm: () => void; onCancel: () => void;
}) {
  const emp = distinction.employee;
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer la distinction</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Supprimer la distinction de&nbsp;
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `#${distinction.employee_id}`}
          </Box>&nbsp;?
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '9px', bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>{distinction.name} · {formatDate(distinction.award_date)}</Typography>
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

/* ─────────────────────── Carte distinction ── */

function DistinctionCard({ distinction, onEdit, onDelete }: {
  distinction: Distinction; onEdit: () => void; onDelete: () => void;
}) {
  const emp  = distinction.employee;
  const tm   = TYPE_META[distinction.type];
  const lm   = distinction.level ? LEVEL_META[distinction.level] : null;
  const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';

  return (
    <Card sx={{
      borderRadius: '16px', border: '1px solid #E2E8F0',
      boxShadow: '0 1px 6px rgba(15,23,42,0.07)', overflow: 'hidden', bgcolor: '#fff',
      transition: 'all 0.22s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)', borderColor: alpha(tm.color, 0.4) },
    }}>
      {/* Bannière colorée */}
      <Box sx={{
        height: 64, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(tm.color, 0.12)} 0%, ${alpha(tm.color, 0.25)} 100%)`,
        borderBottom: `2px solid ${alpha(tm.color, 0.2)}`,
      }}>
        {/* Icône décorative grande */}
        <Box sx={{
          position: 'absolute', right: -8, top: -8, opacity: 0.12,
          color: tm.color, '& svg': { fontSize: '80px !important' },
        }}>{tm.icon}</Box>

        {/* Chips en haut à gauche */}
        <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, left: 12 }}>
          <Chip
            icon={<Box sx={{ color: `${tm.color} !important`, display: 'flex', '& svg': { fontSize: '11px !important' } }}>{tm.icon}</Box>}
            label={tm.label} size="small"
            sx={{ height: 20, fontSize: 10, fontWeight: 700, color: tm.color, bgcolor: '#fff', border: `1px solid ${alpha(tm.color, 0.3)}` }}
          />
          {lm && (
            <Chip label={lm.label} size="small"
              sx={{ height: 20, fontSize: 10, fontWeight: 700, color: lm.color, bgcolor: '#fff', border: `1px solid ${alpha(lm.color, 0.3)}` }} />
          )}
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Tooltip title="Modifier" arrow>
            <IconButton size="small" onClick={onEdit}
              sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(255,255,255,0.9)', color: '#F97316',
                '&:hover': { bgcolor: '#fff', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
              <Edit sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer" arrow>
            <IconButton size="small" onClick={onDelete}
              sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(255,255,255,0.9)', color: '#DC2626',
                '&:hover': { bgcolor: '#fff', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
              <Delete sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Corps */}
      <Box sx={{ px: 2, pb: 2 }}>
        {/* Avatar centré */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: -3, mb: 1.25 }}>
          <Avatar sx={{
            width: 52, height: 52, fontSize: 18, fontWeight: 800,
            background: 'linear-gradient(135deg, #1D4ED8, #7C3AED)',
            border: '3px solid #fff', boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          }}>
            {initials}
          </Avatar>
        </Box>

        {/* Nom agent */}
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', textAlign: 'center', lineHeight: 1.2, mb: 0.25 }}>
          {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${distinction.employee_id}`}
        </Typography>
        {emp?.employee_number && (
          <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace', textAlign: 'center', mb: 1.25 }}>
            {emp.employee_number}{emp.department?.name ? ` · ${emp.department.name}` : ''}
          </Typography>
        )}

        {/* Intitulé distinction */}
        <Box sx={{
          p: 1.25, borderRadius: '10px', mb: 1.25, textAlign: 'center',
          bgcolor: alpha(tm.color, 0.06), border: `1px solid ${alpha(tm.color, 0.18)}`,
        }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: tm.color, lineHeight: 1.3 }}>
            {distinction.name}
          </Typography>
        </Box>

        {/* Méta */}
        <Stack spacing={0.6}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <CalendarMonth sx={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>{formatDate(distinction.award_date)}</Typography>
          </Stack>
          {distinction.issuing_authority && (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <LocationOn sx={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {distinction.issuing_authority}
              </Typography>
            </Stack>
          )}
          {distinction.description && (
            <Tooltip title={distinction.description} arrow>
              <Typography sx={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default', mt: 0.25 }}>
                "{distinction.description}"
              </Typography>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Card>
  );
}

/* ─────────────────────── DistinctionTab principal ── */

export default function DistinctionTab() {
  const qc = useQueryClient();

  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<Distinction['type']|'all'>('all');
  const [levelFilter, setLevelFilter] = useState<NonNullable<Distinction['level']>|'all'>('all');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState<Distinction|undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Distinction|null>(null);

  const { data: distinctions = [], isLoading, refetch } = useQuery({
    queryKey: ['distinctions'],
    queryFn: () => distinctionsApi.list().then(r => r.data),
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
    mutationFn: (id: number) => distinctionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distinctions'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit   = (d: Distinction) => { setEditItem(d); setModalOpen(true); };

  const filtered = distinctions.filter(d => {
    const emp = d.employee;
    const q   = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q)) ||
      (emp?.employee_number?.toLowerCase().includes(q)) ||
      d.name.toLowerCase().includes(q) ||
      (d.issuing_authority?.toLowerCase().includes(q));
    return matchSearch &&
      (typeFilter === 'all' || d.type === typeFilter) &&
      (levelFilter === 'all' || d.level === levelFilter);
  });

  /* stats par type */
  const typeCounts = Object.fromEntries(
    Object.keys(TYPE_META).map(k => [k, distinctions.filter(d => d.type === k).length])
  );

  return (
    <>
      {/* ════ EN-TÊTE ════ */}
      <Box sx={{
        px: 2, py: 1.5,
        background: 'linear-gradient(135deg, #0F172A 0%, #4A1D96 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(168,85,247,0.16) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: `linear-gradient(135deg, ${ACCENT}, #7C3AED)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(ACCENT, 0.45)}`,
            }}>
              <EmojiEvents sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14.5 }}>Distinctions & Récompenses</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>
                {distinctions.length} distinction{distinctions.length > 1 ? 's' : ''} enregistrée{distinctions.length > 1 ? 's' : ''}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75}>
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { color: ACCENT, bgcolor: 'rgba(168,85,247,0.1)', borderColor: alpha(ACCENT, 0.4) } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<Add sx={{ fontSize: '15px !important' }} />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #7C3AED)`,
                color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.5)}`,
                '&:hover': { background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}>
              Nouvelle distinction
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ════ BARRE DE FILTRES ════ */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0',
        background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField placeholder="Rechercher agent, intitulé, autorité…" size="small" value={search}
            onChange={e => setSearch(e.target.value)} sx={{ bgcolor: '#fff', width: 280 }}
            InputProps={{ sx: { fontSize: 12 },
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }} />

          {/* Filtre type */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            <Box onClick={() => setTypeFilter('all')}
              sx={{ px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                bgcolor: typeFilter === 'all' ? '#475569' : 'transparent', color: typeFilter === 'all' ? '#fff' : '#475569',
                transition: 'all .15s', '&:hover': { bgcolor: typeFilter === 'all' ? '#475569' : '#47556918' } }}>
              Tous
            </Box>
            {Object.entries(TYPE_META).map(([k, tm]) => (
              <Tooltip key={k} title={tm.label} arrow>
                <Box onClick={() => setTypeFilter(k as Distinction['type'])}
                  sx={{ px: 1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center',
                    bgcolor: typeFilter === k ? tm.color : 'transparent', color: typeFilter === k ? '#fff' : tm.color,
                    transition: 'all .15s', '&:hover': { bgcolor: typeFilter === k ? tm.color : alpha(tm.color, 0.12) },
                    '& svg': { fontSize: '14px !important' } }}>
                  {tm.icon}
                </Box>
              </Tooltip>
            ))}
          </Stack>

          {/* Filtre niveau */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            {([['all','Tous','#475569'], ...Object.entries(LEVEL_META).map(([k,lm]) => [k, lm.label, lm.color])] as const).map(([val, lbl, clr]) => (
              <Box key={val} onClick={() => setLevelFilter(val as NonNullable<Distinction['level']>|'all')}
                sx={{ px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  bgcolor: levelFilter === val ? clr : 'transparent', color: levelFilter === val ? '#fff' : clr,
                  transition: 'all .15s', '&:hover': { bgcolor: levelFilter === val ? clr : `${clr}18` } }}>
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

      {/* ════ STATS BAR ════ */}
      <Stack direction="row" alignItems="center" px={2.5} py={0.875}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          {Object.entries(TYPE_META).map(([key, tm]) => (
            <Stack key={key} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ color: tm.color, display: 'flex', '& svg': { fontSize: '12px !important' } }}>{tm.icon}</Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
                {tm.label}&nbsp;<Box component="span" sx={{ fontWeight: 800, color: tm.color }}>{typeCounts[key] ?? 0}</Box>
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      {/* ════ GRILLE DE CARTES ════ */}
      <Box sx={{ bgcolor: '#F1F5F9', minHeight: 340, p: 2.5 }}>
        {isLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={260} sx={{ borderRadius: '16px' }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <Box sx={{ width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
                <EmojiEvents sx={{ fontSize: 36, color: '#CBD5E1' }} />
              </Box>
              <Box textAlign="center">
                <Typography fontWeight={700} color="text.secondary" fontSize={15}>Aucune distinction trouvée</Typography>
                <Typography variant="caption" color="text.disabled">
                  {distinctions.length === 0 ? 'Attribuez la première distinction' : 'Modifiez vos critères de recherche'}
                </Typography>
              </Box>
              {distinctions.length === 0 && (
                <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={openCreate}
                  sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600, borderColor: ACCENT, color: ACCENT }}>
                  Nouvelle distinction
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
            {filtered.map(d => (
              <DistinctionCard
                key={d.id} distinction={d}
                onEdit={() => openEdit(d)}
                onDelete={() => setDeleteTarget(d)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* ── Dialogs ── */}
      {modalOpen && (
        <DistinctionModal open={modalOpen} onClose={() => setModalOpen(false)}
          distinction={editItem} employees={employees} />
      )}
      {deleteTarget && (
        <DeleteDialog distinction={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
