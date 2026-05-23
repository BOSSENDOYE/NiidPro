import { Box, Typography } from '@mui/material';

const config: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Actif',       color: '#059669', bg: '#ECFDF5' },
  inactive:  { label: 'Inactif',     color: '#64748B', bg: '#F1F5F9' },
  suspended: { label: 'Suspendu',    color: '#DC2626', bg: '#FEF2F2' },
  present:   { label: 'Présent',     color: '#059669', bg: '#ECFDF5' },
  absent:    { label: 'Absent',      color: '#DC2626', bg: '#FEF2F2' },
  late:      { label: 'En retard',   color: '#D97706', bg: '#FFFBEB' },
  on_leave:  { label: 'En congé',    color: '#2563EB', bg: '#EFF6FF' },
  holiday:   { label: 'Férié',       color: '#7C3AED', bg: '#F5F3FF' },
  remote:    { label: 'Télétravail', color: '#0284C7', bg: '#F0F9FF' },
  pending:   { label: 'En attente',  color: '#D97706', bg: '#FFFBEB' },
  approved:  { label: 'Approuvé',    color: '#059669', bg: '#ECFDF5' },
  rejected:  { label: 'Refusé',      color: '#DC2626', bg: '#FEF2F2' },
  cancelled: { label: 'Annulé',      color: '#64748B', bg: '#F1F5F9' },
  CDI:       { label: 'CDI',         color: '#2563EB', bg: '#EFF6FF' },
  CDD:       { label: 'CDD',         color: '#7C3AED', bg: '#F5F3FF' },
};

interface Props {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: Props) {
  const c = config[status] ?? { label: status, color: '#64748B', bg: '#F1F5F9' };
  const py = size === 'small' ? '2px' : '4px';
  const px = size === 'small' ? '8px' : '12px';
  const fs = size === 'small' ? 11 : 13;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        px, py, borderRadius: '6px',
        bgcolor: c.bg,
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
      <Typography
        component="span"
        sx={{ fontSize: fs, fontWeight: 600, color: c.color, lineHeight: 1 }}
      >
        {c.label}
      </Typography>
    </Box>
  );
}
