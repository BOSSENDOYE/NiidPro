import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, IconButton, Stack } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { leavesApi } from '../../api/leaves';
import { LeaveCalendar } from './LeaveTab';

const ACCENT = '#22C55E';

const MONTH_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function LeavePlanningTab() {
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.list().then((r) => r.data),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leavesApi.types().then((r) => r.data),
  });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const monthLeaves = leaves.filter((l) => {
    const m = String(calMonth + 1).padStart(2, '0');
    return (
      l.start_date.startsWith(`${calYear}-${m}`) ||
      l.end_date.startsWith(`${calYear}-${m}`) ||
      (l.start_date <= `${calYear}-${m}-01` && l.end_date >= `${calYear}-${m}-28`)
    );
  });

  return (
    <Box>
      {/* ── En-tête navigation mois ── */}
      <Box sx={{
        px: 2, py: 1.25,
        background: 'linear-gradient(135deg, #0F172A 0%, #14532D 60%, #1E293B 100%)',
        position: 'relative', overflow: 'hidden',
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 90% 50%, rgba(34,197,94,0.14) 0%, transparent 55%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={prevMonth}
            sx={{ color: '#94A3B8', borderRadius: '8px', zIndex: 1,
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <ChevronLeft fontSize="small" />
          </IconButton>

          <Box sx={{ textAlign: 'center', minWidth: 160, zIndex: 1 }}>
            <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
              {MONTH_FR[calMonth]} {calYear}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: 11 }}>
              {monthLeaves.length} congé{monthLeaves.length > 1 ? 's' : ''} ce mois
            </Typography>
          </Box>

          <IconButton size="small" onClick={nextMonth}
            sx={{ color: '#94A3B8', borderRadius: '8px', zIndex: 1,
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <ChevronRight fontSize="small" />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          {/* Légende statuts */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ zIndex: 1 }}>
            {[
              { color: '#059669', label: 'Approuvé' },
              { color: '#D97706', label: 'En attente' },
            ].map(({ color, label }) => (
              <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 10, height: 10, borderRadius: '3px',
                  bgcolor: alpha(color, 0.8), border: `1px solid ${alpha(color, 0.5)}` }} />
                <Typography sx={{ color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* ── Calendrier ── */}
      <Box sx={{ bgcolor: '#F1F5F9', pt: 1.5 }}>
        <LeaveCalendar
          leaves={leaves}
          leaveTypes={leaveTypes}
          year={calYear}
          month={calMonth}
          onEditLeave={() => {}}
        />
      </Box>
    </Box>
  );
}
