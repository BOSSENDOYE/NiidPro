import client from './client';
import type { Attendance } from '../types';

export const attendancesApi = {
  list:    (params?: Record<string, unknown>) => client.get<Attendance[]>('/attendances', { params }),
  today:   ()                                  => client.get<Attendance[]>('/attendances/today'),
  checkIn: (data?: { notes?: string })         => client.post('/attendances/check-in', data),
  checkOut:(data?: { notes?: string })         => client.post('/attendances/check-out', data),
  /** Badgeage manuel par un admin pour un agent donné */
  badge:   (employee_number: string, action: 'in' | 'out', notes?: string) =>
    client.post<Attendance>('/attendances/badge', { employee_number, action, notes }),
};
