import client from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export type CategorieEmploi = 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'D' | 'E';
export type AppreciationAnnuelle = 'insuffisant' | 'passable' | 'satisfaisant' | 'excellent';

export interface EvaluationAnnuelle {
  id: number;
  employee_id: number;
  evaluateur_id: number;
  annee: number;
  statut: 'brouillon' | 'soumise' | 'validee';
  note_resultats: number | null;
  note_competences: number | null;
  note_comportement: number | null;
  note_developpement: number | null;
  note_globale: number | null;
  appreciation: AppreciationAnnuelle | null;
  objectifs_annee: string | null;
  commentaire_evaluateur: string | null;
  commentaire_agent: string | null;
  date_entretien: string | null;
  date_validation: string | null;
  employee?: {
    id: number; first_name: string; last_name: string; employee_number: string;
    categorie_emploi: CategorieEmploi | null; echelon: number;
    department?: { id: number; name: string };
    position?: { id: number; title: string };
  };
  evaluateur?: { id: number; name: string };
}

export interface EligibleAvancement {
  employee: {
    id: number; first_name: string; last_name: string; employee_number: string;
    categorie_emploi: CategorieEmploi | null; echelon: number;
    department?: { id: number; name: string };
    position?: { id: number; title: string };
  };
  date_echelon: string;
  duree_min_ans: number;
  date_eligibilite: string;
  note_derniere_eval: number | null;
  appreciation: AppreciationAnnuelle | null;
  annee_eval: number | null;
}

export interface Avancement {
  id: number;
  employee_id: number;
  categorie: CategorieEmploi;
  echelon_avant: number;
  echelon_apres: number;
  note_evaluation: number | null;
  date_eligibilite: string;
  date_decision: string | null;
  decision: 'accorde' | 'refuse' | 'reporte' | null;
  motif_refus: string | null;
  statut: 'en_attente_daf' | 'en_attente_dg' | 'accorde' | 'refuse' | 'reporte';
  employee?: EligibleAvancement['employee'];
}

export interface Promotion {
  id: number;
  employee_id: number;
  categorie_avant: CategorieEmploi;
  categorie_apres: CategorieEmploi;
  type_promotion: 'au_choix' | 'concours_interne' | 'formation_qualifiante';
  annees_dans_categorie: number | null;
  note_eval_n1: number | null;
  note_eval_n2: number | null;
  commission_date: string | null;
  commission_avis: 'favorable' | 'defavorable' | 'reporte' | null;
  date_decision: string | null;
  date_effet: string | null;
  commentaire: string | null;
  statut: 'appel_candidature' | 'en_instruction' | 'commission_tenue' | 'accorde' | 'refuse';
  employee?: EligibleAvancement['employee'];
}

export interface PdiAction {
  id?: number;
  pdi_id?: number;
  type: 'formation' | 'mission' | 'projet_transverse';
  intitule: string;
  organisme: string | null;
  duree_jours: number | null;
  echeance: string | null;
  indicateur_suivi: string | null;
  statut: 'planifie' | 'en_cours' | 'realise' | 'abandonne';
}

export interface PDI {
  id: number;
  employee_id: number;
  evaluation_annuelle_id: number | null;
  annee: number;
  objectifs_professionnels: string | null;
  competences_a_renforcer: string | null;
  commentaire_rh: string | null;
  commentaire_agent: string | null;
  statut: 'brouillon' | 'soumis' | 'valide';
  date_validation: string | null;
  actions: PdiAction[];
  employee?: EligibleAvancement['employee'];
}

