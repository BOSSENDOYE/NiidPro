import { useRef, useState, useEffect } from 'react';
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
  AccountBalance, HealthAndSafety,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';
import { getPayrollTemplates, type PayrollTemplate } from '../../api/payrollTemplates';
import { recruitmentApi } from '../../api/recruitment';
import { organisationUnitApi, type OrgUnit } from '../../api/organisationUnits';
import type { Employee, RecruitmentIndice } from '../../types';

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
  base_salary:        z.number().min(0),
  department_id:      z.number().min(1, 'Service requis'),
  status:             z.enum(['active', 'inactive', 'suspended']),
  annual_leave_days:  z.number().min(0),
  employee_number:    z.string().optional(),
  city:               z.string().optional(),
  country:            z.string().optional(),
  birth_place:        z.string().optional(),
  payroll_template_id:  z.number().nullable().optional(),
  indice_id:            z.number().nullable().optional(),
  part_trimf:           z.number().nullable().optional(),
  part_ir:              z.number().nullable().optional(),
  organisation_unit_id: z.number().nullable().optional(),
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
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', fontSize: 13, bgcolor: '#fff',
    '& fieldset': { borderColor: '#DDE3EE' },
    '&:hover fieldset': { borderColor: '#6B8DD6' },
    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '1.5px' },
    '&.Mui-disabled': { bgcolor: '#F6F8FC' },
    '&.Mui-disabled fieldset': { borderColor: '#E8ECF4' },
  },
};
const labelSx = {
  fontSize: 10, fontWeight: 800, color: '#7C8BAB',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', display: 'block', mb: 0.5,
};

const SF = (props: React.ComponentProps<typeof TextField>) => (
  <TextField size="small" fullWidth {...props} sx={{ ...inputSx, ...props.sx }} />
);

