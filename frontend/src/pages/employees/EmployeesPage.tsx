import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Typography, IconButton, Tooltip, TextField,
  InputAdornment, Skeleton, TablePagination, Stack,
} from '@mui/material';
import { Add, Search, Visibility, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api/employees';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { formatDate, formatSalary } from '../../utils/format';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () =>
      employeesApi.list({ page: page + 1, per_page: rowsPerPage, search }).then((r) => r.data),
  });

  return (
    <Box>
      <PageHeader
        title="Employés"
        subtitle={`${data?.total ?? '...'} employés au total`}
        action={{ label: 'Nouvel employé', icon: <Add />, onClick: () => navigate('/employees/new') }}
      />

      <Card>
        {/* Search bar */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Rechercher par nom, email, matricule..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
            sx={{ width: 320 }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Poste</TableCell>
                <TableCell>Date d'entrée</TableCell>
                <TableCell>Salaire</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.data.map((emp) => (
                    <TableRow key={emp.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', fontSize: 13, fontWeight: 700 }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {emp.first_name} {emp.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emp.professional_email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {emp.employee_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{emp.department?.name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{emp.position?.title ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(emp.hire_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatSalary(emp.base_salary)}</Typography>
                      </TableCell>
                      <TableCell><StatusChip status={emp.status} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Voir">
                          <IconButton size="small" onClick={() => navigate(`/employees/${emp.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => navigate(`/employees/${emp.id}/edit`)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Card>
    </Box>
  );
}
