import client from './client';
import type { Attendance } from '../types';

export interface TodayResponse {
  date:     string;
  total:    number;
  present:  number;
  absent:   number;
  late:     number;
  on_leave: number;
  records:  Attendance[];
}

export const attendancesApi = {
  list:    (params?: Record<string, unknown>) => client.get<{ data: Attendance[]; total: number; last_page: number }>('/attendances', { params }),
  today:   ()                                  => client.get<TodayResponse>('/attendances/today'),
  /** Badgeage via QR : employee_number = contenu du QR de la carte */
  badge:   (employee_number: string, action: 'in' | 'out', notes?: string) =>
    client.post<Attendance>('/attendances/badge', { employee_number, action, notes }),
  checkIn: (employee_id: number) => client.post('/attendances/check-in', { employee_id }),
  checkOut:(employee_id: number) => client.post('/attendances/check-out', { employee_id }),
  store:   (data: Record<string, unknown>) => client.post<Attendance>('/attendances', data),
};
