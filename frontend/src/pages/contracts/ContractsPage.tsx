import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Avatar, IconButton, Tooltip, Button,
  TextField, InputAdornment, MenuItem, Select, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Collapse,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Stack,
} from '@mui/material';
import {
  Add, Search, Edit, Delete, Description, Warning,
  CheckCircle, CalendarToday, AccessTime, ExpandMore, ExpandLess, PictureAsPdf, Close,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { contractsApi } from '../../api/contracts';
import { employeesApi } from '../../api/employees';
import type { Contract, Employee } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => d ? dayjs(d).format('DD/MM/YYYY') : '—';

const fmtSalary = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' : '—';

const daysLeft = (end?: string | null) => {
  if (!end) return null;
  return dayjs(end).diff(dayjs(), 'day');
};

const contractDuration = (start: string, end?: string | null) => {
  if (!end) return null;
  const total = dayjs(end).diff(dayjs(start), 'day');
  const elapsed = dayjs().diff(dayjs(start), 'day');
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};

interface TypeConfig { label: string; color: string; bg: string; border: string }

const TYPE_CONFIG: Record<string, TypeConfig> = {
  CDI:          { label: 'CDI',          color: '#059669', bg: '#ECFDF5', border: '#059669' },
  CDD:          { label: 'CDD',          color: '#D97706', bg: '#FFFBEB', border: '#D97706' },
  DECRET:       { label: 'Décret',       color: '#1B4B8A', bg: '#EFF6FF', border: '#1B4B8A' },
  DETACHEMENT:  { label: 'Détachement',  color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED' },
  Stage:        { label: 'Stage',        color: '#EC4899', bg: '#FDF2F8', border: '#EC4899' },
  Alternance:   { label: 'Alternance',   color: '#0D9488', bg: '#F0FDFA', border: '#0D9488' },
  Prestation:   { label: 'Prestation',   color: '#0284C7', bg: '#F0F9FF', border: '#0284C7' },
  Autre:        { label: 'Autre',        color: '#64748B', bg: '#F1F5F9', border: '#94A3B8' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 700,
        bgcolor: cfg.bg,
        color: cfg.color,
        border: `1.5px solid ${cfg.border}40`,
        letterSpacing: '0.03em',
      }}
    />
  );
}

function UrgencyChip({ days }: { days: number }) {
  const color = days <= 7 ? '#DC2626' : days <= 30 ? '#D97706' : '#059669';
  const bg    = days <= 7 ? '#FEF2F2' : days <= 30 ? '#FFFBEB' : '#ECFDF5';
  return (
    <Chip
      icon={<Warning sx={{ fontSize: '11px !important', color: `${color} !important` }} />}
      label={`${days}j`}
      size="small"
      sx={{ height: 20, fontSize: 10, fontWeight: 700, color, bgcolor: bg, border: `1px solid ${color}30`, ml: 0.5 }}
    />
  );
}

