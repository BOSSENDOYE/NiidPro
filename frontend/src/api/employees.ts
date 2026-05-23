import client from './client';
import type { Employee, PaginatedResponse } from '../types';

export const employeesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Employee>>('/employees', { params }),

  get: (id: number) => client.get<Employee>(`/employees/${id}`),

  create: (data: Partial<Employee>) => client.post<Employee>('/employees', data),

  update: (id: number, data: Partial<Employee>) => client.put<Employee>(`/employees/${id}`, data),

  delete: (id: number) => client.delete(`/employees/${id}`),
};
