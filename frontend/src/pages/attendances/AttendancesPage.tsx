import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Avatar, Chip, Tooltip, Button,
  TextField, InputAdornment, MenuItem, Select, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Tab, Tabs, LinearProgress,
} from '@mui/material';
import {
  Search, Edit, AccessTime, People, CheckCircle,
  Warning, BeachAccess, QrCodeScanner, CalendarToday, Add,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { attendancesApi } from '../../api/attendances';
import { employeesApi } from '../../api/employees';
import type { Attendance, Employee } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtTime = (dt?: string | null) =>
  dt ? dayjs(dt).format('HH:mm') : '—';

const fmtDate = (d?: string | null) =>
  d ? dayjs(d).format('DD/MM/YYYY') : '—';

const hm = (min?: number | null) => {
  if (min == null) return '—';
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  present:  { label: 'Présent',    color: '#059669', bg: '#ECFDF5', icon: '✓' },
  late:     { label: 'Retard',     color: '#D97706', bg: '#FFFBEB', icon: '⌚' },
  absent:   { label: 'Absent',     color: '#DC2626', bg: '#FEF2F2', icon: '✗' },
  on_leave: { label: 'Congé',      color: '#2563EB', bg: '#EFF6FF', icon: '🌴' },
  holiday:  { label: 'Férié',      color: '#7C3AED', bg: '#F5F3FF', icon: '★' },
  remote:   { label: 'Télétravail',color: '#0284C7', bg: '#F0F9FF', icon: '🏠' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#64748B', bg: '#F1F5F9', icon: '?' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        height: 22, fontSize: 11, fontWeight: 700,
        bgcolor: cfg.bg, color: cfg.color,
        border: `1.5px solid ${cfg.color}30`,
      }}
    />
  );
}

