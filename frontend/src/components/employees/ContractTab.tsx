import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogTitle, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Table, TableBody,
  TableCell, TableHead, TableRow, Skeleton, Avatar,
  Switch, InputAdornment, alpha,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  Assignment, CheckCircle, Block, AttachMoney,
  AccessTime, Person, CalendarMonth, DescriptionOutlined,
  WorkOutline, PictureAsPdf,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractsApi } from '../../api/contracts';
import { employeesApi } from '../../api/employees';
import { formatDate, formatSalary } from '../../utils/format';
import type { Contract, Employee } from '../../types';

/* ─────────────────────────────────────────── types & constants ── */

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Apprentissage', 'Freelance', 'Interim'] as const;
type ContractType = (typeof CONTRACT_TYPES)[number];

const TYPE_META: Record<ContractType, { label: string; color: string; bg: string; border: string }> = {
  CDI:          { label: 'CDI',          color: '#059669', bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.28)'   },
  CDD:          { label: 'CDD',          color: '#2563EB', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.28)'   },
  Stage:        { label: 'Stage',        color: '#7C3AED', bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.28)'  },
  Apprentissage:{ label: 'Apprentissage',color: '#F97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.28)'  },
  Freelance:    { label: 'Freelance',    color: '#0891B2', bg: 'rgba(8,145,178,0.10)',   border: 'rgba(8,145,178,0.28)'   },
  Interim:      { label: 'Intérim',      color: '#DC2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.28)'   },
};

const ACCENT = '#3B82F6';

/* ─────────────────────────────────────────────────────── schema ── */

const schema = z.object({
  employee_id:            z.number().min(1, 'Agent requis'),
  type:                   z.enum(CONTRACT_TYPES),
  start_date:             z.string().min(1, 'Date de début requise'),
  end_date:               z.string().optional(),
  salary:                 z.number().min(0),
  working_hours_per_week: z.number().min(1).max(60),
  notes:                  z.string().optional(),
  is_active:              z.boolean(),
});
type FormData = z.infer<typeof schema>;

