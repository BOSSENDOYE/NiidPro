import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  InputAdornment, Paper, Skeleton, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { AssignmentReturn, CheckCircle, Info } from '@mui/icons-material';
import { carryoverApi, type CarryoverRow } from '../../api/leaves';

const NAV = '#0D2137';
const ACT = '#E85D04';

export default function LeaveCarryoverTab() {
  const qc  = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [year,    setYear]    = useState(currentYear);
  const [plafond, setPlafond] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error,   setError]     = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leaves-carryover', year, plafond],
    queryFn: () => carryoverApi.index(year, plafond),
  });

  const applyMutation = useMutation({
    mutationFn: () => carryoverApi.apply({ year, plafond, employee_ids: selected }),
    onSuccess: (res: { message?: string }) => {
      setSuccess(res.message ?? 'Report appliqué.');
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['leaves-carryover'] });
      refetch();
    },
    onError: () => setError('Une erreur est survenue. Veuillez réessayer.'),
  });

  const rows: CarryoverRow[] = data?.rows ?? [];
  const pending  = rows.filter((r) => !r.already_applied);
  const allPendingIds = pending.map((r) => r.employee_id);
  const allSelected   = selected.length === allPendingIds.length && allPendingIds.length > 0;

  const toggle = (id: number) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(allSelected ? [] : allPendingIds);

  return (
    <Box sx={{ p: 0 }}>
      {/* ── Titre ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AssignmentReturn sx={{ color: '#fff', fontSize: 20 }} />
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              Report de congé — Clôture annuelle
            </Typography>
            <Typography sx={{ color: '#93C5FD', fontSize: 11.5 }}>
              Transfère le solde non consommé de l'année N vers le solde de départ de l'année N+1
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Paramètres ── */}
      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end" flexWrap="wrap">
          <TextField
            label="Année à clôturer"
            type="number"
            size="small"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSelected([]); }}
            inputProps={{ min: 2020, max: 2100 }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Plafond de report"
            type="number"
            size="small"
            value={plafond}
            onChange={(e) => { setPlafond(Number(e.target.value)); setSelected([]); }}
            inputProps={{ min: 0, max: 60, step: 0.5 }}
            InputProps={{ endAdornment: <InputAdornment position="end">j</InputAdornment> }}
            helperText="Jours maximum reportables"
            sx={{ width: 210 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => { refetch(); setSelected([]); setSuccess(null); setError(null); }}
            sx={{ height: 40, borderColor: NAV, color: NAV }}
          >
            Actualiser
          </Button>
        </Stack>
      </Box>

      {/* ── Alertes ── */}
      <Box sx={{ px: 2.5, pt: 1.5 }}>
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 1.5 }}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {/* Info box */}
        <Alert severity="info" icon={<Info />} sx={{ mb: 2, fontSize: 12.5 }}>
          Le report est limité à <strong>{plafond} jours</strong>. Les jours reportés seront crédités
          comme solde de départ au <strong>1er janvier {year + 1}</strong> pour chaque agent sélectionné.
        </Alert>
      </Box>

      {/* ── Tableau ── */}
      <Box sx={{ px: 2.5, pb: 3 }}>
        {isLoading ? (
          <Skeleton variant="rounded" height={300} />
        ) : (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: NAV }}>
                {rows.length} agent(s) — {pending.length} en attente de report
              </Typography>
              <Button
                variant="contained"
                size="small"
                disabled={selected.length === 0 || applyMutation.isPending}
                startIcon={applyMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <AssignmentReturn />}
                onClick={() => { setSuccess(null); setError(null); applyMutation.mutate(); }}
                sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#c44b02' }, borderRadius: '8px' }}
              >
                Appliquer le report ({selected.length} agent{selected.length > 1 ? 's' : ''})
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allSelected}
                        indeterminate={selected.length > 0 && !allSelected}
                        onChange={toggleAll}
                        disabled={allPendingIds.length === 0}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Matricule</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Direction</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Solde fin {year}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Jours à reporter</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: 11.5, color: '#64748B' }}>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
                        Aucun agent actif trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const isChecked = selected.includes(row.employee_id);
                      return (
                        <TableRow
                          key={row.employee_id}
                          hover
                          sx={{
                            opacity:    row.already_applied ? 0.6 : 1,
                            bgcolor:    isChecked ? '#FFF7ED' : 'inherit',
                            '&:last-child td': { border: 0 },
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              disabled={row.already_applied}
                              onChange={() => toggle(row.employee_id)}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12.5, color: '#64748B', fontFamily: 'monospace' }}>
                            {row.employee_number}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                            {row.employee_name}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12.5, color: '#475569' }}>
                            {row.department}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${row.solde_disponible} j`}
                              size="small"
                              sx={{
                                fontSize: 12, fontWeight: 800,
                                bgcolor: row.solde_disponible > 0 ? '#DCFCE7' : '#F1F5F9',
                                color:   row.solde_disponible > 0 ? '#166534' : '#64748B',
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${row.already_applied ? row.jours_reportes : row.jours_a_reporter} j`}
                              size="small"
                              sx={{
                                fontSize: 12, fontWeight: 800,
                                bgcolor: '#FFF7ED', color: ACT,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {row.already_applied ? (
                              <Chip
                                icon={<CheckCircle sx={{ fontSize: 13 }} />}
                                label="Appliqué"
                                size="small"
                                sx={{ bgcolor: '#DCFCE7', color: '#166534', fontWeight: 700, fontSize: 11 }}
                              />
                            ) : (
                              <Chip
                                label="En attente"
                                size="small"
                                sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 700, fontSize: 11 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Box>
  );
}
