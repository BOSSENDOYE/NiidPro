import client from './client';
import type { Leave, LeaveType } from '../types';

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export const leavesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/leaves', { params }).then((r) => ({
      ...r,
      data: normalizeArray<Leave>(r.data),
    })),

  pending: () =>
    client.get('/leaves/pending').then((r) => ({
      ...r,
      data: normalizeArray<Leave>(r.data),
    })),

  types: () =>
    client.get<LeaveType[]>('/leaves/types').then((r) => ({
      ...r,
      data: normalizeArray<LeaveType>(r.data),
    })),

  get: (id: number) => client.get<Leave>(`/leaves/${id}`),

  create: (data: Partial<Leave>) => client.post<Leave>('/leaves', data),

  update: (id: number, data: Partial<Leave>) => client.put<Leave>(`/leaves/${id}`, data),

  delete: (id: number) => client.delete(`/leaves/${id}`),

  approve: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/approve`, { comment }),

  reject: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/reject`, { comment }),
};
