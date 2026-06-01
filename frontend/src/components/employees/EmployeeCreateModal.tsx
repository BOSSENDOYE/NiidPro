import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, Box, Typography, Button, TextField, Grid, MenuItem,
  Stack, Avatar, IconButton, Tooltip, FormControl,
  Select, InputAdornment, Chip, CircularProgress, Alert, alpha,
  Tabs, Tab, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Close, Save, CameraAlt, Add, Delete, Search as SearchIcon,
  Autorenew, Groups, Folder, BarChart, Person, Work,
  ContactEmergency, FamilyRestroom, School,
  AttachFile, CheckCircle, Edit, RemoveRedEye,
  AccountBalance, HealthAndSafety, Home,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';
import type { Employee } from '../../types';

/* ─── Types ─── */
interface TableRow { id: string; [col: string]: string }
interface DocRow   { id: string; type: string; libelle: string; description: string; extension: string; fileName: string }

/* ─── Zod schema ─── */
const schema = z.object({
  first_name:         z.string().min(1, 'Prénom requis'),
  last_name:          z.string().min(1, 'Nom requis'),
  professional_email: z.string().email('Email invalide'),
  phone:              z.string().optional(),
  hire_date:          z.string().min(1, 'Date requise'),
  birth_date:         z.string().optional(),
  nationality:        z.string().optional(),
  gender:             z.string().optional(),
  base_salary:        z.number({ coerce: true }).min(0),
  department_id:      z.number({ coerce: true }).min(1, 'Service requis'),
  status:             z.enum(['active', 'inactive', 'suspended']),
  annual_leave_days:  z.number({ coerce: true }).min(0),
  employee_number:    z.string().optional(),
  city:               z.string().optional(),
  country:            z.string().optional(),
  birth_place:        z.string().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─── Tabs config ─── */
const TABS = [
  { label: 'Filiations',              icon: <Person           fontSize="small" />, color: '#F97316' },
  { label: 'Autres infos',            icon: <ContactEmergency fontSize="small" />, color: '#2563EB' },
  { label: 'Conjoints/Enfants',       icon: <FamilyRestroom   fontSize="small" />, color: '#7C3AED' },
  { label: 'Diplômes/Qualif.',        icon: <School           fontSize="small" />, color: '#059669' },
  { label: 'Catégories/Postes',       icon: <Work             fontSize="small" />, color: '#D97706' },
  { label: 'Documents',               icon: <Folder           fontSize="small" />, color: '#0891B2' },
  { label: 'Info par indice',         icon: <BarChart         fontSize="small" />, color: '#9333EA' },
];

/* ─── Table row helpers ─── */
function newRow(): TableRow { return { id: `${Date.now()}-${Math.random()}` }; }
function newDoc(): DocRow   { return { id: `${Date.now()}-${Math.random()}`, type: '', libelle: '', description: '', extension: 'PDF', fileName: '' }; }
function addRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>) { setter(p => [...p, newRow()]); }
function removeRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>, id: string) { setter(p => p.filter(r => r.id !== id)); }
function updateRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>, id: string, col: string, val: string) {
  setter(p => p.map(r => r.id === id ? { ...r, [col]: val } : r));
}

/* ─── Shared input style ─── */
const inputSx = {
  bgcolor: '#fff',
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', fontSize: 13,
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#93C5FD' },
    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '2px' },
    '&.Mui-disabled': { bgcolor: '#F8FAFC' },
  },
};
const labelSx = {
  fontSize: 10.5, fontWeight: 700, color: '#64748B',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em', display: 'block', mb: 0.5,
};

const SF = (props: React.ComponentProps<typeof TextField>) => (
  <TextField size="small" fullWidth {...props} sx={{ ...inputSx, ...props.sx }} />
);

/* ─── Section Box ─── */
const SectionBox = ({ title, color = '#2563EB', icon, children }: {
  title: string; color?: string; icon?: React.ReactNode; children: React.ReactNode
}) => (
  <Box sx={{
    border: '1px solid #E8EDF2',
    borderLeft: `3.5px solid ${color}`,
    borderRadius: '0 12px 12px 12px',
    p: 2, mb: 2, bgcolor: '#FAFBFC',
    boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
  }}>
    <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5}>
      {icon && <Box sx={{ color, display: 'flex', '& svg': { fontSize: 15 } }}>{icon}</Box>}
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
);

/* ─── Group Label ─── */
const GL = ({ color = '#2563EB', icon, children }: { color?: string; icon?: React.ReactNode; children: string }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} mb={1} mt={0.5}>
    {icon && <Box sx={{ color, display: 'flex', '& svg': { fontSize: 14 } }}>{icon}</Box>}
    <Typography sx={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </Typography>
  </Stack>
);

/* ─── Table Header Cell ─── */
const TH = ({ children, width }: { children?: React.ReactNode; width?: number | string }) => (
  <TableCell sx={{
    bgcolor: '#1E293B', color: '#94A3B8', fontSize: 9.5, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    py: 1, px: 1, borderColor: '#334155', whiteSpace: 'nowrap',
    width,
  }}>
    {children}
  </TableCell>
);

