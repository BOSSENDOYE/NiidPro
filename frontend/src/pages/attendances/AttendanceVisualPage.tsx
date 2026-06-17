import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, IconButton, Tooltip,
  Skeleton, Avatar, Stack,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { employeesApi } from '../../api/employees';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/format';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  present:  { bg: '#ECFDF5', color: '#059669', label: 'P' },
  late:     { bg: '#FFFBEB', color: '#D97706', label: 'R' },
  absent:   { bg: '#FEF2F2', color: '#DC2626', label: 'A' },
  on_leave: { bg: '#EFF6FF', color: '#2563EB', label: 'C' },
  holiday:  { bg: '#F5F3FF', color: '#7C3AED', label: 'F' },
  remote:   { bg: '#F0F9FF', color: '#0284C7', label: 'T' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

export default function AttendanceVisualPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.list({ per_page: 100 }).then((r) => r.data),
  });

  const employees = empData?.data ?? [];
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthLabel = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const CELL_W = 32;
  const COL_W = 180;

  return (
    <Box>
      <PageHeader
        title="Pointage visuel"
        subtitle="Vue calendrier par employé"
      />

      {/* Legend */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([key, c]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{
              width: 20, height: 20, borderRadius: '5px',
              bgcolor: c.bg, border: `1px solid ${c.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.color }}>{c.label}</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              {{ present: 'Présent', late: 'Retard', absent: 'Absent', on_leave: 'Congé', holiday: 'Férié', remote: 'Télétravail' }[key]}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Card>
        {/* Month navigator */}
        <Box sx={{
          display: 'flex', alignItems: 'center', px: 3, py: 2,
          borderBottom: '1px solid #E2E8F0',
        }}>
          <IconButton size="small" onClick={prevMonth} sx={{ color: '#64748B' }}>
            <ChevronLeft />
          </IconButton>
          <Typography sx={{ mx: 2, fontWeight: 700, fontSize: 15, color: '#0F172A', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>
            {monthLabel}
          </Typography>
          <IconButton size="small" onClick={nextMonth} sx={{ color: '#64748B' }}>
            <ChevronRight />
          </IconButton>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: COL_W + CELL_W * daysInMonth + 40 }}>
            {/* Day headers */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
              <Box sx={{ width: COL_W, flexShrink: 0, px: 2, py: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Employé
                </Typography>
              </Box>
              {days.map((d) => {
                const weekend = isWeekend(year, month, d);
                const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
                return (
                  <Box
                    key={d}
                    sx={{
                      width: CELL_W, flexShrink: 0, textAlign: 'center', py: 1,
                      bgcolor: isToday ? '#EFF6FF' : weekend ? '#FAFAFA' : 'transparent',
                    }}
                  >
                    <Typography sx={{
                      fontSize: 10, fontWeight: isToday ? 800 : 600,
                      color: isToday ? '#2563EB' : weekend ? '#CBD5E1' : '#64748B',
                    }}>
                      {d}
                    </Typography>
                    <Typography sx={{
                      fontSize: 9, color: isToday ? '#2563EB' : weekend ? '#CBD5E1' : '#94A3B8',
                    }}>
                      {new Date(year, month, d).toLocaleDateString('fr-FR', { weekday: 'narrow' })}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Employee rows */}
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', borderBottom: '1px solid #F1F5F9', alignItems: 'center', py: 1 }}>
                    <Box sx={{ width: COL_W, px: 2 }}>
                      <Skeleton width={120} height={20} />
                    </Box>
                    {days.map((d) => (
                      <Box key={d} sx={{ width: CELL_W, px: 0.25 }}>
                        <Skeleton variant="rectangular" height={22} sx={{ borderRadius: '5px' }} />
                      </Box>
                    ))}
                  </Box>
                ))
              : employees.map((emp) => (
                  <Box
                    key={emp.id}
                    sx={{
                      display: 'flex', alignItems: 'center',
                      borderBottom: '1px solid #F1F5F9',
                      '&:hover': { bgcolor: '#FAFAFA' },
                    }}
                  >
                    <Box sx={{ width: COL_W, flexShrink: 0, px: 2, py: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{
                          width: 26, height: 26,
                          background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>
                          {emp.first_name[0]}{emp.last_name[0]}
                        </Avatar>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#334155' }} noWrap>
                          {emp.first_name} {emp.last_name}
                        </Typography>
                      </Stack>
                    </Box>
                    {days.map((d) => {
                      const weekend = isWeekend(year, month, d);
                      // No real data per cell — show weekend grey, workdays neutral
                      if (weekend) {
                        return (
                          <Box key={d} sx={{ width: CELL_W, flexShrink: 0, px: 0.25, py: 1 }}>
                            <Box sx={{ height: 22, borderRadius: '5px', bgcolor: '#F8FAFC' }} />
                          </Box>
                        );
                      }
                      // Future days — empty
                      const cellDate = new Date(year, month, d);
                      if (cellDate > now) {
                        return (
                          <Box key={d} sx={{ width: CELL_W, flexShrink: 0, px: 0.25, py: 1 }}>
                            <Box sx={{ height: 22, borderRadius: '5px', bgcolor: '#F8FAFC', border: '1px dashed #E2E8F0' }} />
                          </Box>
                        );
                      }
                      // Past / today — cellule vide (les données réelles viendraient de l'API)
                      return (
                        <Tooltip
                          key={d}
                          title={`${emp.first_name} ${emp.last_name} — ${formatDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}`}
                          placement="top"
                        >
                          <Box sx={{ width: CELL_W, flexShrink: 0, px: 0.25, py: 1, cursor: 'pointer' }}>
                            <Box sx={{
                              height: 22, borderRadius: '5px',
                              bgcolor: '#F1F5F9', border: '1px solid #E2E8F0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#CBD5E1' }}>
                                —
                              </Typography>
                            </Box>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                ))}
          </Box>
        </Box>
      </Card>

      <Typography sx={{ fontSize: 12, color: '#94A3B8', mt: 2, textAlign: 'center' }}>
        * Les données de pointage réel sont chargées depuis le registre de présences
      </Typography>
    </Box>
  );
}
