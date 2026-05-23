import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Skeleton, Avatar, Stack, Chip,
} from '@mui/material';
import { attendancesApi } from '../../api/attendances';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatDate } from '../../utils/format';

function minutesToHM(minutes: number | null | undefined) {
  if (minutes == null) return '—';
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

export default function AttendancesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendances', 'today'],
    queryFn: () => attendancesApi.today().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const counts = data
    ? {
        present: data.filter((a) => a.status === 'present').length,
        late: data.filter((a) => a.status === 'late').length,
        absent: data.filter((a) => a.status === 'absent').length,
        on_leave: data.filter((a) => a.status === 'on_leave').length,
      }
    : null;

  return (
    <Box>
      <PageHeader title="Pointage" subtitle={`Journée du ${formatDate(new Date().toISOString())}`} />

      {/* Summary chips */}
      {counts && (
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <Chip label={`Présents: ${counts.present}`} color="success" />
          <Chip label={`En retard: ${counts.late}`} color="warning" />
          <Chip label={`Absents: ${counts.absent}`} color="error" />
          <Chip label={`En congé: ${counts.on_leave}`} color="info" />
        </Stack>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Arrivée</TableCell>
                <TableCell>Départ</TableCell>
                <TableCell>Durée</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Source</TableCell>
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
                : data?.map((att) => (
                    <TableRow key={att.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366F1', fontSize: 12 }}>
                            {att.employee?.first_name?.[0]}{att.employee?.last_name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {att.employee?.first_name} {att.employee?.last_name}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(att.date)}</TableCell>
                      <TableCell>
                        {att.check_in
                          ? new Date(att.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {att.check_out
                          ? new Date(att.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </TableCell>
                      <TableCell>{minutesToHM(att.worked_minutes)}</TableCell>
                      <TableCell><StatusChip status={att.status} /></TableCell>
                      <TableCell>
                        <Chip label={att.source} size="small" variant="outlined" />
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