function EmpAvatar({ emp }: { emp?: Employee | { first_name: string; last_name: string } }) {
  if (!emp) return <Avatar sx={{ width: 32, height: 32, fontSize: 11 }}>?</Avatar>;
  const init = `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase();
  const hue  = (emp.first_name.charCodeAt(0) + emp.last_name.charCodeAt(0)) % 360;
  return (
    <Avatar sx={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, bgcolor: `hsl(${hue},50%,44%)` }}>
      {init}
    </Avatar>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, total, color, bg, icon }: {
  label: string; value: number; total?: number; color: string; bg: string; icon: React.ReactNode;
}) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <Box sx={{
      flex: 1, minWidth: 140, bgcolor: '#fff', border: '1px solid #E2E8F0',
      borderRadius: '12px', p: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: pct !== null ? 1.25 : 0 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Box sx={{ color, '& svg': { fontSize: 19 } }}>{icon}</Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</Typography>
          <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>{label}</Typography>
        </Box>
        {pct !== null && (
          <Typography sx={{ ml: 'auto', fontSize: 13, fontWeight: 700, color }}>{pct}%</Typography>
        )}
      </Box>
      {pct !== null && (
        <LinearProgress variant="determinate" value={pct} sx={{
          height: 4, borderRadius: 2, bgcolor: bg,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
        }} />
      )}
    </Box>
  );
}

// ─── Manual pointage dialog ───────────────────────────────────────────────────
function ManualDialog({ open, onClose, employees, onSuccess }: {
  open: boolean; onClose: () => void; employees: Employee[]; onSuccess: () => void;
}) {
  const [empId, setEmpId]       = useState<number | ''>('');
  const [date,  setDate]        = useState(dayjs().format('YYYY-MM-DD'));
  const [status,setStatus]      = useState('present');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes]       = useState('');

  const storeMut = useMutation({
    mutationFn: () => attendancesApi.store({
      employee_id: empId,
      date,
      status,
      check_in:  checkIn  || undefined,
      check_out: checkOut || undefined,
      notes:     notes    || undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '14px' } }}>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit sx={{ fontSize: 16, color: '#2563EB' }} />
          Pointage manuel
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl size="small" fullWidth>
            <Select value={empId} onChange={(e) => setEmpId(e.target.value as number)}
              displayEmpty renderValue={(v) => {
                if (!v) return <em style={{ color: '#94A3B8' }}>Choisir un agent</em>;
                const e = employees.find((x) => x.id === v);
                return e ? `${e.first_name} ${e.last_name}` : String(v);
              }}>
              {employees.map((e) => (
                <MenuItem key={e.id} value={e.id} sx={{ gap: 1.5 }}>
                  <EmpAvatar emp={e} />
                  <Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{e.first_name} {e.last_name}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>{e.employee_number}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField type="date" label="Date" size="small" fullWidth value={date}
              onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField type="time" label="Arrivée" size="small" fullWidth value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="time" label="Départ" size="small" fullWidth value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Box>

          <TextField label="Notes" size="small" fullWidth multiline rows={2} value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="Motif, observation…" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
        <Button size="small" onClick={onClose} sx={{ borderRadius: '8px' }}>Annuler</Button>
        <Button size="small" variant="contained" disabled={!empId || storeMut.isPending}
          onClick={() => storeMut.mutate()} sx={{ borderRadius: '8px', px: 2 }}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Today tab ────────────────────────────────────────────────────────────────
function TodayTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [manualOpen, setManualOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['attendances', 'today'],
    queryFn: () => attendancesApi.today().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ per_page: 200 }).then((r) => {
      const d = r.data as unknown;
      return ((d as { data?: Employee[] }).data ?? (Array.isArray(d) ? d : [])) as Employee[];
    }),
  });

  const records: Attendance[] = (data as any)?.records ?? [];
  const total   = (data as any)?.total  ?? 0;
  const present = (data as any)?.present ?? 0;
  const late    = (data as any)?.late    ?? 0;
  const absent  = (data as any)?.absent  ?? 0;
  const onLeave = (data as any)?.on_leave ?? 0;
  const notYet  = Math.max(0, total - records.length);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((a) => {
      const matchSearch = !q
        || `${a.employee?.first_name} ${a.employee?.last_name}`.toLowerCase().includes(q)
        || (a.employee?.employee_number ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const SOURCE_LABEL: Record<string, string> = {
    badge: 'QR Badge', web: 'Web', mobile: 'Mobile', manual: 'Manuel',
  };

  return (
    <Box>
      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard label="Total agents"   value={total}   color="#2563EB" bg="#EFF6FF"  icon={<People />} />
        <StatCard label="Présents"       value={present} total={total} color="#059669" bg="#ECFDF5" icon={<CheckCircle />} />
        <StatCard label="En retard"      value={late}    total={total} color="#D97706" bg="#FFFBEB" icon={<Warning />} />
        <StatCard label="Absents"        value={absent}  total={total} color="#DC2626" bg="#FEF2F2" icon={<AccessTime />} />
        <StatCard label="En congé"       value={onLeave} total={total} color="#2563EB" bg="#EFF6FF" icon={<BeachAccess />} />
        {notYet > 0 && (
          <StatCard label="Non pointés" value={notYet} total={total} color="#64748B" bg="#F1F5F9" icon={<AccessTime />} />
        )}
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder="Rechercher un agent…" size="small" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: 280, flexGrow: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">Tous les statuts</MenuItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Ouvrir le terminal QR (badgeage)">
            <Button variant="outlined" size="small" startIcon={<QrCodeScanner />}
              onClick={() => navigate('/attendance-scanner')}
              sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}>
              Terminal QR
            </Button>
          </Tooltip>
          <Button variant="contained" size="small" startIcon={<Add />}
            onClick={() => setManualOpen(true)}
            sx={{ borderRadius: '9px', fontSize: 12, textTransform: 'none' }}>
            Pointage manuel
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Agent', 'Arrivée', 'Départ', 'Durée', 'Statut', 'Source'].map((h) => (
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
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}
                    </TableRow>
                  ))
                : filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucun pointage{search ? ' correspondant' : ' aujourd\'hui'}</TableCell></TableRow>
                  : filtered.map((att) => (
                    <TableRow key={att.id}
                      sx={{
                        '&:hover': { bgcolor: '#F8FAFC' },
                        borderLeft: `3px solid ${STATUS_CFG[att.status]?.color ?? 'transparent'}20`,
                      }}>
                      <TableCell sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <EmpAvatar emp={att.employee} />
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                              {att.employee?.first_name} {att.employee?.last_name}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1.3 }}>
                              {att.employee?.employee_number}
                              {(att.employee as any)?.department?.code && ` · ${(att.employee as any).department.code}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: att.check_in ? 600 : 400, color: att.check_in ? '#059669' : '#94A3B8' }}>
                          {fmtTime(att.check_in)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: att.check_out ? 600 : 400, color: att.check_out ? '#2563EB' : '#94A3B8' }}>
                          {fmtTime(att.check_out)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                          {hm(att.worked_minutes)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}><StatusBadge status={att.status} /></TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip label={SOURCE_LABEL[att.source] ?? att.source} size="small"
                          variant="outlined"
                          sx={{
                            height: 20, fontSize: 10, fontWeight: 600,
                            color: att.source === 'badge' ? '#7C3AED' : '#64748B',
                            borderColor: att.source === 'badge' ? '#7C3AED40' : '#E2E8F0',
                          }} />
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <ManualDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        employees={employees}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['attendances', 'today'] })}
      />
    </Box>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab() {
  const [from,   setFrom]   = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [to,     setTo]     = useState(dayjs().format('YYYY-MM-DD'));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['attendances', 'history', from, to, status, page],
    queryFn: () => attendancesApi.list({ from, to, status: status || undefined, page, per_page: 25 }).then((r) => r.data),
    keepPreviousData: true,
  } as any);

  const records: Attendance[] = (data as any)?.data ?? [];
  const lastPage: number      = (data as any)?.last_page ?? 1;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter((a) =>
      `${a.employee?.first_name} ${a.employee?.last_name}`.toLowerCase().includes(q) ||
      (a.employee?.employee_number ?? '').toLowerCase().includes(q)
    );
  }, [records, search]);

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField type="date" label="Du" size="small" value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }} InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }} />
        <TextField type="date" label="Au" size="small" value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }} InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            displayEmpty renderValue={(v) => v ? STATUS_CFG[v]?.label ?? v : 'Tous statuts'}>
            <MenuItem value="">Tous statuts</MenuItem>
            {Object.entries(STATUS_CFG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField placeholder="Rechercher…" size="small" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment> }} />
      </Box>

      <Box sx={{ bgcolor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Date', 'Agent', 'Arrivée', 'Départ', 'Durée', 'Statut', 'Source'].map((h) => (
                  <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1.25, borderBottom: '2px solid #E2E8F0' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                  ))
                : filtered.length === 0
                  ? <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucun pointage sur cette période</TableCell></TableRow>
                  : filtered.map((att) => (
                    <TableRow key={att.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{fmtDate(att.date)}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmpAvatar emp={att.employee} />
                          <Box>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                              {att.employee?.first_name} {att.employee?.last_name}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>{att.employee?.employee_number}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: 12.5, fontWeight: 600, color: att.check_in ? '#059669' : '#94A3B8' }}>
                        {fmtTime(att.check_in)}
                      </TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: 12.5, fontWeight: 600, color: att.check_out ? '#2563EB' : '#94A3B8' }}>
                        {fmtTime(att.check_out)}
                      </TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
                        {hm(att.worked_minutes)}
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}><StatusBadge status={att.status} /></TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip label={att.source} size="small" variant="outlined"
                          sx={{ height: 18, fontSize: 10, color: att.source === 'badge' ? '#7C3AED' : '#64748B', borderColor: att.source === 'badge' ? '#7C3AED40' : '#E2E8F0' }} />
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {lastPage > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, py: 2, borderTop: '1px solid #F1F5F9' }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} sx={{ borderRadius: '8px', textTransform: 'none', fontSize: 12 }}>
              ← Précédent
            </Button>
            <Typography sx={{ fontSize: 12, color: '#64748B', px: 1 }}>
              Page {page} / {lastPage}
            </Typography>
            <Button size="small" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} sx={{ borderRadius: '8px', textTransform: 'none', fontSize: 12 }}>
              Suivant →
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AttendancesPage() {
  const [tab, setTab] = useState(0);
  const today = dayjs().format('dddd D MMMM YYYY');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
            Pointage
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.5, textTransform: 'capitalize' }}>
            {today}
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontSize: 13, fontWeight: 600, textTransform: 'none', minHeight: 40, py: 0.75 },
            '& .Mui-selected': { color: '#2563EB' },
            '& .MuiTabs-indicator': { bgcolor: '#2563EB', height: 2.5, borderRadius: '2px 2px 0 0' },
          }}>
          <Tab icon={<CalendarToday sx={{ fontSize: 15, mr: 0.5 }} />} iconPosition="start" label="Aujourd'hui" />
          <Tab icon={<AccessTime sx={{ fontSize: 15, mr: 0.5 }} />} iconPosition="start" label="Historique" />
        </Tabs>
      </Box>

      {tab === 0 ? <TodayTab /> : <HistoryTab />}
    </Box>
  );
}
