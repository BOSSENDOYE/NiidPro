import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, Avatar, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, LinearProgress,
  TextField, InputAdornment, Stack, Skeleton,
} from '@mui/material';
import {
  Visibility, Search, Close, BeachAccess, CheckCircle, HourglassEmpty,
  Cancel, TrendingDown,
} from '@mui/icons-material';
import { employeesApi } from '../../api/employees';
import { leavesApi } from '../../api/leaves';
import { formatDate } from '../../utils/format';
import StatusChip from '../common/StatusChip';
import type { Employee, Leave } from '../../types';

const NAV = '#0D2137';
const ACT = '#E85D04';

function barColor(pct: number) {
  if (pct > 60) return '#059669';
  if (pct > 30) return '#D97706';
  return '#EF4444';
}

export default function LeaveBalanceTab() {
  const [search,      setSearch]      = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  /* ── Pagination table principale ── */
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ── Pagination dialog historique ── */
  const [dlgPage,        setDlgPage]        = useState(0);
  const [dlgRowsPerPage, setDlgRowsPerPage] = useState(5);

  /* Remet la page à 0 quand la recherche change */
  useEffect(() => { setPage(0); }, [search]);
  /* Remet la page dialog à 0 quand on change d'agent */
  useEffect(() => { setDlgPage(0); }, [selectedEmp]);

  /* ── Employés ── */
  const { data: empData, isLoading: loadingEmps } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () =>
      employeesApi.list({ per_page: 200 }).then((r) => {
        const d = r.data as unknown;
        return ((d as { data?: Employee[] }).data ?? []) as Employee[];
      }),
  });
  const employees = empData ?? [];

  /* ── Tous les congés ── */
  const { data: allLeaves = [] } = useQuery<Leave[]>({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => r.data),
  });

  /* Jours pris (approuvés) par employé */
  const daysTakenMap = useMemo(() =>
    allLeaves.reduce<Record<number, number>>((acc, l) => {
      if (l.status === 'approved') {
        acc[l.employee_id] = (acc[l.employee_id] ?? 0) + (l.days_count ?? 0);
      }
      return acc;
    }, {}),
  [allLeaves]);

  /* Congés de l'agent sélectionné, triés du plus récent */
  const empLeaves = useMemo(() => {
    if (!selectedEmp) return [];
    return [...allLeaves]
      .filter((l) => l.employee_id === selectedEmp.id)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [allLeaves, selectedEmp]);

  /* Page courante du dialog */
  const dlgRows = empLeaves.slice(
    dlgPage * dlgRowsPerPage,
    dlgPage * dlgRowsPerPage + dlgRowsPerPage,
  );

  /* Filtre recherche */
  const filtered = useMemo(() =>
    employees.filter((e) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        e.employee_number.toLowerCase().includes(s) ||
        e.first_name.toLowerCase().includes(s) ||
        e.last_name.toLowerCase().includes(s) ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
        (e.department?.name ?? '').toLowerCase().includes(s)
      );
    }),
  [employees, search]);

  /* Ligne courante de la table principale */
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  /* Statistiques pour le dialog */
  const empStats = useMemo(() => {
    if (!selectedEmp) return { approved: 0, pending: 0, rejected: 0 };
    return empLeaves.reduce(
      (acc, l) => {
        if      (l.status === 'approved') acc.approved += l.days_count ?? 0;
        else if (l.status === 'pending')  acc.pending  += l.days_count ?? 0;
        else if (l.status === 'rejected') acc.rejected += l.days_count ?? 0;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 },
    );
  }, [empLeaves, selectedEmp]);

  /* ─── Rendu ─── */
  return (
    <Box>
      {/* ── En-tête ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Solde de Congés par Agent
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5, mt: 0.2 }}>
          Vue consolidée — jours restants et jours pris · {employees.length} agent(s)
        </Typography>
      </Box>

      {/* ── Recherche ── */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Rechercher par matricule, nom ou direction…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: '#94A3B8' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 380, bgcolor: '#fff' }}
        />
        {search && (
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>
            {filtered.length} résultat(s)
          </Typography>
        )}
      </Box>

      {/* ── Table ── */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1E3A5F' }}>
              {['#', 'Matricule', 'Agent', 'Direction', 'Jours restants', 'Jours pris', 'Détails'].map((h) => (
                <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingEmps
              ? Array.from({ length: rowsPerPage }).map((_, i) => (
                  <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : pageRows.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 13 }}>
                        Aucun agent trouvé
                      </TableCell>
                    </TableRow>
                  )
                : pageRows.map((emp, idx) => {
                    const globalIdx = page * rowsPerPage + idx;
                    const daysTaken = daysTakenMap[emp.id] ?? 0;
                    const daysLeft  = Number(emp.nbre_jour_restant ?? 0);
                    const total     = daysLeft + daysTaken || 1;
                    const pct       = (daysLeft / total) * 100;
                    const initials  = `${emp.first_name[0] ?? '?'}${emp.last_name[0] ?? ''}`.toUpperCase();
                    const hue       = (emp.first_name.charCodeAt(0) + emp.last_name.charCodeAt(0)) % 360;

                    return (
                      <TableRow
                        key={emp.id}
                        sx={{
                          bgcolor: idx % 2 === 0 ? '#fff' : '#F8FAFC',
                          '&:hover': { bgcolor: '#EFF6FF' },
                        }}
                      >
                        {/* N° */}
                        <TableCell sx={{ fontSize: 11, color: '#94A3B8', py: 1, width: 36 }}>
                          {globalIdx + 1}
                        </TableCell>

                        {/* Matricule */}
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#1E3A5F', py: 1 }}>
                          {emp.employee_number}
                        </TableCell>

                        {/* Nom */}
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: `hsl(${hue},50%,44%)`, flexShrink: 0 }}>
                              {initials}
                            </Avatar>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                              {emp.first_name} {emp.last_name}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Direction */}
                        <TableCell sx={{ fontSize: 11, color: '#475569', py: 1 }}>
                          {emp.department?.name ?? '—'}
                        </TableCell>

                        {/* Jours restants + barre */}
                        <TableCell sx={{ minWidth: 170, py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 7, borderRadius: 4,
                                  bgcolor: '#F1F5F9',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: barColor(pct),
                                    borderRadius: 4,
                                    transition: 'none',
                                  },
                                }}
                              />
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, minWidth: 32, textAlign: 'right', color: barColor(pct) }}>
                              {daysLeft}j
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Jours pris */}
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            icon={<BeachAccess sx={{ fontSize: '13px !important' }} />}
                            label={`${daysTaken} j`}
                            size="small"
                            sx={{
                              fontSize: 11, fontWeight: 700, height: 22,
                              bgcolor: daysTaken > 0 ? '#FEF3C7' : '#F1F5F9',
                              color:   daysTaken > 0 ? '#92400E' : '#94A3B8',
                              '& .MuiChip-icon': { color: 'inherit' },
                            }}
                          />
                        </TableCell>

                        {/* Action */}
                        <TableCell sx={{ py: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => setSelectedEmp(emp)}
                            sx={{
                              color: NAV, border: `1.5px solid #CBD5E1`,
                              borderRadius: '7px', p: '4px',
                              '&:hover': { bgcolor: '#EFF6FF', borderColor: ACT, color: ACT },
                            }}
                          >
                            <Visibility sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination table principale ── */}
      <Box sx={{ borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 15, 25]}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{
            fontSize: 12,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
            '& .MuiTablePagination-select': { fontSize: 12 },
          }}
        />
      </Box>

      {/* ══ Dialog historique agent ══ */}
      <Dialog
        open={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', overflow: 'hidden' } }}
      >
        {/* Titre */}
        <DialogTitle sx={{ bgcolor: NAV, color: '#fff', p: 0 }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {selectedEmp && (
                <Avatar sx={{
                  width: 40, height: 40, fontSize: 14, fontWeight: 800,
                  bgcolor: `hsl(${(selectedEmp.first_name.charCodeAt(0) + selectedEmp.last_name.charCodeAt(0)) % 360},50%,50%)`,
                }}>
                  {selectedEmp.first_name[0]}{selectedEmp.last_name[0]}
                </Avatar>
              )}
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                  {selectedEmp?.first_name} {selectedEmp?.last_name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>
                  {selectedEmp?.employee_number} · {selectedEmp?.department?.name ?? '—'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setSelectedEmp(null)}
              sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Cartes résumé */}
          {selectedEmp && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
              {[
                { label: 'Jours restants',  value: Number(selectedEmp.nbre_jour_restant ?? 0), color: '#059669', bg: '#ECFDF5', icon: <TrendingDown sx={{ fontSize: 20 }} /> },
                { label: 'Jours approuvés', value: empStats.approved,  color: '#2563EB', bg: '#EFF6FF', icon: <CheckCircle   sx={{ fontSize: 20 }} /> },
                { label: 'En attente',       value: empStats.pending,   color: '#D97706', bg: '#FEF3C7', icon: <HourglassEmpty sx={{ fontSize: 20 }} /> },
                { label: 'Refusés',          value: empStats.rejected,  color: '#DC2626', bg: '#FEF2F2', icon: <Cancel         sx={{ fontSize: 20 }} /> },
              ].map(({ label, value, color, bg, icon }) => (
                <Box key={label} sx={{ p: 2, textAlign: 'center', bgcolor: bg, borderRight: '1px solid #E2E8F0', '&:last-child': { borderRight: 'none' } }}>
                  <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.5 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Bandeau titre table */}
          <Box sx={{ bgcolor: '#334155', px: 2.5, py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Historique des congés — {empLeaves.length} demande(s)
            </Typography>
            {empLeaves.length > 0 && (
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Page {dlgPage + 1} / {Math.ceil(empLeaves.length / dlgRowsPerPage)}
              </Typography>
            )}
          </Box>

          {/* Table congés */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Type de congé', 'Date début', 'Date fin', 'Jours', 'Motif / Raison', 'Statut'].map((h) => (
                    <TableCell key={h} sx={{ bgcolor: '#1E3A5F', color: '#fff', fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {empLeaves.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: '#94A3B8', fontSize: 13 }}>
                          Aucune demande de congé enregistrée pour cet agent.
                        </TableCell>
                      </TableRow>
                    )
                  : dlgRows.map((leave, idx) => {
                      const globalN = dlgPage * dlgRowsPerPage + idx + 1;
                      return (
                        <TableRow
                          key={leave.id}
                          sx={{
                            bgcolor: idx % 2 === 0 ? '#fff' : '#F8FAFC',
                            '&:hover': { bgcolor: '#EFF6FF' },
                            opacity: leave.status === 'rejected' ? 0.65 : 1,
                          }}
                        >
                          {/* N° */}
                          <TableCell sx={{ fontSize: 11, color: '#94A3B8', py: 0.85, width: 36 }}>
                            {globalN}
                          </TableCell>

                          {/* Type */}
                          <TableCell sx={{ py: 0.85 }}>
                            <Chip
                              label={leave.leaveType?.name ?? '—'}
                              size="small"
                              sx={{
                                fontSize: 10, height: 20, fontWeight: 600,
                                bgcolor: leave.leaveType?.color ? `${leave.leaveType.color}20` : '#EEF2FF',
                                color:   leave.leaveType?.color ?? '#6366F1',
                              }}
                            />
                          </TableCell>

                          {/* Dates */}
                          <TableCell sx={{ fontSize: 12, color: '#334155', py: 0.85 }}>{formatDate(leave.start_date)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#334155', py: 0.85 }}>{formatDate(leave.end_date)}</TableCell>

                          {/* Nbr jours */}
                          <TableCell sx={{ py: 0.85 }}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 30, height: 22, borderRadius: '6px', fontWeight: 800, fontSize: 12,
                              bgcolor: leave.status === 'approved' ? '#DBEAFE' : '#F1F5F9',
                              color:   leave.status === 'approved' ? '#1D4ED8' : '#64748B',
                            }}>
                              {leave.days_count ?? 0}
                            </Box>
                          </TableCell>

                          {/* Motif */}
                          <TableCell sx={{ py: 0.85, maxWidth: 200 }}>
                            {leave.reason
                              ? <Typography sx={{ fontSize: 12, color: '#475569' }} title={leave.reason} noWrap>{leave.reason}</Typography>
                              : <Typography sx={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>Aucun motif</Typography>
                            }
                          </TableCell>

                          {/* Statut */}
                          <TableCell sx={{ py: 0.85 }}><StatusChip status={leave.status} /></TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ── Pagination dialog ── */}
          {empLeaves.length > 0 && (
            <Box sx={{ borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
              <TablePagination
                component="div"
                count={empLeaves.length}
                page={dlgPage}
                rowsPerPage={dlgRowsPerPage}
                onPageChange={(_, p) => setDlgPage(p)}
                onRowsPerPageChange={(e) => { setDlgRowsPerPage(parseInt(e.target.value, 10)); setDlgPage(0); }}
                rowsPerPageOptions={[5, 10, 20]}
                labelRowsPerPage="Par page :"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
                sx={{
                  fontSize: 12,
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
                  '& .MuiTablePagination-select': { fontSize: 12 },
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Stack direction="row" alignItems="center" sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
              Données en temps réel
            </Typography>
          </Stack>
          <Button
            onClick={() => setSelectedEmp(null)}
            variant="outlined"
            sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, borderColor: '#CBD5E1', color: '#475569' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
