import client from './client';
import type { Evaluation, EvaluationCritere, EvaluationPeriodeEssai, EvaluationDashboard } from '../types';

// ── Ancien API évaluations (onglet agent) ────────────────────────────────────
export const evaluationsApi = {
  list:     (params?: Record<string, unknown>) => client.get<Evaluation[]>('/evaluations', { params }),
  get:      (id: number)                        => client.get<Evaluation>(`/evaluations/${id}`),
  create:   (data: Partial<Evaluation>)         => client.post<Evaluation>('/evaluations', data),
  update:   (id: number, data: Partial<Evaluation>) => client.put<Evaluation>(`/evaluations/${id}`, data),
  validate: (id: number)                        => client.patch<Evaluation>(`/evaluations/${id}/validate`),
  delete:   (id: number)                        => client.delete(`/evaluations/${id}`),
};

// ── Nouveau API — Évaluation Période d'Essai (ANASER) ────────────────────────
export const evaluationApi = {
  dashboard: () =>
    client.get<EvaluationDashboard>('/evaluations/dashboard'),

  criteres: () =>
    client.get<EvaluationCritere[]>('/evaluations/criteres'),

  list: (params?: Record<string, unknown>) =>
    client.get<EvaluationPeriodeEssai[]>('/evaluations', { params }),

  create: (data: Partial<EvaluationPeriodeEssai>) =>
    client.post<EvaluationPeriodeEssai>('/evaluations', data),

  show: (id: number) =>
    client.get<EvaluationPeriodeEssai>(`/evaluations/${id}`),

  saveNotes: (id: number, data: {
    notations: Array<{ critere_id: number; note: number; commentaire_hierarchique?: string }>;
    commentaire_general?: string;
    plan_amelioration?: string;
  }) => client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/notes`, data),

  autoEvaluation: (id: number, data: {
    notations: Array<{ critere_id: number; commentaire_agent?: string }>;
  }) => client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/auto-evaluation`, data),

  avancer: (id: number, commentaire?: string) =>
    client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/avancer`, { commentaire }),

  validerRrh: (id: number, commentaire?: string) =>
    client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/valider-rrh`, { commentaire }),

  decisionDg: (id: number, data: { decision_finale: string; remarques_dg?: string }) =>
    client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/decision-dg`, data),
};
