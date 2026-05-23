import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Avatar, Grid, Chip, Button,
  Tab, Tabs, Skeleton, Divider, Stack,
} from '@mui/material';
import {
  ArrowBack, Edit, Email, Phone, LocationOn, CalendarMonth,
  Work, AttachMoney, Badge,
} from '@mui/icons-material';
import { employeesApi } from '../../api/employees';
import { contractsApi } from '../../api/contracts';
import { leavesApi } from '../../api/leaves';
import StatusChip from '../../components/common/StatusChip';
import { formatDate, formatSalary } from '../../utils/format';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
      <Box sx={{ color: '#94A3B8', display: 'flex', alignItems: 'center', minWidth: 20 }}>{icon}</Box>
      <Typography sx={{ fontSize: 13, color: '#64748B', minWidth: 140 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(Number(id)).then((r) => r.data),
    enabled: !!id,
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
    enabled: !!id,
    select: (data: unknown[]) =>
      (data as import('../../types').Contract[]).filter((c) => c.employee_id === Number(id)),
  });

  const { data: leaves } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
    enabled: !!id,
    select: (data: unknown[]) =>
      (data as import('../../types').Leave[]).filter((l) => l.employee_id === Number(id)),
  });

  const initials = emp
    ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
    : '??';

  return (
    <Box>
      {/* Back + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/employees')}
          variant="outlined"
          size="small"
          sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: '8px' }}
        >
          Retour
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          startIcon={<Edit />}
          variant="contained"
          size="small"
          onClick={() => navigate(`/employees/${id}/edit`)}
          sx={{ borderRadius: '8px' }}
        >
          Modifier
        </Button>
      </Box>

      {/* Header card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="circular" width={72} height={72} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width={200} height={28} />
                <Skeleton width={140} height={20} />
              </Box>
            </Box>
          ) : emp ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
              <Avatar sx={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                fontSize: 24, fontWeight: 800,
              }}>
                {initials}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
                  {emp.first_name} {emp.last_name}
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#64748B' }}>
                  {emp.position?.title ?? '—'} · {emp.department?.name ?? '—'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <StatusChip status={emp.status} />
                  <Chip
                    icon={<Badge sx={{ fontSize: 12 }} />}
                    label={emp.employee_number}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  />
                  <Chip
                    label={`${emp.annual_leave_days}j congés/an`}
                    size="small"
                    sx={{ fontSize: 11, bgcolor: '#EFF6FF', color: '#2563EB' }}
                  />
                </Box>
              </Box>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: '1px solid #E2E8F0' }}
      >
        <Tab label="Informations" />
        <Tab label="Contrats" />
        <Tab label="Congés" />
      </Tabs>

      {/* Tab: Informations */}
      {tab === 0 && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 1.5 }}>
                  Informations personnelles
                </Typography>
                {isLoading ? <Skeleton height={200} /> : emp ? (
                  <Box>
                    <InfoRow icon={<Email sx={{ fontSize: 16 }} />} label="Email professionnel" value={emp.professional_email} />
                    <InfoRow icon={<Email sx={{ fontSize: 16 }} />} label="Email personnel" value={emp.personal_email} />
                    <InfoRow icon={<Phone sx={{ fontSize: 16 }} />} label="Téléphone" value={emp.phone} />
                    <InfoRow icon={<LocationOn sx={{ fontSize: 16 }} />} label="Ville" value={`${emp.city ?? '—'}${emp.country ? `, ${emp.country}` : ''}`} />
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0F172A', mb: 1.5 }}>
                  Informations professionnelles
                </Typography>
                {isLoading ? <Skeleton height={200} /> : emp ? (
                  <Box>
                    <InfoRow icon={<Work sx={{ fontSize: 16 }} />} label="Direction" value={emp.department?.name} />
                    <InfoRow icon={<Work sx={{ fontSize: 16 }} />} label="Poste" value={emp.position?.title} />
                    <InfoRow icon={<CalendarMonth sx={{ fontSize: 16 }} />} label="Date d'entrée" value={formatDate(emp.hire_date)} />
                    <InfoRow icon={<AttachMoney sx={{ fontSize: 16 }} />} label="Salaire de base" value={formatSalary(emp.base_salary)} />
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Contrats */}
      {tab === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            {!contracts || contracts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>Aucun contrat trouvé</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {contracts.map((c) => (
                  <Box key={c.id} sx={{
                    p: 2, borderRadius: '10px', border: '1px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                  }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <StatusChip status={c.type} />
                        <StatusChip status={c.is_active ? 'active' : 'inactive'} />
                      </Box>
                      <Typography sx={{ fontSize: 13, color: '#64748B' }}>
                        Du {formatDate(c.start_date)} {c.end_date ? `au ${formatDate(c.end_date)}` : '(indéterminée)'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                        {formatSalary(c.salary)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
                        {c.working_hours_per_week}h / semaine
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Congés */}
      {tab === 2 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            {!leaves || leaves.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>Aucun congé trouvé</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {leaves.map((leave) => (
                  <Box key={leave.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 2, borderRadius: '10px', border: '1px solid #E2E8F0',
                    flexWrap: 'wrap',
                  }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                        {leave.leaveType?.name ?? 'Congé'}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)} · {leave.days_count}j
                      </Typography>
                    </Box>
                    <StatusChip status={leave.status} />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
