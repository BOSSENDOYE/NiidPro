import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Typography, Button, TextField, Grid, MenuItem,
  CircularProgress, Alert, Tabs, Tab, Stack, Divider,
  IconButton, Tooltip, Table, TableHead, TableRow, TableCell,
  TableBody, Checkbox, FormControlLabel, Select, InputLabel,
  FormControl, InputAdornment, Chip, alpha,
} from '@mui/material';
import {
  Save, Close, Autorenew, CameraAlt, Add, Delete, Search,
  Person, Phone, Work, School, FamilyRestroom,
  Folder, BarChart, ContactEmergency,
  Groups, AttachFile, CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';

/* ─── Zod schema ─── */
const schema = z.object({
  first_name:         z.string().min(1, 'Prénom requis'),
  last_name:          z.string().min(1, 'Nom requis'),
  professional_email: z.string().email('Email invalide'),
  personal_email:     z.string().optional().or(z.literal('')),
  phone:              z.string().optional(),
  hire_date:          z.string().min(1, 'Date requise'),
  birth_date:         z.string().optional(),
  birth_place:        z.string().optional(),
  nationality:        z.string().optional(),
  gender:             z.string().optional(),
  base_salary:        z.number().min(0),
  department_id:      z.number().min(1, 'Service requis'),
  status:             z.enum(['active', 'inactive', 'suspended']),
  city:               z.string().optional(),
  country:            z.string().optional(),
  annual_leave_days:  z.number().min(0),
  employee_number:    z.string().optional(),
  position_id:        z.number().optional(),
});
type FormData = z.infer<typeof schema>;

/* ─── Tab config ─── */
const TABS = [
  { label: 'Filiations',             icon: <Person fontSize="small" /> },
  { label: 'Autres informations',    icon: <ContactEmergency fontSize="small" /> },
  { label: 'Conjoints/Enfants',      icon: <FamilyRestroom fontSize="small" /> },
  { label: 'Diplômes/Qualifications',icon: <School fontSize="small" /> },
  { label: 'Catégories/Postes',      icon: <Work fontSize="small" /> },
  { label: 'Documents',              icon: <Folder fontSize="small" /> },
  { label: 'Info par indice',        icon: <BarChart fontSize="small" /> },
];

/* ─── Helpers ─── */
const SectionTitle = ({ children }: { children: string }) => (
  <Typography
    sx={{
      fontSize: 11, fontWeight: 700, color: '#2563EB',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      mb: 1.5, mt: 0.5,
    }}
  >
    {children}
  </Typography>
);

const GroupBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box
    sx={{
      border: '1px solid #E2E8F0', borderRadius: '10px', p: 2,
      position: 'relative', mb: 2,
      '&::before': {
        content: `"${title}"`,
        position: 'absolute', top: -10, left: 12,
        bgcolor: '#fff', px: 1,
        fontSize: 11, fontWeight: 700, color: '#2563EB',
        textTransform: 'uppercase', letterSpacing: '0.07em',
      },
    }}
  >
    {children}
  </Box>
);



/* ─── Controlled table types & helpers ─── */
interface TableRow { id: string; [col: string]: string }
interface DocRow   { id: string; type: string; libelle: string; description: string; extension: string; fileName: string }

function newRow(): TableRow { return { id: `${Date.now()}-${Math.random()}` }; }
function newDoc(): DocRow   { return { id: `${Date.now()}-${Math.random()}`, type: '', libelle: '', description: '', extension: 'PDF', fileName: '' }; }

function addTRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>) {
  setter(p => [...p, newRow()]);
}
function removeTRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>, id: string) {
  setter(p => p.filter(r => r.id !== id));
}
function updateTRow(setter: React.Dispatch<React.SetStateAction<TableRow[]>>, id: string, col: string, val: string) {
  setter(p => p.map(r => r.id === id ? { ...r, [col]: val } : r));
}

const TH = ({ children, width }: { children: React.ReactNode; width?: number | string }) => (
  <TableCell sx={{
    bgcolor: '#1E293B', color: '#64748B', fontSize: 9.5, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    py: 1, px: 1.25, borderColor: '#334155', whiteSpace: 'nowrap',
    width,
  }}>
    {children}
  </TableCell>
);

