import client from './client';
import type { Distinction } from '../types';

export const distinctionsApi = {
  list:   (params?: Record<string, unknown>) => client.get<Distinction[]>('/distinctions', { params }),
  get:    (id: number)                        => client.get<Distinction>(`/distinctions/${id}`),
  create: (data: Partial<Distinction>)        => client.post<Distinction>('/distinctions', data),
  update: (id: number, data: Partial<Distinction>) => client.put<Distinction>(`/distinctions/${id}`, data),
  delete: (id: number)                        => client.delete(`/distinctions/${id}`),
};