/* ─── Editable cell ─── */
const EditCell = ({ value, onChange, placeholder, type = 'text', select, options, readOnly }:
  { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; select?: boolean; options?: string[]; readOnly?: boolean }) => (
  <TableCell sx={{ py: 0.35, px: 0.6, borderColor: '#F1F5F9' }}>
    {select && options ? (
      <Select value={value} onChange={e => onChange(e.target.value)} size="small" displayEmpty disabled={readOnly}
        sx={{ fontSize: 12, height: 30, minWidth: 90, bgcolor: readOnly ? '#F8FAFC' : '#fff', borderRadius: '8px', '& fieldset': { borderColor: '#E2E8F0' }, '&:hover fieldset': { borderColor: '#93C5FD' } }}>
        <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal' }}>—</em></MenuItem>
        {options.map(o => <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>)}
      </Select>
    ) : (
      <TextField value={value} onChange={e => onChange(e.target.value)}
        size="small" fullWidth type={type} placeholder={readOnly ? '' : placeholder} disabled={readOnly}
        sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, height: 30, borderRadius: '8px', bgcolor: readOnly ? '#F8FAFC' : '#fff', '& fieldset': { borderColor: '#E2E8F0' }, '&:hover fieldset': { borderColor: '#93C5FD' }, '&.Mui-focused fieldset': { borderColor: '#2563EB' } } }}
      />
    )}
  </TableCell>
);

