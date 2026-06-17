import client from './client';
import type {
  PlanPoste, BesoinRecrutement, PlanRecrutement, LignePlan,
  FichePoste, ProcessusRecrutement, CandidaturePlan,
  DecisionRecrutement, PlanRecrutementDashboard,
} from '../types';

export const planRecrutementApi = {
  // Dashboard
  dashboard: () => client.get<PlanRecrutementDashboard>('/plan-recrutement/dashboard'),

  // Postes
  postes: () => client.get<PlanPoste[]>('/plan-recrutement/postes'),
  createPoste: (data: Partial<PlanPoste>) => client.post<PlanPoste>('/plan-recrutement/postes', data),

  // Besoins
  besoins: (params?: Record<string, unknown>) => client.get<BesoinRecrutement[]>('/plan-recrutement/besoins', { params }),
  createBesoin: (data: Partial<BesoinRecrutement>) => client.post<BesoinRecrutement>('/plan-recrutement/besoins', data),
  validerBesoin: (id: number, statut: 'valide' | 'rejete') =>
    client.put<BesoinRecrutement>(`/plan-recrutement/besoins/${id}/valider`, { statut }),

  // Plans
  plans: () => client.get<PlanRecrutement[]>('/plan-recrutement/plans'),
  createPlan: (data: Partial<PlanRecrutement>) => client.post<PlanRecrutement>('/plan-recrutement/plans', data),
  showPlan: (id: number) => client.get<PlanRecrutement>(`/plan-recrutement/plans/${id}`),
  updatePlan: (id: number, data: Partial<PlanRecrutement>) => client.put<PlanRecrutement>(`/plan-recrutement/plans/${id}`, data),
  validerPlan: (id: number) => client.put<PlanRecrutement>(`/plan-recrutement/plans/${id}/valider`, {}),

  // Lignes
  createLigne: (planId: number, data: Partial<LignePlan>) =>
    client.post<LignePlan>(`/plan-recrutement/plans/${planId}/lignes`, data),
  updateLigne: (id: number, data: Partial<LignePlan>) => client.put<LignePlan>(`/plan-recrutement/lignes/${id}`, data),
  deleteLigne: (id: number) => client.delete(`/plan-recrutement/lignes/${id}`),

  // Fiches
  fichesPoste: (pospeId: number) => client.get<FichePoste[]>(`/plan-recrutement/fiches/${pospeId}`),
  createFiche: (data: Partial<FichePoste>) => client.post<FichePoste>('/plan-recrutement/fiches', data),

  // Processus
  processus: (params?: Record<string, unknown>) => client.get<ProcessusRecrutement[]>('/plan-recrutement/processus', { params }),
  showProcessus: (id: number) => client.get<ProcessusRecrutement>(`/plan-recrutement/processus/${id}`),
  createProcessus: (data: Partial<ProcessusRecrutement>) => client.post<ProcessusRecrutement>('/plan-recrutement/processus', data),
  avancerEtape: (id: number, data: { etape: string; commentaire?: string; role_validateur?: string }) =>
    client.put<ProcessusRecrutement>(`/plan-recrutement/processus/${id}/etape`, data),

  // Candidatures
  candidatures: (processusId: number) =>
    client.get<CandidaturePlan[]>(`/plan-recrutement/processus/${processusId}/candidatures`),
  createCandidature: (data: Partial<CandidaturePlan>) => client.post<CandidaturePlan>('/plan-recrutement/candidatures', data),
  updateCandidature: (id: number, data: Partial<CandidaturePlan>) =>
    client.put<CandidaturePlan>(`/plan-recrutement/candidatures/${id}`, data),

  // Décisions
  createDecision: (data: Partial<DecisionRecrutement>) =>
    client.post<DecisionRecrutement>('/plan-recrutement/decisions', data),
};
