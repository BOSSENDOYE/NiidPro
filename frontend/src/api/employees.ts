import client from './client';
import type { Employee, PaginatedResponse } from '../types';

export const employeesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Employee>>('/employees', { params }),

  get: (id: number) => client.get<Employee>(`/employees/${id}`),

  create: (data: Partial<Employee>) => client.post<Employee>('/employees', data),

  update: (id: number, data: Partial<Employee>) => client.put<Employee>(`/employees/${id}`, data),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return client.post<Employee>(`/employees/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) => client.delete(`/employees/${id}`),
};
