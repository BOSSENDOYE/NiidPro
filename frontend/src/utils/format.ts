import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

export const formatDate = (date: string | null | undefined, fmt = 'DD/MM/YYYY') =>
  date ? dayjs(date).format(fmt) : '—';

export const formatDateTime = (date: string | null | undefined) =>
  date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '—';

export const formatSalary = (amount: number | null | undefined) =>
  amount != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    : '—';

export const formatMinutes = (minutes: number | null | undefined) => {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
};

export const statusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
  const map: Record<string, 'success' | 'error' | 'warning' | 'default' | 'info'> = {
    active: 'success',
    present: 'success',
    approved: 'success',
    absent: 'error',
    rejected: 'error',
    late: 'warning',
    pending: 'warning',
    on_leave: 'info',
    inactive: 'default',
    cancelled: 'default',
  };
  return map[status] ?? 'default';
};

export const contractTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    CDI: 'CDI', CDD: 'CDD', Interim: 'Intérim', Freelance: 'Freelance',
    Stage: 'Stage', Apprentissage: 'Apprentissage',
  };
  return map[type] ?? type;
};
