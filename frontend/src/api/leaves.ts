import client from './client';
import type { Leave, LeaveType } from '../types';

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export interface LeaveBalance {
  employee_id:           number;
  employee_name:         string;
  base_restant:          number;
  acquis_periode:        number;
  supplement_anciennete: number;
  supplement_enfant:     number;
  supplement_medaille:   number;
  total_brut:            number;
  jours_utilises:        number;
  solde_disponible:      number;
  last_calculation:      string;
  computed_at:           string;
  anciennete_years:      number;
}

export interface PlanningGenResult {
  message:   string;
  generated: number;
  plannings: DetailPlanningConge[];
}

export interface DetailPlanningConge {
  id:                         number;
  employee_id:                number;
  employee?:                  { id: number; first_name: string; last_name: string; employee_number: string; department?: { name: string; code?: string } };
  annee:                      number;
  critere:                    string;
  date_generation:            string;
  date_limite:                string;
  nbre_jour_dispo:            number;
  supplement_enfant:          number;
  supplement_anciennete:      number;
  supplement_medaille:        number;
  nbre_jour_conges:           number;
  nbre_jour_a_imputer:        number;
  nbre_jour_total_disponible: number;
  statut:                     string;
  created_at:                 string;
}

export interface JourFerie {
  id:        number;
  libelle:   string;
  date:      string;
  recurring: boolean;
}

export interface CalculateDaysResult {
  original_start: string;
  adjusted_start: string;
  end_date:       string;
  working_days:   number;
  friday_rule:    boolean;
}

export const leavesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/leaves', { params }).then((r) => ({ ...r, data: normalizeArray<Leave>(r.data) })),

  pending: () =>
    client.get('/leaves/pending').then((r) => ({ ...r, data: normalizeArray<Leave>(r.data) })),

  types: () =>
    client.get<LeaveType[]>('/leaves/types').then((r) => ({ ...r, data: normalizeArray<LeaveType>(r.data) })),

  holidays: (year?: number) =>
    client.get<JourFerie[]>('/leaves/holidays', { params: { year } }).then((r) => r.data as unknown as JourFerie[]),

  balance: (employeeId: number) =>
    client.get<LeaveBalance>(`/leaves/balance/${employeeId}`).then((r) => r.data),

  calculateDays: (startDate: string, endDate: string) =>
    client.post<CalculateDaysResult>('/leaves/calculate-days', { start_date: startDate, end_date: endDate })
      .then((r) => r.data),

  generatePlanning: (params: {
    critere: 'G' | 'E' | 'A';
    annee: number;
    date_generation?: string;
    date_limite?: string;
    department_id?: number;
    employee_id?: number;
  }) => client.post<PlanningGenResult>('/leaves/planning/generate', params).then((r) => r.data),

  plannings: (params?: Record<string, unknown>) =>
    client.get('/leaves/planning', { params }).then((r) => r.data),

  get: (id: number) => client.get<Leave>(`/leaves/${id}`),

  create: (data: Partial<Leave>) => client.post<Leave>('/leaves', data),

  update: (id: number, data: Partial<Leave>) => client.put<Leave>(`/leaves/${id}`, data),

  delete: (id: number) => client.delete(`/leaves/${id}`),

  approve: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/approve`, { comment }),

  reject: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/reject`, { rejection_reason: comment, comment }),

  submitJustification: (id: number) =>
    client.post(`/leaves/${id}/justification`),
};
