import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Typography, Button, TextField, FormControl, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, Avatar, CircularProgress, Alert, Tooltip, Autocomplete,
} from '@mui/material';
import {
  PlayArrow, Groups, Person, AccountTree, CheckCircle, Info,
  CalendarMonth, ChildCare, WorkspacePremium, Timelapse,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { leavesApi } from '../../api/leaves';
import { departmentsApi } from '../../api/departments';
import { employeesApi } from '../../api/employees';
import type { DetailPlanningConge } from '../../api/leaves';
import type { Department, Employee } from '../../types';

const NAV = '#0D2137';
const ACT = '#E85D04';

// ─── Carte solde ──────────────────────────────────────────────────
function BalanceCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
  return (
    <Box sx={{
      flex: 1, minWidth: 110, bgcolor: '#fff', border: `1.5px solid ${color}30`,
      borderRadius: '10px', p: 1.5, textAlign: 'center',
      boxShadow: `0 2px 8px ${color}15`,
    }}>
      <Box sx={{ color, mb: 0.5, '& svg': { fontSize: 20 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10.5, color: '#64748B', mt: 0.25, lineHeight: 1.3 }}>{label}</Typography>
    </Box>
  );
}

// ─── Onglet planning congés ───────────────────────────────────────
export default function LeavePlanningTab() {
  const year = dayjs().year();
  const [critere,      setCritere]      = useState<'G' | 'E' | 'A'>('G');
  const [annee,        setAnnee]        = useState(year);
  const [dateGen,      setDateGen]      = useState(dayjs().format('YYYY-MM-DD'));
  const [dateLimite,   setDateLimite]   = useState(`${year}-10-31`);
  const [deptId,       setDeptId]       = useState<number | ''>('');
  const [employeeId,   setEmployeeId]   = useState<number | ''>('');
  const [result,       setResult]       = useState<{ message: string; generated: number } | null>(null);
  const [error,        setError]        = useState<string>('');

  // ── Queries ──
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn:  () => departmentsApi.list().then((r) => {
      const d = r.data as unknown;
      return (Array.isArray(d) ? d : ((d as { data?: Department[] }).data ?? [])) as Department[];
    }),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn:  () => employeesApi.list({ per_page: 200 }).then((r) => {
      const d = r.data as unknown;
      return ((d as { data?: Employee[] }).data ?? []) as Employee[];
    }),
  });
  const employees = empData ?? [];

  const { data: planningsData, refetch: refetchPlannings, isLoading: loadingPlannings } = useQuery({
    queryKey: ['leave-plannings', annee],
    queryFn:  () => leavesApi.plannings({ annee }) as Promise<{ data: DetailPlanningConge[] }>,
  });
  const plannings: DetailPlanningConge[] = (planningsData as any)?.data ?? [];

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', annee],
    queryFn:  () => leavesApi.holidays(annee),
  });

  // Solde d'un agent sélectionné
  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['leave-balance', employeeId],
    queryFn:  () => employeeId ? leavesApi.balance(Number(employeeId)) : null,
    enabled:  !!employeeId,
  });

  // ── Mutation génération ──
  const genMut = useMutation({
    mutationFn: () => leavesApi.generatePlanning({
      critere,
      annee,
      date_generation: dateGen,
      date_limite:     dateLimite,
      department_id:   critere === 'E' && deptId ? Number(deptId) : undefined,
      employee_id:     critere === 'A' && employeeId ? Number(employeeId) : undefined,
    }),
    onSuccess: (data) => {
      setResult({ message: data.message, generated: data.generated });
      setError('');
      refetchPlannings();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Erreur lors de la génération.');
    },
  });

  const critereLabel = { G: 'Toute l\'agence', E: 'Par direction', A: 'Par agent' };

  return (
    <Box sx={{ p: 0 }}>

      {/* ── Section génération ── */}
      <Box sx={{ bgcolor: NAV, px: 2.5, py: 1.25 }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Génération du Planning de Congés Annuel
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5, mt: 0.2 }}>
          GENERATION_CONGE_ANNUEL — Article L220 Code du Travail Sénégal
        </Typography>
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
        {/* Paramètres */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>

          {/* Critère */}
          <Box sx={{ minWidth: 180 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Critère de génération
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {(['G', 'E', 'A'] as const).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  onClick={() => setCritere(c)}
                  icon={c === 'G' ? <Groups sx={{ fontSize: '14px !important' }} /> : c === 'E' ? <AccountTree sx={{ fontSize: '14px !important' }} /> : <Person sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    bgcolor:     critere === c ? NAV    : '#fff',
                    color:       critere === c ? '#fff' : NAV,
                    border:      `1.5px solid ${critere === c ? NAV : '#CBD5E1'}`,
                    '&:hover': { bgcolor: critere === c ? NAV : '#EFF6FF' },
                  }}
                />
              ))}
            </Box>
            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mt: 0.5 }}>{critereLabel[critere]}</Typography>
          </Box>

          {/* Année */}
          <Box sx={{ minWidth: 100 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Année</Typography>
            <TextField type="number" size="small" value={annee}
              onChange={(e) => { setAnnee(Number(e.target.value)); setDateLimite(`${e.target.value}-10-31`); }}
              inputProps={{ min: 2020, max: 2050 }} sx={{ width: 100, bgcolor: '#fff' }} />
          </Box>

          {/* Date génération */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date génération</Typography>
            <TextField type="date" size="small" value={dateGen}
              onChange={(e) => setDateGen(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 160 }} />
          </Box>

          {/* Date limite */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Date limite{' '}
              <Tooltip title="Période légale : 1 mai – 31 octobre"><Info sx={{ fontSize: 12, color: '#94A3B8', verticalAlign: 'middle' }} /></Tooltip>
            </Typography>
            <TextField type="date" size="small" value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#fff', width: 160 }} />
          </Box>

          {/* Direction (si critère E) */}
          {critere === 'E' && (
            <Box sx={{ minWidth: 220 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direction</Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: '#fff' }}>
                <Select value={deptId} onChange={(e) => setDeptId(e.target.value as number)} displayEmpty
                  renderValue={(v) => v ? departments.find((d) => d.id === v)?.name ?? String(v) : '— Choisir —'}>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.code ? `[${d.code}] ` : ''}{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Agent (si critère A) — Autocomplete matricule + nom */}
          {critere === 'A' && (
            <Box sx={{ minWidth: 300 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agent
              </Typography>
              <Autocomplete
                size="small"
                options={employees}
                /* filtre sur matricule OU prénom OU nom */
                filterOptions={(opts, { inputValue }) => {
                  const q = inputValue.toLowerCase().trim();
                  if (!q) return opts.slice(0, 20);
                  return opts.filter((e) =>
                    e.employee_number.toLowerCase().includes(q) ||
                    e.first_name.toLowerCase().includes(q) ||
                    e.last_name.toLowerCase().includes(q) ||
                    `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
                  );
                }}
                getOptionLabel={(e) =>
                  typeof e === 'string' ? e : `${e.employee_number} — ${e.first_name} ${e.last_name}`
                }
                value={employees.find((e) => e.id === employeeId) ?? null}
                onChange={(_, val) => setEmployeeId(val?.id ?? '')}
                noOptionsText="Aucun agent trouvé"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Matricule ou nom…"
                    sx={{ bgcolor: '#fff', minWidth: 300 }}
                    InputProps={{
                      ...params.InputProps,
                      sx: { fontSize: 13 },
                    }}
                  />
                )}
                renderOption={(props, emp) => {
                  const { key, ...optProps } = props as typeof props & { key: React.Key };
                  const hue = (emp.first_name.charCodeAt(0) + emp.last_name.charCodeAt(0)) % 360;
                  const initials = `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase();
                  return (
                    <Box key={key} component="li" {...optProps}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: '6px !important', px: '12px !important' }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, flexShrink: 0, bgcolor: `hsl(${hue},50%,44%)` }}>
                        {initials}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#1E3A5F', letterSpacing: '0.04em' }}>
                            {emp.employee_number}
                          </Typography>
                          {emp.department?.code && (
                            <Chip label={emp.department.code} size="small"
                              sx={{ height: 16, fontSize: 9, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#334155', lineHeight: 1.2 }} noWrap>
                          {emp.first_name} {emp.last_name}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
              />
            </Box>
          )}

          {/* Bouton générer */}
          <Button
            variant="contained"
            startIcon={genMut.isPending ? <CircularProgress size={14} color="inherit" /> : <PlayArrow />}
            disabled={genMut.isPending || (critere === 'E' && !deptId) || (critere === 'A' && !employeeId)}
            onClick={() => genMut.mutate()}
            sx={{ bgcolor: ACT, '&:hover': { bgcolor: '#c94d00' }, borderRadius: '8px', fontWeight: 700, fontSize: 13, px: 2.5, py: 1, boxShadow: `0 4px 14px ${ACT}40`, alignSelf: 'flex-end' }}>
            Générer
          </Button>
        </Box>

        {/* Résultats / erreurs */}
        {result && (
          <Alert severity="success" icon={<CheckCircle />} onClose={() => setResult(null)}
            sx={{ borderRadius: '8px', fontWeight: 600 }}>
            {result.message} ({result.generated} agent{result.generated > 1 ? 's' : ''})
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '8px' }}>{error}</Alert>
        )}
      </Box>

      {/* ── Solde agent sélectionné ── */}
      {critere === 'A' && employeeId && (
        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAV, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Solde de congés — {employees.find((e) => e.id === employeeId)?.first_name} {employees.find((e) => e.id === employeeId)?.last_name}
          </Typography>
          {loadingBalance
            ? <CircularProgress size={24} />
            : balance && (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <BalanceCard label="Solde disponible"    value={balance.solde_disponible}      color="#059669" icon={<CheckCircle />} />
                <BalanceCard label="Jours acquis"        value={balance.acquis_periode}         color="#2563EB" icon={<Timelapse />} />
                <BalanceCard label="Sup. ancienneté"     value={balance.supplement_anciennete}  color="#7C3AED" icon={<WorkspacePremium />} />
                <BalanceCard label="Sup. enfants"        value={balance.supplement_enfant}      color="#EC4899" icon={<ChildCare />} />
                <BalanceCard label="Jours utilisés"      value={balance.jours_utilises}         color="#D97706" icon={<CalendarMonth />} />
                <BalanceCard label="Ancienneté (ans)"    value={balance.anciennete_years}       color="#64748B" icon={<Person />} />
              </Box>
            )
          }
        </Box>
      )}

      {/* ── Jours fériés ── */}
      <Box sx={{ display: 'flex', gap: 0 }}>
        {/* Table plannings */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Plannings générés — {annee} ({plannings.length})
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1E3A5F' }}>
                  {['Agent', 'Matricule', 'Direction', 'Dispo', '+ Acquis', '+ Anc.', '+ Enf.', '− Imputés', 'Total', 'Statut'].map((h) => (
                    <TableCell key={h} sx={{ bgcolor: '#1E3A5F', color: '#fff', fontWeight: 700, fontSize: 11, py: 1, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingPlannings
                  ? <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                  : plannings.length === 0
                    ? <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', py: 5, color: '#94A3B8', fontSize: 13 }}>Aucun planning généré pour {annee}. Cliquez sur "Générer".</TableCell></TableRow>
                    : plannings.map((p, idx) => (
                      <TableRow key={p.id} sx={{ bgcolor: idx % 2 === 0 ? '#fff' : '#F8FAFC', '&:hover': { bgcolor: '#EFF6FF' } }}>
                        <TableCell sx={{ py: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 9, fontWeight: 700, bgcolor: '#1E3A5F' }}>
                              {p.employee?.first_name?.[0]}{p.employee?.last_name?.[0]}
                            </Avatar>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }} noWrap>
                              {p.employee?.first_name} {p.employee?.last_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{p.employee?.employee_number}</TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{p.employee?.department?.code ?? p.employee?.department?.name ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: '#334155' }}>{p.nbre_jour_dispo}</TableCell>
                        <TableCell sx={{ fontSize: 12, textAlign: 'right', color: '#2563EB' }}>+{p.nbre_jour_conges}</TableCell>
                        <TableCell sx={{ fontSize: 12, textAlign: 'right', color: '#7C3AED' }}>+{p.supplement_anciennete}</TableCell>
                        <TableCell sx={{ fontSize: 12, textAlign: 'right', color: '#EC4899' }}>+{p.supplement_enfant}</TableCell>
                        <TableCell sx={{ fontSize: 12, textAlign: 'right', color: '#DC2626' }}>−{p.nbre_jour_a_imputer}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: '#059669' }}>
                          {p.nbre_jour_total_disponible}
                        </TableCell>
                        <TableCell>
                          <Chip label={p.statut} size="small"
                            sx={{ fontSize: 10, height: 18, fontWeight: 700,
                              bgcolor: p.statut === 'valide' ? '#ECFDF5' : '#F8FAFC',
                              color:   p.statut === 'valide' ? '#059669'  : '#64748B',
                            }} />
                        </TableCell>
                      </TableRow>
                    ))
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Jours fériés */}
        <Box sx={{ width: 220, flexShrink: 0, borderLeft: '1px solid #E2E8F0' }}>
          <Box sx={{ bgcolor: '#334155', px: 2, py: 0.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Jours fériés {annee}
            </Typography>
          </Box>
          <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
            {holidays.map((h, i) => (
              <Box key={i} sx={{
                display: 'flex', gap: 1, px: 1.5, py: 0.75,
                borderBottom: '1px solid #F1F5F9',
                bgcolor: i % 2 === 0 ? '#fff' : '#F8FAFC',
                '&:hover': { bgcolor: '#EFF6FF' },
              }}>
                <Box sx={{
                  width: 38, fontSize: 10, fontWeight: 700, color: '#fff',
                  bgcolor: '#E31937', borderRadius: '5px', textAlign: 'center',
                  py: 0.25, flexShrink: 0,
                }}>
                  {dayjs(h.date).format('DD/MM')}
                </Box>
                <Typography sx={{ fontSize: 11, color: '#334155', lineHeight: 1.3 }} noWrap>{h.libelle}</Typography>
              </Box>
            ))}
            {holidays.length === 0 && (
              <Typography sx={{ fontSize: 12, color: '#94A3B8', p: 2, textAlign: 'center' }}>
                Chargement…
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