export interface MobiliteInterne {
  id: number;
  employee_id: number;
  type_mobilite: 'fonctionnelle' | 'geographique' | 'organisationnelle';
  initiateur: 'agent' | 'hierarchie' | 'direction';
  department_avant_id: number | null;
  position_avant_id: number | null;
  department_apres_id: number | null;
  position_apres_id: number | null;
  motif: string | null;
  date_demande: string;
  date_preavis_30j: string | null;
  date_prise_effet: string | null;
  date_decision: string | null;
  delegues_informes: boolean;
  commentaire_rh: string | null;
  statut: 'en_etude' | 'soumise_sg' | 'approuvee' | 'refusee';
  employee?: EligibleAvancement['employee'];
  department_avant?: { id: number; name: string };
  department_apres?: { id: number; name: string };
  position_avant?: { id: number; title: string };
  position_apres?: { id: number; title: string };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const CATEGORIE_LABELS: Record<CategorieEmploi, string> = {
  A1: 'Cadre supérieur N1',
  A2: 'Cadre supérieur N2',
  B1: 'Cadre moyen N1',
  B2: 'Cadre moyen N2',
  C:  'Agent de maîtrise',
  D:  'Employé',
  E:  'Ouvrier',
};

export const CATEGORIE_COLORS: Record<CategorieEmploi, string> = {
  A1: '#7C3AED', A2: '#9333EA',
  B1: '#2563EB', B2: '#3B82F6',
  C:  '#0891B2',
  D:  '#059669', E:  '#65A30D',
};

export const APPRECIATION_COLORS: Record<AppreciationAnnuelle, string> = {
  excellent:    '#059669',
  satisfaisant: '#2563EB',
  passable:     '#D97706',
  insuffisant:  '#DC2626',
};

// ── API client ───────────────────────────────────────────────────────────────

export const carriereApi = {
  // Évaluations annuelles
  getEvaluations: (params?: Record<string, unknown>) =>
    client.get<EvaluationAnnuelle[]>('/carrieres/evaluations', { params }),
  createEvaluation: (data: Partial<EvaluationAnnuelle>) =>
    client.post<EvaluationAnnuelle>('/carrieres/evaluations', data),
  updateEvaluation: (id: number, data: Partial<EvaluationAnnuelle>) =>
    client.put<EvaluationAnnuelle>(`/carrieres/evaluations/${id}`, data),

  // Avancements
  getEligibles: () =>
    client.get<EligibleAvancement[]>('/carrieres/avancements/eligibles'),
  getAvancements: (params?: Record<string, unknown>) =>
    client.get<Avancement[]>('/carrieres/avancements', { params }),
  createAvancement: (data: Partial<Avancement>) =>
    client.post<Avancement>('/carrieres/avancements', data),
  validerAvancement: (id: number, action: string, motif?: string) =>
    client.patch<Avancement>(`/carrieres/avancements/${id}/valider`, { action, motif_refus: motif }),

  // Promotions
  getPromotions: (params?: Record<string, unknown>) =>
    client.get<Promotion[]>('/carrieres/promotions', { params }),
  createPromotion: (data: Partial<Promotion>) =>
    client.post<Promotion>('/carrieres/promotions', data),
  validerPromotion: (id: number, data: Record<string, unknown>) =>
    client.patch<Promotion>(`/carrieres/promotions/${id}/valider`, data),

  // PDI
  getPdis: (params?: Record<string, unknown>) =>
    client.get<PDI[]>('/carrieres/pdis', { params }),
  createPdi: (data: Partial<PDI>) =>
    client.post<PDI>('/carrieres/pdis', data),
  updatePdi: (id: number, data: Partial<PDI>) =>
    client.put<PDI>(`/carrieres/pdis/${id}`, data),

  // Mobilité
  getMobilites: (params?: Record<string, unknown>) =>
    client.get<MobiliteInterne[]>('/carrieres/mobilites', { params }),
  createMobilite: (data: Partial<MobiliteInterne>) =>
    client.post<MobiliteInterne>('/carrieres/mobilites', data),
  validerMobilite: (id: number, action: string, datePriseEffet?: string) =>
    client.patch<MobiliteInterne>(`/carrieres/mobilites/${id}/valider`, { action, date_prise_effet: datePriseEffet }),
};