/* ─────────────────────────────────────────────── ContractModal ── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  contract?: Contract;
  employees: Employee[];
}

function ContractModal({ open, onClose, contract, employees }: ModalProps) {
  const qc   = useQueryClient();
  const mode = contract ? 'edit' : 'create';

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: contract ? {
      employee_id:            contract.employee_id,
      type:                   contract.type as ContractType,
      start_date:             contract.start_date,
      end_date:               contract.end_date ?? '',
      salary:                 contract.salary,
      working_hours_per_week: contract.working_hours_per_week,
      notes:                  contract.notes ?? '',
      is_active:              contract.is_active,
    } : {
      working_hours_per_week: 40,
      is_active: true,
    },
  });

  const watchedType = watch('type');
  const needsEndDate = watchedType && ['CDD', 'Stage', 'Apprentissage'].includes(watchedType);

  const createMut = useMutation({
    mutationFn: (d: FormData) => contractsApi.create(d as Partial<Contract>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) => contractsApi.update(contract!.id, d as Partial<Contract>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); handleClose(); },
  });

  const mutation = mode === 'edit' ? updateMut : createMut;
  const mutError = mutation.error as { response?: { data?: { message?: string } } } | null;

  const handleClose = () => { reset(); onClose(); };

  const SF = (props: React.ComponentProps<typeof TextField>) => (
    <TextField
      fullWidth size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '9px', fontSize: 13,
          '&:hover fieldset': { borderColor: ACCENT },
          '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 2 },
        },
      }}
      {...props}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.28)' } }}
    >
      {/* ── Header ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(59,130,246,0.22) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <Assignment sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouveau contrat' : 'Modifier le contrat'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Saisir les informations du contrat' : `Contrat #${contract?.id}`}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
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

        <Box component="form" id="contract-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container spacing={2}>

            {/* Agent */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Agent
              </Typography>
              <Controller name="employee_id" control={control} render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.employee_id}>
                  <Select
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(Number(e.target.value))}
                    displayEmpty
                    renderValue={val => {
                      if (!val) return <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Sélectionner un agent…</Typography>;
                      const emp = employees.find(e => e.id === val);
                      return emp ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 800, background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </Avatar>
                          <Typography sx={{ fontSize: 13 }}>{emp.first_name} {emp.last_name}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{emp.employee_number}</Typography>
                        </Stack>
                      ) : val;
                    }}
                    sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    startAdornment={<InputAdornment position="start"><Person sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>}
                  >
                    {employees.map(emp => (
                      <MenuItem key={emp.id} value={emp.id} sx={{ fontSize: 13 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 800, background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                              {emp.first_name} {emp.last_name}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                              {emp.employee_number} · {emp.department?.name ?? '—'}
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.employee_id && <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.3 }}>{errors.employee_id.message}</Typography>}
                </FormControl>
              )} />
            </Grid>

            {/* Type de contrat */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Type de contrat
              </Typography>
              <Controller name="type" control={control} render={({ field }) => (
                <FormControl fullWidth size="small" error={!!errors.type}>
                  <Select
                    {...field}
                    value={field.value ?? ''}
                    displayEmpty
                    renderValue={val => {
                      if (!val) return <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Type…</Typography>;
                      const meta = TYPE_META[val as ContractType];
                      return (
                        <Chip label={meta?.label ?? val} size="small"
                          sx={{ height: 20, fontSize: 11, fontWeight: 700, color: meta?.color, bgcolor: meta?.bg, border: `1px solid ${meta?.border}` }} />
                      );
                    }}
                    sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    startAdornment={<InputAdornment position="start"><WorkOutline sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>}
                  >
                    {CONTRACT_TYPES.map(t => {
                      const meta = TYPE_META[t];
                      return (
                        <MenuItem key={t} value={t}>
                          <Chip label={meta.label} size="small"
                            sx={{ height: 20, fontSize: 11, fontWeight: 700, color: meta.color, bgcolor: meta.bg, border: `1px solid ${meta.border}`, cursor: 'pointer' }} />
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {errors.type && <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.3 }}>{errors.type.message}</Typography>}
                </FormControl>
              )} />
            </Grid>

            {/* Statut actif */}
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Controller name="is_active" control={control} render={({ field }) => (
                <Box sx={{
                  width: '100%', p: 1.25, borderRadius: '9px', border: '1px solid #E2E8F0',
                  bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {field.value
                      ? <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />
                      : <Block sx={{ fontSize: 16, color: '#DC2626' }} />
                    }
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: field.value ? '#059669' : '#DC2626' }}>
                      {field.value ? 'Contrat actif' : 'Contrat inactif'}
                    </Typography>
                  </Stack>
                  <Switch
                    checked={!!field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#059669' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#059669' },
                    }}
                  />
                </Box>
              )} />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Date de début
              </Typography>
              <SF {...register('start_date')} type="date" InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.start_date} helperText={errors.start_date?.message} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Date de fin {!needsEndDate && <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>}
              </Typography>
              <SF {...register('end_date')} type="date" InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                placeholder={needsEndDate ? 'Obligatoire pour ce type' : ''} />
            </Grid>

            {/* Salaire + heures */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Salaire mensuel brut
              </Typography>
              <SF {...register('salary', { valueAsNumber: true })} type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><AttachMoney sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 12, color: '#94A3B8' }}>FCFA</Typography></InputAdornment>,
                }}
                error={!!errors.salary} helperText={errors.salary?.message} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Heures / semaine
              </Typography>
              <SF {...register('working_hours_per_week', { valueAsNumber: true })} type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><AccessTime sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 12, color: '#94A3B8' }}>h</Typography></InputAdornment>,
                }}
                error={!!errors.working_hours_per_week} helperText={errors.working_hours_per_week?.message} />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Notes <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</Box>
              </Typography>
              <SF {...register('notes')} multiline rows={2}
                placeholder="Observations, conditions particulières…"
                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}><DescriptionOutlined sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* ── Footer ── */}
      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600,
            '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' } }}>
          Annuler
        </Button>
        <Button type="submit" form="contract-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#1D4ED8,#1E3A8A)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer le contrat' : 'Enregistrer'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────── DeleteDialog ── */