const EditCell = ({ value, onChange, placeholder, type = 'text', select, options }:
  { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; select?: boolean; options?: string[] }) => (
  <TableCell sx={{ py: 0.4, px: 0.75, borderColor: '#F1F5F9' }}>
    {select && options ? (
      <Select value={value} onChange={e => onChange(e.target.value)} size="small" displayEmpty
        sx={{ fontSize: 12, height: 30, minWidth: 90, bgcolor: '#fff', '& fieldset': { borderColor: '#E8EDF2' } }}>
        <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal' }}>—</em></MenuItem>
        {options.map(o => <MenuItem key={o} value={o} sx={{ fontSize: 12 }}>{o}</MenuItem>)}
      </Select>
    ) : (
      <TextField value={value} onChange={e => onChange(e.target.value)}
        size="small" fullWidth type={type} placeholder={placeholder}
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: 12, height: 30, borderRadius: '7px', bgcolor: '#fff',
            '& fieldset': { borderColor: '#E8EDF2' },
            '&:hover fieldset': { borderColor: '#BFDBFE' },
            '&.Mui-focused fieldset': { borderColor: '#2563EB' },
          },
        }}
      />
    )}
  </TableCell>
);

interface DynTableProps {
  cols: { key: string; label: string; width?: number | string; select?: boolean; options?: string[]; type?: string }[];
  rows: TableRow[];
  setter: React.Dispatch<React.SetStateAction<TableRow[]>>;
  emptyMsg?: string;
}
function DynTable({ cols, rows, setter, emptyMsg }: DynTableProps) {
  return (
    <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {cols.map(c => <TH key={c.key} width={c.width}>{c.label}</TH>)}
            <TH width={36}>
              <Tooltip title="Nouvelle ligne" arrow>
                <IconButton size="small" onClick={() => addTRow(setter)}
                  sx={{ color: '#4ADE80', p: 0, width: 22, height: 22, '&:hover': { bgcolor: 'rgba(74,222,128,0.15)', borderRadius: '5px' } }}>
                  <Add sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </TH>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols.length + 1}
                sx={{ textAlign: 'center', py: 4, color: '#94A3B8', fontSize: 12 }}>
                {emptyMsg ?? 'Aucune entrée —'} <strong style={{ color: '#4ADE80' }}>+</strong> pour ajouter
              </TableCell>
            </TableRow>
          ) : rows.map(row => (
            <TableRow key={row.id} hover sx={{ '&:hover td': { bgcolor: '#F8FAFC' } }}>
              {cols.map(c => (
                <EditCell key={c.key}
                  value={row[c.key] ?? ''}
                  onChange={v => updateTRow(setter, row.id, c.key, v)}
                  type={c.type}
                  select={c.select}
                  options={c.options}
                />
              ))}
              <TableCell sx={{ py: 0.4, px: 0.75, borderColor: '#F1F5F9', width: 36 }}>
                <IconButton size="small" onClick={() => removeTRow(setter, row.id)}
                  sx={{ color: '#DC2626', bgcolor: '#FFF5F5', borderRadius: '6px', width: 24, height: 24, '&:hover': { bgcolor: '#FEE2E2' } }}>
                  <Delete sx={{ fontSize: 13 }} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function EmployeeFormPage() {
  const { id }      = useParams<{ id: string }>();
  const isEdit      = Boolean(id);
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null);
  const [age,       setAge]       = useState<number | null>(null);

  /* ── Tables state ── */
  const [familyRows,  setFamilyRows]  = useState<TableRow[]>([]);
  const [diplomas,    setDiplomas]    = useState<TableRow[]>([]);
  const [quals,       setQuals]       = useState<TableRow[]>([]);
  const [categories,  setCategories]  = useState<TableRow[]>([]);
  const [postings,    setPostings]    = useState<TableRow[]>([]);
  const [documents,   setDocuments]   = useState<DocRow[]>([]);

  /* ── API ── */
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { data: employee, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(Number(id)).then((r) => r.data),
    enabled: isEdit,
  });

  const {
    register, handleSubmit, control, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', annual_leave_days: 30, base_salary: 0 },
  });

  const birthDate = watch('birth_date');
  useEffect(() => {
    if (birthDate) {
      const diff = Date.now() - new Date(birthDate).getTime();
      setAge(Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
    } else setAge(null);
  }, [birthDate]);

  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        professional_email: employee.professional_email,
        personal_email: employee.personal_email ?? '',
        phone: employee.phone ?? '',
        hire_date: employee.hire_date,
        base_salary: employee.base_salary,
        department_id: employee.department_id,
        status: (['active', 'inactive', 'suspended'].includes(employee.status) ? employee.status : 'active') as 'active' | 'inactive' | 'suspended',
        city: employee.city ?? '',
        country: employee.country ?? '',
        annual_leave_days: employee.annual_leave_days,
        employee_number: employee.employee_number ?? '',
      });
      if (employee.photo_url) setPhotoUrl(employee.photo_url);

      // ── Onglet Conjoints/Enfants ──
      setFamilyRows((employee.family_members ?? []).map((m) => ({
        id:        String(m.id ?? `${Date.now()}-${Math.random()}`),
        relation:  m.relation ?? 'Autre',
        prenom:    m.first_name ?? '',
        nom:       m.last_name ?? '',
        naissance: m.birth_date ? String(m.birth_date).substring(0, 10) : '',
        lieu:      m.birth_place ?? '',
        sexe:      m.gender ?? '',
        activite:  m.activity ?? '',
        typeDoc:   m.document_type ?? '',
      })));
    }
  }, [employee, reset]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => employeesApi.create(data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['employees'] }); navigate(`/employees/${res.data.id}`); },
  });
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => employeesApi.update(Number(id), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); navigate(`/employees/${id}`); },
  });

  // Mappe les lignes de l'onglet Conjoints/Enfants vers le format API
  const buildFamilyPayload = (rows: TableRow[]) =>
    rows
      .filter((r) => r.prenom || r.nom || r.naissance)
      .map((r) => ({
        relation:      r.relation || 'Autre',
        first_name:    r.prenom || null,
        last_name:     r.nom || null,
        birth_date:    r.naissance || null,
        birth_place:   r.lieu || null,
        gender:        r.sexe || null,
        activity:      r.activite || null,
        document_type: r.typeDoc || null,
      }));

  const onSubmit = (data: FormData) => {
    const payload = { ...data, family_members: buildFamilyPayload(familyRows) };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };
  const mutError = (createMutation.error ?? updateMutation.error) as { response?: { data?: { message?: string } } } | null;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  };

  /* ── Doc handlers ── */
  const addDoc    = () => setDocuments(p => [...p, newDoc()]);
  const removeDoc = (id: string) => setDocuments(p => p.filter(d => d.id !== id));
  const updateDoc = (id: string, field: keyof DocRow, val: string) =>
    setDocuments(p => p.map(d => d.id === id ? { ...d, [field]: val } : d));
  const handleDocFile = (id: string, file: File | null) => {
    if (file) updateDoc(id, 'fileName', file.name);
  };

  if (loadingEmp && isEdit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {mutError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {mutError.response?.data?.message ?? 'Une erreur est survenue'}
        </Alert>
      )}

      {/* ══════════════════════════════════════════
          CARD PRINCIPALE
      ══════════════════════════════════════════ */}
      <Card sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(15,23,42,0.12)', border: 'none' }}>

        {/* ── MODULE HEADER BAR ── */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
            px: 3, py: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
            '&::before': {
              content: '""', position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 55%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249,115,22,0.45)', flexShrink: 0,
            }}>
              <Groups sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                GRH &nbsp;|&nbsp; GESTION AGENT
              </Typography>
              <Typography sx={{ color: '#475569', fontSize: 10.5 }}>
                {isEdit ? `Modification · ID ${id}` : 'Création d\'un nouvel agent'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            {isEdit && (
              <Button size="small" startIcon={<Autorenew sx={{ fontSize: '14px !important' }} />}
                sx={{
                  color: '#CBD5E1', borderColor: 'rgba(203,213,225,0.3)',
                  border: '1px solid', borderRadius: '20px', fontSize: 11.5, fontWeight: 600, px: 2,
                  '&:hover': { borderColor: '#CBD5E1', bgcolor: 'rgba(255,255,255,0.06)' },
                }}>
                Renouvellement contrat
              </Button>
            )}
            <Button size="small" type="submit"
              startIcon={isSubmitting ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: '14px !important' }} />}
              disabled={isSubmitting}
              sx={{
                bgcolor: '#2563EB', color: '#fff', fontWeight: 700, fontSize: 11.5,
                borderRadius: '20px', px: 2.5,
                boxShadow: '0 3px 10px rgba(37,99,235,0.45)',
                '&:hover': { bgcolor: '#1D4ED8' },
              }}>
              Enregistrer
            </Button>
            <Button size="small" startIcon={<Close sx={{ fontSize: '14px !important' }} />}
              onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')}
              sx={{
                color: '#F87171', border: '1px solid rgba(248,113,113,0.35)',
                borderRadius: '20px', fontSize: 11.5, fontWeight: 600, px: 2,
                '&:hover': { borderColor: '#F87171', bgcolor: 'rgba(248,113,113,0.08)' },
              }}>
              Fermer
            </Button>
          </Stack>
        </Box>

        {/* ── HEADER FORM (champs identité + photo) ── */}
        <Box sx={{ bgcolor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', p: 2.5 }}>
          <Grid container spacing={2} alignItems="flex-start">
            {/* Champs principaux */}
            <Grid item xs={12} md={10}>
              {/* Ligne 1 */}
              <Grid container spacing={1.5} mb={1.5}>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField label="ID" size="small" fullWidth disabled
                    value={isEdit ? id : 'Auto'} sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField {...register('employee_number')} label="Matricule" size="small" fullWidth
                    error={!!errors.employee_number} sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <TextField {...register('first_name')} label="Prénom *" size="small" fullWidth
                    error={!!errors.first_name} helperText={errors.first_name?.message}
                    sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <TextField {...register('last_name')} label="Nom *" size="small" fullWidth
                    error={!!errors.last_name} helperText={errors.last_name?.message}
                    sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <Controller name="status" control={control}
                    render={({ field }) => (
                      <FormControl size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <InputLabel>Statut</InputLabel>
                        <Select {...field} label="Statut" value={field.value ?? 'active'}>
                          <MenuItem value="active">
                            <Chip size="small" label="Actif" sx={{ bgcolor: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: 11, height: 18 }} />
                          </MenuItem>
                          <MenuItem value="inactive">
                            <Chip size="small" label="Inactif" sx={{ bgcolor: 'rgba(220,38,38,0.1)', color: '#DC2626', fontSize: 11, height: 18 }} />
                          </MenuItem>
                          <MenuItem value="suspended">
                            <Chip size="small" label="Suspendu" sx={{ bgcolor: 'rgba(217,119,6,0.1)', color: '#D97706', fontSize: 11, height: 18 }} />
                          </MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>

              {/* Ligne 2 */}
              <Grid container spacing={1.5} mb={1.5}>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField {...register('birth_date')} label="Date de naissance" type="date" size="small" fullWidth
                    InputLabelProps={{ shrink: true }} sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={3} sm={2} md={1}>
                  <TextField label="Âge" size="small" fullWidth disabled
                    value={age !== null ? `${age}` : ''}
                    InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">ans</Typography></InputAdornment> }}
                    sx={{ bgcolor: '#F1F5F9' }} />
                </Grid>
                <Grid item xs={9} sm={4} md={3}>
                  <TextField {...register('birth_place')} label="Lieu de naissance" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <TextField {...register('nationality')} label="Nationalité" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <Controller name="gender" control={control}
                    render={({ field }) => (
                      <FormControl size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <InputLabel>Sexe</InputLabel>
                        <Select {...field} label="Sexe" value={field.value ?? ''}>
                          <MenuItem value="">—</MenuItem>
                          <MenuItem value="M">Masculin</MenuItem>
                          <MenuItem value="F">Féminin</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>

              {/* Ligne 3 */}
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}>
                  <Controller name="department_id" control={control}
                    render={({ field }) => (
                      <FormControl size="small" fullWidth error={!!errors.department_id} sx={{ bgcolor: '#fff' }}>
                        <InputLabel>Structure *</InputLabel>
                        <Select {...field} label="Structure *" value={field.value ?? ''}>
                          {departments?.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Service" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Division" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Bureau" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                </Grid>
              </Grid>
            </Grid>

            {/* Photo upload */}
            <Grid item xs={12} md={2}>
              <Box
                onClick={() => fileRef.current?.click()}
                sx={{
                  width: '100%', aspectRatio: '3/4', maxWidth: 120, mx: 'auto',
                  border: '2px dashed #CBD5E1', borderRadius: '12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                  bgcolor: '#F8FAFC', transition: 'all 0.2s',
                  '&:hover': { borderColor: '#2563EB', bgcolor: alpha('#2563EB', 0.04) },
                }}
              >
                {photoUrl ? (
                  <Box component="img" src={photoUrl} alt="Photo"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Stack alignItems="center" spacing={0.75} p={1}>
                    <CameraAlt sx={{ fontSize: 28, color: '#94A3B8' }} />
                    <Typography variant="caption" sx={{ color: '#94A3B8', textAlign: 'center', fontSize: 10 }}>
                      Photo agent
                    </Typography>
                  </Stack>
                )}
              </Box>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            </Grid>
          </Grid>
        </Box>

        {/* ── TABS ── */}
        <Box sx={{ borderBottom: '1px solid #E2E8F0', bgcolor: '#fff' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable" scrollButtons="auto"
            sx={{
              minHeight: 42,
              '& .MuiTabs-indicator': { height: 2.5, borderRadius: 2, bgcolor: '#F97316' },
              '& .MuiTab-root': {
                minHeight: 42, fontSize: 12, fontWeight: 500, color: '#64748B',
                textTransform: 'none', px: 2,
                '&:hover': { color: '#0F172A', bgcolor: alpha('#2563EB', 0.04) },
              },
              '& .Mui-selected': { color: '#F97316 !important', fontWeight: '700 !important' },
            }}
          >
            {TABS.map((tab, i) => (
              <Tab key={i}
                label={
                  <Stack direction="row" alignItems="center" spacing={0.6}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </Stack>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* ── TAB CONTENT ── */}
        <Box sx={{ p: 2.5, bgcolor: '#FAFBFC', minHeight: 360 }}>

          {/* ════ TAB 0: FILIATIONS ════ */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              {/* Contact */}
              <Grid item xs={12}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={2.5}>
                    <TextField {...register('phone')} label="Téléphone fixe" size="small" fullWidth
                      sx={{ bgcolor: '#fff' }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 14, color: '#94A3B8' }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={1.5}>
                    <TextField label="CP" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField {...register('professional_email')} label="Email professionnel *" size="small" fullWidth
                      error={!!errors.professional_email} helperText={errors.professional_email?.message}
                      sx={{ bgcolor: '#fff' }} />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField label="Cellulaire" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField {...register('city')} label="Adresse" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                  </Grid>
                </Grid>
              </Grid>

              {/* Statut */}
              <Grid item xs={12} md={6}>
                <GroupBox title="Statut">
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={7}>
                      <TextField label="Type de contrat" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        {['CDI','CDD','Stage','Apprentissage','Freelance','Interim'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Durée (mois)" type="number" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField label="ID Unique" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Convention collective" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <MenuItem value="">—</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Prise de service" type="number" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                    </Grid>
                  </Grid>
                </GroupBox>
              </Grid>

              {/* Contrat */}
              <Grid item xs={12} md={6}>
                <GroupBox title="Contrat">
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField {...register('hire_date')} label="Date début contrat *" type="date" size="small" fullWidth
                        InputLabelProps={{ shrink: true }} error={!!errors.hire_date}
                        helperText={errors.hire_date?.message} sx={{ bgcolor: '#fff' }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Date fin contrat" type="date" size="small" fullWidth
                        InputLabelProps={{ shrink: true }} sx={{ bgcolor: '#fff' }} />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField label="Âge retraite" type="number" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                    </Grid>
                    <Grid item xs={8}>
                      <TextField label="Date retraite" type="date" size="small" fullWidth
                        InputLabelProps={{ shrink: true }} disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Profession" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <MenuItem value="">—</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Ancienneté" type="number" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                  </Grid>
                </GroupBox>
              </Grid>
            </Grid>
          )}

          {/* ════ TAB 1: AUTRES INFORMATIONS ════ */}
          {activeTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <GroupBox title="Contact en cas d'urgence">
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}><TextField label="Prénom contact" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Nom contact" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Tél. domicile" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Cellulaire" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Tél. bureau" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Nom complet" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                  </Grid>
                </GroupBox>
              </Grid>

              <Grid item xs={12} md={6}>
                <GroupBox title="Compte courant">
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={5}>
                      <TextField label="Banque" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <MenuItem value="">—</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3.5}><TextField label="Code banque" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6} sm={3.5}><TextField label="Code guichet" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Clé RIB" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6}><TextField label="Numéro compte" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                  </Grid>
                </GroupBox>
              </Grid>

              <Grid item xs={12}>
                <GroupBox title="Sécurité sociale">
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} sm={3}><TextField label="N° IPRESS" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6} sm={3}><TextField label="N° Sécurité sociale" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6} sm={3}><TextField label="N° IPM" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                    <Grid item xs={6} sm={3}><TextField label="N° Assurance" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                  </Grid>
                </GroupBox>
              </Grid>
            </Grid>
          )}

          {/* ════ TAB 2: CONJOINTS/ENFANTS ════ */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={1.5} mb={2}>
                <Grid item xs={6} sm={3}>
                  <TextField label="Situation matrimoniale" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                    {['Célibataire','Marié(e)','Divorcé(e)','Veuf/Veuve'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField label="Nb d'épouse(s)" type="number" size="small" fullWidth
                    inputProps={{ min: 0 }} sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField label="Nb d'enfants" type="number" size="small" fullWidth
                    inputProps={{ min: 0 }} sx={{ bgcolor: '#fff' }} />
                </Grid>
                <Grid item xs={4} sm={3}>
                  <TextField label="Enfants à charge" type="number" size="small" fullWidth
                    inputProps={{ min: 0 }} sx={{ bgcolor: '#fff' }} />
                </Grid>
              </Grid>

              <SectionTitle>Conjoints et Enfants</SectionTitle>
              <DynTable setter={setFamilyRows} rows={familyRows} cols={[
                { key: 'relation',  label: 'Type relation', width: 130, select: true, options: ['Conjoint(e)','Fils','Fille','Autre'] },
                { key: 'prenom',    label: 'Prénom' },
                { key: 'nom',       label: 'Nom' },
                { key: 'naissance', label: 'Date naiss.', type: 'date' },
                { key: 'lieu',      label: 'Lieu naiss.' },
                { key: 'sexe',      label: 'Sexe', width: 90, select: true, options: ['M','F'] },
                { key: 'activite',  label: 'Étude/Travail' },
                { key: 'typeDoc',   label: 'Type doc' },
              ]} />
            </Box>
          )}

          {/* ════ TAB 3: DIPLOMES/QUALIFICATIONS ════ */}
          {activeTab === 3 && (
            <Box>
              <SectionTitle>Établissement / Diplômes obtenus</SectionTitle>
              <DynTable setter={setDiplomas} rows={diplomas} cols={[
                { key: 'annee',         label: 'Année',          width: 70,  type: 'number' },
                { key: 'etablissement', label: 'Établissement' },
                { key: 'adresse',       label: 'Adresse' },
                { key: 'tel',           label: 'Tél',            width: 110 },
                { key: 'diplome',       label: 'Diplôme' },
                { key: 'dateObtention', label: 'Date obtention',  type: 'date' },
                { key: 'mention',       label: 'Mention',         width: 100, select: true, options: ['Passable','Assez bien','Bien','Très bien'] },
                { key: 'niveau',        label: 'Niveau',          width: 90,  select: true, options: ['BEP','BAC','BTS','Licence','Master','Doctorat'] },
              ]} />

              <SectionTitle>Qualifications</SectionTitle>
              <DynTable setter={setQuals} rows={quals} cols={[
                { key: 'date',          label: 'Date',          type: 'date', width: 150 },
                { key: 'qualification', label: 'Qualification' },
                { key: 'observation',   label: 'Observation' },
              ]} />
            </Box>
          )}

          {/* ════ TAB 4: CATEGORIES/POSTES ════ */}
          {activeTab === 4 && (
            <Box>
              <SectionTitle>Catégories</SectionTitle>
              <DynTable setter={setCategories} rows={categories} cols={[
                { key: 'categorie',     label: 'Catégorie' },
                { key: 'dateObtention', label: 'Date obtention', type: 'date', width: 160 },
                { key: 'motif',         label: 'Motif' },
              ]} />

              <SectionTitle>Affectations aux postes</SectionTitle>
              <DynTable setter={setPostings} rows={postings} cols={[
                { key: 'dateAffect', label: 'Date affect.', type: 'date', width: 140 },
                { key: 'poste',      label: 'Poste' },
                { key: 'debut',      label: 'Début',        type: 'date', width: 130 },
                { key: 'fin',        label: 'Fin',          type: 'date', width: 130 },
                { key: 'service',    label: 'Service' },
                { key: 'division',   label: 'Division' },
                { key: 'bureau',     label: 'Bureau' },
                { key: 'raison',     label: 'Raison' },
                { key: 'obs',        label: 'Obs.' },
              ]} />
            </Box>
          )}

          {/* ════ TAB 5: DOCUMENTS ════ */}
          {activeTab === 5 && (
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <SectionTitle>Documents administratifs</SectionTitle>
                <Button size="small" startIcon={<Add sx={{ fontSize: 14 }} />} variant="outlined"
                  onClick={addDoc}
                  sx={{ borderRadius: '20px', fontSize: 11, fontWeight: 700, borderColor: '#BAE6FD', color: '#0891B2', '&:hover': { bgcolor: '#F0F9FF', borderColor: '#0891B2' } }}>
                  Ajouter un document
                </Button>
              </Stack>

              <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
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
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}>
                          <Stack alignItems="center" spacing={1.5}>
                            <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Folder sx={{ fontSize: 28, color: '#BAE6FD' }} />
                            </Box>
                            <Box textAlign="center">
                              <Typography variant="body2" fontWeight={600} color="text.secondary">Aucun document</Typography>
                              <Typography variant="caption" color="text.disabled">Cliquez "Ajouter un document" pour joindre des fichiers</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : documents.map(doc => (
                      <TableRow key={doc.id} hover sx={{ '&:hover td': { bgcolor: '#F0F9FF' } }}>
                        <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                          <Select value={doc.type} onChange={e => updateDoc(doc.id, 'type', e.target.value)}
                            size="small" displayEmpty fullWidth
                            sx={{ fontSize: 12, height: 30, bgcolor: '#fff', '& fieldset': { borderColor: '#E8EDF2' } }}>
                            <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal' }}>—</em></MenuItem>
                            {['CIN','Passeport','Acte naissance','Diplôme','Contrat','Autre'].map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                          <TextField value={doc.libelle} onChange={e => updateDoc(doc.id, 'libelle', e.target.value)}
                            size="small" fullWidth placeholder="Libellé…"
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, height: 30, borderRadius: '7px', bgcolor: '#fff', '& fieldset': { borderColor: '#E8EDF2' } } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                          <TextField value={doc.description} onChange={e => updateDoc(doc.id, 'description', e.target.value)}
                            size="small" fullWidth placeholder="Description…"
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, height: 30, borderRadius: '7px', bgcolor: '#fff', '& fieldset': { borderColor: '#E8EDF2' } } }} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                          <Select value={doc.extension} onChange={e => updateDoc(doc.id, 'extension', e.target.value)}
                            size="small" fullWidth
                            sx={{ fontSize: 12, height: 30, bgcolor: '#fff', '& fieldset': { borderColor: '#E8EDF2' } }}>
                            {['PDF','JPEG','PNG','DOCX','XLSX'].map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 0.75, borderColor: '#F1F5F9' }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Button component="label" size="small" variant="outlined"
                              startIcon={<AttachFile sx={{ fontSize: '12px !important' }} />}
                              sx={{ fontSize: 10.5, fontWeight: 700, borderRadius: '7px', px: 1, py: 0.25, borderColor: '#BAE6FD', color: '#0891B2', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#F0F9FF' } }}>
                              Parcourir
                              <input type="file" hidden onChange={e => handleDocFile(doc.id, e.target.files?.[0] ?? null)} />
                            </Button>
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
                                <Search sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer" arrow>
                              <IconButton size="small" onClick={() => removeDoc(doc.id)}
                                sx={{ color: '#DC2626', bgcolor: '#FFF5F5', borderRadius: '6px', width: 26, height: 26, '&:hover': { bgcolor: '#FEE2E2' } }}>
                                <Delete sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {documents.length > 0 && (
                <Stack direction="row" alignItems="center" spacing={1} mt={1.5}
                  sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#0891B2' }} />
                  <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 600 }}>
                    {documents.length} document{documents.length > 1 ? 's' : ''} · {documents.filter(d => d.fileName).length} fichier{documents.filter(d => d.fileName).length > 1 ? 's' : ''} joint{documents.filter(d => d.fileName).length > 1 ? 's' : ''}
                  </Typography>
                </Stack>
              )}
            </Box>
          )}

          {/* ════ TAB 6: INFO PAR INDICE ════ */}
          {activeTab === 6 && (
            <Grid container spacing={2}>
              {/* Mode paiement */}
              <Grid item xs={12}>
                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField label="Mode de paiement" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                      {['Virement','Espèces','Chèque'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField label="Type de modèle de paie" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                      <MenuItem value="">—</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField label="Part TRIMF" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                      <MenuItem value="">—</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField label="Part IR" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                      <MenuItem value="">—</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={1}>
                    <FormControlLabel control={<Checkbox size="small" />}
                      label={<Typography variant="caption" fontWeight={600}>Médecin</Typography>}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Indice */}
              <Grid item xs={12} md={6}>
                <GroupBox title="Indice d'agent">
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Indice d'agent" select size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                        <MenuItem value="">—</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Hiérarchie" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Indemnité de sujétion" type="number" size="small" fullWidth sx={{ bgcolor: '#fff' }} />
                    </Grid>
                    <Grid item xs={4}><TextField label="Classe" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                    <Grid item xs={4}><TextField label="Échelon" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                    <Grid item xs={4}><TextField label="Grade" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                    <Grid item xs={4}><TextField label="Valeur indice" type="number" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                    <Grid item xs={4}><TextField label="Indice" type="number" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                    <Grid item xs={4}><TextField label="Rappel d'avancement" type="number" size="small" fullWidth sx={{ bgcolor: '#fff' }} /></Grid>
                  </Grid>
                </GroupBox>
              </Grid>

              {/* Information du paiement */}
              <Grid item xs={12} md={6}>
                <GroupBox title="Information du paiement">
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField label="Complément spécial de solde 20%" type="number" size="small" fullWidth disabled sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Indemnité de résidence 14%" type="number" size="small" fullWidth disabled sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Hiérarchie" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Indice code" size="small" fullWidth disabled sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Solde mensuelle indiciaire assimilés" type="number" size="small" fullWidth disabled
                        sx={{ bgcolor: '#FFFBEB', '& .MuiOutlinedInput-root': { fontWeight: 700 } }} />
                    </Grid>
                  </Grid>
                </GroupBox>
              </Grid>

              {/* Médecin */}
              <Grid item xs={12}>
                <GroupBox title="Partie pour le médecin">
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Sursalaire" type="number" size="small" fullWidth sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Indemnité responsabilité" type="number" size="small" fullWidth sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Indemnité de spécialisation" type="number" size="small" fullWidth sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField label="Indemnité représentation médicale" type="number" size="small" fullWidth sx={{ bgcolor: '#FFFBEB' }} />
                    </Grid>
                  </Grid>
                </GroupBox>
              </Grid>
            </Grid>
          )}
        </Box>

        {/* ── FOOTER ACTIONS ── */}
        <Box
          sx={{
            px: 2.5, py: 1.5,
            borderTop: '1px solid #E2E8F0',
            bgcolor: '#fff',
            display: 'flex', justifyContent: 'flex-end', gap: 1.5,
          }}
        >
          <Button variant="outlined" onClick={() => navigate(isEdit ? `/employees/${id}` : '/employees')}
            sx={{ borderRadius: '8px', fontSize: 13, color: '#64748B', borderColor: '#E2E8F0' }}>
            Annuler
          </Button>
          <Button type="submit" variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={15} color="inherit" /> : <Save />}
            disabled={isSubmitting}
            sx={{
              borderRadius: '8px', fontSize: 13, px: 3,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              boxShadow: '0 3px 10px rgba(37,99,235,0.35)',
            }}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer l\'agent'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
