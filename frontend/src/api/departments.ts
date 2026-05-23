import client from './client';
import type { Department } from '../types';

export const departmentsApi = {
  list: () => client.get<Department[]>('/departments'),
  get: (id: number) => client.get<Department>(`/departments/${id}`),
  create: (data: Partial<Department>) => client.post<Department>('/departments', data),
  update: (id: number, data: Partial<Department>) => client.put<Department>(`/departments/${id}`, data),
  delete: (id: number) => client.delete(`/departments/${id}`),
};
