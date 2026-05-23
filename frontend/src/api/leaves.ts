import client from './client';
import type { Leave, LeaveType } from '../types';

export const leavesApi = {
  list: (params?: Record<string, unknown>) => client.get<Leave[]>('/leaves', { params }),
  pending: () => client.get<Leave[]>('/leaves/pending'),
  types: () => client.get<LeaveType[]>('/leaves/types'),
  get: (id: number) => client.get<Leave>(`/leaves/${id}`),
  create: (data: Partial<Leave>) => client.post<Leave>('/leaves', data),
  update: (id: number, data: Partial<Leave>) => client.put<Leave>(`/leaves/${id}`, data),
  delete: (id: number) => client.delete(`/leaves/${id}`),
  approve: (id: number, comment?: string) => client.post(`/leaves/${id}/approve`, { comment }),
  reject: (id: number, comment?: string) => client.post(`/leaves/${id}/reject`, { comment }),
};
