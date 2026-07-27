import client from './client';
import type { Leave, LeaveType } from '../types';

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export interface LeaveEndingSoon {
  id:                 number;
  employee_id:        number;
  employee?:          { id: number; first_name: string; last_name: string; employee_number: string; department?: { name: string } };
  leaveType?:         { id: number; name: string; color: string; category?: string };
  start_date:         string;
  end_date:           string;
  days_count:         number;
  days_until_return:  number;
  status:             string;
  created_at:         string;
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
  annual_quota?:         number;
  // Carry-over
  solde_reporte?:        number;
  expire_annee?:         number | null;
  report_expire?:        boolean;
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
  // Dates de planification
  date_depart_prevu?:         string | null;
  date_retour_prevu?:         string | null;
  nbre_jours_programme?:      number | null;
  statut_realisation?:        'planifié' | 'confirmé' | 'réalisé' | 'non_respecté';
  derniere_notif_at?:         string | null;
  leave_id?:                  number | null;
  days_until_depart?:         number; // computed by backend in planningUpcoming
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

  endingSoon: (days = 3) =>
    client.get<LeaveEndingSoon[]>('/leaves/ending-soon', { params: { days } }).then(r => r.data as unknown as LeaveEndingSoon[]),

  types: () =>
    client.get<LeaveType[]>('/leaves/types').then((r) => ({ ...r, data: normalizeArray<LeaveType>(r.data) })),

  holidays: (year?: number) =>
    client.get<JourFerie[]>('/leaves/holidays', { params: { year } }).then((r) => r.data as unknown as JourFerie[]),

  balance: (employeeId: number) =>
    client.get<LeaveBalance>(`/leaves/balance/${employeeId}`).then((r) => r.data),

  calculateDays: (startDate: string, endDate: string, applyFridayRule = true) =>
    client.post<CalculateDaysResult>('/leaves/calculate-days', {
      start_date: startDate, end_date: endDate, apply_friday_rule: applyFridayRule,
    }).then((r) => r.data),

  calculateEndDate: (startDate: string, duration: number) =>
    client.post<{ start_date: string; end_date: string; duration: number }>(
      '/leaves/calculate-end-date', { start_date: startDate, duration }
    ).then((r) => r.data),

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

  planningUpcoming: (days = 14) =>
    client.get<DetailPlanningConge[]>('/leaves/planning/upcoming', { params: { days } })
      .then(r => r.data as unknown as DetailPlanningConge[]),

  planningUpdateDates: (id: number, data: {
    date_depart_prevu?:    string | null;
    date_retour_prevu?:    string | null;
    nbre_jours_programme?: number | null;
    statut_realisation?:   string;
    leave_id?:             number | null;
  }) => client.patch<DetailPlanningConge>(`/leaves/planning/${id}/dates`, data).then(r => r.data),

  get: (id: number) => client.get<Leave>(`/leaves/${id}`),

  create: (data: Partial<Leave>) => client.post<Leave>('/leaves', data),

  update: (id: number, data: Partial<Leave>) => client.put<Leave>(`/leaves/${id}`, data),

  delete: (id: number) => client.delete(`/leaves/${id}`),

  approve: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/approve`, { comment }),

  approveLevel: (id: number, action: 'approve' | 'reject', comment?: string) =>
    client.post<import('../types').Leave>(`/leaves/${id}/approve-level`, { action, comment }).then(r => r.data),

  reject: (id: number, comment?: string) =>
    client.post(`/leaves/${id}/reject`, { rejection_reason: comment, comment }),

  submitJustification: (id: number) =>
    client.post(`/leaves/${id}/justification`),
};

export interface CarryoverRow {
  employee_id:      number;
  employee_name:    string;
  employee_number:  string;
  department:       string;
  solde_disponible: number;
  plafond:          number;
  jours_a_reporter: number;
  already_applied:  boolean;
  applied_at:       string | null;
  jours_reportes:   number | null;
}

export interface CarryoverIndexResult {
  year:    number;
  plafond: number;
  rows:    CarryoverRow[];
  history: unknown[];
}

export const carryoverApi = {
  index: (year?: number, plafond?: number) =>
    client.get<CarryoverIndexResult>('/leaves-carryover', { params: { year, plafond } }).then((r) => r.data),

  apply: (data: { year: number; plafond: number; employee_ids: number[] }) =>
    client.post('/leaves-carryover/apply', data).then((r) => r.data),

  history: (params?: Record<string, unknown>) =>
    client.get('/leaves-carryover/history', { params }).then((r) => r.data),
};

// ── Paramètres congés (quota annuel, règles) ─────────────────────────────────
export interface LeaveSettingsData {
  id?:                       number;
  annual_quota:              number;
  min_jours_obligatoires:    number;
  report_annees_max:         number;
  samedi_ouvrable:           boolean;
  mere_famille_age_max:      number;
  mere_famille_jours_enfant: number;
}

export const leaveSettingsApi = {
  get: () =>
    client.get<LeaveSettingsData>('/leave-settings').then(r => r.data),
  update: (data: LeaveSettingsData) =>
    client.put<LeaveSettingsData>('/leave-settings', data).then(r => r.data),
};

// ── CRUD Types de congé ──────────────────────────────────────────────────────
export const leaveTypesApi = {
  list: () =>
    client.get<LeaveType[]>('/leave-types').then((r) => ({ ...r, data: normalizeArray<LeaveType>(r.data) })),

  create: (data: Partial<LeaveType>) =>
    client.post<LeaveType>('/leave-types', data),

  update: (id: number, data: Partial<LeaveType>) =>
    client.put<LeaveType>(`/leave-types/${id}`, data),

  delete: (id: number) =>
    client.delete(`/leave-types/${id}`),
};

// ── Demande de report de date de jouissance ──────────────────────────────────

export type PostponementStepStatus = 'pending' | 'approved' | 'rejected';

export interface PostponementStep {
  status:  PostponementStepStatus;
  user_id: number | null;
  at:      string | null;
  comment: string | null;
  user?:   { id: number; name: string } | null;
}

export interface LeavePostponement {
  id:                    number;
  employee_id:           number;
  leave_id:              number | null;
  submitted_by:          number | null;
  submitted_at:          string | null;
  date_depart_initial:   string;
  date_retour_initial:   string;
  date_depart_effectif:  string;
  date_retour_effectif:  string;
  jours_report:          number;
  motif:                 string;
  status:                'pending' | 'approved' | 'rejected';
  current_step:          number | null;
  // Niveaux
  n1_status: PostponementStepStatus; n1_user_id: number | null; n1_at: string | null; n1_comment: string | null;
  n2_status: PostponementStepStatus; n2_user_id: number | null; n2_at: string | null; n2_comment: string | null;
  n3_status: PostponementStepStatus; n3_user_id: number | null; n3_at: string | null; n3_comment: string | null;
  n4_status: PostponementStepStatus; n4_user_id: number | null; n4_at: string | null; n4_comment: string | null;
  n5_status: PostponementStepStatus; n5_user_id: number | null; n5_at: string | null; n5_comment: string | null;
  // Relations
  employee?:    { id: number; first_name: string; last_name: string; employee_number: string; department?: { name: string } };
  leave?:       { id: number; start_date: string; end_date: string } | null;
  submitted_by_user?: { id: number; name: string } | null;
  n1_user?: { name: string } | null; n2_user?: { name: string } | null;
  n3_user?: { name: string } | null; n4_user?: { name: string } | null;
  n5_user?: { name: string } | null;
  created_at:   string;
}

export const postponementApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<{ data: LeavePostponement[]; total: number; last_page: number }>(
      '/leave-postponements', { params }
    ).then(r => r.data),

  create: (data: {
    employee_id: number;
    leave_id?: number | null;
    date_depart_initial: string;
    date_retour_initial: string;
    date_depart_effectif: string;
    date_retour_effectif: string;
    motif: string;
  }) => client.post<LeavePostponement>('/leave-postponements', data).then(r => r.data),

  show: (id: number) =>
    client.get<LeavePostponement>(`/leave-postponements/${id}`).then(r => r.data),

  approve: (id: number, data: { step: number; status: 'approved' | 'rejected'; comment?: string }) =>
    client.post<LeavePostponement>(`/leave-postponements/${id}/approve`, data).then(r => r.data),

  delete: (id: number) =>
    client.delete(`/leave-postponements/${id}`),
};
