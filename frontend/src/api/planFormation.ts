import client from './client';
import type {
  FormationPrestataire, FormationAction, FormationBesoin,
  PlanFormation, LignePlanFormation, FormationSession,
  FormationInscription, FormationEvaluation, PlanFormationDashboard,
} from '../types';

export const planFormationApi = {
  // Dashboard
  dashboard: () => client.get<PlanFormationDashboard>('/plan-formation/dashboard'),

  // Prestataires
  prestataires: () => client.get<FormationPrestataire[]>('/plan-formation/prestataires'),
  createPrestataire: (data: Partial<FormationPrestataire>) =>
    client.post<FormationPrestataire>('/plan-formation/prestataires', data),

  // Actions (catalogue)
  actions: (params?: Record<string, unknown>) =>
    client.get<FormationAction[]>('/plan-formation/actions', { params }),
  createAction: (data: Partial<FormationAction>) =>
    client.post<FormationAction>('/plan-formation/actions', data),

  // Besoins
  besoins: (params?: Record<string, unknown>) =>
    client.get<FormationBesoin[]>('/plan-formation/besoins', { params }),
  createBesoin: (data: Partial<FormationBesoin>) =>
    client.post<FormationBesoin>('/plan-formation/besoins', data),
  validerBesoin: (id: number, statut: 'retenu' | 'rejete') =>
    client.put<FormationBesoin>(`/plan-formation/besoins/${id}/valider`, { statut }),

  // Plans
  plans: () => client.get<PlanFormation[]>('/plan-formation/plans'),
  createPlan: (data: Partial<PlanFormation>) =>
    client.post<PlanFormation>('/plan-formation/plans', data),
  showPlan: (id: number) => client.get<PlanFormation>(`/plan-formation/plans/${id}`),
  validerPlan: (id: number) => client.put<PlanFormation>(`/plan-formation/plans/${id}/valider`, {}),

  // Lignes
  createLigne: (planId: number, data: Partial<LignePlanFormation>) =>
    client.post<LignePlanFormation>(`/plan-formation/plans/${planId}/lignes`, data),
  updateLigne: (id: number, data: Partial<LignePlanFormation>) =>
    client.put<LignePlanFormation>(`/plan-formation/lignes/${id}`, data),
  deleteLigne: (id: number) => client.delete(`/plan-formation/lignes/${id}`),

  // Sessions
  sessions: (params?: Record<string, unknown>) =>
    client.get<FormationSession[]>('/plan-formation/sessions', { params }),
  showSession: (id: number) => client.get<FormationSession>(`/plan-formation/sessions/${id}`),
  createSession: (data: Partial<FormationSession>) =>
    client.post<FormationSession>('/plan-formation/sessions', data),
  updateSession: (id: number, data: Partial<FormationSession>) =>
    client.put<FormationSession>(`/plan-formation/sessions/${id}`, data),

  // Inscriptions
  inscrire: (sessionId: number, data: { employee_id: number; statut?: string }) =>
    client.post<FormationInscription>(`/plan-formation/sessions/${sessionId}/inscrire`, data),
  updateInscription: (id: number, data: Partial<FormationInscription>) =>
    client.put<FormationInscription>(`/plan-formation/inscriptions/${id}`, data),

  // Évaluations
  evaluations: (params?: Record<string, unknown>) =>
    client.get<FormationEvaluation[]>('/plan-formation/evaluations', { params }),
  createEvaluation: (data: Partial<FormationEvaluation>) =>
    client.post<FormationEvaluation>('/plan-formation/evaluations', data),
};
