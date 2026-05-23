import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Alert, Chip, Stack,
} from '@mui/material';
import { contractsApi } from '../../api/contracts';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatDate, formatSalary, contractTypeLabel } from '../../utils/format';
import { Add } from '@mui/icons-material';

export default function ContractsPage() {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  const { data: expiring } = useQuery({
    queryKey: ['contracts', 'expiring'],
    queryFn: () => contractsApi.expiringSoon().then((r) => {
      const d = r.data as unknown;
      return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? []);
    }),
  });

  return (
    <Box>
      <PageHeader
        title="Contrats"
        subtitle={`${contracts?.length ?? '...'} contrats actifs`}
        action={{ label: 'Nouveau contrat', icon: <Add />, onClick: () => {} }}
      />

      {expiring && expiring.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{expiring.length} contrat(s)</strong> expirent dans les 30 prochains jours.
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Début</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Salaire</TableCell>
                <TableCell>Heures/sem.</TableCell>
                <TableCell>Statut</TableCell>
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
                : contracts?.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.employee?.first_name} {c.employee?.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.employee?.employee_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Chip label={contractTypeLabel(c.type)} size="small" color="primary" />
                          {expiring?.find((e) => e.id === c.id) && (
                            <Chip label="Expire bientôt" size="small" color="warning" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(c.start_date)}</TableCell>
                      <TableCell>{c.end_date ? formatDate(c.end_date) : <em>Indéterminée</em>}</TableCell>
                      <TableCell>{formatSalary(c.salary)}</TableCell>
                      <TableCell>{c.working_hours_per_week}h</TableCell>
                      <TableCell>
                        <StatusChip status={c.is_active ? 'active' : 'inactive'} />
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
