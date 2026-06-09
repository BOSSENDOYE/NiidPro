import {
  Box, Card, CardContent, Typography, Grid, Chip, Stack,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';

interface Column { name: string; type: string; note?: string }
interface Table { name: string; color: string; columns: Column[] }

const SCHEMA: Table[] = [
  {
    name: 'users',
    color: '#2563EB',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'name', type: 'string' },
      { name: 'email', type: 'string UNIQUE' },
      { name: 'password', type: 'string' },
      { name: 'is_active', type: 'boolean' },
      { name: 'created_at', type: 'timestamp' },
    ],
  },
  {
    name: 'departments',
    color: '#7C3AED',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'name', type: 'string' },
      { name: 'code', type: 'string UNIQUE' },
      { name: 'color', type: 'string nullable' },
      { name: 'parent_id', type: 'FK departments' },
      { name: 'manager_id', type: 'FK employees' },
      { name: 'is_active', type: 'boolean' },
    ],
  },
  {
    name: 'positions',
    color: '#059669',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'title', type: 'string' },
      { name: 'code', type: 'string UNIQUE' },
      { name: 'department_id', type: 'FK departments' },
      { name: 'base_salary_min', type: 'decimal nullable' },
      { name: 'base_salary_max', type: 'decimal nullable' },
    ],
  },
  {
    name: 'employees',
    color: '#D97706',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'employee_number', type: 'string UNIQUE' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'professional_email', type: 'string UNIQUE' },
      { name: 'department_id', type: 'FK departments' },
      { name: 'position_id', type: 'FK positions' },
      { name: 'hire_date', type: 'date' },
      { name: 'base_salary', type: 'decimal' },
      { name: 'status', type: 'enum(active,inactive,suspended)' },
      { name: 'user_id', type: 'FK users nullable' },
    ],
  },
  {
    name: 'contracts',
    color: '#DC2626',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'employee_id', type: 'FK employees' },
      { name: 'type', type: 'enum(CDI,CDD,...)' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date nullable' },
      { name: 'salary', type: 'decimal' },
      { name: 'working_hours_per_week', type: 'tinyint' },
      { name: 'is_active', type: 'boolean' },
    ],
  },
  {
    name: 'attendances',
    color: '#0284C7',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'employee_id', type: 'FK employees' },
      { name: 'date', type: 'date' },
      { name: 'check_in', type: 'datetime nullable' },
      { name: 'check_out', type: 'datetime nullable' },
      { name: 'status', type: 'enum(present,absent,late,...)' },
      { name: 'worked_minutes', type: 'int nullable' },
      { name: 'source', type: 'enum(web,mobile,badge,manual)' },
    ],
  },
  {
    name: 'leave_types',
    color: '#7C3AED',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'name', type: 'string' },
      { name: 'code', type: 'string UNIQUE' },
      { name: 'color', type: 'string' },
      { name: 'paid', type: 'boolean' },
      { name: 'max_days_per_year', type: 'int nullable' },
    ],
  },
  {
    name: 'leaves',
    color: '#059669',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'employee_id', type: 'FK employees' },
      { name: 'leave_type_id', type: 'FK leave_types' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' },
      { name: 'days_count', type: 'tinyint' },
      { name: 'status', type: 'enum(pending,approved,rejected,cancelled)' },
      { name: 'reason', type: 'text nullable' },
      { name: 'approved_by', type: 'FK users nullable' },
    ],
  },
  {
    name: 'justifications',
    color: '#D97706',
    columns: [
      { name: 'id', type: 'bigint PK' },
      { name: 'employee_id', type: 'FK employees' },
      { name: 'attendance_id', type: 'FK attendances nullable' },
      { name: 'date', type: 'date' },
      { name: 'reason', type: 'text' },
      { name: 'file_path', type: 'string nullable' },
      { name: 'status', type: 'enum(pending,approved,rejected)' },
      { name: 'reviewed_by', type: 'FK users nullable' },
    ],
  },
];

export default function SchemaPage() {
  return (
    <Box>
      <PageHeader
        title="Schéma SQL"
        subtitle={`${SCHEMA.length} tables · Base de données RH+PAIE`}
      />

      <Grid container spacing={2.5}>
        {SCHEMA.map((table) => (
          <Grid item xs={12} sm={6} lg={4} key={table.name}>
            <Card sx={{ borderTop: `4px solid ${table.color}` }}>
              <CardContent sx={{ p: 0 }}>
                {/* Table header */}
                <Box sx={{
                  px: 2.5, py: 1.75,
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex', alignItems: 'center', gap: 1.5,
                }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: table.color, flexShrink: 0,
                  }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: '#0F172A' }}>
                    {table.name}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip
                      label={`${table.columns.length} cols`}
                      size="small"
                      sx={{ fontSize: 10, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    />
                  </Box>
                </Box>

                {/* Columns */}
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Stack spacing={0.75}>
                    {table.columns.map((col) => {
                      const isPk = col.type.includes('PK');
                      const isFk = col.type.includes('FK');
                      const isUnique = col.type.includes('UNIQUE');
                      return (
                        <Box
                          key={col.name}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            py: 0.5, px: 1, borderRadius: '6px',
                            bgcolor: isPk ? '#FFF7ED' : 'transparent',
                          }}
                        >
                          <Typography sx={{
                            fontSize: 12, fontFamily: 'monospace',
                            color: isPk ? '#D97706' : isFk ? '#2563EB' : '#334155',
                            fontWeight: isPk || isFk ? 600 : 400,
                            minWidth: 100,
                          }}>
                            {col.name}
                          </Typography>
                          <Typography sx={{
                            fontSize: 11, fontFamily: 'monospace',
                            color: '#94A3B8', flexGrow: 1,
                          }} noWrap>
                            {col.type.replace(' PK', '').replace(' UNIQUE', '')}
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            {isPk && (
                              <Box sx={{ px: 0.75, py: 0.1, borderRadius: '4px', bgcolor: '#FEF3C7' }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#D97706' }}>PK</Typography>
                              </Box>
                            )}
                            {isFk && (
                              <Box sx={{ px: 0.75, py: 0.1, borderRadius: '4px', bgcolor: '#EFF6FF' }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#2563EB' }}>FK</Typography>
                              </Box>
                            )}
                            {isUnique && (
                              <Box sx={{ px: 0.75, py: 0.1, borderRadius: '4px', bgcolor: '#F5F3FF' }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#7C3AED' }}>UQ</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
