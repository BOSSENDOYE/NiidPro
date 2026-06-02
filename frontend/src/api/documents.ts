import client from './client';
import type { DocumentTemplate, GeneratedDocument, PaginatedResponse } from '../types';

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export const documentsApi = {
  listTemplates: (params?: Record<string, unknown>) =>
    client.get('/documents/templates', { params }).then((r) => ({
      ...r,
      data: normalizeArray<DocumentTemplate>(r.data),
    })),

  createTemplate: (data: Partial<DocumentTemplate>) =>
    client.post<DocumentTemplate>('/documents/templates', data),

  updateTemplate: (id: number, data: Partial<DocumentTemplate>) =>
    client.put<DocumentTemplate>(`/documents/templates/${id}`, data),

  deleteTemplate: (id: number) =>
    client.delete(`/documents/templates/${id}`),

  generate: (templateId: number, employeeIds: number[], customVariables?: Record<string, string>) =>
    client.post<{ documents: GeneratedDocument[]; count: number }>('/documents/generate', {
      template_id:       templateId,
      employee_ids:      employeeIds,
      custom_variables:  customVariables,
    }),

  listGenerated: (params?: Record<string, unknown>) =>
    client.get('/documents/generated', { params }).then((r) => ({
      ...r,
      data: r.data as PaginatedResponse<GeneratedDocument>,
    })),

  getGenerated: (id: number) =>
    client.get<GeneratedDocument>(`/documents/generated/${id}`),

  deleteGenerated: (id: number) =>
    client.delete(`/documents/generated/${id}`),
};
