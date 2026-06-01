import client from './client';
import type { Availability } from '../types';

export const availabilitiesApi = {
  list:    (params?: Record<string, unknown>) => client.get<Availability[]>('/availabilities', { params }),
  get:     (id: number)                        => client.get<Availability>(`/availabilities/${id}`),
  create:  (data: Partial<Availability>)        => client.post<Availability>('/availabilities', data),
  update:  (id: number, data: Partial<Availability>) => client.put<Availability>(`/availabilities/${id}`, data),
  approve: (id: number)                         => client.patch<Availability>(`/availabilities/${id}/approve`),
  delete:  (id: number)                         => client.delete(`/availabilities/${id}`),
};
