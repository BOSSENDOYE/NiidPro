import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Stack, TextField, Chip,
  Dialog, DialogContent, Grid, MenuItem, Select,
  FormControl, IconButton, Tooltip, Skeleton, Avatar,
  InputAdornment, alpha, Autocomplete, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Refresh, Close, Save,
  Gavel, CalendarMonth, Person, AttachFile,
  WarningAmber, BlockOutlined, ArrowDownward, RemoveCircleOutline,
  GavelOutlined, HelpOutline, CheckCircleOutline,
  PictureAsPdf, Image as ImageIcon, Download,
} from '@mui/icons-material';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { sanctionsApi } from '../../api/sanctions';
import { employeesApi } from '../../api/employees';
import { formatDate } from '../../utils/format';
import type { Sanction, Employee } from '../../types';

/* ─── Palette ─── */
const ACCENT = '#EF4444';

/* ─── Méta types de sanction ─── */
const TYPE_META: Record<Sanction['type'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  avertissement: { label: 'Avertissement',    color: '#F59E0B', bg: '#FEF3C7', icon: <WarningAmber /> },
  blame:         { label: 'Blâme',            color: '#EA580C', bg: '#FFF7ED', icon: <BlockOutlined /> },
  mise_a_pied:   { label: 'Mise à pied',      color: '#DC2626', bg: '#FEE2E2', icon: <RemoveCircleOutline /> },
  retrogradation:{ label: 'Rétrogradation',   color: '#7C3AED', bg: '#EDE9FE', icon: <ArrowDownward /> },
  licenciement:  { label: 'Licenciement',     color: '#7F1D1D', bg: '#FEE2E2', icon: <GavelOutlined /> },
  autre:         { label: 'Autre',            color: '#475569', bg: '#F1F5F9', icon: <HelpOutline /> },
};

const STATUS_META = {
  active: { label: 'Active',  color: '#DC2626', bg: '#FEE2E2' },
  lifted: { label: 'Levée',   color: '#059669', bg: '#D1FAE5' },
};

