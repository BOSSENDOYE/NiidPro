import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Button, Avatar, Stack, MenuItem,
  TextField, Grid, CardContent, IconButton, Tooltip,
} from '@mui/material';
import { Download, PlayArrow, CheckCircle } from '@mui/icons-material';
import { payrollApi, type Payslip } from '../../api/payroll';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatSalary } from '../../utils/format';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const payslipStatusMap: Record<Payslip['status'], string> = {
  draft: 'pending',
  validated: 'approved',
  paid: 'active',
};

export default function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => payrollApi.list({ month, year }).then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => payrollApi.generate(month, year),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const validateMutation = useMutation({
    mutationFn: (id: number) => payrollApi.validate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => payrollApi.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const totalGross = payslips?.reduce((s, p) => s + p.gross_salary, 0) ?? 0;
  const totalNet = payslips?.reduce((s, p) => s + p.net_salary, 0) ?? 0;
  const totalCharges = payslips?.reduce((s, p) => s + p.employer_charges, 0) ?? 0;

  return (
    <Box>
      <PageHeader
        title="Paie & Bulletins"
        subtitle="Gestion de la paie mensuelle"
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                select
                label="Mois"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                fullWidth size="small"
              >
                {MONTHS.map((m, i) => (
                  <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <TextField
                type="number"
                label="Année"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                fullWidth size="small"
                inputProps={{ min: 2020, max: 2030 }}
              />
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                sx={{ borderRadius: '8px' }}
              >
                Générer la paie
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Bulletins générés', value: payslips?.length ?? 0, color: '#2563EB', bg: '#EFF6FF', suffix: '' },
          { label: 'Masse salariale brute', value: totalGross, color: '#059669', bg: '#ECFDF5', format: true },
          { label: 'Masse salariale nette', value: totalNet, color: '#7C3AED', bg: '#F5F3FF', format: true },
          { label: 'Charges patronales', value: totalCharges, color: '#D97706', bg: '#FFFBEB', format: true },
        ].map((s) => (
          <Grid item xs={12} sm={6} lg={3} key={s.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: '#64748B', mb: 0.75 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>
                  {s.format ? formatSalary(s.value as number) : s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Payslips table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Salaire brut</TableCell>
                <TableCell>Charges emp.</TableCell>
                <TableCell>Charges pat.</TableCell>
                <TableCell>Salaire net</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : !payslips || payslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                        <Typography sx={{ color: '#94A3B8', fontSize: 14, mb: 1 }}>
                          Aucun bulletin pour cette période
                        </Typography>
                        <Typography sx={{ color: '#CBD5E1', fontSize: 12 }}>
                          Cliquez sur "Générer la paie" pour créer les bulletins
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                : payslips.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{
                            width: 32, height: 32,
                            background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {p.employee?.first_name?.[0]}{p.employee?.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                              {p.employee?.first_name} {p.employee?.last_name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                              {p.employee?.department?.name}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatSalary(p.gross_salary)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: '#DC2626' }}>-{formatSalary(p.employee_charges)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, color: '#D97706' }}>{formatSalary(p.employer_charges)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{formatSalary(p.net_salary)}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={payslipStatusMap[p.status]} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {p.status === 'draft' && (
                            <Tooltip title="Valider">
                              <IconButton size="small" onClick={() => validateMutation.mutate(p.id)} sx={{ color: '#059669' }}>
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Télécharger">
                            <IconButton size="small" sx={{ color: '#64748B' }}>
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
