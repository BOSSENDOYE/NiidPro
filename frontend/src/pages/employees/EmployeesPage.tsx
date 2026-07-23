import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Avatar, Typography, IconButton, Tooltip, TextField,
  Skeleton, Stack, Tabs, Tab, Button, CircularProgress,
  Chip, Select, FormControl, InputLabel, Grid, Divider, Checkbox, Menu, ListItemIcon, ListItemText,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert,
} from '@mui/material';
import {
  Visibility, Edit, Delete, Email, Badge as BadgeIcon,
  Print, PersonAdd, Groups, CheckCircle, Block,
  Gavel, Assignment, Assessment, ViewModule, ViewList,
  Phone, Event, Refresh, AccessTime, EmojiEvents, Search, AssignmentTurnedIn,
  FileUpload, HowToReg, QrCode2, VerifiedUser, DoNotDisturb, EditNote,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/employees';
import { tasksApi } from '../../api/tasks';
import client from '../../api/client';
import { organisationUnitApi, type OrgUnit } from '../../api/organisationUnits';
import { formatDate, fmtMatricule } from '../../utils/format';
import EmployeeCreateModal from '../../components/employees/EmployeeCreateModal';
import ContractTab from '../../components/employees/ContractTab';
import EvaluationTab from '../../components/employees/EvaluationTab';
import AvailabilityTab from '../../components/employees/AvailabilityTab';
import DistinctionTab from '../../components/employees/DistinctionTab';
import SanctionTab from '../../components/employees/SanctionTab';
import EmployeeBadgeCard from '../../components/employees/EmployeeBadgeCard';
import ComposeEmailDialog from '../../components/employees/ComposeEmailDialog';
import type { Employee, EnrollmentRequest } from '../../types';

const TAB_CONFIG = [
  { label: 'Agents',              icon: <Groups fontSize="small" />,      color: '#F97316' },
  { label: 'Disponibilité',       icon: <AccessTime fontSize="small" />,  color: '#06B6D4' },
  { label: 'Distinction',         icon: <EmojiEvents fontSize="small" />, color: '#A855F7' },
  { label: 'Sanction',            icon: <Gavel fontSize="small" />,       color: '#EF4444' },
  { label: 'Contrat',             icon: <Assignment fontSize="small" />,  color: '#3B82F6' },
  { label: 'Évaluation',          icon: <Assessment fontSize="small" />,  color: '#F59E0B' },
  { label: 'Vérification agents', icon: <HowToReg fontSize="small" />,   color: '#002f59' },
];

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState(0);
  const [viewMode, setViewMode]         = useState<'grid' | 'table'>('grid');
  const [page, setPage]                 = useState(0);
  const rowsPerPage                     = 20;
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [matricule, setMatricule]       = useState('');
  const [prenom, setPrenom]             = useState('');
  const [nom, setNom]                   = useState('');
  const [sexe, setSexe]                 = useState('');
  const [service, setService]           = useState('');
  const [telephone, setTelephone]       = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<number[]>([]);
  const [anchorEl, setAnchorEl]         = useState<null | HTMLElement>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalMode, setModalMode]       = useState<'create'|'edit'|'view'>('create');
  const [modalEmployee, setModalEmployee] = useState<Employee | undefined>(undefined);
  const [modalKey, setModalKey]         = useState(0);
  const [badgeEmployee, setBadgeEmployee] = useState<Employee | null>(null);
  const [emailEmp, setEmailEmp] = useState<Employee | null>(null);
  const [taskEmp, setTaskEmp]   = useState<Employee | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

  // ── Vérification / Enrôlement ────────────────────────────────────────────
  const ENROLL_URL = `${window.location.origin}/enroll`;
  const [enrollFilter, setEnrollFilter]       = useState<'pending'|'validated'|'rejected'|''>('pending');
  const [enrollDetail, setEnrollDetail]       = useState<{ enrollment: EnrollmentRequest; matched_employee: Employee | null } | null>(null);
  const [enrollDetailOpen, setEnrollDetailOpen] = useState(false);
  const [enrollRejectOpen, setEnrollRejectOpen] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [enrollActionLoading, setEnrollActionLoading] = useState(false);
  // ── Mode édition de l'enrôlement ─────────────────────────────────────────
  const [enrollEditMode, setEnrollEditMode]   = useState(false);
  const [enrollSaveLoading, setEnrollSaveLoading] = useState(false);
  type EnrollForm = {
    matricule: string; first_name: string; last_name: string;
    date_naissance: string; lieu_naissance: string; date_embauche: string;
    fonction: string; telephone: string; email: string;
    categorie_emploi: string; qualification: string; adresse: string;
    directionId: number | ''; divisionId: number | '';
  };
  const ENROLL_FORM_EMPTY: EnrollForm = {
    matricule: '', first_name: '', last_name: '',
    date_naissance: '', lieu_naissance: '', date_embauche: '',
    fonction: '', telephone: '', email: '',
    categorie_emploi: '', qualification: '', adresse: '',
    directionId: '', divisionId: '',
  };
  const [enrollEditForm, setEnrollEditForm]   = useState<EnrollForm>(ENROLL_FORM_EMPTY);

  const qcPage = useQueryClient();

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => organisationUnitApi.list().then(r => r.data),
    staleTime: 10 * 60_000,
    enabled: enrollDetailOpen,
  });

  const govIds    = new Set(orgUnits.filter(u => u.type === 'gouvernance').map(u => u.id));
  const directions = orgUnits.filter(u => u.parent_id === null || govIds.has(u.parent_id ?? -1));
  const divisionsByDirection = (dirId: number | '') =>
    dirId ? orgUnits.filter(u => u.parent_id === dirId && !directions.find(d => d.id === u.id)) : [];

  // Initialise le formulaire d'édition quand on ouvre une demande
  useEffect(() => {
    if (!enrollDetail || orgUnits.length === 0) return;
    const e = enrollDetail.enrollment;
    let dirId: number | '' = '';
    let divId: number | '' = '';
    if (e.organisation_unit_id) {
      const unit = orgUnits.find(u => u.id === e.organisation_unit_id);
      if (unit) {
        if (directions.some(d => d.id === unit.id)) {
          dirId = unit.id;
        } else {
          divId = unit.id;
          dirId = unit.parent_id ?? '';
        }
      }
    }
    setEnrollEditForm({
      matricule:       e.matricule ?? '',
      first_name:      e.first_name ?? '',
      last_name:       e.last_name ?? '',
      date_naissance:  e.date_naissance?.substring(0, 10) ?? '',
      lieu_naissance:  e.lieu_naissance ?? '',
      date_embauche:   e.date_embauche?.substring(0, 10) ?? '',
      fonction:        e.fonction ?? '',
      telephone:       e.telephone ?? '',
      email:           e.email ?? '',
      categorie_emploi: e.categorie_emploi ?? '',
      qualification:   e.qualification ?? '',
      adresse:         e.adresse ?? '',
      directionId:     dirId,
      divisionId:      divId,
    });
  }, [enrollDetail, orgUnits.length]);

  const taskMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => tasksApi.create(data),
    onSuccess: () => { qcPage.invalidateQueries({ queryKey: ['tasks'] }); setTaskEmp(null); setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' }); },
  });

  const openModal = (mode: 'create'|'edit'|'view', emp?: Employee) => {
    setModalMode(mode);
    setModalEmployee(emp);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setModalEmployee(undefined); };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employees', page, search, statusFilter],
    queryFn: () =>
      employeesApi.list({
        page: page + 1,
        per_page: rowsPerPage,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }).then((r) => r.data),
  });

  const { data: enrollmentsData, isLoading: loadingEnrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ['enrollments', enrollFilter],
    queryFn: () => client.get('/enrollments', { params: enrollFilter ? { status: enrollFilter } : {} }).then(r => r.data),
    enabled: activeTab === 6,
  });

  const handleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSearch = () => {
    setSearch([matricule, prenom, nom, telephone].filter(Boolean).join(' '));
    setPage(0);
  };

  const handleClear = () => {
    setMatricule(''); setPrenom(''); setNom(''); setSexe('');
    setService(''); setTelephone(''); setDateFrom(''); setDateTo('');
    setSearch(''); setStatusFilter('all'); setPage(0);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ══ ENTÊTE FIXE : header + onglets + filtres ══ */}
      <Box sx={{ flexShrink: 0 }}>

      {/* ══════════════════════════════════════════════════════════
          HEADER GRADIENT SOMBRE + ONGLETS
      ══════════════════════════════════════════════════════════ */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
        borderRadius: '16px 16px 0 0',
        px: 3, pt: 2.5, pb: 0,
        boxShadow: '0 4px 24px rgba(15,23,42,0.35)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 15% 50%, rgba(37,99,235,0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 30%, rgba(124,58,237,0.12) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
      }}>
        {/* Titre + compteurs */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{
              width: 46, height: 46, borderRadius: '13px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(249,115,22,0.45)', flexShrink: 0,
            }}>
              <Groups sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                Gestion des Agents
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Ressources Humaines · RH+PAIE Platform
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip icon={<Groups sx={{ fontSize: '13px !important', color: '#94A3B8 !important' }} />}
              label={`${data?.total ?? 0} Total`} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 600 }} />
            <Chip icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#34D399 !important' }} />}
              label="Actifs" size="small"
              sx={{ bgcolor: 'rgba(5,150,105,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)', fontSize: 11, fontWeight: 600 }} />
            <Chip icon={<Block sx={{ fontSize: '13px !important', color: '#FCA5A5 !important' }} />}
              label="Inactifs" size="small"
              sx={{ bgcolor: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: '1px solid rgba(252,165,165,0.25)', fontSize: 11, fontWeight: 600 }} />
          </Stack>
        </Stack>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTabs-scrollButtons': { color: '#64748B' },
            '& .MuiTab-root': {
              color: '#64748B', fontWeight: 500, fontSize: 12.5,
              px: 2.5, py: 1.5, minHeight: 46, borderRadius: '10px 10px 0 0',
              transition: 'all 0.2s ease',
              '&:hover': { color: '#CBD5E1', bgcolor: 'rgba(255,255,255,0.06)' },
            },
            '& .Mui-selected': {
              color: '#fff !important', fontWeight: '700 !important',
              background: 'linear-gradient(180deg, #F97316 0%, #EA580C 100%) !important',
              boxShadow: '0 -3px 14px rgba(249,115,22,0.35)',
            },
          }}>
          {TAB_CONFIG.map((tab, i) => (
            <Tab key={i} label={
              <Stack direction="row" alignItems="center" spacing={0.75}>
                {tab.icon}<span>{tab.label}</span>
              </Stack>
            } />
          ))}
        </Tabs>
      </Box>

      {/* ── BARRE RECHERCHE + ACTIONS (dans le bloc sticky) ── */}
      {activeTab === 0 && (
        <Box sx={{ bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
        <Box sx={{ px: 2, py: 1.25 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {/* Champs de recherche */}
                <TextField placeholder="Matricule" size="small" value={matricule} onChange={e => setMatricule(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 115 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Prénom" size="small" value={prenom} onChange={e => setPrenom(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 105 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Nom" size="small" value={nom} onChange={e => setNom(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 105 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Service" size="small" value={service} onChange={e => setService(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 105 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Téléphone" size="small" value={telephone} onChange={e => setTelephone(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 115 }} InputProps={{ sx: { fontSize: 12 } }} />

                {/* Toggle Statut */}
                <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
                  {([['all','Tous','#475569'],['active','Actif','#059669'],['inactive','Inactif','#DC2626']] as const).map(([val, lbl, clr]) => (
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

                <Button variant="contained" size="small" startIcon={<Search sx={{ fontSize: '14px !important' }} />}
                  onClick={handleSearch}
                  sx={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius: '8px', fontSize: 12, fontWeight: 700, px: 1.75, boxShadow: '0 3px 10px rgba(37,99,235,0.3)', '&:hover': { background: 'linear-gradient(135deg,#1D4ED8,#1E3A8A)' }, whiteSpace: 'nowrap' }}>
                  Chercher
                </Button>
                <Button variant="outlined" color="error" size="small" onClick={handleClear}
                  sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 600, px: 1.5, whiteSpace: 'nowrap' }}>
                  Effacer
                </Button>

                {/* Spacer */}
                <Box sx={{ flex: 1 }} />

                {/* Actions à droite */}
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Tooltip title="Actualiser" arrow>
                    <IconButton size="small" onClick={() => refetch()}
                      sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid #E2E8F0', bgcolor: '#fff', '&:hover': { color: '#2563EB', bgcolor: '#EFF6FF', borderColor: '#BFDBFE' } }}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button size="small" variant="outlined" startIcon={<Print sx={{ fontSize: '14px !important' }} />}
                    sx={{ color: '#475569', borderColor: '#E2E8F0', bgcolor: '#fff', fontSize: 12, borderRadius: '8px', px: 1.75, fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' }, transition: 'all 0.2s' }}>
                    Imprimer
                  </Button>
                  <Button size="small" startIcon={<FileUpload sx={{ fontSize: '15px !important' }} />}
                    onClick={() => navigate('/employees/import')}
                    sx={{
                      bgcolor: '#002f59', color: '#fff', fontWeight: 700, fontSize: 12,
                      borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#001f3f' }, transition: 'all 0.2s',
                    }}>
                    Importer
                  </Button>
                  <Button size="small" startIcon={<PersonAdd sx={{ fontSize: '15px !important' }} />}
                    onClick={() => openModal('create')}
                    sx={{
                      bgcolor: '#F97316', color: '#fff', fontWeight: 700, fontSize: 12,
                      borderRadius: '8px', px: 2, whiteSpace: 'nowrap',
                      boxShadow: '0 3px 10px rgba(249,115,22,0.4)',
                      '&:hover': { bgcolor: '#EA580C', transform: 'translateY(-1px)', boxShadow: '0 5px 14px rgba(249,115,22,0.5)' },
                      transition: 'all 0.2s',
                    }}>
                    Nouveau AGENT
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {/* ── BARRE INFO ── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              px={2.5} py={0.875} sx={{ bgcolor: '#fff', borderBottom: '1px solid #F1F5F9' }}>
              <Stack direction="row" spacing={2.5} alignItems="center">
                {[{ color: '#2563EB', label: 'Actif' }, { color: '#DC2626', label: 'Passif' }].map(({ color, label }) => (
                  <Stack key={label} direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B' }}>{label}</Typography>
                  </Stack>
                ))}
                {data && (
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    {data.total} agent{data.total > 1 ? 's' : ''} trouvé{data.total > 1 ? 's' : ''}
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1.25} alignItems="center">
                {selected.length > 0 && (
                  <Chip label={`${selected.length} sélectionné(s)`} size="small" color="primary"
                    onDelete={() => setSelected([])} sx={{ fontSize: 11, height: 22, fontWeight: 600 }} />
                )}
                {/* Toggle Grille / Tableau */}
                <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', p: 0.4 }}>
                  {([['grid', 'Grille', <ViewModule sx={{ fontSize: 15 }} />], ['table', 'Tableau', <ViewList sx={{ fontSize: 15 }} />]] as const).map(([val, lbl, icon]) => (
                    <Tooltip key={val} title={lbl} arrow>
                      <Box onClick={() => setViewMode(val)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1, py: 0.35, borderRadius: '6px', cursor: 'pointer',
                          fontSize: 11.5, fontWeight: 700, transition: 'all .15s',
                          bgcolor: viewMode === val ? '#2563EB' : 'transparent',
                          color: viewMode === val ? '#fff' : '#64748B',
                          boxShadow: viewMode === val ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                          '&:hover': { bgcolor: viewMode === val ? '#2563EB' : '#E2E8F0' },
                        }}>
                        {icon}
                        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{lbl}</Box>
                      </Box>
                    </Tooltip>
                  ))}
                </Stack>
              </Stack>
            </Stack>
        </Box>
      )}
      </Box>
      {/* ══ FIN ENTÊTE FIXE ══ */}

      {/* ══ ZONE SCROLLABLE ══ */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
      <Card sx={{ borderRadius: '0 0 16px 16px', border: 'none', boxShadow: '0 8px 40px rgba(15,23,42,0.1)', overflow: 'visible' }}>
        {activeTab === 0 ? (
          <>
            <Box sx={{ p: 2.5, bgcolor: '#F1F5F9', minHeight: 340 }}>
              {isLoading ? (
                viewMode === 'grid' ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 1.5 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={240} sx={{ borderRadius: '14px' }} />
                    ))}
                  </Box>
                ) : (
                  <Stack spacing={0.75}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                    ))}
                  </Stack>
                )
              ) : !data?.data.length ? (
                <Box sx={{ py: 12, textAlign: 'center' }}>
                  <Stack alignItems="center" spacing={2}>
                    <Box sx={{
                      width: 72, height: 72, borderRadius: '20px', bgcolor: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                    }}>
                      <Groups sx={{ fontSize: 36, color: '#CBD5E1' }} />
                    </Box>
                    <Box textAlign="center">
                      <Typography fontWeight={700} color="text.secondary" fontSize={15}>
                        Aucun agent trouvé
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Modifiez vos critères ou ajoutez un nouvel agent
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<PersonAdd fontSize="small" />}
                      onClick={() => openModal('create')}
                      sx={{ borderRadius: '20px', fontSize: 12, fontWeight: 600 }}>
                      Nouveau agent
                    </Button>
                  </Stack>
                </Box>
              ) : viewMode === 'grid' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 1.5 }}>
                  {data.data.map((emp, idx) => {
                    const isActive   = emp.status === 'active';
                    const isSelected = selected.includes(emp.id);
                    const initials   = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase();
                    return (
                      <Box key={emp.id}>
                        <Card
                          onClick={() => openModal('view', emp)}
                          sx={{
                            borderRadius: '16px',
                            border: `1.5px solid ${isSelected ? '#3B82F6' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: isSelected
                              ? '0 0 0 2px rgba(59,130,246,0.25), 0 4px 16px rgba(59,130,246,0.15)'
                              : '0 4px 16px rgba(0,0,0,0.25)',
                            overflow: 'visible',
                            cursor: 'pointer',
                            transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                            bgcolor: '#1E293B',
                            position: 'relative',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: '0 18px 44px rgba(0,0,0,0.35)',
                              borderColor: isActive ? '#3B82F6' : '#EF4444',
                            },
                          }}
                        >
                          {/* ── Bannière colorée ── */}
                          <Box sx={{
                            height: 52,
                            backgroundImage: isActive
                              ? 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)'
                              : 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 55%, #EF4444 100%)',
                            backgroundColor: isActive ? '#1E3A8A' : '#7F1D1D',
                            borderRadius: '14px 14px 0 0',
                            position: 'relative',
                            overflow: 'hidden',
                          }}>
                            {/* Cercles décoratifs */}
                            <Box sx={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)', top: -30, right: -20 }} />
                            <Box sx={{ position: 'absolute', width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', top: 10, left: -14 }} />

                            {/* Checkbox sélection */}
                            <Box sx={{ position: 'absolute', top: 8, left: 8 }}
                              onClick={e => { e.stopPropagation(); handleSelect(emp.id); }}>
                              <Checkbox size="small" checked={isSelected}
                                sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25, '&.Mui-checked': { color: '#fff' } }} />
                            </Box>

                            {/* Numéro rang */}
                            <Box sx={{ position: 'absolute', top: 11, right: 12 }}>
                              <Typography sx={{
                                fontFamily: 'monospace', fontSize: 10, fontWeight: 800,
                                color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em',
                              }}>
                                #{String(page * rowsPerPage + idx + 1).padStart(3, '0')}
                              </Typography>
                            </Box>
                          </Box>

                          {/* ── Corps de la carte ── */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: -3.5, px: 1.5, pb: 1.5 }}>

                            {/* Avatar */}
                            <Avatar
                              src={emp.photo_url ?? undefined}
                              sx={{
                                width: 60, height: 60,
                                fontSize: 20, fontWeight: 800,
                                backgroundImage: isActive
                                  ? 'linear-gradient(135deg, #1D4ED8, #7C3AED)'
                                  : 'linear-gradient(135deg, #94A3B8, #475569)',
                                backgroundColor: isActive ? '#1D4ED8' : '#94A3B8',
                                border: '3px solid #1E293B',
                                boxShadow: isActive
                                  ? '0 4px 14px rgba(37,99,235,0.4)'
                                  : '0 4px 14px rgba(0,0,0,0.3)',
                              }}
                            >
                              {initials}
                            </Avatar>

                            {/* Statut */}
                            <Chip size="small"
                              icon={isActive
                                ? <CheckCircle sx={{ fontSize: '10px !important', color: '#34D399 !important' }} />
                                : <Block sx={{ fontSize: '10px !important', color: '#F87171 !important' }} />
                              }
                              label={isActive ? 'Actif' : 'Inactif'}
                              sx={{
                                mt: 0.6, height: 18, fontSize: 9.5, fontWeight: 700,
                                bgcolor: isActive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                color: isActive ? '#34D399' : '#F87171',
                                border: `1px solid ${isActive ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                              }}
                            />

                            {/* Nom complet */}
                            <Typography fontWeight={800} fontSize={12.5} color="#F1F5F9"
                              textAlign="center" lineHeight={1.25} mt={0.6} noWrap sx={{ maxWidth: 150 }}>
                              {emp.first_name} {emp.last_name}
                            </Typography>

                            {/* Poste */}
                            {emp.position?.title && (
                              <Typography variant="caption" textAlign="center" noWrap
                                sx={{ fontSize: 9.5, color: '#64748B', maxWidth: 145, mt: 0.2 }}>
                                {emp.position.title}
                              </Typography>
                            )}

                            {/* Badges matricule + département */}
                            <Stack direction="row" spacing={0.4} mt={0.6} mb={1}
                              flexWrap="wrap" justifyContent="center" useFlexGap>
                              {emp.employee_number && (
                                <Box component="span" sx={{
                                  fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                                  color: '#93C5FD', bgcolor: 'rgba(59,130,246,0.12)',
                                  px: 0.75, py: 0.2, borderRadius: '5px',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                }}>
                                  {fmtMatricule(emp.employee_number)}
                                </Box>
                              )}
                              {emp.department?.name && (
                                <Box component="span" sx={{
                                  fontSize: 10, fontWeight: 600,
                                  color: '#C4B5FD', bgcolor: 'rgba(124,58,237,0.12)',
                                  px: 0.75, py: 0.2, borderRadius: '5px',
                                  border: '1px solid rgba(124,58,237,0.25)',
                                  maxWidth: 105, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}>
                                  {emp.department.name}
                                </Box>
                              )}
                            </Stack>

                            <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.07)', mb: 0.8 }} />

                            {/* Informations clés */}
                            <Stack spacing={0.5} width="100%">
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Email sx={{ fontSize: 11, color: '#475569', flexShrink: 0 }} />
                                <Typography noWrap sx={{ fontSize: 10, flex: 1, color: '#94A3B8' }}>
                                  {emp.professional_email}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Event sx={{ fontSize: 11, color: '#475569', flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>
                                  {formatDate(emp.hire_date)}
                                </Typography>
                              </Stack>
                            </Stack>

                            <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.07)', mt: 0.8, mb: 0.8 }} />

                            {/* Boutons d'action */}
                            <Stack direction="row" spacing={0.4} justifyContent="center" flexWrap="wrap" useFlexGap>
                              <Tooltip title="Voir le dossier" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); openModal('view', emp); }}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(59,130,246,0.12)', color: '#93C5FD', '&:hover': { bgcolor: 'rgba(59,130,246,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Visibility sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Modifier" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); openModal('edit', emp); }}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(249,115,22,0.12)', color: '#FB923C', '&:hover': { bgcolor: 'rgba(249,115,22,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Edit sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Envoyer un mail" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setEmailEmp(emp); }}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(34,197,94,0.12)', color: '#4ADE80', '&:hover': { bgcolor: 'rgba(34,197,94,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Email sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Carte professionnelle & Badge" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setBadgeEmployee(emp); }}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(168,85,247,0.12)', color: '#C084FC', '&:hover': { bgcolor: 'rgba(168,85,247,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <BadgeIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Assigner une tâche" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setTaskEmp(emp); }}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(234,179,8,0.12)', color: '#EAB308', '&:hover': { bgcolor: 'rgba(234,179,8,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <AssignmentTurnedIn sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer" arrow>
                                <IconButton size="small" onClick={e => e.stopPropagation()}
                                  sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: 'rgba(225,29,72,0.12)', color: '#FB7185', '&:hover': { bgcolor: 'rgba(225,29,72,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Delete sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Card>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                /* ══════════════ VUE TABLEAU ══════════════ */
                <TableContainer sx={{ bgcolor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>
                  <Table size="small" sx={{ minWidth: 920 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#1E293B' }}>
                        <TableCell padding="checkbox" sx={{ borderColor: 'transparent', pl: 1.5 }}>
                          <Checkbox size="small"
                            sx={{ color: 'rgba(255,255,255,0.45)', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                            checked={data.data.length > 0 && data.data.every(e => selected.includes(e.id))}
                            indeterminate={data.data.some(e => selected.includes(e.id)) && !data.data.every(e => selected.includes(e.id))}
                            onChange={(e) => setSelected(e.target.checked ? data.data.map(x => x.id) : [])} />
                        </TableCell>
                        {['#', 'Agent', 'Poste', 'Département', 'Email', 'Téléphone', 'Recruté le', 'Statut', 'Actions'].map(h => (
                          <TableCell key={h} align={h === 'Actions' ? 'center' : 'left'}
                            sx={{ color: '#fff', fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap', borderColor: 'transparent', py: 1.25 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.data.map((emp, idx) => {
                        const isActive   = emp.status === 'active';
                        const isSelected = selected.includes(emp.id);
                        const initials   = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase();
                        return (
                          <TableRow key={emp.id} hover selected={isSelected}
                            onClick={() => openModal('view', emp)}
                            sx={{ cursor: 'pointer', bgcolor: idx % 2 ? '#F8FAFC' : '#fff', '&:hover': { bgcolor: '#EFF6FF !important' } }}>
                            <TableCell padding="checkbox" sx={{ pl: 1.5 }} onClick={e => e.stopPropagation()}>
                              <Checkbox size="small" checked={isSelected} onChange={() => handleSelect(emp.id)} />
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', fontWeight: 700 }}>
                              {String(page * rowsPerPage + idx + 1).padStart(3, '0')}
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <Avatar src={emp.photo_url ?? undefined}
                                  sx={{ width: 34, height: 34, fontSize: 12.5, fontWeight: 800, bgcolor: isActive ? '#1D4ED8' : '#94A3B8' }}>
                                  {initials}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B', lineHeight: 1.25 }} noWrap>
                                    {emp.first_name} {emp.last_name}
                                  </Typography>
                                  {emp.employee_number && (
                                    <Typography sx={{ fontSize: 10.5, color: '#2563EB', fontFamily: 'monospace', fontWeight: 600 }}>
                                      {fmtMatricule(emp.employee_number)}
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#475569', maxWidth: 160 }}>
                              <Typography sx={{ fontSize: 12 }} noWrap>{emp.position?.title ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#475569', maxWidth: 150 }}>
                              <Typography sx={{ fontSize: 12 }} noWrap>{emp.department?.name ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 11.5, color: '#64748B', maxWidth: 180 }}>
                              <Typography sx={{ fontSize: 11.5 }} noWrap>{emp.professional_email ?? '—'}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{emp.phone || '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{formatDate(emp.hire_date)}</TableCell>
                            <TableCell>
                              <Chip size="small"
                                icon={isActive
                                  ? <CheckCircle sx={{ fontSize: '12px !important', color: '#059669 !important' }} />
                                  : <Block sx={{ fontSize: '12px !important', color: '#DC2626 !important' }} />}
                                label={isActive ? 'Actif' : 'Inactif'}
                                sx={{ height: 22, fontSize: 10.5, fontWeight: 700,
                                  bgcolor: isActive ? '#ECFDF5' : '#FEF2F2',
                                  color: isActive ? '#059669' : '#DC2626',
                                  border: `1px solid ${isActive ? '#A7F3D0' : '#FECACA'}` }} />
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Stack direction="row" spacing={0.25} justifyContent="center">
                                <Tooltip title="Voir" arrow>
                                  <IconButton size="small" onClick={() => openModal('view', emp)} sx={{ color: '#2563EB' }}>
                                    <Visibility sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Modifier" arrow>
                                  <IconButton size="small" onClick={() => openModal('edit', emp)} sx={{ color: '#F97316' }}>
                                    <Edit sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Mail" arrow>
                                  <IconButton size="small" onClick={() => setEmailEmp(emp)} sx={{ color: '#16A34A' }}>
                                    <Email sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Badge" arrow>
                                  <IconButton size="small" onClick={() => setBadgeEmployee(emp)} sx={{ color: '#A855F7' }}>
                                    <BadgeIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Tâche" arrow>
                                  <IconButton size="small" onClick={() => setTaskEmp(emp)} sx={{ color: '#CA8A04' }}>
                                    <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer" arrow>
                                  <IconButton size="small" sx={{ color: '#E11D48' }}>
                                    <Delete sx={{ fontSize: 16 }} />
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

            {/* Modal création / vue / édition */}
            <EmployeeCreateModal key={modalKey} open={modalOpen} onClose={closeModal} mode={modalMode} employee={modalEmployee} />

            {/* Modal carte professionnelle */}
            {badgeEmployee && (
              <EmployeeBadgeCard
                open={!!badgeEmployee}
                onClose={() => setBadgeEmployee(null)}
                employee={badgeEmployee}
              />
            )}

            {/* Composeur d'email intégré */}
            <ComposeEmailDialog
              open={!!emailEmp}
              onClose={() => setEmailEmp(null)}
              employee={emailEmp}
            />

            {/* Dialog assignation de tâche */}
            <Dialog open={!!taskEmp} onClose={() => setTaskEmp(null)} maxWidth="xs" fullWidth
              PaperProps={{ sx: { borderRadius: '16px' } }}>
              <DialogTitle sx={{ fontWeight: 700, fontSize: 15, pb: 1 }}>
                Assigner une tâche
              </DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                  {taskEmp && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#F0F9FF', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#2563EB', fontSize: 13 }}>
                        {taskEmp.first_name?.[0]}{taskEmp.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0C4A6E' }}>
                          {taskEmp.first_name} {taskEmp.last_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#0369A1' }}>
                          {fmtMatricule(taskEmp.employee_number)} · {taskEmp.position?.title ?? '—'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <TextField
                    label="Titre de la tâche *" size="small" fullWidth
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <TextField
                    label="Description" size="small" fullWidth multiline rows={2}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        select label="Priorité" size="small" fullWidth
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                      >
                        <MenuItem value="low">Faible</MenuItem>
                        <MenuItem value="medium">Moyen</MenuItem>
                        <MenuItem value="high">Élevé</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Délai d'exécution" type="date" size="small" fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={() => setTaskEmp(null)} sx={{ color: '#64748B', textTransform: 'none' }}>Annuler</Button>
                <Button
                  variant="contained" disabled={!taskForm.title || taskMut.isPending}
                  onClick={() => taskMut.mutate({ ...taskForm, assigned_to: taskEmp?.id, status: 'todo' })}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#EAB308', '&:hover': { bgcolor: '#CA8A04' } }}
                >
                  {taskMut.isPending ? 'Assignation…' : 'Assigner'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Menu contextuel */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0', minWidth: 185,
                  '& .MuiMenuItem-root': { borderRadius: '6px', mx: 0.5, px: 1.5 },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
              <MenuItem dense onClick={() => setAnchorEl(null)}>
                <ListItemIcon><BadgeIcon fontSize="small" sx={{ color: '#7C3AED' }} /></ListItemIcon>
                <ListItemText primary="Carte d'accès" primaryTypographyProps={{ fontSize: 13 }} />
              </MenuItem>
              <MenuItem dense onClick={() => setAnchorEl(null)}>
                <ListItemIcon><Email fontSize="small" sx={{ color: '#2563EB' }} /></ListItemIcon>
                <ListItemText primary="Envoyer un mail" primaryTypographyProps={{ fontSize: 13 }} />
              </MenuItem>
              <MenuItem dense onClick={() => setAnchorEl(null)}>
                <ListItemIcon><Print fontSize="small" sx={{ color: '#059669' }} /></ListItemIcon>
                <ListItemText primary="Imprimer la fiche" primaryTypographyProps={{ fontSize: 13 }} />
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem dense onClick={() => setAnchorEl(null)}>
                <ListItemIcon><Delete fontSize="small" sx={{ color: '#DC2626' }} /></ListItemIcon>
                <ListItemText primary="Supprimer" primaryTypographyProps={{ fontSize: 13, color: '#DC2626' }} />
              </MenuItem>
            </Menu>

            {/* ── PAGINATION PERSONNALISÉE ── */}
            {(() => {
              const total      = data?.total ?? 0;
              const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
              const from       = total === 0 ? 0 : page * rowsPerPage + 1;
              const to         = Math.min((page + 1) * rowsPerPage, total);

              /* pages à afficher : toujours première, dernière + fenêtre autour de la page courante */
              const windowPages: (number | '...')[] = [];
              for (let i = 0; i < totalPages; i++) {
                if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
                  windowPages.push(i);
                } else if (windowPages[windowPages.length - 1] !== '...') {
                  windowPages.push('...');
                }
              }

              const btnBase = {
                minWidth: 34, height: 34, borderRadius: '9px', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none', transition: 'all .16s',
              } as const;

              return (
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ px: 2.5, py: 1.25, borderTop: '1px solid #F1F5F9', bgcolor: '#fff', flexWrap: 'wrap', gap: 1 }}>

                  {/* Compteur */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563EB' }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                      {from}–{to}
                      <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400, mx: 0.5 }}>sur</Box>
                      <Box component="span" sx={{ color: '#1E293B', fontWeight: 800 }}>{total}</Box>
                      <Box component="span" sx={{ color: '#94A3B8', fontWeight: 400, ml: 0.5 }}>agent{total > 1 ? 's' : ''}</Box>
                    </Typography>
                  </Stack>

                  {/* Boutons de page */}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {/* Précédent */}
                    <Box
                      onClick={() => page > 0 && setPage(page - 1)}
                      sx={{
                        ...btnBase, px: 1.25, gap: 0.5,
                        bgcolor: page === 0 ? '#F8FAFC' : '#EFF6FF',
                        color: page === 0 ? '#CBD5E1' : '#2563EB',
                        border: `1.5px solid ${page === 0 ? '#E2E8F0' : '#BFDBFE'}`,
                        pointerEvents: page === 0 ? 'none' : 'auto',
                        '&:hover': page > 0 ? { bgcolor: '#DBEAFE', borderColor: '#93C5FD' } : {},
                      }}
                    >
                      <Typography sx={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>‹</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Préc.</Typography>
                    </Box>

                    {/* Numéros */}
                    {windowPages.map((p, i) =>
                      p === '...' ? (
                        <Box key={`ellipsis-${i}`} sx={{ ...btnBase, color: '#94A3B8', bgcolor: 'transparent', cursor: 'default', fontSize: 16 }}>
                          ···
                        </Box>
                      ) : (
                        <Box key={p} onClick={() => setPage(p as number)}
                          sx={{
                            ...btnBase,
                            bgcolor: page === p ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#F8FAFC',
                            background: page === p ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : undefined,
                            color: page === p ? '#fff' : '#475569',
                            border: `1.5px solid ${page === p ? '#2563EB' : '#E2E8F0'}`,
                            boxShadow: page === p ? '0 3px 10px rgba(37,99,235,0.35)' : 'none',
                            '&:hover': page !== p ? { bgcolor: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' } : {},
                          }}
                        >
                          {(p as number) + 1}
                        </Box>
                      )
                    )}

                    {/* Suivant */}
                    <Box
                      onClick={() => page < totalPages - 1 && setPage(page + 1)}
                      sx={{
                        ...btnBase, px: 1.25, gap: 0.5,
                        bgcolor: page >= totalPages - 1 ? '#F8FAFC' : '#EFF6FF',
                        color: page >= totalPages - 1 ? '#CBD5E1' : '#2563EB',
                        border: `1.5px solid ${page >= totalPages - 1 ? '#E2E8F0' : '#BFDBFE'}`,
                        pointerEvents: page >= totalPages - 1 ? 'none' : 'auto',
                        '&:hover': page < totalPages - 1 ? { bgcolor: '#DBEAFE', borderColor: '#93C5FD' } : {},
                      }}
                    >
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Suiv.</Typography>
                      <Typography sx={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>›</Typography>
                    </Box>
                  </Stack>

                  {/* Page X / Y */}
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                    Page <Box component="span" sx={{ color: '#2563EB', fontWeight: 800 }}>{page + 1}</Box>
                    {' '}/ {totalPages}
                  </Typography>
                </Stack>
              );
            })()}
          </>
        ) : activeTab === 1 ? (
          /* ── ONGLET DISPONIBILITÉ ── */
          <AvailabilityTab />
        ) : activeTab === 2 ? (
          /* ── ONGLET DISTINCTION ── */
          <DistinctionTab />
        ) : activeTab === 3 ? (
          /* ── ONGLET SANCTION ── */
          <SanctionTab />
        ) : activeTab === 4 ? (
          /* ── ONGLET CONTRAT ── */
          <ContractTab />
        ) : activeTab === 5 ? (
          /* ── ONGLET ÉVALUATION ── */
          <EvaluationTab />
        ) : activeTab === 6 ? (
          /* ── ONGLET VÉRIFICATION AGENTS ── */
          <Grid container spacing={2}>
            {/* QR Code */}
            <Grid item xs={12} md={4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <QrCode2 sx={{ color: '#002f59' }} />
                    <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>QR Code d'enrôlement</Typography>
                  </Box>
                  <Box id="qr-print-zone" sx={{ p: 2, borderRadius: 2, border: '2px solid #E2E8F0', bgcolor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <QRCodeSVG value={ENROLL_URL} size={180} fgColor="#002f59" level="M" />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', wordBreak: 'break-all' }}>{ENROLL_URL}</Typography>
                  </Box>
                  <Button fullWidth variant="outlined" startIcon={<Print />}
                    onClick={() => {
                      const zone = document.getElementById('qr-print-zone');
                      if (!zone) return;
                      const svgEl = zone.querySelector('svg');
                      const svgHtml = svgEl ? svgEl.outerHTML : '';
                      const win = window.open('', '_blank', 'width=400,height=500');
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html><html><head><title>QR Code Enrôlement</title>
                        <style>
                          body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #fff; }
                          .title { color: #002f59; font-weight: 800; font-size: 18px; margin-bottom: 12px; letter-spacing: 0.5px; }
                          .qr-box { padding: 20px; border: 2px solid #E2E8F0; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                          .url { font-size: 10px; color: #64748B; text-align: center; word-break: break-all; max-width: 220px; }
                          .subtitle { color: #475569; font-size: 12px; margin-top: 8px; text-align: center; max-width: 240px; }
                          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                        </style></head><body>
                        <div class="title">Formulaire d'enrôlement</div>
                        <div class="qr-box">
                          ${svgHtml}
                          <div class="url">${ENROLL_URL}</div>
                        </div>
                        <div class="subtitle">Scannez ce QR code pour accéder au formulaire d'enrôlement agent</div>
                        <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
                      </body></html>`);
                      win.document.close();
                    }}
                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#002f59', color: '#002f59' }}>
                    Imprimer le QR code
                  </Button>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
                    Les agents scannent ce QR code pour accéder au formulaire d'enrôlement.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Liste des demandes */}
            <Grid item xs={12} md={8}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
                    <Typography sx={{ fontWeight: 700, color: 'text.primary', flex: 1 }}>Demandes d'enrôlement</Typography>
                    {(['pending','validated','rejected',''] as const).map((s) => (
                      <Chip key={s || 'all'}
                        label={s === 'pending' ? 'En attente' : s === 'validated' ? 'Validées' : s === 'rejected' ? 'Rejetées' : 'Toutes'}
                        variant={enrollFilter === s ? 'filled' : 'outlined'}
                        color={s === 'pending' ? 'warning' : s === 'validated' ? 'success' : s === 'rejected' ? 'error' : 'default'}
                        size="small" onClick={() => setEnrollFilter(s)}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                      />
                    ))}
                    <Tooltip title="Actualiser">
                      <IconButton size="small" onClick={() => refetchEnrollments()}><Refresh fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                  {loadingEnrollments ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 420 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {['Photo','Matricule','Nom complet','Fonction','Email','Date soumission','Statut',''].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#F8FAFC', color: '#475569', whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(enrollmentsData?.data ?? []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 5, color: '#94A3B8', fontSize: 13 }}>
                                Aucune demande d'enrôlement
                              </TableCell>
                            </TableRow>
                          ) : (enrollmentsData?.data ?? []).map((enr: EnrollmentRequest) => (
                            <TableRow key={enr.id} hover>
                              <TableCell sx={{ py: 0.5 }}>
                                <Avatar
                                  src={enr.photo_url ?? undefined}
                                  sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: '#E2E8F0', color: '#475569' }}
                                >
                                  {`${enr.first_name?.[0] ?? ''}${enr.last_name?.[0] ?? ''}`.toUpperCase()}
                                </Avatar>
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#002f59' }}>{enr.matricule}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{enr.first_name} <strong>{enr.last_name}</strong></TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{enr.fonction}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{enr.email}</TableCell>
                              <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', color: '#64748B' }}>
                                {new Date(enr.created_at).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={enr.status === 'pending' ? 'En attente' : enr.status === 'validated' ? 'Validée' : 'Rejetée'}
                                  color={enr.status === 'pending' ? 'warning' : enr.status === 'validated' ? 'success' : 'error'}
                                  size="small" sx={{ fontWeight: 700, fontSize: 10 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Voir détail">
                                  <IconButton size="small" sx={{ color: '#002f59' }}
                                    onClick={async () => {
                                      const res = await client.get(`/enrollments/${enr.id}`);
                                      setEnrollDetail(res.data);
                                      setEnrollDetailOpen(true);
                                    }}>
                                    <Search fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          /* ── PLACEHOLDER AUTRES ONGLETS ── */
          <Box sx={{ py: 14, textAlign: 'center' }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: '22px', mx: 'auto', mb: 2.5,
              background: `linear-gradient(135deg, ${TAB_CONFIG[activeTab].color}18, ${TAB_CONFIG[activeTab].color}35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${TAB_CONFIG[activeTab].color}30`,
              boxShadow: `0 8px 24px ${TAB_CONFIG[activeTab].color}20`,
            }}>
              <Box sx={{ color: TAB_CONFIG[activeTab].color, '& svg': { fontSize: 38 } }}>
                {TAB_CONFIG[activeTab].icon}
              </Box>
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
              {TAB_CONFIG[activeTab].label}
            </Typography>
            <Typography color="text.secondary" variant="body2" maxWidth={340} mx="auto">
              Cette section est en cours de développement et sera disponible prochainement.
            </Typography>
          </Box>
        )}
      </Card>

      {/* ── Dialog : Détail enrôlement ── */}
      <Dialog open={enrollDetailOpen} onClose={() => { setEnrollDetailOpen(false); setEnrollDetail(null); setEnrollEditMode(false); }}
        maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HowToReg sx={{ color: '#002f59' }} />
          Demande d'enrôlement
          {enrollDetail && (
            <Chip
              label={enrollDetail.enrollment.status === 'pending' ? 'En attente' : enrollDetail.enrollment.status === 'validated' ? 'Validée' : 'Rejetée'}
              color={enrollDetail.enrollment.status === 'pending' ? 'warning' : enrollDetail.enrollment.status === 'validated' ? 'success' : 'error'}
              size="small" sx={{ fontWeight: 700, ml: 1 }}
            />
          )}
        </DialogTitle>
        <Divider />
        {enrollDetail && (
          <DialogContent sx={{ pt: 2 }}>
            {/* Carte profil photo */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 2.5, mb: 3,
              p: 2.5, borderRadius: 2,
              background: 'linear-gradient(135deg, #002f59 0%, #004080 100%)',
            }}>
              <Avatar
                src={enrollDetail.enrollment.photo_url ?? undefined}
                sx={{
                  width: 96, height: 96, flexShrink: 0,
                  border: '3px solid rgba(255,255,255,0.4)',
                  fontSize: 32, fontWeight: 800,
                  bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
                }}
              >
                {`${enrollDetail.enrollment.first_name?.[0] ?? ''}${enrollDetail.enrollment.last_name?.[0] ?? ''}`.toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>
                  {enrollDetail.enrollment.first_name} {enrollDetail.enrollment.last_name}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, mt: 0.5 }}>
                  {enrollDetail.enrollment.fonction}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip label={`Matricule : ${enrollDetail.enrollment.matricule}`}
                    size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 11 }} />
                  {!enrollDetail.enrollment.photo_path && (
                    <Chip label="Pas de photo" size="small"
                      sx={{ bgcolor: 'rgba(255,120,0,0.3)', color: '#ffd0a0', fontSize: 11 }} />
                  )}
                </Stack>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={enrollDetail.matched_employee ? 6 : 12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#002f59' }}>Informations soumises</Typography>
                  {enrollDetail.enrollment.status === 'pending' && !enrollEditMode && (
                    <Button size="small" startIcon={<EditNote />} variant="outlined"
                      onClick={() => setEnrollEditMode(true)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12, fontWeight: 700 }}>
                      Modifier
                    </Button>
                  )}
                  {enrollEditMode && (
                    <Button size="small" variant="text" color="inherit"
                      onClick={() => setEnrollEditMode(false)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
                      Annuler
                    </Button>
                  )}
                </Box>

                {!enrollEditMode ? (
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 2 }}>
                    {([
                      ['Matricule', enrollDetail.enrollment.matricule],
                      ['Prénom(s)', enrollDetail.enrollment.first_name],
                      ['Nom', enrollDetail.enrollment.last_name],
                      ['Date de naissance', enrollDetail.enrollment.date_naissance ? new Date(enrollDetail.enrollment.date_naissance).toLocaleDateString('fr-FR') : '—'],
                      ['Lieu de naissance', enrollDetail.enrollment.lieu_naissance],
                      ["Date d'embauche", enrollDetail.enrollment.date_embauche ? new Date(enrollDetail.enrollment.date_embauche).toLocaleDateString('fr-FR') : '—'],
                      ['Fonction', enrollDetail.enrollment.fonction],
                      ['Téléphone', enrollDetail.enrollment.telephone],
                      ['Email', enrollDetail.enrollment.email],
                      ['Catégorie', enrollDetail.enrollment.categorie_emploi || '—'],
                      ['Qualification', enrollDetail.enrollment.qualification || '—'],
                      ['Adresse', enrollDetail.enrollment.adresse || '—'],
                    ] as [string, string][]).map(([label, val]) => (
                      <Box key={label} sx={{ display: 'flex', py: 0.75, borderBottom: '1px solid #E2E8F0', '&:last-child': { borderBottom: 'none' } }}>
                        <Typography sx={{ width: 160, fontSize: 12, color: '#64748B', fontWeight: 600, flexShrink: 0 }}>{label}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{val || '—'}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  /* ── Formulaire d'édition ── */
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 2 }}>
                    <Grid container spacing={1.5}>
                      {([
                        { key: 'matricule',      label: 'Matricule',        xs: 4 },
                        { key: 'first_name',     label: 'Prénom(s)',        xs: 4 },
                        { key: 'last_name',      label: 'Nom',              xs: 4 },
                        { key: 'date_naissance', label: 'Date naissance',   xs: 4, type: 'date' },
                        { key: 'lieu_naissance', label: 'Lieu naissance',   xs: 4 },
                        { key: 'date_embauche',  label: "Date d'embauche",  xs: 4, type: 'date' },
                        { key: 'fonction',       label: 'Fonction',         xs: 6 },
                        { key: 'telephone',      label: 'Téléphone',        xs: 6 },
                        { key: 'email',          label: 'Email',            xs: 12 },
                        { key: 'categorie_emploi', label: 'Catégorie',      xs: 6 },
                        { key: 'qualification',  label: 'Qualification',    xs: 6 },
                        { key: 'adresse',        label: 'Adresse',          xs: 12 },
                      ] as { key: keyof typeof enrollEditForm; label: string; xs: number; type?: string }[]).map(({ key, label, xs, type }) => (
                        <Grid item xs={xs} key={key}>
                          <TextField fullWidth size="small" label={label} type={type ?? 'text'}
                            value={enrollEditForm[key]} InputLabelProps={type === 'date' ? { shrink: true } : undefined}
                            onChange={e => setEnrollEditForm(f => ({ ...f, [key]: e.target.value }))}
                          />
                        </Grid>
                      ))}
                      {/* Direction */}
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Direction / Entité</InputLabel>
                          <Select label="Direction / Entité"
                            value={enrollEditForm.directionId}
                            onChange={e => setEnrollEditForm(f => ({ ...f, directionId: e.target.value as number | '', divisionId: '' }))}>
                            <MenuItem value=""><em>— Aucune —</em></MenuItem>
                            {directions.map(d => <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Division */}
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small" disabled={!enrollEditForm.directionId}>
                          <InputLabel>Division / Service</InputLabel>
                          <Select label="Division / Service"
                            value={enrollEditForm.divisionId}
                            onChange={e => setEnrollEditForm(f => ({ ...f, divisionId: e.target.value as number | '' }))}>
                            <MenuItem value=""><em>— Aucune —</em></MenuItem>
                            {divisionsByDirection(enrollEditForm.directionId).map(d => <MenuItem key={d.id} value={d.id}>{d.libelle}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button variant="contained" size="small" disabled={enrollSaveLoading}
                        startIcon={enrollSaveLoading ? <CircularProgress size={14} color="inherit" /> : <EditNote />}
                        onClick={async () => {
                          if (!enrollDetail) return;
                          setEnrollSaveLoading(true);
                          try {
                            const payload = {
                              matricule:       enrollEditForm.matricule,
                              first_name:      enrollEditForm.first_name,
                              last_name:       enrollEditForm.last_name,
                              date_naissance:  enrollEditForm.date_naissance,
                              lieu_naissance:  enrollEditForm.lieu_naissance,
                              date_embauche:   enrollEditForm.date_embauche,
                              fonction:        enrollEditForm.fonction,
                              telephone:       enrollEditForm.telephone,
                              email:           enrollEditForm.email,
                              categorie_emploi:   enrollEditForm.categorie_emploi || null,
                              qualification:      enrollEditForm.qualification    || null,
                              adresse:            enrollEditForm.adresse           || null,
                              organisation_unit_id: enrollEditForm.divisionId || enrollEditForm.directionId || null,
                            };
                            const res = await client.patch(`/enrollments/${enrollDetail.enrollment.id}`, payload);
                            setEnrollDetail(d => d ? { ...d, enrollment: res.data } : d);
                            setEnrollEditMode(false);
                            refetchEnrollments();
                          } finally { setEnrollSaveLoading(false); }
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#002f59', '&:hover': { bgcolor: '#003f7a' } }}>
                        Sauvegarder les modifications
                      </Button>
                    </Box>
                  </Box>
                )}
              </Grid>
              {enrollDetail.matched_employee && (
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#059669', mb: 1.5 }}>Agent existant trouvé</Typography>
                  <Box sx={{ bgcolor: '#ECFDF5', borderRadius: 2, p: 2, border: '1px solid #A7F3D0' }}>
                    {([
                      ['Matricule', enrollDetail.matched_employee.employee_number],
                      ['Prénom(s)', enrollDetail.matched_employee.first_name],
                      ['Nom', enrollDetail.matched_employee.last_name],
                      ['Date de naissance', enrollDetail.matched_employee.birth_date ? new Date(enrollDetail.matched_employee.birth_date).toLocaleDateString('fr-FR') : '—'],
                      ['Lieu de naissance', enrollDetail.matched_employee.birth_place || '—'],
                      ["Date d'embauche", enrollDetail.matched_employee.hire_date ? new Date(enrollDetail.matched_employee.hire_date).toLocaleDateString('fr-FR') : '—'],
                      ['Fonction', enrollDetail.matched_employee.fonction || '—'],
                      ['Téléphone', enrollDetail.matched_employee.phone_personal || '—'],
                      ['Email', enrollDetail.matched_employee.personal_email || '—'],
                    ] as [string, string][]).map(([label, val]) => (
                      <Box key={label} sx={{ display: 'flex', py: 0.75, borderBottom: '1px solid #A7F3D0', '&:last-child': { borderBottom: 'none' } }}>
                        <Typography sx={{ width: 160, fontSize: 12, color: '#047857', fontWeight: 600, flexShrink: 0 }}>{label}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{val || '—'}</Typography>
                      </Box>
                    ))}
                    <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1, py: 0.5, fontSize: 12 }}>
                      Cet agent sera <strong>mis à jour</strong> sur les champs vides uniquement.
                    </Alert>
                  </Box>
                </Grid>
              )}
              {enrollDetail.enrollment.rejection_reason && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    <strong>Motif de rejet :</strong> {enrollDetail.enrollment.rejection_reason}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => { setEnrollDetailOpen(false); setEnrollDetail(null); }}
            sx={{ borderRadius: 2, textTransform: 'none' }}>Fermer</Button>
          {enrollDetail?.enrollment.status === 'pending' && (
            <>
              <Button variant="outlined" color="error" startIcon={<DoNotDisturb />}
                onClick={() => setEnrollRejectOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Rejeter</Button>
              <Button variant="contained" startIcon={<VerifiedUser />} disabled={enrollActionLoading}
                onClick={async () => {
                  if (!enrollDetail) return;
                  setEnrollActionLoading(true);
                  try {
                    await client.post(`/enrollments/${enrollDetail.enrollment.id}/validate`);
                    setEnrollDetailOpen(false);
                    setEnrollDetail(null);
                    refetchEnrollments();
                  } finally { setEnrollActionLoading(false); }
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                {enrollActionLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Valider'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Dialog : Motif de rejet ── */}
      <Dialog open={enrollRejectOpen} onClose={() => setEnrollRejectOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Motif de rejet</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>
            Ce motif sera envoyé par email à l'agent pour qu'il puisse corriger et soumettre à nouveau.
          </Typography>
          <TextField fullWidth multiline rows={4} label="Motif *"
            value={rejectReasonText} onChange={e => setRejectReasonText(e.target.value)}
            placeholder="Ex : Le matricule saisi ne correspond pas à nos dossiers. Veuillez vérifier et soumettre à nouveau."
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setEnrollRejectOpen(false)}
            sx={{ borderRadius: 2, textTransform: 'none' }}>Annuler</Button>
          <Button variant="contained" color="error"
            disabled={enrollActionLoading || rejectReasonText.trim().length < 10}
            onClick={async () => {
              if (!enrollDetail) return;
              setEnrollActionLoading(true);
              try {
                await client.post(`/enrollments/${enrollDetail.enrollment.id}/reject`, { reason: rejectReasonText });
                setEnrollRejectOpen(false);
                setEnrollDetailOpen(false);
                setEnrollDetail(null);
                setRejectReasonText('');
                refetchEnrollments();
              } finally { setEnrollActionLoading(false); }
            }}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            {enrollActionLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Envoyer le rejet'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}