/* ─── Dynamic table with visible Add button ─── */
interface DynTableProps {
  cols: { key: string; label: string; width?: number | string; select?: boolean; options?: string[]; type?: string }[];
  rows: TableRow[];
  setter: React.Dispatch<React.SetStateAction<TableRow[]>>;
  emptyMsg?: string;
  color?: string;
  readOnly?: boolean;
}
function DynTable({ cols, rows, setter, emptyMsg, color = '#4ADE80', readOnly }: DynTableProps) {
  return (
    <Box mb={2}>
      <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {cols.map(c => <TH key={c.key} width={c.width}>{c.label}</TH>)}
              {!readOnly && <TH width={40} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols.length + (readOnly ? 0 : 1)}
                  sx={{ textAlign: 'center', py: 3.5, color: '#94A3B8', fontSize: 12, bgcolor: '#FAFBFC' }}>
                  <Stack alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Add sx={{ fontSize: 20, color }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                      {emptyMsg ?? 'Aucune entrée — cliquez « Ajouter une ligne » ci-dessous'}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#FAFBFC', '&:hover': { bgcolor: `${color}08` } }}>
                {cols.map(c => (
                  <EditCell key={c.key}
                    value={row[c.key] ?? ''}
                    onChange={v => updateRow(setter, row.id, c.key, v)}
                    type={c.type} select={c.select} options={c.options} readOnly={readOnly}
                  />
                ))}
                {!readOnly && (
                  <TableCell sx={{ py: 0.35, px: 0.6, borderColor: '#F1F5F9', width: 40 }}>
                    <IconButton size="small" onClick={() => removeRow(setter, row.id)}
                      sx={{ color: '#DC2626', bgcolor: '#FFF5F5', borderRadius: '7px', width: 26, height: 26, '&:hover': { bgcolor: '#FEE2E2', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                      <Delete sx={{ fontSize: 13 }} />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {!readOnly && (
        <Button fullWidth startIcon={<Add sx={{ fontSize: 17 }} />} onClick={() => addRow(setter)}
          sx={{
            mt: 0.75, py: 0.9, borderRadius: '10px',
            border: `1.5px dashed ${color}`,
            color, bgcolor: `${color}0D`,
            fontWeight: 700, fontSize: 12.5, letterSpacing: '0.02em',
            transition: 'all .16s',
            '&:hover': { bgcolor: `${color}1A`, borderStyle: 'solid', transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${color}30` },
          }}>
          Ajouter une ligne
        </Button>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════ */
type ModalMode = 'create' | 'edit' | 'view';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: ModalMode;
  employee?: Employee;
}

const MODE_CONFIG: Record<ModalMode, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  create: { label: 'Nouveau dossier',  color: '#F97316', bg: 'rgba(249,115,22,0.15)',  icon: <Groups sx={{ fontSize: 22 }} /> },
  edit:   { label: 'Modification',     color: '#2563EB', bg: 'rgba(37,99,235,0.15)',   icon: <Edit sx={{ fontSize: 22 }} /> },
  view:   { label: 'Consultation',     color: '#059669', bg: 'rgba(5,150,105,0.15)',   icon: <RemoveRedEye sx={{ fontSize: 22 }} /> },
};

/* Construit les defaultValues du formulaire depuis un Employee existant */
function empToForm(e: Employee): FormData {
  return {
    first_name:         e.first_name        ?? '',
    last_name:          e.last_name         ?? '',
    professional_email: e.professional_email ?? '',
    phone:              e.phone             ?? '',
    hire_date:          (e.hire_date        ?? '').slice(0, 10),
    birth_date:         '',
    nationality:        '',
    gender:             '',
    base_salary:        Number(e.base_salary)      || 0,
    department_id:      Number(e.department_id)    || 0,
    status:             (e.status as FormData['status']) ?? 'active',
    annual_leave_days:  Number(e.annual_leave_days) || 30,
    employee_number:    e.employee_number   ?? '',
    city:               e.city             ?? '',
    country:            e.country          ?? '',
    birth_place:        '',
  };
}

export default function EmployeeCreateModal({ open, onClose, mode = 'create', employee }: Props) {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const isView  = mode === 'view';
  const mCfg    = MODE_CONFIG[mode];

  const [tab,       setTab]       = useState(0);
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(employee?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [age,       setAge]       = useState<number | null>(null);

  /* ── Table states ── */
  const [familyRows,  setFamilyRows]  = useState<TableRow[]>([]);
  const [diplomas,    setDiplomas]    = useState<TableRow[]>([]);
  const [quals,       setQuals]       = useState<TableRow[]>([]);
  const [categories,  setCategories]  = useState<TableRow[]>([]);
  const [postings,    setPostings]    = useState<TableRow[]>([]);
  const [documents,   setDocuments]   = useState<DocRow[]>([]);

  /* ── Doc handlers ── */
  const addDoc    = () => setDocuments(p => [...p, newDoc()]);
  const removeDoc = (id: string) => setDocuments(p => p.filter(d => d.id !== id));
  const updateDoc = (id: string, field: keyof DocRow, val: string) =>
    setDocuments(p => p.map(d => d.id === id ? { ...d, [field]: val } : d));
  const handleDocFile = (id: string, file: File | null) => { if (file) updateDoc(id, 'fileName', file.name); };

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  /* ── Formulaire : defaultValues calculés immédiatement depuis employee ── */
  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: employee && mode !== 'create' ? empToForm(employee) : { status: 'active', annual_leave_days: 30, base_salary: 0 },
    mode: 'onSubmit',
  });

  const uploadPhoto = async (employeeId: number) => {
    if (!photoFile) return;
    try {
      await employeesApi.uploadPhoto(employeeId, photoFile);
    } catch {
      // photo upload failure is non-blocking
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '')) as Partial<FormData>;
      return employeesApi.create(clean as FormData);
    },
    onSuccess: async (res) => {
      await uploadPhoto(res.data.id);
      qc.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '')) as Partial<FormData>;
      return employeesApi.update(employee!.id, clean as FormData);
    },
    onSuccess: async () => {
      await uploadPhoto(employee!.id);
      qc.invalidateQueries({ queryKey: ['employees'] });
      handleClose();
    },
  });

  const mutation = mode === 'edit' ? updateMutation : createMutation;
  const mutError = mutation.error as { response?: { data?: { message?: string } } } | null;
  const watched  = watch();
  const initials = `${watched.first_name?.[0] ?? ''}${watched.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const deptName = departments?.find((d: { id: number; name: string }) => d.id === Number(watched.department_id))?.name ?? '—';

  const handleClose = () => {
    reset(); setTab(0); setPhotoUrl(null); setPhotoFile(null); setAge(null);
    setFamilyRows([]); setDiplomas([]); setQuals([]);
    setCategories([]); setPostings([]); setDocuments([]);
    onClose();
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      setPhotoUrl(URL.createObjectURL(f));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: '100%', md: 960 }, maxWidth: '98vw', maxHeight: '97vh',
          borderRadius: '22px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 40px 100px rgba(15,23,42,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
        },
      }}
    >
      <>

        {/* ══ HEADER ══ */}
        <Box sx={{
          background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#0B1120 100%)',
          px: 3, py: 2, flexShrink: 0, position: 'relative', overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 10% 60%,${mCfg.color}22 0%,transparent 55%), radial-gradient(ellipse at 90% 20%,rgba(37,99,235,.1) 0%,transparent 45%)`,
          },
        }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Mode icon */}
                <Box sx={{
                  width: 46, height: 46, borderRadius: '13px',
                  background: `linear-gradient(135deg,${mCfg.color},${mCfg.color}CC)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 18px ${mCfg.color}50`, flexShrink: 0,
                }}>
                  <Box sx={{ color: '#fff' }}>{mCfg.icon}</Box>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
                      GRH · Gestion Agent
                    </Typography>
                    <Chip label={mCfg.label} size="small"
                      sx={{ height: 20, fontSize: 9.5, fontWeight: 700, bgcolor: mCfg.bg, color: mCfg.color, border: `1px solid ${mCfg.color}40`, letterSpacing: '0.05em' }} />
                  </Stack>
                  {mode !== 'create' && employee ? (
                    <Typography sx={{ color: '#475569', fontSize: 11, mt: 0.25 }}>
                      {employee.full_name} · {employee.employee_number}
                    </Typography>
                  ) : (
                    <Typography sx={{ color: '#475569', fontSize: 11, mt: 0.25 }}>Dossier de création · Nouvel agent</Typography>
                  )}
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                {!isView && (
                  <Button size="small" type="submit" form="agent-form"
                    startIcon={mutation.isPending ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: '14px !important' }} />}
                    disabled={mutation.isPending}
                    sx={{ bgcolor: mCfg.color, color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: '10px', px: 2.5, boxShadow: `0 3px 10px ${mCfg.color}50`, '&:hover': { filter: 'brightness(0.92)' } }}>
                    {mutation.isPending ? 'Enregistrement…' : (mode === 'edit' ? 'Mettre à jour' : 'Enregistrer')}
                  </Button>
                )}
                {!isView && (
                  <Button size="small" startIcon={<Autorenew sx={{ fontSize: '13px !important' }} />}
                    sx={{ color: '#94A3B8', border: '1px solid rgba(148,163,184,.2)', borderRadius: '10px', fontSize: 11.5, px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,.06)' } }}>
                    Renouvellement
                  </Button>
                )}
                <IconButton size="small" onClick={handleClose}
                  sx={{ color: '#64748B', bgcolor: 'rgba(255,255,255,.06)', borderRadius: '9px', width: 32, height: 32, '&:hover': { color: '#F87171', bgcolor: 'rgba(248,113,113,.12)' } }}>
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>

          {/* ══ FORM ══ */}
          <Box component={isView ? 'div' : 'form'} id="agent-form"
            {...(!isView ? { onSubmit: handleSubmit(d => mutation.mutate(d)) } : {})}
            sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

            {mutError && (
              <Alert severity="error" sx={{ mx: 2.5, mt: 1.5, borderRadius: '10px', fontSize: 12 }}>
                {mutError.response?.data?.message ?? 'Erreur — vérifiez les champs obligatoires.'}
              </Alert>
            )}

            {/* ── EN-TÊTE FICHE ── */}
            <Box sx={{ px: 2.5, py: 2, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', flexShrink: 0 }}>
              <Grid container spacing={1.5} alignItems="flex-start">
                <Grid item xs={12} md={10}>
                  {/* Ligne 1 */}
                  <Grid container spacing={1.25} mb={1.25}>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>ID</Typography>
                      <SF disabled value={employee?.id ?? 'Auto'} sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Matricule</Typography>
                      <SF {...register('employee_number')} placeholder="EMP-001" disabled={isView} />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Prénom *</Typography>
                      <SF {...register('first_name')} error={!!errors.first_name} helperText={errors.first_name?.message} placeholder="Prénom" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Nom *</Typography>
                      <SF {...register('last_name')} error={!!errors.last_name} helperText={errors.last_name?.message} placeholder="Nom" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Sexe</Typography>
                      <Controller name="gender" control={control} render={({ field }) => (
                        <FormControl size="small" fullWidth sx={inputSx}>
                          <Select {...field} value={field.value ?? ''} displayEmpty disabled={isView}>
                            <MenuItem value="">—</MenuItem>
                            <MenuItem value="M">Masculin</MenuItem>
                            <MenuItem value="F">Féminin</MenuItem>
                          </Select>
                        </FormControl>
                      )} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Statut</Typography>
                      <Controller name="status" control={control} render={({ field }) => (
                        <FormControl size="small" fullWidth sx={inputSx}>
                          <Select {...field} value={field.value ?? 'active'} disabled={isView}>
                            <MenuItem value="active"><Chip size="small" label="Actif"     sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(5,150,105,.1)',   color: '#059669' }} /></MenuItem>
                            <MenuItem value="inactive"><Chip size="small" label="Inactif" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(220,38,38,.1)',   color: '#DC2626' }} /></MenuItem>
                            <MenuItem value="suspended"><Chip size="small" label="Suspendu" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: 'rgba(217,119,6,.1)', color: '#D97706' }} /></MenuItem>
                          </Select>
                        </FormControl>
                      )} />
                    </Grid>
                  </Grid>
                  {/* Ligne 2 */}
                  <Grid container spacing={1.25} mb={1.25}>
                    <Grid item xs={6} sm={2.5}>
                      <Typography variant="caption" sx={labelSx}>Date naissance</Typography>
                      <SF {...register('birth_date')} type="date" InputLabelProps={{ shrink: true }} disabled={isView} />
                    </Grid>
                    <Grid item xs={3} sm={1}>
                      <Typography variant="caption" sx={labelSx}>Âge</Typography>
                      <SF disabled value={age ?? ''} sx={{ bgcolor: '#F1F5F9' }}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>ans</Typography></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={9} sm={2.5}>
                      <Typography variant="caption" sx={labelSx}>Lieu naissance</Typography>
                      <SF {...register('birth_place')} placeholder="Dakar" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Nationalité</Typography>
                      <SF {...register('nationality')} placeholder="Sénégalaise" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Email professionnel *</Typography>
                      <SF {...register('professional_email')} type="email" placeholder="prenom.nom@org.sn"
                        error={!!errors.professional_email} helperText={errors.professional_email?.message} disabled={isView} />
                    </Grid>
                  </Grid>
                  {/* Ligne 3 */}
                  <Grid container spacing={1.25}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Structure *</Typography>
                      <Controller name="department_id" control={control} render={({ field }) => (
                        <FormControl size="small" fullWidth error={!!errors.department_id} sx={inputSx}>
                          <Select {...field} value={field.value ?? ''} displayEmpty disabled={isView}>
                            <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal', fontSize: 13 }}>Sélectionner</em></MenuItem>
                            {departments?.map((d: { id: number; name: string }) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )} />
                    </Grid>
                    <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Service</Typography><SF placeholder="Service" disabled={isView} /></Grid>
                    <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Division</Typography><SF placeholder="Division" disabled={isView} /></Grid>
                    <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Bureau</Typography><SF placeholder="Bureau" disabled={isView} /></Grid>
                  </Grid>
                </Grid>

                {/* Photo */}
                <Grid item xs={12} md={2}>
                  <Stack alignItems="center" spacing={1.25}>
                    <Box onClick={() => !isView && fileRef.current?.click()} sx={{
                      width: 85, height: 105, borderRadius: '14px',
                      border: isView ? '2px solid #E2E8F0' : '2px dashed #CBD5E1',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: isView ? 'default' : 'pointer',
                      overflow: 'hidden', bgcolor: '#F8FAFC', transition: 'all .2s',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
                      ...(!isView ? { '&:hover': { borderColor: '#2563EB', bgcolor: alpha('#2563EB', .04) }, '&:hover .cam': { opacity: 1 } } : {}),
                    }}>
                      {photoUrl
                        ? <Box component="img" src={photoUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (
                          <Stack alignItems="center" spacing={0.75}>
                            <CameraAlt sx={{ fontSize: 24, color: '#CBD5E1' }} />
                            <Typography sx={{ fontSize: 9, color: '#CBD5E1', fontWeight: 700, letterSpacing: '0.1em' }}>PHOTO</Typography>
                          </Stack>
                        )
                      }
                      {photoUrl && !isView && (
                        <Box className="cam" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '.2s' }}>
                          <CameraAlt sx={{ color: '#fff' }} />
                        </Box>
                      )}
                    </Box>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />

                    <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg,${mCfg.color},#7C3AED)` }}>
                      {initials}
                    </Avatar>

                    <Box textAlign="center">
                      <Typography sx={{ fontSize: 9, color: '#94A3B8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {deptName}
                      </Typography>
                    </Box>

                    <FormControlLabel control={<Checkbox size="small" checked={watched.status === 'active'} disabled sx={{ '&.Mui-checked': { color: '#059669' }, p: 0.5 }} />}
                      label={<Typography sx={{ fontSize: 10.5, fontWeight: 700, color: watched.status === 'active' ? '#059669' : '#DC2626' }}>
                        {watched.status === 'active' ? 'ACTIF' : 'INACTIF'}
                      </Typography>}
                      sx={{ m: 0 }} />
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            {/* ── TABS BAR ── */}
            <Box sx={{ borderBottom: '1.5px solid #E2E8F0', bgcolor: '#fff', flexShrink: 0 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{
                  minHeight: 44,
                  '& .MuiTabs-indicator': { height: 3, borderRadius: 2, bgcolor: TABS[tab]?.color },
                  '& .MuiTab-root': { minHeight: 44, fontSize: 11.5, fontWeight: 500, color: '#64748B', textTransform: 'none', px: 1.75, '&:hover': { color: '#0F172A', bgcolor: '#F8FAFC' } },
                  '& .Mui-selected': { color: `${TABS[tab]?.color} !important`, fontWeight: '700 !important' },
                }}>
                {TABS.map((t, i) => (
                  <Tab key={i} label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ color: tab === i ? t.color : '#94A3B8', display: 'flex', '& svg': { fontSize: 14 } }}>{t.icon}</Box>
                      <span>{t.label}</span>
                    </Stack>
                  } />
                ))}
              </Tabs>
            </Box>

            {/* ── TAB CONTENT ── */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2, bgcolor: '#F8FAFC' }}>

              {/* ─── TAB 0 : FILIATIONS ─── */}
              {tab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Grid container spacing={1.25}>
                      <Grid item xs={6} sm={2.5}><Typography variant="caption" sx={labelSx}>Téléphone fixe</Typography><SF {...register('phone')} placeholder="+221 33 000 00 00" disabled={isView} /></Grid>
                      <Grid item xs={3} sm={1.5}><Typography variant="caption" sx={labelSx}>CP</Typography><SF placeholder="10000" disabled={isView} /></Grid>
                      <Grid item xs={3} sm={2}><Typography variant="caption" sx={labelSx}>Cellulaire</Typography><SF placeholder="+221 77 …" disabled={isView} /></Grid>
                      <Grid item xs={12} sm={3}><Typography variant="caption" sx={labelSx}>Adresse</Typography><SF {...register('city')} placeholder="Rue, Dakar" disabled={isView} /></Grid>
                      <Grid item xs={12} sm={3}><Typography variant="caption" sx={labelSx}>Pays</Typography><SF {...register('country')} placeholder="Sénégal" disabled={isView} /></Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Statut" color="#F97316" icon={<Work />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={12} sm={7}><Typography variant="caption" sx={labelSx}>Type de contrat</Typography>
                          <SF select disabled={isView}>{['CDI','CDD','Stage','Apprentissage','Freelance','Intérim'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</SF>
                        </Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Durée (mois)</Typography><SF type="number" disabled={isView} /></Grid>
                        <Grid item xs={6} sm={2}><Typography variant="caption" sx={labelSx}>ID Unique</Typography><SF disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={12}><Typography variant="caption" sx={labelSx}>Convention collective</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Prise de service</Typography><SF type="number" defaultValue={0} disabled={isView} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Contrat" color="#2563EB" icon={<AccountBalance />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Date début *</Typography>
                          <SF {...register('hire_date')} type="date" InputLabelProps={{ shrink: true }} error={!!errors.hire_date} helperText={errors.hire_date?.message} disabled={isView} />
                        </Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Date fin</Typography><SF type="date" InputLabelProps={{ shrink: true }} disabled={isView} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Âge retraite</Typography><SF type="number" disabled={isView} /></Grid>
                        <Grid item xs={8}><Typography variant="caption" sx={labelSx}>Date retraite</Typography><SF type="date" disabled InputLabelProps={{ shrink: true }} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Profession</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Ancienneté</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Salaire de base *</Typography>
                          <SF {...register('base_salary', { valueAsNumber: true })} type="number" error={!!errors.base_salary} helperText={errors.base_salary?.message} disabled={isView}
                            InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>FCFA</Typography></InputAdornment> }} />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Jours congé / an</Typography>
                          <SF {...register('annual_leave_days', { valueAsNumber: true })} type="number" disabled={isView}
                            InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>j</Typography></InputAdornment> }} />
                        </Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                </Grid>
              )}

              {/* ─── TAB 1 : AUTRES INFORMATIONS ─── */}
              {tab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Contact en cas d'urgence" color="#2563EB" icon={<ContactEmergency />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Prénom contact</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Nom contact</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Tél. domicile</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Cellulaire</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Tél. bureau</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Nom complet</Typography><SF disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Compte courant" color="#059669" icon={<AccountBalance />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={12} sm={5}><Typography variant="caption" sx={labelSx}>Banque</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                        <Grid item xs={6} sm={3.5}><Typography variant="caption" sx={labelSx}>Code banque</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6} sm={3.5}><Typography variant="caption" sx={labelSx}>Code guichet</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Clé RIB</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>N° compte</Typography><SF disabled={isView} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                  <Grid item xs={12}>
                    <SectionBox title="Sécurité sociale" color="#7C3AED" icon={<HealthAndSafety />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>N° IPRESS</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>N° Sécurité sociale</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>N° IPM</Typography><SF disabled={isView} /></Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>N° Assurance</Typography><SF disabled={isView} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                </Grid>
              )}

              {/* ─── TAB 2 : CONJOINTS/ENFANTS ─── */}
              {tab === 2 && (
                <Box>
                  <Grid container spacing={1.5} mb={2}>
                    <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Situation matrimoniale</Typography>
                      <SF select disabled={isView}>{['Célibataire','Marié(e)','Divorcé(e)','Veuf/Veuve'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</SF>
                    </Grid>
                    <Grid item xs={4} sm={2}><Typography variant="caption" sx={labelSx}>Nb épouse(s)</Typography><SF type="number" inputProps={{ min: 0 }} disabled={isView} /></Grid>
                    <Grid item xs={4} sm={2}><Typography variant="caption" sx={labelSx}>Nb enfants</Typography><SF type="number" inputProps={{ min: 0 }} disabled={isView} /></Grid>
                    <Grid item xs={4} sm={3}><Typography variant="caption" sx={labelSx}>Enfants à charge</Typography><SF type="number" inputProps={{ min: 0 }} disabled={isView} /></Grid>
                  </Grid>
                  <GL color="#7C3AED" icon={<FamilyRestroom />}>Conjoints et enfants</GL>
                  <DynTable setter={setFamilyRows} rows={familyRows} color="#7C3AED" readOnly={isView} cols={[
                    { key: 'relation',  label: 'Type relation', width: 130, select: true, options: ['Conjoint(e)','Fils','Fille','Autre'] },
                    { key: 'prenom',    label: 'Prénom' },
                    { key: 'nom',       label: 'Nom' },
                    { key: 'naissance', label: 'Date naiss.', type: 'date' },
                    { key: 'lieu',      label: 'Lieu naiss.' },
                    { key: 'sexe',      label: 'Sexe', width: 90, select: true, options: ['M','F'] },
                    { key: 'activite',  label: 'Étude/Travail' },
                  ]} />
                </Box>
              )}

              {/* ─── TAB 3 : DIPLÔMES/QUALIFICATIONS ─── */}
              {tab === 3 && (
                <Box>
                  <GL color="#059669" icon={<School />}>Établissement / Diplômes obtenus</GL>
                  <DynTable setter={setDiplomas} rows={diplomas} color="#059669" readOnly={isView} cols={[
                    { key: 'annee',         label: 'Année',       width: 70,  type: 'number' },
                    { key: 'etablissement', label: 'Établissement' },
                    { key: 'adresse',       label: 'Adresse' },
                    { key: 'tel',           label: 'Tél',         width: 110 },
                    { key: 'diplome',       label: 'Diplôme' },
                    { key: 'dateObtention', label: 'Date obtention', type: 'date' },
                    { key: 'mention',       label: 'Mention', width: 110, select: true, options: ['Passable','Assez bien','Bien','Très bien'] },
                    { key: 'niveau',        label: 'Niveau',  width: 100, select: true, options: ['BEP','BAC','BTS','Licence','Master','Doctorat'] },
                  ]} />
                  <Box mt={2.5}>
                    <GL color="#2563EB" icon={<Work />}>Qualifications</GL>
                    <DynTable setter={setQuals} rows={quals} color="#2563EB" readOnly={isView} cols={[
                      { key: 'date',          label: 'Date', type: 'date', width: 145 },
                      { key: 'qualification', label: 'Qualification' },
                      { key: 'observation',   label: 'Observation' },
                    ]} />
                  </Box>
                </Box>
              )}

              {/* ─── TAB 4 : CATÉGORIES/POSTES ─── */}
              {tab === 4 && (
                <Box>
                  <GL color="#D97706" icon={<BarChart />}>Catégories</GL>
                  <DynTable setter={setCategories} rows={categories} color="#D97706" readOnly={isView} cols={[
                    { key: 'categorie',     label: 'Catégorie' },
                    { key: 'dateObtention', label: 'Date obtention', type: 'date', width: 155 },
                    { key: 'motif',         label: 'Motif' },
                  ]} />
                  <Box mt={2.5}>
                    <GL color="#F97316" icon={<Work />}>Affectations aux postes</GL>
                    <DynTable setter={setPostings} rows={postings} color="#F97316" readOnly={isView} cols={[
                      { key: 'dateAffect', label: 'Date affect.', type: 'date', width: 145 },
                      { key: 'poste',      label: 'Poste' },
                      { key: 'debut',      label: 'Début', type: 'date', width: 135 },
                      { key: 'fin',        label: 'Fin',   type: 'date', width: 135 },
                      { key: 'service',    label: 'Service' },
                      { key: 'division',   label: 'Division' },
                      { key: 'bureau',     label: 'Bureau' },
                      { key: 'raison',     label: 'Raison' },
                    ]} />
                  </Box>
                </Box>
              )}

              {/* ─── TAB 5 : DOCUMENTS ─── */}
              {tab === 5 && (
                <Box>
                  <GL color="#0891B2" icon={<Folder />}>Documents administratifs</GL>

                  <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', mb: 0.75 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TH width={130}>Type document</TH>
                          <TH>Libellé</TH>
                          <TH>Description</TH>
                          <TH width={90}>Extension</TH>
                          <TH width={200}>Fichier</TH>
                          <TH width={80}>Actions</TH>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {documents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, bgcolor: '#FAFBFC' }}>
                              <Stack alignItems="center" spacing={1.25}>
                                <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Folder sx={{ fontSize: 28, color: '#0891B2' }} />
                                </Box>
                                <Box textAlign="center">
                                  <Typography variant="body2" fontWeight={600} color="text.secondary">Aucun document</Typography>
                                  <Typography variant="caption" color="text.disabled">Cliquez « Ajouter un document » ci-dessous</Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : documents.map((doc, idx) => (
                          <TableRow key={doc.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#F0F9FF', '&:hover': { bgcolor: '#E0F2FE' } }}>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <Select value={doc.type} onChange={e => updateDoc(doc.id, 'type', e.target.value)}
                                size="small" displayEmpty fullWidth disabled={isView}
                                sx={{ fontSize: 12, height: 30, bgcolor: '#fff', borderRadius: '8px', '& fieldset': { borderColor: '#E2E8F0' } }}>
                                <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal' }}>—</em></MenuItem>
                                {['CIN','Passeport','Acte naissance','Diplôme','Contrat','Autre'].map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <TextField value={doc.libelle} onChange={e => updateDoc(doc.id, 'libelle', e.target.value)}
                                size="small" fullWidth placeholder="Libellé…" disabled={isView}
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, height: 30, borderRadius: '8px', bgcolor: '#fff', '& fieldset': { borderColor: '#E2E8F0' } } }} />
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <TextField value={doc.description} onChange={e => updateDoc(doc.id, 'description', e.target.value)}
                                size="small" fullWidth placeholder="Description…" disabled={isView}
                                sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, height: 30, borderRadius: '8px', bgcolor: '#fff', '& fieldset': { borderColor: '#E2E8F0' } } }} />
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <Select value={doc.extension} onChange={e => updateDoc(doc.id, 'extension', e.target.value)}
                                size="small" fullWidth disabled={isView}
                                sx={{ fontSize: 12, height: 30, bgcolor: '#fff', borderRadius: '8px', '& fieldset': { borderColor: '#E2E8F0' } }}>
                                {['PDF','JPEG','PNG','DOCX','XLSX'].map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                {!isView && (
                                  <Button component="label" size="small" variant="outlined"
                                    startIcon={<AttachFile sx={{ fontSize: '12px !important' }} />}
                                    sx={{ fontSize: 10.5, fontWeight: 700, borderRadius: '7px', px: 1, py: 0.25, borderColor: '#BAE6FD', color: '#0891B2', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#F0F9FF' } }}>
                                    Parcourir
                                    <input type="file" hidden onChange={e => handleDocFile(doc.id, e.target.files?.[0] ?? null)} />
                                  </Button>
                                )}
                                {doc.fileName && (
                                  <Tooltip title={doc.fileName} arrow>
                                    <Chip size="small" label={doc.fileName.length > 14 ? doc.fileName.slice(0, 14) + '…' : doc.fileName}
                                      sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', maxWidth: 110 }} />
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Prévisualiser" arrow>
                                  <IconButton size="small" sx={{ color: '#2563EB', bgcolor: '#EFF6FF', borderRadius: '6px', width: 26, height: 26, '&:hover': { bgcolor: '#DBEAFE' } }}>
                                    <SearchIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                                {!isView && (
                                  <Tooltip title="Supprimer" arrow>
                                    <IconButton size="small" onClick={() => removeDoc(doc.id)}
                                      sx={{ color: '#DC2626', bgcolor: '#FFF5F5', borderRadius: '6px', width: 26, height: 26, '&:hover': { bgcolor: '#FEE2E2' } }}>
                                      <Delete sx={{ fontSize: 13 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  {!isView && (
                    <Button fullWidth startIcon={<Add sx={{ fontSize: 17 }} />} onClick={addDoc}
                      sx={{
                        mt: 0.75, py: 0.9, borderRadius: '10px',
                        border: '1.5px dashed #0891B2',
                        color: '#0891B2', bgcolor: '#F0F9FF',
                        fontWeight: 700, fontSize: 12.5,
                        transition: 'all .16s',
                        '&:hover': { bgcolor: '#E0F2FE', borderStyle: 'solid', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(8,145,178,0.25)' },
                      }}>
                      Ajouter un document
                    </Button>
                  )}

                  {documents.length > 0 && (
                    <Stack direction="row" alignItems="center" spacing={1} mt={1.25}
                      sx={{ p: 1.25, borderRadius: '10px', bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                      <CheckCircle sx={{ fontSize: 15, color: '#0891B2' }} />
                      <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 600 }}>
                        {documents.length} document{documents.length > 1 ? 's' : ''} · {documents.filter(d => d.fileName).length} fichier{documents.filter(d => d.fileName).length > 1 ? 's' : ''} joint{documents.filter(d => d.fileName).length > 1 ? 's' : ''}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}

              {/* ─── TAB 6 : INFO PAR INDICE ─── */}
              {tab === 6 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Grid container spacing={1.25} alignItems="flex-end">
                      <Grid item xs={12} sm={4}><Typography variant="caption" sx={labelSx}>Mode de paiement</Typography>
                        <SF select disabled={isView}>{['Virement','Espèces','Chèque'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</SF>
                      </Grid>
                      <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Type modèle de paie</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                      <Grid item xs={6} sm={2}><Typography variant="caption" sx={labelSx}>Part TRIMF</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                      <Grid item xs={6} sm={2}><Typography variant="caption" sx={labelSx}>Part IR</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                      <Grid item xs={6} sm={1}><FormControlLabel control={<Checkbox size="small" disabled={isView} />} label={<Typography sx={{ fontSize: 11, fontWeight: 700 }}>Médecin</Typography>} sx={{ m: 0, mt: 1.5 }} /></Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Indice d'agent" color="#9333EA" icon={<BarChart />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={12} sm={6}><Typography variant="caption" sx={labelSx}>Indice d'agent</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Hiérarchie</Typography><SF disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6} sm={3}><Typography variant="caption" sx={labelSx}>Indemnité sujétion</Typography><SF type="number" defaultValue={0} disabled={isView} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Classe</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Échelon</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Grade</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Valeur indice</Typography><SF type="number" disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Indice</Typography><SF type="number" disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Rappel avancement</Typography><SF type="number" defaultValue={0} disabled={isView} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Information du paiement" color="#D97706" icon={<AccountBalance />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Complément spécial 20%</Typography><SF type="number" disabled defaultValue={0} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Indemnité résidence 14%</Typography><SF type="number" disabled defaultValue={0} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Hiérarchie</Typography><SF disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Indice code</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={12}><Typography variant="caption" sx={labelSx}>Solde mensuelle indiciaire assimilés</Typography><SF type="number" disabled defaultValue={0} sx={{ bgcolor: '#FFFBEB', '& input': { fontWeight: 700 } }} /></Grid>
                      </Grid>
                    </SectionBox>
                    <SectionBox title="Partie médecin" color="#0891B2" icon={<HealthAndSafety />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Sursalaire</Typography><SF type="number" defaultValue={0} disabled={isView} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Indemnité responsabilité</Typography><SF type="number" defaultValue={0} disabled={isView} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Indemnité spécialisation</Typography><SF type="number" defaultValue={0} disabled={isView} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Indemnité représentation</Typography><SF type="number" defaultValue={0} disabled={isView} sx={{ bgcolor: '#FFFBEB' }} /></Grid>
                      </Grid>
                    </SectionBox>
                  </Grid>
                </Grid>
              )}
            </Box>

            {/* ── FOOTER : nav dots + boutons ── */}
            <Box sx={{ px: 2.5, py: 1.25, borderTop: '1.5px solid #F1F5F9', bgcolor: '#fff', flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                {/* Dots de navigation */}
                <Stack direction="row" spacing={0.75}>
                  {TABS.map((t, i) => (
                    <Tooltip key={i} title={t.label} arrow placement="top">
                      <Box onClick={() => setTab(i)} sx={{
                        width: tab === i ? 28 : 8, height: 8, borderRadius: '4px', cursor: 'pointer',
                        bgcolor: tab === i ? t.color : i < tab ? alpha(t.color, 0.35) : '#E2E8F0',
                        transition: 'all 0.25s ease',
                        '&:hover': { bgcolor: t.color, transform: 'scaleY(1.2)' },
                      }} />
                    </Tooltip>
                  ))}
                </Stack>

                {/* Boutons navigation tab */}
                <Stack direction="row" spacing={0.75}>
                  {tab > 0 && (
                    <Button size="small" variant="outlined" onClick={() => setTab(t => t - 1)}
                      sx={{ borderRadius: '8px', fontSize: 11.5, fontWeight: 600, px: 1.75, borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#94A3B8' } }}>
                      ← Précédent
                    </Button>
                  )}
                  {tab < TABS.length - 1 && (
                    <Button size="small" variant="outlined" onClick={() => setTab(t => t + 1)}
                      sx={{ borderRadius: '8px', fontSize: 11.5, fontWeight: 600, px: 1.75, borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#94A3B8' } }}>
                      Suivant →
                    </Button>
                  )}
                  {!isView && tab === TABS.length - 1 && (
                    <Button size="small" type="submit" form="agent-form"
                      startIcon={mutation.isPending ? <CircularProgress size={12} color="inherit" /> : <Save sx={{ fontSize: '13px !important' }} />}
                      disabled={mutation.isPending}
                      sx={{ bgcolor: mCfg.color, color: '#fff', fontWeight: 700, fontSize: 11.5, borderRadius: '8px', px: 2, boxShadow: `0 3px 10px ${mCfg.color}40`, '&:hover': { filter: 'brightness(0.92)' } }}>
                      {mutation.isPending ? 'Enregistrement…' : (mode === 'edit' ? 'Mettre à jour' : 'Enregistrer')}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Box>
      </>
    </Dialog>
  );
}
