import client from './client';
import type { Contract } from '../types';

export const contractsApi = {
  list: (params?: Record<string, unknown>) => client.get<Contract[]>('/contracts', { params }),
  get: (id: number) => client.get<Contract>(`/contracts/${id}`),
  expiringSoon: () => client.get<Contract[]>('/contracts/expiring'),
  create: (data: Partial<Contract>) => client.post<Contract>('/contracts', data),
  update: (id: number, data: Partial<Contract>) => client.put<Contract>(`/contracts/${id}`, data),
  delete: (id: number) => client.delete(`/contracts/${id}`),
};
