import client from './client';
import type {
  Evaluation, EvaluationCritere, EvaluationPeriodeEssai, EvaluationDashboard,
  EvalCampagne, EvalFiche, EvalCritere, EvalNotation,
  EvalBesoinFormation, EvalObjectif, EvalDecisionRh, EvalSynthese,
} from '../types';

// ── Ancien API période d'essai (conservé pour rétrocompatibilité) ─────────────
export const evaluationsApi = {
  list:     (params?: Record<string, unknown>) => client.get<Evaluation[]>('/evaluations', { params }),
  get:      (id: number)                        => client.get<Evaluation>(`/evaluations/${id}`),
  create:   (data: Partial<Evaluation>)         => client.post<Evaluation>('/evaluations', data),
  update:   (id: number, data: Partial<Evaluation>) => client.put<Evaluation>(`/evaluations/${id}`, data),
  validate: (id: number)                        => client.patch<Evaluation>(`/evaluations/${id}/validate`),
  delete:   (id: number)                        => client.delete(`/evaluations/${id}`),
};

export const evaluationApi = {
  dashboard: () => client.get<EvaluationDashboard>('/evaluations/dashboard'),
  criteres:  () => client.get<EvaluationCritere[]>('/evaluations/criteres'),
  list:   (params?: Record<string, unknown>) => client.get<EvaluationPeriodeEssai[]>('/evaluations', { params }),
  create: (data: Partial<EvaluationPeriodeEssai>) => client.post<EvaluationPeriodeEssai>('/evaluations', data),
  show:   (id: number) => client.get<EvaluationPeriodeEssai>(`/evaluations/${id}`),
  saveNotes: (id: number, data: {
    notations: Array<{ critere_id: number; note: number; commentaire_hierarchique?: string }>;
    commentaire_general?: string; plan_amelioration?: string;
  }) => client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/notes`, data),
  autoEvaluation: (id: number, data: { notations: Array<{ critere_id: number; commentaire_agent?: string }> }) =>
    client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/auto-evaluation`, data),
  avancer:    (id: number, commentaire?: string) => client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/avancer`, { commentaire }),
  validerRrh: (id: number, commentaire?: string) => client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/valider-rrh`, { commentaire }),
  decisionDg: (id: number, data: { decision_finale: string; remarques_dg?: string }) =>
    client.put<EvaluationPeriodeEssai>(`/evaluations/${id}/decision-dg`, data),
};

// ── NOUVEAU — Module Évaluation Annuelle (CDC-ANASER-EVAL-2026-01) ────────────

export const evalCampagneApi = {
  list:    ()                          => client.get<EvalCampagne[]>('/eval/campagnes'),
  create:  (data: Partial<EvalCampagne>) => client.post<EvalCampagne>('/eval/campagnes', data),
  update:  (id: number, data: Partial<EvalCampagne>) => client.put<EvalCampagne>(`/eval/campagnes/${id}`, data),
  show:    (id: number)                => client.get<{ campagne: EvalCampagne; stats: EvalCampagne['stats'] }>(`/eval/campagnes/${id}`),
  lancer:  (id: number)                => client.put<{ message: string; campagne: EvalCampagne; fiches_generees: number }>(`/eval/campagnes/${id}/lancer`, {}),
  synthese:(id: number)                => client.get<EvalSynthese>(`/eval/campagnes/${id}/synthese`),
  destroy: (id: number)                => client.delete<{ message: string }>(`/eval/campagnes/${id}`),
};

export const evalFicheApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<EvalFiche[]>('/eval/fiches', { params }),

  create: (data: { campagne_id: number; employee_id: number; evaluateur_id?: number | null; statut_agent?: string }) =>
    client.post<EvalFiche>('/eval/fiches', data),

  show: (id: number) =>
    client.get<{ fiche: EvalFiche; criteres: EvalCritere[] }>(`/eval/fiches/${id}`),

  planifier: (id: number, data: { date_entretien: string; lieu_entretien?: string }) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/planifier`, data),

  noter: (id: number, data: {
    notations: Array<{ critere_id: number; note: number; observation?: string }>;
    realisations?: string;
    difficultes?: string;
    competences_demontrees?: string;
    observations_evaluateur?: string;
    entretien_tenu?: boolean;
  }) => client.put<EvalFiche>(`/eval/fiches/${id}/noter`, data),

  sauvegarderBesoins: (id: number, besoins: EvalBesoinFormation[]) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/besoins`, { besoins }),

  sauvegarderObjectifs: (id: number, objectifs: EvalObjectif[]) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/objectifs`, { objectifs }),

  signerEvaluateur: (id: number, observations_evaluateur?: string) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/signer-evaluateur`, { observations_evaluateur }),

  signerAgent: (id: number, data: {
    observations_agent?: string;
    refus_signature?: boolean;
    motif_refus_signature?: string;
  }) => client.put<EvalFiche>(`/eval/fiches/${id}/signer-agent`, data),

  transmettreDAF: (id: number) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/transmettre-daf`, {}),

  annoterDG: (id: number, data: {
    avis_dg?: string;
    decision?: Partial<EvalDecisionRh>;
  }) => client.put<EvalFiche>(`/eval/fiches/${id}/annoter-dg`, data),

  notifier: (id: number) =>
    client.put<EvalFiche>(`/eval/fiches/${id}/notifier`, {}),

  archiver: (id: number) =>
    client.put<{ message: string }>(`/eval/fiches/${id}/archiver`, {}),

  destroy: (id: number) =>
    client.delete<{ message: string }>(`/eval/fiches/${id}`),
};

export const evalCritereApi = {
  list: (statut_agent?: string) =>
    client.get<EvalCritere[]>('/eval/criteres', { params: { statut_agent } }),
};
