import { Chip } from '@mui/material';
import { statusColor } from '../../utils/format';

const labels: Record<string, string> = {
  active: 'Actif', inactive: 'Inactif', suspended: 'Suspendu',
  present: 'Présent', absent: 'Absent', late: 'En retard', on_leave: 'En congé',
  holiday: 'Férié', remote: 'Télétravail',
  pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé', cancelled: 'Annulé',
  CDI: 'CDI', CDD: 'CDD',
};

interface Props {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: Props) {
  return (
    <Chip
      label={labels[status] ?? status}
      color={statusColor(status)}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
}
