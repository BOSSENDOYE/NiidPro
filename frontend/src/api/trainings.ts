import client from './client';
import type {
  Training, TrainingType, TrainingProvider, TrainingBudget,
  TrainingCostCenter, TrainingDocument, TrainingEvaluation,
  TrainingStatistics, TrainingEmployeeHistory,
} from '../types';

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export const trainingsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/trainings', { params }).then((r) => ({ ...r, data: normalizeArray<Training>(r.data) })),

  pending: () =>
    client.get('/trainings/pending').then((r) => ({ ...r, data: normalizeArray<Training>(r.data) })),

  get: (id: number) => client.get<Training>(`/trainings/${id}`),

  create: (data: Partial<Training>) => client.post<Training>('/trainings', data),
  update: (id: number, data: Partial<Training>) => client.put<Training>(`/trainings/${id}`, data),
  delete: (id: number) => client.delete(`/trainings/${id}`),

  // ── Workflow ──
  approve: (id: number, comment?: string) =>
    client.post(`/trainings/${id}/approve`, { comment }),
  reject: (id: number, comment?: string) =>
    client.post(`/trainings/${id}/reject`, { rejection_reason: comment, comment }),
  requestInfo: (id: number, info_request: string) =>
    client.post(`/trainings/${id}/request-info`, { info_request }),
  plan: (id: number, data: { start_date: string; end_date: string; location?: string; provider_id?: number | null; cost_center_id?: number | null }) =>
    client.post(`/trainings/${id}/plan`, data),
  setStatus: (id: number, data: { status: string; report?: string; recommendations?: string; overall_score?: number; actual_cost?: number }) =>
    client.post(`/trainings/${id}/status`, data),

  // ── Participants ──
  addParticipants: (id: number, employeeIds: number[]) =>
    client.post(`/trainings/${id}/participants`, { employee_ids: employeeIds }),
  removeParticipant: (id: number, employeeId: number) =>
    client.delete(`/trainings/${id}/participants/${employeeId}`),

  // ── Présences ──
  recordAttendance: (id: number, employeeId: number, present: boolean, absenceReason?: string) =>
    client.post(`/trainings/${id}/attendance`, { employee_id: employeeId, present, absence_reason: absenceReason }),

  // ── Évaluations ──
  evaluate: (id: number, employeeId: number, score: number, feedback?: string) =>
    client.post<TrainingEvaluation>(`/trainings/${id}/evaluate`, { employee_id: employeeId, score, feedback }),
  evaluations: (id: number) =>
    client.get<TrainingEvaluation[]>(`/trainings/${id}/evaluations`).then((r) => ({ ...r, data: normalizeArray<TrainingEvaluation>(r.data) })),

  // ── Documents & certificats ──
  documents: (id: number) =>
    client.get<TrainingDocument[]>(`/trainings/${id}/documents`).then((r) => ({ ...r, data: normalizeArray<TrainingDocument>(r.data) })),
  uploadDocument: (id: number, formData: FormData) =>
    client.post(`/trainings/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (id: number, documentId: number) =>
    client.delete(`/trainings/${id}/documents/${documentId}`),
  generateCertificates: (id: number, employeeIds?: number[]) =>
    client.post(`/trainings/${id}/certificates`, { employee_ids: employeeIds }),

  // ── Statistiques & historique ──
  statistics: (year?: number) =>
    client.get<TrainingStatistics>('/trainings/statistics', { params: year ? { year } : undefined }),
  employeeHistory: (employeeId: number) =>
    client.get<TrainingEmployeeHistory[]>(`/trainings/employee/${employeeId}/history`).then((r) => ({ ...r, data: normalizeArray<TrainingEmployeeHistory>(r.data) })),

  // ── Paramétrage : types ──
  types: () =>
    client.get<TrainingType[]>('/trainings/types').then((r) => ({ ...r, data: normalizeArray<TrainingType>(r.data) })),
  createType: (data: Partial<TrainingType>) => client.post<TrainingType>('/trainings/types', data),
  updateType: (id: number, data: Partial<TrainingType>) => client.put<TrainingType>(`/trainings/types/${id}`, data),
  deleteType: (id: number) => client.delete(`/trainings/types/${id}`),

  // ── Paramétrage : organismes ──
  providers: () =>
    client.get<TrainingProvider[]>('/trainings/providers').then((r) => ({ ...r, data: normalizeArray<TrainingProvider>(r.data) })),
  createProvider: (data: Partial<TrainingProvider>) => client.post<TrainingProvider>('/trainings/providers', data),
  updateProvider: (id: number, data: Partial<TrainingProvider>) => client.put<TrainingProvider>(`/trainings/providers/${id}`, data),
  deleteProvider: (id: number) => client.delete(`/trainings/providers/${id}`),

  // ── Paramétrage : budgets ──
  budgets: () =>
    client.get<TrainingBudget[]>('/trainings/budgets').then((r) => ({ ...r, data: normalizeArray<TrainingBudget>(r.data) })),
  createBudget: (data: Partial<TrainingBudget>) => client.post<TrainingBudget>('/trainings/budgets', data),
  updateBudget: (id: number, data: Partial<TrainingBudget>) => client.put<TrainingBudget>(`/trainings/budgets/${id}`, data),
  deleteBudget: (id: number) => client.delete(`/trainings/budgets/${id}`),

  // ── Paramétrage : centres de coûts ──
  costCenters: () =>
    client.get<TrainingCostCenter[]>('/trainings/cost-centers').then((r) => ({ ...r, data: normalizeArray<TrainingCostCenter>(r.data) })),
  createCostCenter: (data: Partial<TrainingCostCenter>) => client.post<TrainingCostCenter>('/trainings/cost-centers', data),
  updateCostCenter: (id: number, data: Partial<TrainingCostCenter>) => client.put<TrainingCostCenter>(`/trainings/cost-centers/${id}`, data),
  deleteCostCenter: (id: number) => client.delete(`/trainings/cost-centers/${id}`),
};