/* ─── Section Box ─── */
const SectionBox = ({ title, color = '#2563EB', icon, children }: {
  title: string; color?: string; icon?: React.ReactNode; children: React.ReactNode
}) => (
  <Box sx={{
    border: '1px solid #E8EDF6', borderRadius: '14px', overflow: 'hidden', mb: 2,
    boxShadow: '0 1px 6px rgba(15,23,42,0.05)',
  }}>
    <Box sx={{
      background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.03)} 100%)`,
      borderBottom: `1px solid ${alpha(color, 0.14)}`,
      px: 2, py: 1.25,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {icon && <Box sx={{ color, display: 'flex', '& svg': { fontSize: 15 } }}>{icon}</Box>}
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          {title}
        </Typography>
      </Stack>
    </Box>
    <Box sx={{ p: 2, bgcolor: '#FAFBFF' }}>{children}</Box>
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

/* Construit les valeurs du formulaire depuis un Employee existant */
function empToForm(e: Employee): FormData {
  return {
    first_name:         e.first_name                                   ?? '',
    last_name:          e.last_name                                    ?? '',
    professional_email: e.professional_email                           ?? '',
    phone:              e.phone_personal ?? e.phone_professional ?? e.phone ?? '',
    hire_date:          (e.hire_date ?? '').slice(0, 10),
    birth_date:         (e.birth_date ?? '').slice(0, 10),
    nationality:        e.nationality   ?? '',
    gender:             e.gender        ?? '',
    base_salary:        Number(e.base_salary)       || 0,
    department_id:      Number(e.department_id)     || 0,
    status:             (['active','inactive','suspended'].includes(e.status)
                          ? e.status
                          : 'active') as FormData['status'],
    annual_leave_days:  Number(e.annual_leave_days) || 30,
    employee_number:    e.employee_number ?? '',
    city:               e.city           ?? '',
    country:            e.country        ?? '',
    birth_place:        e.birth_place    ?? '',
    payroll_template_id:  e.payroll_template_id ?? null,
    indice_id:            e.indice_id ?? null,
    part_trimf:           e.part_trimf   ? Number(e.part_trimf)   : null,
    part_ir:              e.part_ir      ? Number(e.part_ir)      : null,
    organisation_unit_id: e.organisation_unit_id ?? null,
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

  const { data: payrollTemplates = [] } = useQuery({
    queryKey: ['payroll-templates'],
    queryFn: getPayrollTemplates,
  });

  /* ── Organisation units (filière) ── */
  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['organisation-units'],
    queryFn: () => organisationUnitApi.list().then(r => r.data),
  });

  // Org units that are top-level anchors (gouvernance/direction/appui/cellule with no parent or parent is gouvernance)
  const govIds = new Set(orgUnits.filter(u => u.type === 'gouvernance').map(u => u.id));
  const parentUnits = orgUnits.filter(u => u.parent_id === null || govIds.has(u.parent_id));
  // Children of the selected parent
  const [orgParentId, setOrgParentId] = useState<number | null>(null);
  const childUnits = orgUnits.filter(u => u.parent_id === orgParentId);

  // On edit mode: restore orgParentId from the existing organisation_unit_id
  useEffect(() => {
    if (!employee || !orgUnits.length) return;
    const unitId = employee.organisation_unit_id;
    if (!unitId) return;
    const unit = orgUnits.find(u => u.id === unitId);
    if (!unit) return;
    // If this unit has a parent in our parentUnits list, set that parent
    if (unit.parent_id && parentUnits.some(p => p.id === unit.parent_id)) {
      setOrgParentId(unit.parent_id);
    } else {
      // It is itself a parent unit
      setOrgParentId(unit.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, orgUnits.length]);

  /* ── Indices (Grade) ── */
  const [selectedIndice, setSelectedIndice] = useState<RecruitmentIndice | null>(
    employee?.indice ?? null
  );

  const { data: indices = [] } = useQuery<RecruitmentIndice[]>({
    queryKey: ['payroll', 'params', 'indices'],
    queryFn: () => recruitmentApi.getIndices().then(r => r.data),
  });

  /* Valeurs calculées automatiquement depuis l'indice sélectionné */
  const complement20 = selectedIndice?.solde_mensuelle ? Math.round(selectedIndice.solde_mensuelle * 0.20) : 0;
  const indemnite14  = selectedIndice?.solde_mensuelle ? Math.round(selectedIndice.solde_mensuelle * 0.14) : 0;

  /* ── Formulaire ── */
  /*
   * `values` (option react-hook-form ≥ v7.28) synchronise les valeurs à chaque rendu.
   * Comme le parent force key={modalKey} à chaque ouverture, le composant est
   * toujours remonté proprement → values est appliqué dès le premier rendu,
   * sans conflit avec zodResolver (le resolver ne valide qu'au submit).
   */
  const formValues: FormData = employee && mode !== 'create'
    ? empToForm(employee)
    : { status: 'active', annual_leave_days: 30, base_salary: 0, department_id: 0,
        first_name: '', last_name: '', professional_email: '', phone: '',
        hire_date: '', birth_date: '', nationality: '', gender: '',
        employee_number: '', city: '', country: '', birth_place: '',
        payroll_template_id: null, part_trimf: null, part_ir: null,
        organisation_unit_id: null };

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: formValues,
    mode: 'onSubmit',
  });

  /*
   * MUI TextField forwardRef pointe sur la div racine, PAS sur le <input> natif.
   * RHF fait element.value = '...' pour remplir les champs : ça ne fonctionne
   * que sur un vrai <input>. On extrait donc le ref et on le passe via inputRef.
   */
  const ri = (
    name: Parameters<typeof register>[0],
    opts?: Parameters<typeof register>[1],
  ) => {
    const { ref, ...rest } = register(name, opts as Parameters<typeof register>[1]);
    return { ...rest, inputRef: ref };
  };

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
    setOrgParentId(null);
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
          width: { xs: '100%', md: 1100 }, maxWidth: '98vw', maxHeight: '97vh',
          borderRadius: '20px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
        },
      }}
    >
      <>

        {/* ══ HEADER ══ */}
        <Box sx={{
          background: 'linear-gradient(135deg,#07101E 0%,#0E2240 55%,#081726 100%)',
          flexShrink: 0, position: 'relative', overflow: 'hidden',
        }}>
          {/* Top accent gradient bar */}
          <Box sx={{ height: 3, background: `linear-gradient(90deg, ${mCfg.color} 0%, #7C3AED 100%)` }} />
          {/* Dots pattern */}
          <Box sx={{ position: 'absolute', top: 3, bottom: 0, left: 0, right: 0, pointerEvents: 'none', opacity: 0.04, backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          {/* Glow overlay */}
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 12% 70%, ${mCfg.color}18 0%, transparent 50%), radial-gradient(ellipse at 88% 15%, rgba(124,58,237,.06) 0%, transparent 50%)` }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2, position: 'relative' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 50, height: 50, borderRadius: '15px',
                background: `linear-gradient(135deg, ${mCfg.color}, ${mCfg.color}BB)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 24px ${mCfg.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`, flexShrink: 0,
              }}>
                <Box sx={{ color: '#fff' }}>{mCfg.icon}</Box>
              </Box>
              <Box>
                <Stack direction="row" spacing={0.75} alignItems="center" mb={0.4}>
                  <Chip label="ANASER · GRH" size="small" sx={{ height: 17, fontSize: 8.5, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.07)', color: '#64748B', letterSpacing: '0.1em', borderRadius: '5px' }} />
                  <Chip label={mCfg.label.toUpperCase()} size="small" sx={{ height: 17, fontSize: 8.5, fontWeight: 700, bgcolor: alpha(mCfg.color, 0.2), color: mCfg.color, letterSpacing: '0.05em', borderRadius: '5px' }} />
                </Stack>
                <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', lineHeight: 1 }}>
                  Dossier Agent
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 11.5, mt: 0.3 }}>
                  {mode !== 'create' && employee ? `${employee.full_name} · ${employee.employee_number}` : 'Création d\'un nouvel agent'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {!isView && (
                <Button size="small" type="submit" form="agent-form"
                  startIcon={mutation.isPending ? <CircularProgress size={13} color="inherit" /> : <Save sx={{ fontSize: '14px !important' }} />}
                  disabled={mutation.isPending}
                  sx={{
                    bgcolor: mCfg.color, color: '#fff', fontWeight: 700, fontSize: 12.5, borderRadius: '11px', px: 2.5, py: 0.9,
                    boxShadow: `0 4px 14px ${mCfg.color}55`,
                    '&:hover': { filter: 'brightness(0.88)', transform: 'translateY(-1px)' },
                    transition: 'all .15s',
                  }}>
                  {mutation.isPending ? 'Enregistrement…' : (mode === 'edit' ? 'Mettre à jour' : 'Enregistrer')}
                </Button>
              )}
              {!isView && (
                <Button size="small" startIcon={<Autorenew sx={{ fontSize: '13px !important' }} />}
                  sx={{ color: '#64748B', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', fontSize: 11.5, px: 1.75, '&:hover': { bgcolor: 'rgba(255,255,255,.06)', color: '#94A3B8' } }}>
                  Renouvellement
                </Button>
              )}
              <IconButton size="small" onClick={handleClose}
                sx={{ color: '#475569', bgcolor: 'rgba(255,255,255,.06)', borderRadius: '10px', width: 34, height: 34, border: '1px solid rgba(255,255,255,0.07)', '&:hover': { color: '#F87171', bgcolor: 'rgba(248,113,113,.12)' } }}>
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
              <Alert severity="error" sx={{ mx: 2, mt: 1.25, borderRadius: '10px', fontSize: 12, py: 0.5 }}>
                {mutError.response?.data?.message ?? 'Erreur — vérifiez les champs obligatoires.'}
              </Alert>
            )}

            {/* ── IDENTITY CARD ── */}
            <Box sx={{ display: 'flex', flexShrink: 0, bgcolor: '#fff', borderBottom: '1.5px solid #E4EAF5' }}>

              {/* LEFT: Photo + mini preview (dark panel) */}
              <Box sx={{
                width: 172, flexShrink: 0,
                background: 'linear-gradient(170deg, #09192F 0%, #132B4A 55%, #0B1F3A 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', py: 2.5, px: 2.25, gap: 1.75,
                borderRight: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Box onClick={() => !isView && fileRef.current?.click()} sx={{
                  width: 108, height: 132, borderRadius: '16px',
                  position: 'relative', overflow: 'hidden',
                  cursor: isView ? 'default' : 'pointer',
                  border: `2.5px solid ${alpha(mCfg.color, 0.5)}`,
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.07), 0 12px 32px rgba(0,0,0,0.55)`,
                  bgcolor: '#1B3255', transition: 'all .25s',
                  ...(!isView ? { '&:hover': { borderColor: mCfg.color, transform: 'scale(1.025)' }, '&:hover .cam-ov': { opacity: 1 } } : {}),
                }}>
                  {photoUrl
                    ? <Box component="img" src={photoUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <Stack alignItems="center" justifyContent="center" height="100%" spacing={1.25}>
                        <Avatar sx={{ width: 50, height: 50, fontSize: 20, fontWeight: 800, background: `linear-gradient(135deg, ${mCfg.color}55, #7C3AED55)`, color: '#fff' }}>
                          {initials}
                        </Avatar>
                        {!isView && <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.12em' }}>PHOTO</Typography>}
                      </Stack>
                    )
                  }
                  <Box className="cam-ov" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '.2s', flexDirection: 'column', gap: 0.5 }}>
                    <CameraAlt sx={{ color: '#fff', fontSize: 22 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em' }}>CHANGER</Typography>
                  </Box>
                </Box>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />

                <Box textAlign="center">
                  <Typography sx={{ color: '#E2E8F0', fontWeight: 800, fontSize: 12.5, lineHeight: 1.35, mb: 0.9 }}>
                    {watched.first_name || '—'}{' '}{watched.last_name || '—'}
                  </Typography>
                  <Chip
                    label={watched.status === 'active' ? '● ACTIF' : watched.status === 'inactive' ? '● INACTIF' : '● SUSPENDU'}
                    size="small"
                    sx={{
                      height: 20, fontSize: 9, fontWeight: 800, letterSpacing: '0.03em',
                      bgcolor: watched.status === 'active' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                      color: watched.status === 'active' ? '#34D399' : '#F87171',
                      border: `1px solid ${watched.status === 'active' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    }}
                  />
                  {deptName !== '—' && (
                    <Typography sx={{ color: '#4A6080', fontSize: 9, mt: 0.9, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.3 }}>
                      {deptName}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* RIGHT: Fields */}
              <Box sx={{ flex: 1, p: 2.25, minWidth: 0, bgcolor: '#FAFBFF' }}>
                <Box sx={{ display: 'none' }}>{/* placeholder for old Grid container */}</Box>
                <Grid container spacing={1.5} alignItems="flex-start">
                <Grid item xs={12} md={12}>
                  {/* Ligne 1 */}
                  <Grid container spacing={1.25} mb={1.25}>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>ID</Typography>
                      <SF disabled value={employee?.id ?? 'Auto'} sx={{ bgcolor: '#F1F5F9' }} />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Matricule</Typography>
                      <SF {...ri('employee_number')} placeholder="EMP-001" disabled={isView} />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Prénom *</Typography>
                      <SF {...ri('first_name')} error={!!errors.first_name} helperText={errors.first_name?.message} placeholder="Prénom" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" sx={labelSx}>Nom *</Typography>
                      <SF {...ri('last_name')} error={!!errors.last_name} helperText={errors.last_name?.message} placeholder="Nom" disabled={isView} />
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
                      <SF {...ri('birth_date')} type="date" InputLabelProps={{ shrink: true }} disabled={isView} />
                    </Grid>
                    <Grid item xs={3} sm={1}>
                      <Typography variant="caption" sx={labelSx}>Âge</Typography>
                      <SF disabled value={age ?? ''} sx={{ bgcolor: '#F1F5F9' }}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>ans</Typography></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={9} sm={2.5}>
                      <Typography variant="caption" sx={labelSx}>Lieu naissance</Typography>
                      <SF {...ri('birth_place')} placeholder="Dakar" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Nationalité</Typography>
                      <SF {...ri('nationality')} placeholder="Sénégalaise" disabled={isView} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Email professionnel *</Typography>
                      <SF {...ri('professional_email')} type="email" placeholder="prenom.nom@org.sn"
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
                    {/* Cascading org unit: Direction → Division */}
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Direction / Entité</Typography>
                      <FormControl size="small" fullWidth sx={inputSx}>
                        <Select
                          value={orgParentId ?? ''}
                          displayEmpty
                          disabled={isView}
                          onChange={e => {
                            const pid = e.target.value === '' ? null : Number(e.target.value);
                            setOrgParentId(pid);
                            // If this parent has children → don't set organisation_unit_id yet
                            const hasChildren = orgUnits.some(u => u.parent_id === pid);
                            if (!hasChildren) {
                              setValue('organisation_unit_id', pid);
                            } else {
                              setValue('organisation_unit_id', null);
                            }
                            // Auto-sync department_id
                            if (pid) {
                              const unit = orgUnits.find(u => u.id === pid);
                              if (unit?.type === 'direction') {
                                const matchedDept = (departments ?? []).find((d: { id: number; name: string }) =>
                                  d.name.toLowerCase().includes(unit.libelle.substring(0, 15).toLowerCase()) ||
                                  unit.libelle.toLowerCase().includes(d.name.substring(0, 15).toLowerCase())
                                );
                                if (matchedDept) setValue('department_id', matchedDept.id);
                              }
                            }
                          }}
                        >
                          <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal', fontSize: 13 }}>Sélectionner</em></MenuItem>
                          {parentUnits.map(u => (
                            <MenuItem key={u.id} value={u.id} sx={{ fontSize: 13 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={u.code} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#EFF6FF', color: '#2563EB', flexShrink: 0 }} />
                                <span>{u.libelle}</span>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" sx={labelSx}>Division / Service</Typography>
                      <FormControl size="small" fullWidth sx={inputSx}>
                        <Select
                          value={childUnits.length > 0 ? (watch('organisation_unit_id') ?? '') : ''}
                          displayEmpty
                          disabled={isView || childUnits.length === 0}
                          onChange={e => {
                            const cid = e.target.value === '' ? null : Number(e.target.value);
                            setValue('organisation_unit_id', cid ?? orgParentId);
                          }}
                        >
                          <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal', fontSize: 13 }}>{childUnits.length === 0 ? '—' : 'Sélectionner'}</em></MenuItem>
                          {childUnits.map(u => (
                            <MenuItem key={u.id} value={u.id} sx={{ fontSize: 13 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={u.code} size="small" sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#F0FDF4', color: '#059669', flexShrink: 0 }} />
                                <span>{u.libelle}</span>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              </Box>
            </Box>

            {/* ── TABS BAR ── */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E4EAF5', flexShrink: 0, px: 1 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{
                  minHeight: 46,
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': {
                    minHeight: 46, fontSize: 11.5, fontWeight: 600, color: '#64748B',
                    textTransform: 'none', px: 2, mx: 0.25, borderRadius: '10px',
                    transition: 'all .18s',
                    '&:hover': { color: '#0F172A', bgcolor: '#F0F4FF' },
                  },
                  '& .Mui-selected': {
                    color: `${TABS[tab]?.color} !important`, fontWeight: '700 !important',
                    bgcolor: `${alpha(TABS[tab]?.color ?? '#2563EB', 0.08)} !important`,
                  },
                }}>
                {TABS.map((t, i) => (
                  <Tab key={i} label={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box sx={{
                        width: 26, height: 26, borderRadius: '8px',
                        bgcolor: tab === i ? alpha(t.color, 0.15) : '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .18s',
                        '& svg': { fontSize: 13.5, color: tab === i ? t.color : '#94A3B8', transition: 'color .18s' },
                      }}>
                        {t.icon}
                      </Box>
                      <span>{t.label}</span>
                    </Stack>
                  } />
                ))}
              </Tabs>
            </Box>

            {/* ── TAB CONTENT ── */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2.25, bgcolor: '#F2F5FB' }}>

              {/* ─── TAB 0 : FILIATIONS ─── */}
              {tab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Grid container spacing={1.25}>
                      <Grid item xs={6} sm={2.5}><Typography variant="caption" sx={labelSx}>Téléphone fixe</Typography><SF {...ri('phone')} placeholder="+221 33 000 00 00" disabled={isView} /></Grid>
                      <Grid item xs={3} sm={1.5}><Typography variant="caption" sx={labelSx}>CP</Typography><SF placeholder="10000" disabled={isView} /></Grid>
                      <Grid item xs={3} sm={2}><Typography variant="caption" sx={labelSx}>Cellulaire</Typography><SF placeholder="+221 77 …" disabled={isView} /></Grid>
                      <Grid item xs={12} sm={3}><Typography variant="caption" sx={labelSx}>Adresse</Typography><SF {...ri('city')} placeholder="Rue, Dakar" disabled={isView} /></Grid>
                      <Grid item xs={12} sm={3}><Typography variant="caption" sx={labelSx}>Pays</Typography><SF {...ri('country')} placeholder="Sénégal" disabled={isView} /></Grid>
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
                          <SF {...ri('hire_date')} type="date" InputLabelProps={{ shrink: true }} error={!!errors.hire_date} helperText={errors.hire_date?.message} disabled={isView} />
                        </Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Date fin</Typography><SF type="date" InputLabelProps={{ shrink: true }} disabled={isView} /></Grid>
                        <Grid item xs={4}><Typography variant="caption" sx={labelSx}>Âge retraite</Typography><SF type="number" disabled={isView} /></Grid>
                        <Grid item xs={8}><Typography variant="caption" sx={labelSx}>Date retraite</Typography><SF type="date" disabled InputLabelProps={{ shrink: true }} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Profession</Typography><SF select disabled={isView}><MenuItem value="">—</MenuItem></SF></Grid>
                        <Grid item xs={6}><Typography variant="caption" sx={labelSx}>Ancienneté</Typography><SF disabled defaultValue={0} sx={{ bgcolor: '#F1F5F9' }} /></Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Salaire de base *</Typography>
                          <SF {...ri('base_salary', { valueAsNumber: true })} type="number" error={!!errors.base_salary} helperText={errors.base_salary?.message} disabled={isView}
                            InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>FCFA</Typography></InputAdornment> }} />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Jours congé / an</Typography>
                          <SF {...ri('annual_leave_days', { valueAsNumber: true })} type="number" disabled={isView}
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
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={labelSx}>Modèle de bulletin de paie</Typography>
                        <Controller name="payroll_template_id" control={control} render={({ field }) => (
                          <FormControl size="small" fullWidth sx={inputSx}>
                            <Select
                              value={field.value ?? ''}
                              onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                              displayEmpty
                              disabled={isView}
                            >
                              <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal', fontSize: 13 }}>— Non affecté —</em></MenuItem>
                              {(payrollTemplates as PayrollTemplate[]).filter(t => t.is_active).map(t => (
                                <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )} />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" sx={labelSx}>Part TRIMF</Typography>
                        <Controller name="part_trimf" control={control} render={({ field }) => (
                          <SF select disabled={isView} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}>
                            <MenuItem value="">—</MenuItem>
                            {Array.from({ length: 9 }, (_, i) => 1 + i * 0.5).map(v => <MenuItem key={v} value={v} sx={{ fontSize: 13 }}>{v}</MenuItem>)}
                          </SF>
                        )} />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="caption" sx={labelSx}>Part IR</Typography>
                        <Controller name="part_ir" control={control} render={({ field }) => (
                          <SF select disabled={isView} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}>
                            <MenuItem value="">—</MenuItem>
                            {Array.from({ length: 9 }, (_, i) => 1 + i * 0.5).map(v => <MenuItem key={v} value={v} sx={{ fontSize: 13 }}>{v}</MenuItem>)}
                          </SF>
                        )} />
                      </Grid>
                      <Grid item xs={6} sm={1}><FormControlLabel control={<Checkbox size="small" disabled={isView} />} label={<Typography sx={{ fontSize: 11, fontWeight: 700 }}>Médecin</Typography>} sx={{ m: 0, mt: 1.5 }} /></Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Grade / Indice" color="#9333EA" icon={<BarChart />}>
                      <Grid container spacing={1.25}>

                        {/* ── Grade (sélecteur principal) ── */}
                        <Grid item xs={12} sm={8}>
                          <Typography variant="caption" sx={labelSx}>Grade</Typography>
                          <FormControl size="small" fullWidth sx={inputSx}>
                            <Select
                              value={selectedIndice?.id ?? ''}
                              onChange={e => {
                                const id = e.target.value === '' ? null : Number(e.target.value);
                                const found = id ? ((indices as RecruitmentIndice[]).find(i => i.id === id) ?? null) : null;
                                setSelectedIndice(found);
                                setValue('indice_id', id);
                              }}
                              displayEmpty
                              disabled={isView}
                            >
                              <MenuItem value=""><em style={{ color: '#94A3B8', fontStyle: 'normal', fontSize: 13 }}>— Sélectionner un grade —</em></MenuItem>
                              {(indices as RecruitmentIndice[]).filter(i => i.is_active).map(i => (
                                <MenuItem key={i.id} value={i.id} sx={{ fontSize: 13 }}>
                                  {i.garde ? `${i.garde} — ${i.code}` : i.code}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Indemnité sujétion (saisie libre) */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Indemnité sujétion</Typography>
                          <SF type="number" defaultValue={0} disabled={isView} />
                        </Grid>

                        {/* Hiérarchie (auto) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Hiérarchie</Typography>
                          <SF
                            value={selectedIndice?.hierarchy?.libelle ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {/* Classe (auto) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Classe</Typography>
                          <SF
                            value={selectedIndice?.classe ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {/* Échelon (auto) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Échelon</Typography>
                          <SF
                            value={selectedIndice?.echelon_label ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {/* Valeur indiciaire (auto) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Valeur indiciaire</Typography>
                          <SF
                            type="number"
                            value={selectedIndice?.valeur ?? 0}
                            disabled
                            sx={{ bgcolor: '#F1F5F9' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {/* Indice code (auto) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Code indice</Typography>
                          <SF
                            value={selectedIndice?.code ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9', '& input': { fontFamily: 'monospace', fontWeight: 700 } }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>

                        {/* Rappel avancement (saisie libre) */}
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" sx={labelSx}>Rappel avancement</Typography>
                          <SF type="number" defaultValue={0} disabled={isView} />
                        </Grid>

                      </Grid>
                    </SectionBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionBox title="Information du paiement" color="#D97706" icon={<AccountBalance />}>
                      <Grid container spacing={1.25}>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Complément spécial 20%</Typography>
                          <SF
                            type="number"
                            value={complement20}
                            disabled
                            sx={{ bgcolor: '#FFFBEB' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Indemnité résidence 14%</Typography>
                          <SF
                            type="number"
                            value={indemnite14}
                            disabled
                            sx={{ bgcolor: '#FFFBEB' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Hiérarchie</Typography>
                          <SF
                            value={selectedIndice?.hierarchy?.libelle ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9' }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={labelSx}>Code indice</Typography>
                          <SF
                            value={selectedIndice?.code ?? ''}
                            disabled
                            sx={{ bgcolor: '#F1F5F9', '& input': { fontFamily: 'monospace' } }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" sx={labelSx}>Solde mensuelle indiciaire</Typography>
                          <SF
                            type="number"
                            value={selectedIndice?.solde_mensuelle ?? 0}
                            disabled
                            sx={{ bgcolor: '#FFFBEB', '& input': { fontWeight: 700 } }}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
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
            <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #E4EAF5', bgcolor: '#fff', flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                {/* Dots de navigation */}
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {TABS.map((t, i) => (
                    <Tooltip key={i} title={t.label} arrow placement="top">
                      <Box onClick={() => setTab(i)} sx={{
                        width: tab === i ? 28 : 8, height: 8, borderRadius: '99px', cursor: 'pointer',
                        bgcolor: tab === i ? t.color : i < tab ? alpha(t.color, 0.3) : '#DDE3EE',
                        transition: 'all 0.25s ease',
                        '&:hover': { bgcolor: t.color, transform: 'scaleY(1.15)' },
                      }} />
                    </Tooltip>
                  ))}
                  <Typography sx={{ fontSize: 11, color: '#94A3B8', ml: 0.75, fontWeight: 600 }}>
                    {tab + 1}/{TABS.length}
                  </Typography>
                </Stack>

                {/* Boutons navigation tab */}
                <Stack direction="row" spacing={0.75}>
                  {tab > 0 && (
                    <Button size="small" variant="outlined" onClick={() => setTab(t => t - 1)}
                      sx={{ borderRadius: '9px', fontSize: 12, fontWeight: 600, px: 2, borderColor: '#DDE3EE', color: '#475569', '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' } }}>
                      ← Précédent
                    </Button>
                  )}
                  {tab < TABS.length - 1 && (
                    <Button size="small" variant="outlined" onClick={() => setTab(t => t + 1)}
                      sx={{ borderRadius: '9px', fontSize: 12, fontWeight: 600, px: 2, borderColor: '#DDE3EE', color: '#475569', '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' } }}>
                      Suivant →
                    </Button>
                  )}
                  {!isView && tab === TABS.length - 1 && (
                    <Button size="small" type="submit" form="agent-form"
                      startIcon={mutation.isPending ? <CircularProgress size={12} color="inherit" /> : <Save sx={{ fontSize: '13px !important' }} />}
                      disabled={mutation.isPending}
                      sx={{ bgcolor: mCfg.color, color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: '9px', px: 2.5, boxShadow: `0 3px 12px ${mCfg.color}45`, '&:hover': { filter: 'brightness(0.9)', transform: 'translateY(-1px)' }, transition: 'all .15s' }}>
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
