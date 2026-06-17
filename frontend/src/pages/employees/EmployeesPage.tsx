import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Avatar, Typography, IconButton, Tooltip, TextField,
  Skeleton, Stack, Tabs, Tab, Button,
  Chip, Grid, Divider, Checkbox, Menu, ListItemIcon, ListItemText,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, LinearProgress, Autocomplete,
} from '@mui/material';
import {
  Visibility, Edit, Delete, Email, Badge as BadgeIcon,
  Print, PersonAdd, Groups, CheckCircle, Block,
  Gavel, Assignment, Assessment,
  Phone, Event, Refresh, AccessTime, EmojiEvents, Search, AssignmentTurnedIn,
  FileDownload, FileUpload, TableChart, CloudUpload,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { employeesApi } from '../../api/employees';
import { departmentsApi } from '../../api/departments';
import { tasksApi } from '../../api/tasks';
import { formatDate } from '../../utils/format';
import EmployeeCreateModal from '../../components/employees/EmployeeCreateModal';
import ContractTab from '../../components/employees/ContractTab';
import EvaluationTab from '../../components/employees/EvaluationTab';
import AvailabilityTab from '../../components/employees/AvailabilityTab';
import DistinctionTab from '../../components/employees/DistinctionTab';
import SanctionTab from '../../components/employees/SanctionTab';
import EmployeeBadgeCard from '../../components/employees/EmployeeBadgeCard';
import type { Employee } from '../../types';

const TAB_CONFIG = [
  { label: 'Agents',        icon: <Groups fontSize="small" />,      color: '#F97316' },
  { label: 'Disponibilité', icon: <AccessTime fontSize="small" />,  color: '#06B6D4' },
  { label: 'Distinction',   icon: <EmojiEvents fontSize="small" />, color: '#A855F7' },
  { label: 'Sanction',      icon: <Gavel fontSize="small" />,       color: '#EF4444' },
  { label: 'Contrat',       icon: <Assignment fontSize="small" />,  color: '#3B82F6' },
  { label: 'Évaluation',    icon: <Assessment fontSize="small" />,  color: '#F59E0B' },
];

export default function EmployeesPage() {

  const [activeTab, setActiveTab]       = useState(0);
  const [page, setPage]                 = useState(0);
  const rowsPerPage                     = 20;
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [matricule, setMatricule]       = useState('');
  const [prenom, setPrenom]             = useState('');
  const [nom, setNom]                   = useState('');
  const [service, setService]           = useState('');
  const [telephone, setTelephone]       = useState('');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<number[]>([]);
  const [anchorEl, setAnchorEl]         = useState<null | HTMLElement>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalMode, setModalMode]       = useState<'create'|'edit'|'view'>('create');
  const [modalEmployee, setModalEmployee] = useState<Employee | undefined>(undefined);
  const [modalKey, setModalKey]         = useState(0);
  const [badgeEmployee, setBadgeEmployee] = useState<Employee | null>(null);
  const [taskEmp, setTaskEmp]   = useState<Employee | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [importOpen, setImportOpen]   = useState(false);
  const [importFile, setImportFile]   = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qcPage = useQueryClient();

  const { data: counts } = useQuery({
    queryKey: ['employees', 'counts'],
    queryFn: () => employeesApi.counts().then(r => r.data),
  });

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => r.data),
  });
  const deptNames = (depts as { id: number; name: string }[] | undefined)?.map(d => d.name) ?? [];

  const importMut = useMutation({
    mutationFn: (file: File) => employeesApi.import(file),
    onSuccess: (res) => {
      setImportResult({ created: res.data.created, skipped: res.data.skipped });
      qcPage.invalidateQueries({ queryKey: ['employees'] });
      qcPage.invalidateQueries({ queryKey: ['employees', 'counts'] });
      setImportFile(null);
    },
  });

  const handleExport = async () => {
    const params: Record<string, string> = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    const res = await employeesApi.export(params);
    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportClose = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
    importMut.reset();
  };

  const isExcel = (file: File) =>
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  const excelToCsvFile = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target!.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          const bom = '﻿';
          const csv = bom + rows.map(r => (r as string[]).join(';')).join('\n');
          resolve(new File([csv], file.name.replace(/\.xlsx?$/i, '.csv'), { type: 'text/csv' }));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });

  const handleImport = async () => {
    if (!importFile) return;
    const fileToSend = isExcel(importFile)
      ? await excelToCsvFile(importFile)
      : importFile;
    importMut.mutate(fileToSend);
  };

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

  const handleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSearch = () => {
    setSearch([matricule, prenom, nom, telephone].filter(Boolean).join(' '));
    setPage(0);
  };

  const departmentId = service
    ? (depts as { id: number; name: string }[] | undefined)?.find(d => d.name === service)?.id
    : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employees', page, search, statusFilter, departmentId],
    queryFn: () =>
      employeesApi.list({
        page: page + 1,
        per_page: rowsPerPage,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        department_id: departmentId,
      }).then((r) => r.data),
  });

  const handleClear = () => {
    setMatricule(''); setPrenom(''); setNom('');
    setService(''); setTelephone('');
    setSearch(''); setStatusFilter('all'); setPage(0);
    // departmentId se recalcule automatiquement quand service = ''
  };

  return (
    <Box>
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
              label={`${counts?.total ?? data?.total ?? 0} Total`} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 600 }} />
            <Chip icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#34D399 !important' }} />}
              label={`${counts?.active ?? 0} Actifs`} size="small"
              sx={{ bgcolor: 'rgba(5,150,105,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)', fontSize: 11, fontWeight: 600 }} />
            <Chip icon={<Block sx={{ fontSize: '13px !important', color: '#FCA5A5 !important' }} />}
              label={`${counts?.inactive ?? 0} Inactifs`} size="small"
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

      {/* ══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ══════════════════════════════════════════════════════════ */}
      <Card sx={{ borderRadius: '0 0 16px 16px', border: 'none', boxShadow: '0 8px 40px rgba(15,23,42,0.1)', overflow: 'visible' }}>
        {activeTab === 0 ? (
          <>
            {/* ── BARRE RECHERCHE + ACTIONS ── */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', background: 'linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%)' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {/* Champs de recherche */}
                <TextField placeholder="Matricule" size="small" value={matricule} onChange={e => setMatricule(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 115 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Prénom" size="small" value={prenom} onChange={e => setPrenom(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 105 }} InputProps={{ sx: { fontSize: 12 } }} />
                <TextField placeholder="Nom" size="small" value={nom} onChange={e => setNom(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 105 }} InputProps={{ sx: { fontSize: 12 } }} />
                <Autocomplete
                  options={deptNames}
                  value={service || null}
                  onChange={(_, val) => setService(val ?? '')}
                  size="small"
                  sx={{ width: 140, bgcolor: '#fff' }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Service"
                      InputProps={{ ...params.InputProps, sx: { fontSize: 12 } }} />
                  )}
                  noOptionsText="Aucun service"
                />
                <TextField placeholder="Téléphone" size="small" value={telephone} onChange={e => setTelephone(e.target.value)}
                  sx={{ bgcolor: '#fff', width: 115 }} InputProps={{ sx: { fontSize: 12 } }} />

                {/* Toggle Statut */}
                <Stack direction="row" spacing={0.25} sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', px: 0.75, py: 0.4 }}>
                  {([['all','Tous','#475569'],['active','Actif','#059669'],['inactive','Inactif','#DC2626']] as const).map(([val, lbl, clr]) => (
                    <Box key={val} onClick={() => { setStatusFilter(val); setPage(0); }}
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
                  <Tooltip title="Exporter en CSV" arrow>
                    <Button size="small" variant="outlined" startIcon={<FileDownload sx={{ fontSize: '14px !important' }} />}
                      onClick={handleExport}
                      sx={{ color: '#059669', borderColor: '#A7F3D0', bgcolor: '#F0FDF4', fontSize: 12, borderRadius: '8px', px: 1.75, fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { borderColor: '#059669', bgcolor: '#DCFCE7' }, transition: 'all 0.2s' }}>
                      Exporter
                    </Button>
                  </Tooltip>
                  <Tooltip title="Importer depuis un fichier CSV" arrow>
                    <Button size="small" variant="outlined" startIcon={<FileUpload sx={{ fontSize: '14px !important' }} />}
                      onClick={() => setImportOpen(true)}
                      sx={{ color: '#7C3AED', borderColor: '#DDD6FE', bgcolor: '#FAF5FF', fontSize: 12, borderRadius: '8px', px: 1.75, fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { borderColor: '#7C3AED', bgcolor: '#EDE9FE' }, transition: 'all 0.2s' }}>
                      Importer
                    </Button>
                  </Tooltip>
                  <Button size="small" variant="outlined" startIcon={<Print sx={{ fontSize: '14px !important' }} />}
                    sx={{ color: '#475569', borderColor: '#E2E8F0', bgcolor: '#fff', fontSize: 12, borderRadius: '8px', px: 1.75, fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' }, transition: 'all 0.2s' }}>
                    Imprimer
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
              {selected.length > 0 && (
                <Chip label={`${selected.length} sélectionné(s)`} size="small" color="primary"
                  onDelete={() => setSelected([])} sx={{ fontSize: 11, height: 22, fontWeight: 600 }} />
              )}
            </Stack>

            {/* ══════════════════════════════════════════════════════
                GRILLE DE CARTES AGENTS
            ══════════════════════════════════════════════════════ */}
            <Box sx={{ p: 2.5, bgcolor: '#F1F5F9', minHeight: 340 }}>
              {isLoading ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={310} sx={{ borderRadius: '16px' }} />
                  ))}
                </Box>
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
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2 }}>
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
                            height: 76,
                            backgroundImage: isActive
                              ? 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)'
                              : 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 55%, #EF4444 100%)',
                            backgroundColor: isActive ? '#1E3A8A' : '#7F1D1D',
                            borderRadius: '14px 14px 0 0',
                            position: 'relative',
                            overflow: 'hidden',
                          }}>
                            {/* Cercles décoratifs */}
                            <Box sx={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)', top: -40, right: -28 }} />
                            <Box sx={{ position: 'absolute', width: 65, height: 65, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', top: 20, left: -18 }} />
                            <Box sx={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', bottom: -15, right: 55 }} />

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
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: -4.5, px: 2, pb: 2 }}>

                            {/* Avatar */}
                            <Avatar
                              src={emp.photo_url ?? undefined}
                              sx={{
                                width: 74, height: 74,
                                fontSize: 26, fontWeight: 800,
                                backgroundImage: isActive
                                  ? 'linear-gradient(135deg, #1D4ED8, #7C3AED)'
                                  : 'linear-gradient(135deg, #94A3B8, #475569)',
                                backgroundColor: isActive ? '#1D4ED8' : '#94A3B8',
                                border: '3.5px solid #1E293B',
                                boxShadow: isActive
                                  ? '0 6px 18px rgba(37,99,235,0.4)'
                                  : '0 6px 18px rgba(0,0,0,0.3)',
                              }}
                            >
                              {initials}
                            </Avatar>

                            {/* Statut */}
                            <Chip size="small"
                              icon={isActive
                                ? <CheckCircle sx={{ fontSize: '11px !important', color: '#34D399 !important' }} />
                                : <Block sx={{ fontSize: '11px !important', color: '#F87171 !important' }} />
                              }
                              label={isActive ? 'Actif' : 'Inactif'}
                              sx={{
                                mt: 0.875, height: 21, fontSize: 10, fontWeight: 700,
                                bgcolor: isActive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                color: isActive ? '#34D399' : '#F87171',
                                border: `1px solid ${isActive ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                              }}
                            />

                            {/* Nom complet */}
                            <Typography fontWeight={800} fontSize={14.5} color="#F1F5F9"
                              textAlign="center" lineHeight={1.25} mt={0.875} noWrap sx={{ maxWidth: 170 }}>
                              {emp.first_name} {emp.last_name}
                            </Typography>

                            {/* Poste */}
                            {emp.position?.title && (
                              <Typography variant="caption" textAlign="center" noWrap
                                sx={{ fontSize: 10.5, color: '#64748B', maxWidth: 165, mt: 0.3 }}>
                                {emp.position.title}
                              </Typography>
                            )}

                            {/* Badges matricule + département */}
                            <Stack direction="row" spacing={0.5} mt={0.875} mb={1.5}
                              flexWrap="wrap" justifyContent="center" useFlexGap>
                              {emp.employee_number && (
                                <Box component="span" sx={{
                                  fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                                  color: '#93C5FD', bgcolor: 'rgba(59,130,246,0.12)',
                                  px: 0.75, py: 0.2, borderRadius: '5px',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                }}>
                                  {emp.employee_number}
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

                            <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.07)', mb: 1.25 }} />

                            {/* Informations clés */}
                            <Stack spacing={0.8} width="100%">
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Email sx={{ fontSize: 12, color: '#475569', flexShrink: 0 }} />
                                <Typography noWrap sx={{ fontSize: 11, flex: 1, color: '#94A3B8' }}>
                                  {emp.professional_email}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Phone sx={{ fontSize: 12, color: '#475569', flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                                  {emp.phone || '—'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Event sx={{ fontSize: 12, color: '#475569', flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                                  Recruté le {formatDate(emp.hire_date)}
                                </Typography>
                              </Stack>
                            </Stack>

                            <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.07)', mt: 1.25, mb: 1.1 }} />

                            {/* Boutons d'action */}
                            <Stack direction="row" spacing={0.6} justifyContent="center" flexWrap="wrap" useFlexGap>
                              <Tooltip title="Voir le dossier" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); openModal('view', emp); }}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(59,130,246,0.12)', color: '#93C5FD', '&:hover': { bgcolor: 'rgba(59,130,246,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Visibility sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Modifier" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); openModal('edit', emp); }}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(249,115,22,0.12)', color: '#FB923C', '&:hover': { bgcolor: 'rgba(249,115,22,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Edit sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Envoyer un mail" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); window.location.href = `mailto:${emp.professional_email}`; }}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(34,197,94,0.12)', color: '#4ADE80', '&:hover': { bgcolor: 'rgba(34,197,94,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Email sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Carte professionnelle & Badge" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setBadgeEmployee(emp); }}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(168,85,247,0.12)', color: '#C084FC', '&:hover': { bgcolor: 'rgba(168,85,247,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <BadgeIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Assigner une tâche" arrow>
                                <IconButton size="small" onClick={e => { e.stopPropagation(); setTaskEmp(emp); }}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(234,179,8,0.12)', color: '#EAB308', '&:hover': { bgcolor: 'rgba(234,179,8,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <AssignmentTurnedIn sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer" arrow>
                                <IconButton size="small" onClick={e => e.stopPropagation()}
                                  sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: 'rgba(225,29,72,0.12)', color: '#FB7185', '&:hover': { bgcolor: 'rgba(225,29,72,0.22)', transform: 'scale(1.1)' }, transition: 'all .15s' }}>
                                  <Delete sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Box>
                        </Card>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* ── DIALOG IMPORT CSV ── */}
            <Dialog open={importOpen} onClose={handleImportClose} maxWidth="sm" fullWidth
              PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden' } }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #0F172A 0%, #4C1D95 60%, #1E293B 100%)',
                px: 3, py: 2.5, position: 'relative', overflow: 'hidden',
                '&::before': { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 40%, rgba(124,58,237,0.25) 0%, transparent 55%)', pointerEvents: 'none' },
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.75}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '11px', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(124,58,237,0.45)' }}>
                      <FileUpload sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.3px' }}>
                        Importer des agents
                      </Typography>
                      <Typography sx={{ color: '#94A3B8', fontSize: 11.5 }}>
                        Fichier CSV (séparateur ;) ou Excel (.xlsx / .xls)
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton onClick={handleImportClose} size="small"
                    sx={{ color: '#64748B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </Box>

              <DialogContent sx={{ p: 3 }}>
                {importResult ? (
                  <Stack spacing={2}>
                    <Alert severity="success" sx={{ borderRadius: '10px' }}>
                      <Typography fontWeight={700}>{importResult.created} agent(s) importé(s) avec succès</Typography>
                    </Alert>
                    {importResult.skipped.length > 0 && (
                      <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                        <Typography fontWeight={700} mb={0.5}>{importResult.skipped.length} ligne(s) ignorée(s) :</Typography>
                        {importResult.skipped.map((msg, i) => (
                          <Typography key={i} fontSize={12}>{msg}</Typography>
                        ))}
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2.5}>
                    {/* Format attendu */}
                    <Box sx={{ p: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <TableChart sx={{ fontSize: 16, color: '#059669' }} />
                        <Typography fontSize={12.5} fontWeight={700} color="#059669">Colonnes attendues (dans l'ordre)</Typography>
                      </Stack>
                      <Typography fontSize={11.5} sx={{ fontFamily: 'monospace', color: '#374151', lineHeight: 1.8 }}>
                        Matricule · Prénom · Nom · Email professionnel · Téléphone ·<br />
                        Service · Poste · Date embauche (AAAA-MM-JJ) · Salaire · Statut
                      </Typography>
                      <Typography fontSize={11} sx={{ color: '#6B7280', mt: 0.75 }}>
                        CSV : séparateur point-virgule (;) · Excel : première feuille utilisée
                      </Typography>
                    </Box>

                    {/* Télécharger template */}
                    <Button variant="outlined" size="small" startIcon={<FileDownload fontSize="small" />}
                      onClick={() => {
                        const bom = '﻿';
                        const header = 'Matricule;Prénom;Nom;Email professionnel;Téléphone;Service;Poste;Date embauche;Salaire de base;Statut\n';
                        const example = ';Jean;DUPONT;jean.dupont@exemple.com;771234567;Direction RH;Responsable RH;2024-01-15;450000;active\n';
                        const blob = new Blob([bom + header + example], { type: 'text/csv;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'modele_import_agents.csv'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 600, color: '#059669', borderColor: '#A7F3D0', alignSelf: 'flex-start' }}>
                      Télécharger le modèle CSV
                    </Button>

                    {/* Zone de dépôt */}
                    <Box
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        border: `2px dashed ${importFile ? '#7C3AED' : '#CBD5E1'}`,
                        borderRadius: '12px', p: 3, textAlign: 'center', cursor: 'pointer',
                        bgcolor: importFile ? '#FAF5FF' : '#F8FAFC',
                        transition: 'all .2s',
                        '&:hover': { borderColor: '#7C3AED', bgcolor: '#FAF5FF' },
                      }}>
                      <input
                        ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); e.target.value = ''; }}
                      />
                      <CloudUpload sx={{ fontSize: 36, color: importFile ? '#7C3AED' : '#CBD5E1', mb: 1 }} />
                      {importFile ? (
                        <Stack spacing={0.5}>
                          <Typography fontSize={13} fontWeight={700} color="#7C3AED">{importFile.name}</Typography>
                          <Typography fontSize={11.5} color="#64748B">
                            {(importFile.size / 1024).toFixed(1)} Ko
                            {isExcel(importFile) && <Box component="span" sx={{ ml: 1, color: '#059669', fontWeight: 700 }}>· Excel détecté ✓</Box>}
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack spacing={0.5}>
                          <Typography fontSize={13} fontWeight={600} color="#475569">Cliquez pour sélectionner un fichier</Typography>
                          <Typography fontSize={11.5} color="#94A3B8">CSV ou Excel (.xlsx / .xls) · max 4 Mo</Typography>
                        </Stack>
                      )}
                    </Box>

                    {importMut.isError && (
                      <Alert severity="error" sx={{ borderRadius: '10px', fontSize: 12 }}>
                        Une erreur est survenue lors de l'import.
                      </Alert>
                    )}
                    {importMut.isPending && <LinearProgress sx={{ borderRadius: '4px' }} />}
                  </Stack>
                )}
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={handleImportClose} sx={{ color: '#64748B', textTransform: 'none', borderRadius: '8px' }}>
                  {importResult ? 'Fermer' : 'Annuler'}
                </Button>
                {!importResult && (
                  <Button
                    variant="contained" disabled={!importFile || importMut.isPending}
                    onClick={handleImport}
                    sx={{ bgcolor: '#7C3AED', textTransform: 'none', fontWeight: 700, borderRadius: '8px', '&:hover': { bgcolor: '#6D28D9' } }}>
                    {importMut.isPending ? 'Import en cours…' : `Importer${importFile && isExcel(importFile) ? ' (Excel)' : ''}`}
                  </Button>
                )}
              </DialogActions>
            </Dialog>

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
                          {taskEmp.employee_number} · {taskEmp.position?.title ?? '—'}
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
    </Box>
  );
}