function DeleteDialog({ contract, onConfirm, onCancel }: {
  contract: Contract;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const emp = contract.employee;
  const meta = TYPE_META[contract.type as ContractType];
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer le contrat</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Voulez-vous vraiment supprimer le contrat de&nbsp;
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `#${contract.id}`}
          </Box>&nbsp;?
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '9px', bgcolor: '#FFF1F2', border: '1px solid #FECDD3' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={meta?.label ?? contract.type} size="small"
              sx={{ height: 20, fontSize: 11, fontWeight: 700, color: meta?.color, bgcolor: meta?.bg }} />
            <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
              Du {formatDate(contract.start_date)}{contract.end_date ? ` au ${formatDate(contract.end_date)}` : ' (durée indéterminée)'}
            </Typography>
          </Stack>
        </Box>
      </Box>
      <Box sx={{ px: 3, pb: 2.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13 }}>
          Annuler
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" size="small"
          sx={{ borderRadius: '9px', fontSize: 13, fontWeight: 700 }}>
          Supprimer
        </Button>
      </Box>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────── ContractTab ── */

export default function ContractTab() {
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editContract, setEditContract] = useState<Contract | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  const { data: rawContracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });
  const contracts = (rawContracts ?? []) as Contract[];

  const { data: rawEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ per_page: 500 }).then(r => {
      const d = r.data as unknown;
      if (Array.isArray(d)) return d as Employee[];
      const obj = d as { data?: Employee[] };
      return obj.data ?? [];
    }),
  });
  const employees = (rawEmployees ?? []) as Employee[];

  const deleteMut = useMutation({
    mutationFn: (id: number) => contractsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); setDeleteTarget(null); },
  });

  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null);
  const [pdfLabel,   setPdfLabel]   = useState('');

  const handleViewPdf = async (c: Contract) => {
    setPdfLoading(c.id);
    try {
      const res = await contractsApi.pdf(c.id);
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }));
      setPdfLabel(`Contrat ${c.type} — ${c.employee?.first_name ?? ''} ${c.employee?.last_name ?? ''}`);
      setPdfUrl(url);
    } finally {
      setPdfLoading(null);
    }
  };

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  };

  const openCreate = () => { setEditContract(undefined); setModalOpen(true); };
  const openEdit   = (c: Contract) => { setEditContract(c); setModalOpen(true); };

  /* ── Filtrage ── */
  const filtered = contracts.filter(c => {
    const emp = c.employee;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchLower)) ||
      (emp?.employee_number?.toLowerCase().includes(searchLower));
    const matchType   = typeFilter === 'all' || c.type === typeFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.is_active : !c.is_active);
    return matchSearch && matchType && matchStatus;
  });

  const totalActive   = contracts.filter(c => c.is_active).length;
  const totalInactive = contracts.filter(c => !c.is_active).length;

  return (
    <>
      {/* ── Barre outils ── */}
      <Box sx={{
        px: 2, py: 1.25,
        bgcolor: '#F8FAFC',
        borderBottom: '1.5px solid #E2E8F0',
        background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Recherche */}
          <TextField
            placeholder="Rechercher un agent…"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ bgcolor: '#fff', width: 220 }}
            InputProps={{
              sx: { fontSize: 12 },
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>,
            }}
          />

          {/* Filtre type */}
          <FormControl size="small" sx={{ minWidth: 140, bgcolor: '#fff' }}>
            <Select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as ContractType | 'all')}
              sx={{ fontSize: 12, borderRadius: '8px' }}
              displayEmpty
              renderValue={val => {
                if (val === 'all') return <Typography sx={{ fontSize: 12, color: '#64748B' }}>Tous les types</Typography>;
                const meta = TYPE_META[val as ContractType];
                return (
                  <Chip label={meta.label} size="small"
                    sx={{ height: 18, fontSize: 10.5, fontWeight: 700, color: meta.color, bgcolor: meta.bg, border: `1px solid ${meta.border}` }} />
                );
              }}
            >
              <MenuItem value="all" sx={{ fontSize: 12 }}>Tous les types</MenuItem>
              {CONTRACT_TYPES.map(t => {
                const meta = TYPE_META[t];
                return (
                  <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>
                    <Chip label={meta.label} size="small"
                      sx={{ height: 18, fontSize: 10.5, fontWeight: 700, color: meta.color, bgcolor: meta.bg, border: `1px solid ${meta.border}`, cursor: 'pointer' }} />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Toggle statut */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            {([['all', 'Tous', '#475569'], ['active', 'Actifs', '#059669'], ['inactive', 'Inactifs', '#DC2626']] as const).map(([val, lbl, clr]) => (
              <Box key={val} onClick={() => setStatusFilter(val)}
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

          {/* Actions droite */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid #E2E8F0', bgcolor: '#fff',
                  '&:hover': { color: ACCENT, bgcolor: '#EFF6FF', borderColor: '#BFDBFE' } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              startIcon={<Add sx={{ fontSize: '15px !important' }} />}
              onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)`,
                color: '#fff', fontWeight: 700, fontSize: 12,
                borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.4)}`,
                '&:hover': { background: 'linear-gradient(135deg,#1D4ED8,#1E3A8A)', transform: 'translateY(-1px)', boxShadow: `0 5px 14px ${alpha(ACCENT, 0.5)}` },
                transition: 'all 0.2s',
              }}>
              Nouveau contrat
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Barre info ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        px={2.5} py={0.875} sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#059669' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>Actif</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#DC2626' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>Inactif</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {filtered.length} contrat{filtered.length > 1 ? 's' : ''} · {totalActive} actif{totalActive > 1 ? 's' : ''} · {totalInactive} inactif{totalInactive > 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Stack>

      {/* ── Table ── */}
      <Box sx={{ bgcolor: '#F1F5F9', minHeight: 340, p: 2 }}>
        {isLoading ? (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton width={160} height={18} />
                <Skeleton width={60} height={20} sx={{ ml: 'auto' }} />
                <Skeleton width={80} height={18} />
                <Skeleton width={80} height={18} />
                <Skeleton width={90} height={18} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
              }}>
                <Assignment sx={{ fontSize: 36, color: '#CBD5E1' }} />
              </Box>
              <Box textAlign="center">
                <Typography fontWeight={700} color="text.secondary" fontSize={15}>
                  Aucun contrat trouvé
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {contracts.length === 0 ? 'Créez le premier contrat' : 'Modifiez vos critères de recherche'}
                </Typography>
              </Box>
              {contracts.length === 0 && (
                <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />}
                  onClick={openCreate}
                  sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600, borderColor: ACCENT, color: ACCENT }}>
                  Nouveau contrat
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Agent', 'Type', 'Début', 'Fin', 'Salaire', 'H/Sem', 'Statut', 'Actions'].map(h => (
                    <TableCell key={h} sx={{
                      fontSize: 11, fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '2px solid #E2E8F0', py: 1.25, px: 2,
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c, idx) => {
                  const emp    = c.employee;
                  const meta   = TYPE_META[c.type as ContractType];
                  const initials = emp ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase() : '??';
                  const isEven = idx % 2 === 0;

                  return (
                    <TableRow key={c.id}
                      sx={{
                        bgcolor: isEven ? '#fff' : '#FAFBFC',
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: '#EFF6FF' },
                        '&:last-child td': { border: 0 },
                      }}>

                      {/* Agent */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar sx={{
                            width: 34, height: 34, fontSize: 12.5, fontWeight: 800,
                            background: c.is_active
                              ? 'linear-gradient(135deg,#1D4ED8,#7C3AED)'
                              : 'linear-gradient(135deg,#94A3B8,#475569)',
                            boxShadow: c.is_active ? '0 3px 10px rgba(37,99,235,0.3)' : 'none',
                          }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                              {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${c.employee_id}`}
                            </Typography>
                            {emp?.employee_number && (
                              <Typography sx={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                                {emp.employee_number}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip
                          label={meta?.label ?? c.type}
                          size="small"
                          sx={{
                            height: 22, fontSize: 11, fontWeight: 700,
                            color: meta?.color, bgcolor: meta?.bg,
                            border: `1px solid ${meta?.border}`,
                          }}
                        />
                      </TableCell>

                      {/* Début */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{formatDate(c.start_date)}</Typography>
                      </TableCell>

                      {/* Fin */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        {c.end_date ? (
                          <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{formatDate(c.end_date)}</Typography>
                        ) : (
                          <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontStyle: 'italic' }}>Indéterminée</Typography>
                        )}
                      </TableCell>

                      {/* Salaire */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {formatSalary(c.salary)}
                        </Typography>
                      </TableCell>

                      {/* H/Sem */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <AccessTime sx={{ fontSize: 13, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: 12.5, color: '#334155' }}>{c.working_hours_per_week}h</Typography>
                        </Stack>
                      </TableCell>

                      {/* Statut */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Chip
                          icon={c.is_active
                            ? <CheckCircle sx={{ fontSize: '12px !important', color: '#059669 !important' }} />
                            : <Block sx={{ fontSize: '12px !important', color: '#DC2626 !important' }} />
                          }
                          label={c.is_active ? 'Actif' : 'Inactif'}
                          size="small"
                          sx={{
                            height: 22, fontSize: 11, fontWeight: 700,
                            bgcolor: c.is_active ? 'rgba(5,150,105,0.09)' : 'rgba(220,38,38,0.09)',
                            color: c.is_active ? '#059669' : '#DC2626',
                            border: `1px solid ${c.is_active ? 'rgba(5,150,105,0.28)' : 'rgba(220,38,38,0.28)'}`,
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Voir PDF" arrow>
                            <span>
                              <IconButton size="small" onClick={() => handleViewPdf(c)} disabled={pdfLoading === c.id}
                                sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF1F2', color: '#DC2626',
                                  '&:hover': { bgcolor: '#FEE2E2', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                <PictureAsPdf sx={{ fontSize: 14 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Modifier" arrow>
                            <IconButton size="small" onClick={() => openEdit(c)}
                              sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF7ED', color: '#F97316',
                                '&:hover': { bgcolor: '#FED7AA', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Edit sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer" arrow>
                            <IconButton size="small" onClick={() => setDeleteTarget(c)}
                              sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: '#FFF1F2', color: '#E11D48',
                                '&:hover': { bgcolor: '#FFE4E6', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Delete sx={{ fontSize: 14 }} />
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

      {/* ── Modals ── */}
      {modalOpen && (
        <ContractModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          contract={editContract}
          employees={employees}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          contract={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── PDF Viewer ── */}
      <Dialog open={!!pdfUrl} onClose={closePdf} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: '14px', height: '92vh', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2.5, borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdf sx={{ fontSize: 18, color: '#DC2626' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{pdfLabel}</Typography>
          </Box>
          <IconButton size="small" onClick={closePdf} sx={{ color: '#64748B' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flexGrow: 1, overflow: 'hidden' }}>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Contrat PDF"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