function EmployeeAvatar({ emp }: { emp?: Employee }) {
  if (!emp) return <Avatar sx={{ width: 34, height: 34, fontSize: 12 }}>?</Avatar>;
  const initials = `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase();
  const hue = (emp.first_name.charCodeAt(0) + emp.last_name.charCodeAt(0)) % 360;
  return (
    <Avatar sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 700, bgcolor: `hsl(${hue},55%,45%)` }}>
      {initials}
    </Avatar>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; bg: string;
}) {
  return (
    <Box sx={{
      flex: 1, minWidth: 140,
      bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
      p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Box sx={{ color, '& svg': { fontSize: 20 } }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.3 }}>{label}</Typography>
      </Box>
    </Box>
  );
}

// ─── Form dialog ──────────────────────────────────────────────────────────────
interface ContractForm {
  employee_id: number | '';
  type: string;
  start_date: string;
  end_date: string;
  salary: number | '';
  working_hours_per_week: number | '';
  notes: string;
}

const EMPTY_FORM: ContractForm = {
  employee_id: '', type: 'CDI', start_date: '', end_date: '', salary: '', working_hours_per_week: 40, notes: '',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ContractsPage() {
  const qc = useQueryClient();

  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [alertOpen,    setAlertOpen]    = useState(true);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Contract | null>(null);
  const [form,         setForm]         = useState<ContractForm>(EMPTY_FORM);

  // ── queries ──
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Contract[];
    }),
  });

  const { data: expiring = [] } = useQuery<Contract[]>({
    queryKey: ['contracts', 'expiring'],
    queryFn: () => contractsApi.expiringSoon().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])) as Contract[];
    }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ per_page: 200 }).then((r) => {
      const d = r.data as unknown;
      const raw = (d as { data?: Employee[] }).data ?? (Array.isArray(d) ? d : []);
      return raw as Employee[];
    }),
  });
  const employees = employeesData ?? [];

  // ── mutations ──
  const createMut = useMutation({
    mutationFn: (data: Partial<Contract>) => contractsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); closeDialog(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Contract> }) => contractsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); closeDialog(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => contractsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
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

  // ── filtering ──
  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || `${c.employee?.first_name} ${c.employee?.last_name}`.toLowerCase().includes(q)
        || (c.employee?.employee_number ?? '').toLowerCase().includes(q)
        || c.type.toLowerCase().includes(q);
      const matchType   = typeFilter   === 'all' || c.type === typeFilter;
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'active'   &&  c.is_active)
        || (statusFilter === 'inactive' && !c.is_active);
      return matchSearch && matchType && matchStatus;
    });
  }, [contracts, search, typeFilter, statusFilter]);

  // ── stats ──
  const cdiCount  = contracts.filter((c) => c.type === 'CDI'  && c.is_active).length;
  const cddCount  = contracts.filter((c) => c.type === 'CDD'  && c.is_active).length;
  const actives   = contracts.filter((c) => c.is_active).length;

  // ── dialog helpers ──
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditTarget(c);
    setForm({
      employee_id:           c.employee_id,
      type:                  c.type,
      start_date:            c.start_date,
      end_date:              c.end_date ?? '',
      salary:                c.salary,
      working_hours_per_week:c.working_hours_per_week,
      notes:                 c.notes ?? '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); setForm(EMPTY_FORM); };

  const handleSave = () => {
    const payload: Partial<Contract> = {
      employee_id:            Number(form.employee_id),
      type:                   form.type as Contract['type'],
      start_date:             form.start_date,
      end_date:               form.end_date || undefined,
      salary:                 Number(form.salary),
      working_hours_per_week: Number(form.working_hours_per_week),
      notes:                  form.notes || undefined,
    };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  const setField = <K extends keyof ContractForm>(k: K, v: ContractForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
            Contrats
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5 }}>
            {actives} contrat{actives !== 1 ? 's' : ''} actif{actives !== 1 ? 's' : ''} · {contracts.length} au total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ borderRadius: '10px', fontSize: 13, px: 2.5, py: 1, boxShadow: '0 4px 14px rgba(37,99,235,0.3)', flexShrink: 0 }}
        >
          Nouveau contrat
        </Button>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard icon={<Description />}  label="Total contrats"  value={contracts.length} color="#2563EB" bg="#EFF6FF" />
        <StatCard icon={<CheckCircle />}  label="CDI actifs"       value={cdiCount}  color="#059669" bg="#ECFDF5" />
        <StatCard icon={<CalendarToday />}label="CDD en cours"     value={cddCount}  color="#D97706" bg="#FFFBEB" />
        <StatCard icon={<Warning />}      label="Expirent bientôt" value={expiring.length} color="#DC2626" bg="#FEF2F2" />
      </Box>

      {/* ── Expiring alert ── */}
      {expiring.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Box
            onClick={() => setAlertOpen((o) => !o)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.25, bgcolor: '#FFFBEB', border: '1.5px solid #FCD34D',
              borderRadius: alertOpen ? '10px 10px 0 0' : '10px', cursor: 'pointer',
              '&:hover': { bgcolor: '#FEF3C7' }, transition: 'background 0.12s',
            }}
          >
            <Warning sx={{ fontSize: 18, color: '#D97706', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400E', flexGrow: 1 }}>
              {expiring.length} contrat{expiring.length > 1 ? 's' : ''} expire{expiring.length > 1 ? 'nt' : ''} dans les 30 prochains jours
            </Typography>
            {alertOpen ? <ExpandLess sx={{ fontSize: 18, color: '#D97706' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#D97706' }} />}
          </Box>
          <Collapse in={alertOpen}>
            <Box sx={{ border: '1.5px solid #FCD34D', borderTop: 'none', borderRadius: '0 0 10px 10px', bgcolor: '#fff', overflow: 'hidden' }}>
              {expiring.map((c, i) => {
                const days = daysLeft(c.end_date);
                return (
                  <Box key={c.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1,
                    borderTop: i > 0 ? '1px solid #FEF3C7' : 'none',
                  }}>
                    <EmployeeAvatar emp={c.employee} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }} noWrap>
                        {c.employee?.first_name} {c.employee?.last_name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                        {c.employee?.employee_number} · expire le {fmtDate(c.end_date)}
                      </Typography>
                    </Box>
                    <TypeBadge type={c.type} />
                    {days !== null && <UrgencyChip days={days} />}
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Rechercher un agent, un type…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 320 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            displayEmpty renderValue={(v) => v === 'all' ? 'Tous les types' : TYPE_CONFIG[v]?.label ?? v}
            sx={{ fontSize: 13 }}>
            <MenuItem value="all">Tous les types</MenuItem>
            {ALL_TYPES.map((t) => <MenuItem key={t} value={t}>{TYPE_CONFIG[t].label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 13 }}>
            <MenuItem value="all">Tous statuts</MenuItem>
            <MenuItem value="active">Actifs</MenuItem>
            <MenuItem value="inactive">Inactifs</MenuItem>
          </Select>
        </FormControl>
        <Typography sx={{ fontSize: 12, color: '#94A3B8', ml: 'auto' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Agent', 'Type', 'Période', 'Salaire', 'Heures / sem.', 'Statut', ''].map((h) => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1.25, borderBottom: '2px solid #E2E8F0' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                        <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Aucun contrat trouvé</Typography>
                      </TableCell>
                    </TableRow>
                  )
                  : filtered.map((c) => {
                    const days    = daysLeft(c.end_date);
                    const prog    = contractDuration(c.start_date, c.end_date);
                    const isExpi  = expiring.some((e) => e.id === c.id);

                    return (
                      <TableRow key={c.id}
                        sx={{
                          '&:hover': { bgcolor: '#F8FAFC' },
                          '&:hover .ct-actions': { opacity: 1 },
                          borderLeft: isExpi ? '3px solid #F59E0B' : '3px solid transparent',
                          transition: 'background 0.12s',
                        }}
                      >
                        {/* Agent */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <EmployeeAvatar emp={c.employee} />
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                                {c.employee?.first_name} {c.employee?.last_name}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.3 }}>
                                {c.employee?.employee_number}
                                {c.employee?.department && ` · ${c.employee.department.code ?? c.employee.department.name}`}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Type */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <TypeBadge type={c.type} />
                            {isExpi && days !== null && <UrgencyChip days={days} />}
                          </Stack>
                        </TableCell>

                        {/* Période */}
                        <TableCell sx={{ py: 1.5, minWidth: 180 }}>
                          <Typography sx={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                            {fmtDate(c.start_date)}
                            {' → '}
                            {c.end_date
                              ? <span style={{ color: isExpi ? '#D97706' : '#334155' }}>{fmtDate(c.end_date)}</span>
                              : <em style={{ color: '#94A3B8', fontStyle: 'normal' }}>Indéterminée</em>
                            }
                          </Typography>
                          {prog !== null && (
                            <Box sx={{ mt: 0.75 }}>
                              <LinearProgress
                                variant="determinate"
                                value={prog}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  bgcolor: '#F1F5F9',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: prog >= 80 ? '#DC2626' : prog >= 60 ? '#D97706' : '#059669',
                                    borderRadius: 2,
                                  },
                                }}
                              />
                              <Typography sx={{ fontSize: 10, color: '#94A3B8', mt: 0.25 }}>
                                {prog}% écoulé
                              </Typography>
                            </Box>
                          )}
                        </TableCell>

                        {/* Salaire */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                            {fmtSalary(c.salary)}
                          </Typography>
                        </TableCell>

                        {/* Heures */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 13, color: '#94A3B8' }} />
                            <Typography sx={{ fontSize: 13, color: '#334155' }}>
                              {c.working_hours_per_week}h
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Statut */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip
                            label={c.is_active ? 'Actif' : 'Clôturé'}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: c.is_active ? '#ECFDF5' : '#F8FAFC',
                              color:   c.is_active ? '#059669'  : '#64748B',
                              border: `1.5px solid ${c.is_active ? '#059669' : '#CBD5E1'}40`,
                            }}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Box className="ct-actions" sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 0.12s' }}>
                            <Tooltip title="Voir PDF">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewPdf(c)}
                                  disabled={pdfLoading === c.id}
                                  sx={{ p: 0.5 }}
                                >
                                  <PictureAsPdf sx={{ fontSize: 15, color: pdfLoading === c.id ? '#CBD5E1' : '#DC2626' }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Modifier">
                              <IconButton size="small" onClick={() => openEdit(c)} sx={{ p: 0.5 }}>
                                <Edit sx={{ fontSize: 15, color: '#64748B' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton size="small" onClick={() => deleteMut.mutate(c.id)} sx={{ p: 0.5 }}>
                                <Delete sx={{ fontSize: 15, color: '#EF4444' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

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

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ fontSize: 18, color: '#2563EB' }} />
          {editTarget ? 'Modifier le contrat' : 'Nouveau contrat'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

            {/* Employee */}
            <FormControl fullWidth size="small">
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>Agent *</Typography>
              <Select
                value={form.employee_id}
                onChange={(e) => setField('employee_id', e.target.value as number)}
                displayEmpty
                renderValue={(v) => {
                  if (!v) return <em style={{ color: '#94A3B8' }}>Sélectionner un agent</em>;
                  const emp = employees.find((e) => e.id === v);
                  return emp ? `${emp.first_name} ${emp.last_name} · ${emp.employee_number}` : String(v);
                }}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmployeeAvatar emp={emp} />
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{emp.first_name} {emp.last_name}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{emp.employee_number}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.75 }}>Type de contrat *</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ALL_TYPES.map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  const selected = form.type === t;
                  return (
                    <Chip
                      key={t}
                      label={cfg.label}
                      onClick={() => setField('type', t)}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 12,
                        height: 30,
                        bgcolor: selected ? cfg.bg : '#F8FAFC',
                        color: selected ? cfg.color : '#64748B',
                        border: `2px solid ${selected ? cfg.border : '#E2E8F0'}`,
                        transition: 'all 0.15s',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Dates */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>Date de début *</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={form.start_date}
                  onChange={(e) => setField('start_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>
                  Date de fin {form.type === 'CDI' ? <em style={{ fontWeight: 400, color: '#94A3B8' }}>(optionnel)</em> : '*'}
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={form.end_date}
                  onChange={(e) => setField('end_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>

            {/* Salary + Hours */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>Salaire (FCFA) *</Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={form.salary}
                  onChange={(e) => setField('salary', e.target.value as unknown as number)}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>Heures / semaine</Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={form.working_hours_per_week}
                  onChange={(e) => setField('working_hours_per_week', e.target.value as unknown as number)}
                  InputProps={{ endAdornment: <InputAdornment position="end">h</InputAdornment>, inputProps: { min: 1, max: 60 } }}
                />
              </Box>
            </Box>

            {/* Notes */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B', mb: 0.5 }}>Notes</Typography>
              <TextField
                multiline
                rows={2}
                size="small"
                fullWidth
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Observations, clauses particulières…"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button size="small" onClick={closeDialog} sx={{ borderRadius: '8px' }}>Annuler</Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={!form.employee_id || !form.start_date || !form.salary || createMut.isPending || updateMut.isPending}
            sx={{ borderRadius: '8px', px: 2.5 }}
          >
            {editTarget ? 'Enregistrer' : 'Créer le contrat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
