import client from './client';
import type { DocumentTemplate, GeneratedDocument, PaginatedResponse } from '../types';

export interface DocumentTypeConfig {
  id: number;
  key: string;
  label: string;
  cat: string;
  color: string;
  bg: string;
  border: string;
  prefix: string;
  created_at: string;
}

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

  getTemplate: (id: number) =>
    client.get<DocumentTemplate>(`/documents/templates/${id}`),

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

  listTypeConfigs: () =>
    client.get<DocumentTypeConfig[]>('/documents/type-configs'),

  createTypeConfig: (data: Omit<DocumentTypeConfig, 'id' | 'created_at'>) =>
    client.post<DocumentTypeConfig>('/documents/type-configs', data),

  deleteTypeConfig: (id: number) =>
    client.delete(`/documents/type-configs/${id}`),
};
