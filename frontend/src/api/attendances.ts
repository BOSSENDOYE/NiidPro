import client from './client';
import type { Attendance } from '../types';

export const attendancesApi = {
  list: (params?: Record<string, unknown>) => client.get<Attendance[]>('/attendances', { params }),
  today: () => client.get<Attendance[]>('/attendances/today'),
  checkIn: (data?: { notes?: string }) => client.post('/attendances/check-in', data),
  checkOut: (data?: { notes?: string }) => client.post('/attendances/check-out', data),
};