/* ─── Schéma validation ─── */
const schema = z.object({
  employee_id:   z.number().min(1),
  type:          z.enum(['avertissement','blame','mise_a_pied','retrogradation','licenciement','autre']),
  reason:        z.string().min(1, 'Motif requis'),
  sanction_date: z.string().min(1, 'Date requise'),
  start_date:    z.string().optional(),
  end_date:      z.string().optional(),
  duration_days: z.coerce.number().optional(),
  decided_by:    z.string().optional(),
  reference:     z.string().optional(),
  status:        z.enum(['active','lifted']),
  notes:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ═══════════════════════════════
   MODAL CRÉATION / MODIFICATION
   ═══════════════════════════════ */
function SanctionModal({ open, onClose, sanction, employees }: {
  open: boolean; onClose: () => void; sanction?: Sanction; employees: Employee[];
}) {
  const qc   = useQueryClient();
  const mode = sanction ? 'edit' : 'create';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: sanction ? {
      employee_id:   sanction.employee_id,
      type:          sanction.type,
      reason:        sanction.reason,
      sanction_date: sanction.sanction_date,
      start_date:    sanction.start_date ?? '',
      end_date:      sanction.end_date ?? '',
      duration_days: sanction.duration_days,
      decided_by:    sanction.decided_by ?? '',
      reference:     sanction.reference ?? '',
      status:        sanction.status,
      notes:         sanction.notes ?? '',
    } : {
      type: 'avertissement',
      status: 'active',
      sanction_date: new Date().toISOString().split('T')[0],
    },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData & { document?: File }) => sanctionsApi.create({ ...d, document: file ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sanctions'] }); handleClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData & { document?: File }) =>
      sanctionsApi.update(sanction!.id, { ...d, document: file ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sanctions'] }); handleClose(); },
  });

  const mutation  = mode === 'edit' ? updateMut : createMut;
  const mutError  = mutation.error as { response?: { data?: { message?: string } } } | null;
  const handleClose = () => { reset(); setFile(null); onClose(); };

  const watchType = watch('type');
  const tc        = TYPE_META[watchType] ?? TYPE_META.avertissement;
  const defaultEmp = sanction ? employees.find(e => e.id === sanction.employee_id) ?? null : null;
  const needsDates = ['mise_a_pied'].includes(watchType);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '9px', fontSize: 13,
      '&:hover fieldset':  { borderColor: tc.color },
      '&.Mui-focused fieldset': { borderColor: tc.color, borderWidth: 2 },
    },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15,23,42,0.28)' } }}>

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #7F1D1D 60%, #1E293B 100%)',
        px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 40%, rgba(239,68,68,0.2) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '11px',
              background: `linear-gradient(135deg, ${ACCENT}, #B91C1C)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 16px ${alpha(ACCENT, 0.45)}`,
            }}>
              <Gavel sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                {mode === 'create' ? 'Nouvelle sanction disciplinaire' : 'Modifier la sanction'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11.5 }}>
                {mode === 'create' ? 'Enregistrer une sanction pour un agent' : `#${sanction?.id} · ${sanction?.reference ?? 'sans référence'}`}
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
        <Box component="form" id="sanction-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <Grid container spacing={2}>

            {/* Agent */}
            <Grid item xs={12} md={8}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Agent sanctionné *
              </Typography>
              <Controller name="employee_id" control={control} render={({ field }) => (
                <Autocomplete
                  options={employees} defaultValue={defaultEmp}
                  getOptionLabel={emp => `${emp.first_name} ${emp.last_name} — ${emp.employee_number}`}
                  filterOptions={(opts, { inputValue }) => {
                    const q = inputValue.trim();
                    if (q.length < 2) return [];
                    const ql = q.toLowerCase();
                    return opts.filter(e =>
                      e.employee_number.toLowerCase().includes(ql) ||
                      (e.phone_professional ?? e.phone ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                      (e.phone_personal ?? '').replace(/\s+/g, '').toLowerCase().includes(ql.replace(/\s+/g, '')) ||
                      e.first_name.toLowerCase().startsWith(ql)
                    );
                  }}
                  onChange={(_, val) => field.onChange(val ? val.id : null)}
                  noOptionsText="Tapez 2 caractères (matricule, téléphone ou prénom)…"
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
                />
              )} />
            </Grid>

            {/* Référence */}
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                N° Référence <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(opt.)</Box>
              </Typography>
              <TextField fullWidth size="small" {...register('reference')}
                placeholder="Ex : REF/SAN/2026/001" sx={inputSx} />
            </Grid>

            {/* Type */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Type de sanction *
              </Typography>
              <Controller name="type" control={control} render={({ field }) => (
                <FormControl fullWidth size="small">
                  <Select {...field} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}
                    renderValue={val => {
                      const tm = TYPE_META[val as Sanction['type']];
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

            {/* Statut */}
            <Grid item xs={12} sm={6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Statut
              </Typography>
              <Controller name="status" control={control} render={({ field }) => (
                <FormControl fullWidth size="small">
                  <Select {...field} sx={{ borderRadius: '9px', bgcolor: '#fff', fontSize: 13 }}>
                    <MenuItem value="active">
                      <Chip label="Active" size="small" sx={{ fontSize: 11, fontWeight: 700, color: '#DC2626', bgcolor: '#FEE2E2' }} />
                    </MenuItem>
                    <MenuItem value="lifted">
                      <Chip label="Levée" size="small" sx={{ fontSize: 11, fontWeight: 700, color: '#059669', bgcolor: '#D1FAE5' }} />
                    </MenuItem>
                  </Select>
                </FormControl>
              )} />
            </Grid>

            {/* Date sanction */}
            <Grid item xs={12} sm={needsDates ? 4 : 6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Date de décision *</Typography>
              <TextField fullWidth size="small" type="date" {...register('sanction_date')}
                InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                error={!!errors.sanction_date} helperText={errors.sanction_date?.message} sx={inputSx} />
            </Grid>

            {needsDates && (
              <>
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Début mise à pied</Typography>
                  <TextField fullWidth size="small" type="date" {...register('start_date')}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                    sx={inputSx} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Fin mise à pied</Typography>
                  <TextField fullWidth size="small" type="date" {...register('end_date')}
                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                    sx={inputSx} />
                </Grid>
              </>
            )}

            {/* Durée + Décideur */}
            <Grid item xs={12} sm={needsDates ? 6 : 6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Durée (jours) <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(opt.)</Box>
              </Typography>
              <TextField fullWidth size="small" type="number" {...register('duration_days')}
                placeholder="Ex : 3" sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={needsDates ? 6 : 6}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Décidé par <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(opt.)</Box>
              </Typography>
              <TextField fullWidth size="small" {...register('decided_by')}
                placeholder="Ex : Direction RH, Directeur Général…"
                InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }}
                sx={inputSx} />
            </Grid>

            {/* Motif */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Motif / Faits reprochés *</Typography>
              <TextField fullWidth size="small" multiline rows={3} {...register('reason')}
                placeholder="Décrire les faits ayant conduit à la sanction…"
                error={!!errors.reason} helperText={errors.reason?.message} sx={inputSx} />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Notes complémentaires <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(opt.)</Box>
              </Typography>
              <TextField fullWidth size="small" multiline rows={2} {...register('notes')}
                placeholder="Remarques, suivi, conditions de levée de la sanction…" sx={inputSx} />
            </Grid>

            {/* Pièce jointe */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                Document officiel <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400 }}>(opt.)</Box>
              </Typography>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                  border: `1.5px solid ${alpha(ACCENT, 0.4)}`, borderRadius: '9px', bgcolor: '#FFF1F2' }}>
                  {file.type.startsWith('image/') ? (
                    <ImageIcon sx={{ color: ACCENT, fontSize: 22 }} />
                  ) : (
                    <PictureAsPdf sx={{ color: '#DC2626', fontSize: 22 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#7F1D1D' }} noWrap>{file.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{(file.size / 1024).toFixed(0)} Ko</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setFile(null)} sx={{ color: ACCENT }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box onClick={() => fileInputRef.current?.click()} sx={{
                  border: '2px dashed #CBD5E1', borderRadius: '9px', p: 2, textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  '&:hover': { borderColor: ACCENT, bgcolor: '#FFF1F2' },
                }}>
                  <AttachFile sx={{ color: '#94A3B8', fontSize: 24, mb: 0.25 }} />
                  <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Joindre un document officiel</Typography>
                  <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>PDF, JPG, PNG — 5 Mo max</Typography>
                </Box>
              )}
              {sanction?.file_url && !file && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 11, color: '#64748B' }}>Document actuel :</Typography>
                  <Button size="small" variant="text" component="a" href={sanction.file_url} target="_blank"
                    startIcon={<Download sx={{ fontSize: '12px !important' }} />}
                    sx={{ fontSize: 11, color: ACCENT, p: 0.25 }}>Voir</Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleClose} variant="outlined" size="small"
          sx={{ borderRadius: '9px', borderColor: '#E2E8F0', color: '#64748B', fontSize: 13, fontWeight: 600 }}>
          Annuler
        </Button>
        <Button type="submit" form="sanction-form" variant="contained" size="small"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? undefined : <Save sx={{ fontSize: '15px !important' }} />}
          sx={{
            background: `linear-gradient(135deg, ${ACCENT}, #B91C1C)`,
            borderRadius: '9px', fontSize: 13, fontWeight: 700, px: 2.5,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            '&:hover': { background: 'linear-gradient(135deg,#B91C1C,#991B1B)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s',
          }}>
          {mutation.isPending ? 'Enregistrement…' : mode === 'create' ? 'Enregistrer la sanction' : 'Mettre à jour'}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ═══════════════════════════════
   DIALOG SUPPRESSION
   ═══════════════════════════════ */
function DeleteDialog({ sanction, onConfirm, onCancel }: {
  sanction: Sanction; onConfirm: () => void; onCancel: () => void;
}) {
  const tm  = TYPE_META[sanction.type];
  const emp = sanction.employee;
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', px: 3, py: 2.5 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15.5 }}>Supprimer la sanction</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Cette action est irréversible</Typography>
      </Box>
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: '#0F172A', mb: 1.5 }}>
          Supprimer la sanction de{' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            {emp ? `${emp.first_name} ${emp.last_name}` : `Agent #${sanction.employee_id}`}
          </Box> ?
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '9px', bgcolor: tm.bg, border: `1px solid ${alpha(tm.color, 0.3)}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ color: tm.color, display: 'flex', '& svg': { fontSize: '15px !important' } }}>{tm.icon}</Box>
            <Typography sx={{ fontSize: 12.5, color: tm.color, fontWeight: 700 }}>
              {tm.label} · {formatDate(sanction.sanction_date)}
            </Typography>
          </Stack>
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

/* ═══════════════════════════════
   ONGLET PRINCIPAL
   ═══════════════════════════════ */
export default function SanctionTab() {
  const qc = useQueryClient();

  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState<Sanction['type']|'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'lifted'>('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editItem,     setEditItem]     = useState<Sanction|undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Sanction|null>(null);

  const { data: sanctions = [], isLoading, refetch } = useQuery({
    queryKey: ['sanctions'],
    queryFn: () => sanctionsApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? (d as Sanction[]) : ((d as { data?: Sanction[] }).data ?? []);
    }),
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
    mutationFn: (id: number) => sanctionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sanctions'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setEditItem(undefined); setModalOpen(true); };
  const openEdit   = (s: Sanction) => { setEditItem(s); setModalOpen(true); };

  const filtered = sanctions.filter(s => {
    const emp = s.employee;
    const q   = search.toLowerCase();
    const matchSearch = !search ||
      (emp && `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q)) ||
      (emp?.employee_number?.toLowerCase().includes(q)) ||
      s.reason.toLowerCase().includes(q) ||
      (s.reference?.toLowerCase().includes(q)) ||
      (s.decided_by?.toLowerCase().includes(q));
    return matchSearch &&
      (typeFilter   === 'all' || s.type   === typeFilter) &&
      (statusFilter === 'all' || s.status === statusFilter);
  });

  /* stats */
  const typeCounts = Object.fromEntries(
    Object.keys(TYPE_META).map(k => [k, sanctions.filter(s => s.type === k).length])
  );

  return (
    <>
      {/* ════ EN-TÊTE ════ */}
      <Box sx={{
        px: 2, py: 1.5,
        background: 'linear-gradient(135deg, #0F172A 0%, #7F1D1D 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(239,68,68,0.16) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: `linear-gradient(135deg, ${ACCENT}, #B91C1C)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(ACCENT, 0.45)}`,
            }}>
              <Gavel sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14.5 }}>Sanctions Disciplinaires</Typography>
              <Typography sx={{ color: '#64748B', fontSize: 11 }}>
                {sanctions.length} sanction{sanctions.length > 1 ? 's' : ''} enregistrée{sanctions.length > 1 ? 's' : ''}
                {sanctions.filter(s => s.status === 'active').length > 0 && (
                  <Box component="span" sx={{ color: ACCENT, fontWeight: 700, ml: 1 }}>
                    · {sanctions.filter(s => s.status === 'active').length} active{sanctions.filter(s => s.status === 'active').length > 1 ? 's' : ''}
                  </Box>
                )}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75}>
            <Tooltip title="Actualiser" arrow>
              <IconButton size="small" onClick={() => refetch()}
                sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { color: ACCENT, bgcolor: alpha(ACCENT, 0.1), borderColor: alpha(ACCENT, 0.4) } }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<Add sx={{ fontSize: '15px !important' }} />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${ACCENT}, #B91C1C)`,
                color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                boxShadow: `0 3px 10px ${alpha(ACCENT, 0.5)}`,
                '&:hover': { background: 'linear-gradient(135deg,#B91C1C,#991B1B)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}>
              Nouvelle sanction
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ════ BARRE FILTRES ════ */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0',
        background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField placeholder="Rechercher agent, motif, référence…" size="small" value={search}
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
              <Tooltip key={k} title={`${tm.label} (${typeCounts[k] ?? 0})`} arrow>
                <Box onClick={() => setTypeFilter(k as Sanction['type'])}
                  sx={{ px: 1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: '3px',
                    bgcolor: typeFilter === k ? tm.color : 'transparent', color: typeFilter === k ? '#fff' : tm.color,
                    transition: 'all .15s', '&:hover': { bgcolor: typeFilter === k ? tm.color : alpha(tm.color, 0.12) },
                    '& svg': { fontSize: '13px !important' } }}>
                  {tm.icon}
                  {typeCounts[k] > 0 && (
                    <Typography sx={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{typeCounts[k]}</Typography>
                  )}
                </Box>
              </Tooltip>
            ))}
          </Stack>

          {/* Filtre statut */}
          <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
            {(['all', 'active', 'lifted'] as const).map(val => {
              const lbl = val === 'all' ? 'Tous' : STATUS_META[val].label;
              const clr = val === 'all' ? '#475569' : STATUS_META[val].color;
              return (
                <Box key={val} onClick={() => setStatusFilter(val)}
                  sx={{ px: 1.1, py: 0.3, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    bgcolor: statusFilter === val ? clr : 'transparent', color: statusFilter === val ? '#fff' : clr,
                    transition: 'all .15s', '&:hover': { bgcolor: statusFilter === val ? clr : `${clr}18` } }}>
                  {lbl}
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</Typography>
        </Stack>
      </Box>

      {/* ════ STATS BAR ════ */}
      <Stack direction="row" alignItems="center" px={2.5} py={0.875}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(TYPE_META).map(([key, tm]) => (
          <Stack key={key} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ color: tm.color, display: 'flex', '& svg': { fontSize: '12px !important' } }}>{tm.icon}</Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>
              {tm.label}&nbsp;<Box component="span" sx={{ fontWeight: 800, color: tm.color }}>{typeCounts[key] ?? 0}</Box>
            </Typography>
          </Stack>
        ))}
        <Box sx={{ ml: 'auto' }}>
          <Stack direction="row" spacing={1.5}>
            {(['active','lifted'] as const).map(s => (
              <Stack key={s} direction="row" spacing={0.5} alignItems="center">
                <CheckCircleOutline sx={{ fontSize: 12, color: STATUS_META[s].color }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: STATUS_META[s].color }}>
                  {STATUS_META[s].label}&nbsp;{sanctions.filter(x => x.status === s).length}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>

      {/* ════ TABLE ════ */}
      <Box sx={{ bgcolor: '#F1F5F9', minHeight: 340, p: 2 }}>
        {isLoading ? (
          <Box sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ px: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
                <Skeleton height={20} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <Box sx={{ width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>
                <Gavel sx={{ fontSize: 36, color: '#CBD5E1' }} />
              </Box>
              <Box textAlign="center">
                <Typography fontWeight={700} color="text.secondary" fontSize={15}>Aucune sanction trouvée</Typography>
                <Typography variant="caption" color="text.disabled">
                  {sanctions.length === 0 ? 'Aucune sanction enregistrée' : 'Modifiez vos critères de recherche'}
                </Typography>
              </Box>
              {sanctions.length === 0 && (
                <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={openCreate}
                  sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600, borderColor: ACCENT, color: ACCENT }}>
                  Enregistrer une sanction
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  {['N°','Réf.','Agent','Service','Type','Date décision','Durée','Décidé par','Document','Statut','Actions'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', py: 1.1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s, idx) => {
                  const tm = TYPE_META[s.type];
                  const sm = STATUS_META[s.status];
                  const emp = s.employee;
                  return (
                    <TableRow key={s.id} hover sx={{
                      bgcolor: idx % 2 === 0 ? '#fff' : '#F8FAFC',
                      '&:hover': { bgcolor: '#FFF1F2' },
                    }}>
                      <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>
                        {s.reference ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 800,
                            background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', flexShrink: 0 }}>
                            {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                              {emp ? `${emp.first_name} ${emp.last_name}` : `#${s.employee_id}`}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                              {emp?.employee_number}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#64748B' }}>{emp?.department?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<Box sx={{ color: `${tm.color} !important`, display: 'flex', '& svg': { fontSize: '12px !important' } }}>{tm.icon}</Box>}
                          label={tm.label} size="small"
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, color: tm.color, bgcolor: tm.bg }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(s.sanction_date)}</TableCell>
                      <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>
                        {s.duration_days ? (
                          <Chip label={`${s.duration_days}j`} size="small"
                            sx={{ fontSize: 10, height: 18, fontWeight: 800, color: '#DC2626', bgcolor: '#FEE2E2' }} />
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 140 }}>
                        <Typography sx={{ fontSize: 11, color: '#475569' }} noWrap>{s.decided_by ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {s.file_url ? (
                          <Tooltip title="Voir le document" arrow>
                            <IconButton size="small" onClick={() => window.open(s.file_url, '_blank')}
                              sx={{ color: ACCENT }}>
                              <AttachFile sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        ) : <Typography sx={{ fontSize: 11, color: '#CBD5E1' }}>—</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} size="small"
                          sx={{ fontSize: 10, height: 20, fontWeight: 700, color: sm.color, bgcolor: sm.bg }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Modifier" arrow>
                            <IconButton size="small" onClick={() => openEdit(s)}
                              sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(249,115,22,0.1)', color: '#F97316',
                                '&:hover': { bgcolor: 'rgba(249,115,22,0.2)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Edit sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer" arrow>
                            <IconButton size="small" onClick={() => setDeleteTarget(s)}
                              sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(220,38,38,0.1)', color: '#DC2626',
                                '&:hover': { bgcolor: 'rgba(220,38,38,0.2)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                              <Delete sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ── Dialogs ── */}
      {modalOpen && (
        <SanctionModal open={modalOpen} onClose={() => setModalOpen(false)}
          sanction={editItem} employees={employees} />
      )}
      {deleteTarget && (
        <DeleteDialog sanction={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
