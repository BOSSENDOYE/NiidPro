import client from './client';
import type { Employee, PaginatedResponse } from '../types';

export const employeesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Employee>>('/employees', { params }),

  get: (id: number) => client.get<Employee>(`/employees/${id}`),

  create: (data: Partial<Employee> | Record<string, unknown>) => client.post<Employee>('/employees', data),

  update: (id: number, data: Partial<Employee> | Record<string, unknown>) => client.put<Employee>(`/employees/${id}`, data),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return client.post<Employee>(`/employees/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) => client.delete(`/employees/${id}`),

  counts: () =>
    client.get<{ total: number; active: number; inactive: number; suspended: number }>('/employees/counts'),

  export: (params?: Record<string, string>) =>
    client.get('/employees/export', { params, responseType: 'blob' }),

  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<{ created: number; skipped: string[]; message: string }>(
      '/employees/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};
