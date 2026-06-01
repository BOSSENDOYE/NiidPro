import client from './client';
import type { Evaluation } from '../types';

export const evaluationsApi = {
  list:     (params?: Record<string, unknown>) => client.get<Evaluation[]>('/evaluations', { params }),
  get:      (id: number)                        => client.get<Evaluation>(`/evaluations/${id}`),
  create:   (data: Partial<Evaluation>)         => client.post<Evaluation>('/evaluations', data),
  update:   (id: number, data: Partial<Evaluation>) => client.put<Evaluation>(`/evaluations/${id}`, data),
  validate: (id: number)                        => client.patch<Evaluation>(`/evaluations/${id}/validate`),
  delete:   (id: number)                        => client.delete(`/evaluations/${id}`),
};
