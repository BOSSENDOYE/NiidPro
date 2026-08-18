import client from './client';

// ── Types primitifs ────────────────────────────────────────────────────────

export type EvalStatutCampagneAnn =
  | 'brouillon' | 'lancee' | 'cloturee';

export type EvalStatutFicheAnn =
  | 'cree' | 'transmise_responsable'
  | 'entretien_planifie' | 'agent_convoque' | 'entretien_reporte'
  | 'en_cours_notation' | 'notee_attente_discussion' | 'attente_signature_agent'
  | 'signature_refusee' | 'signee' | 'transmise_daf'
  | 'receptionee_daf' | 'integree_synthese' | 'tableau_transmis_dg'
  | 'etudiee_dg' | 'annotee_dg' | 'validee_notification'
  | 'courrier_etabli' | 'notifiee'
  | 'archivee' | 'cloturee_sortie';

export type EvalStatutSynthese = 'brouillon' | 'transmis' | 'valide_dg';
export type EvalCategorieFiche = 'contractuel' | 'mis_a_disposition' | 'decisionnaire';
export type EvalAppreciationAnn = 'excellent' | 'tres_satisfaisant' | 'satisfaisant' | 'a_ameliorer' | 'insuffisant';
export type EvalTypeCritere = 'socle' | 'complementaire';
export type EvalTypeDecision = 'prime' | 'lettre_felicitation' | 'promotion' | 'aucune' | 'avertissement';
export type EvalModeEnvoi = 'portail' | 'email' | 'main_propre';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface EvalReferentiel {
  id: number;
  code: string;
  version: number;
  libelle: string;
  note_min: number;
  note_max: number;
  verrouille: boolean;
  cree_par?: number;
  criteres?: EvalCritereAnn[];
}

export interface EvalCritereAnn {
  id: number;
  referentiel_id: number;
  code: string;
  libelle: string;
  type: EvalTypeCritere;
  ordre: number;
  actif: boolean;
  note?: number;
  commentaire?: string;
  note_min?: number;
  note_max?: number;
}

export interface EvalCampagneAnn {
  id: number;
  exercice: number;
  titre?: string;
  statut: EvalStatutCampagneAnn;
  referentiel_id?: number;
  date_lancement?: string;
  date_cloture?: string;
  cree_par?: number;
  lance_par?: number;
  lance_at?: string;
  createur?: { id: number; name: string };
  lanceur?: { id: number; name: string };
  referentiel?: EvalReferentiel;
  note_service?: string;
  note_service_signee?: boolean;
  note_service_signee_at?: string;
  stats?: {
    total: number;
    a_planifier: number;
    planifiees: number;
    en_cours: number;
    signees: number;
    transmises_daf: number;
    notifiees: number;
    archivees: number;
  };
  created_at: string;
  updated_at: string;
}

export interface EvalNotationAnn {
  id?: number;
  fiche_id?: number;
  critere_id: number;
  note?: number;
  commentaire?: string;
  critere?: EvalCritereAnn;
}

export interface EvalHistoriqueStatut {
  id: number;
  fiche_id: number;
  statut: EvalStatutFicheAnn;
  statut_libelle?: string;
  user_id?: number;
  commentaire?: string;
  user?: { id: number; name: string };
  created_at: string;
}

export interface EvalCourrier {
  id: number;
  synthese_id: number;
  fiche_id: number;
  employee_id?: number;
  modele_id?: number;
  corps_genere?: string;
  signe_par?: number;
  signe_at?: string;
  mode_envoi?: EvalModeEnvoi;
  envoye_par?: number;
  envoye_at?: string;
  accuse_at?: string;
  accuse_par?: number;
  signataire?: { id: number; name: string };
  created_at: string;
}

export interface EvalFicheAnn {
  id: number;
  campagne_id: number;
  employee_id?: number;
  evaluateur_id?: number;
  statut: EvalStatutFicheAnn;
  statut_libelle?: string;
  sous_procedure?: string;
  categorie_agent: EvalCategorieFiche;
  snapshot_nom_complet: string;
  snapshot_matricule?: string;
  snapshot_direction?: string;
  snapshot_service?: string;
  snapshot_fonction?: string;
  moyenne?: number;
  appreciation?: EvalAppreciationAnn;
  date_entretien?: string;
  heure_entretien?: string;
  lieu_entretien?: string;
  signe_evaluateur_at?: string;
  signe_agent_at?: string;
  transmis_daf_at?: string;
  receptionee_daf_at?: string;
  notifiee_at?: string;
  archivee_at?: string;
  courrier_etabli_at?: string;
  avis_chef_service?: string;
  observations_dg?: string;
  observations_evaluateur?: string;
  ref_notation_fp?: string;
  refus_signature?: boolean;
  motif_refus_signature?: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_number?: string;
    department?: { id: number; name: string };
  };
  evaluateur?: { id: number; name: string };
  campagne?: EvalCampagneAnn;
  notations?: EvalNotationAnn[];
  historique_statuts?: EvalHistoriqueStatut[];
  courrier?: EvalCourrier;
  created_at: string;
  updated_at: string;
}

export interface EvalSyntheseAnn {
  id: number;
  campagne_id: number;
  version: number;
  statut: EvalStatutSynthese;
  genere_par?: number;
  transmis_dg_par?: number;
  transmis_dg_at?: string;
  valide_dg_par?: number;
  valide_dg_at?: string;
  annotation_dg?: string;
  donnees?: Record<string, unknown>;
  campagne?: EvalCampagneAnn;
  created_at: string;
  updated_at: string;
}

export interface EvalGratification {
  id?: number;
  synthese_id: number;
  fiche_id: number;
  employee_id?: number;
  type_decision: EvalTypeDecision;
  commentaire?: string;
  decide_par?: number;
  decided_at?: string;
  fiche?: EvalFicheAnn;
}

export interface EvalModeleNotification {
  id: number;
  nom: string;
  objet_lettre: string;
  corps_html: string;
  actif: boolean;
  cree_par?: number;
}

// Dashboard shapes
export interface EvalDashboardDaf {
  role_dashboard: 'daf';
  campagnes_actives?: EvalCampagneAnn[];
  campagne_courante?: EvalCampagneAnn;
  nb_fiches_total?: number;
  nb_campagnes?: number;
  par_statut?: { libelle: string; sous_procedure: string; nb: number }[];
  taux_completion?: number;
  en_retard?: number;
  bloquees?: number;
  syntheses_recentes?: EvalSyntheseAnn[];
  message?: string;
}

export interface EvalDashboardDirection {
  role_dashboard: 'direction';
  syntheses_a_etudier: EvalSyntheseAnn[];
  nb_en_attente_notif: number;
  nb_en_attente_archiv: number;
  gratifications: { type_decision: string; nb: number }[];
  syntheses_cloturees: EvalSyntheseAnn[];
}

export interface EvalDashboardAgent {
  role_dashboard: 'agent';
  employee?: { id: number; matricule: string; nom_complet: string };
  fiches: {
    id: number; campagne_id: number; exercice?: number;
    statut: EvalStatutFicheAnn; statut_libelle: string; sous_procedure: string;
    moyenne?: number; appreciation?: EvalAppreciationAnn; est_terminal: boolean;
  }[];
  fiche_active?: Partial<EvalFicheAnn>;
  courrier_disponible: boolean;
  action_requise?: string;
  message?: string;
}

export interface EvalDashboardResponsable {
  role_dashboard: 'responsable';
  [key: string]: unknown;
}

export type EvalDashboard =
  | EvalDashboardDaf
  | EvalDashboardDirection
  | EvalDashboardAgent
  | EvalDashboardResponsable;

// ── API Campagnes ──────────────────────────────────────────────────────────

export const evalCampagnesApi = {
  list: () => client.get<EvalCampagneAnn[]>('/eval/campagnes'),
  show: (id: number) =>
    client.get<{ campagne: EvalCampagneAnn; fiches: EvalFicheAnn[]; stats: EvalCampagneAnn['stats'] }>(
      `/eval/campagnes/${id}`
    ),
  create: (data: { exercice: number; titre?: string; referentiel_id?: number; date_lancement?: string; date_cloture?: string }) =>
    client.post<EvalCampagneAnn>('/eval/campagnes', data),
  update: (id: number, data: Partial<EvalCampagneAnn>) =>
    client.put<EvalCampagneAnn>(`/eval/campagnes/${id}`, data),
  lancer: (id: number) =>
    client.put<{ message: string; campagne: EvalCampagneAnn; fiches_generees: number }>(
      `/eval/campagnes/${id}/lancer`,
      {}
    ),
  destroy: (id: number) => client.delete<{ message: string }>(`/eval/campagnes/${id}`),
  genererNote: (id: number) =>
    client.post<{ message: string; note_service: string }>(`/eval/campagnes/${id}/note-service`, {}),
  signerNote: (id: number) =>
    client.post<{ message: string; note_service_signee: boolean; signee_at: string }>(
      `/eval/campagnes/${id}/signer-note`, {}
    ),
  downloadNotePdf: (id: number) =>
    client.get<Blob>(`/eval/campagnes/${id}/note-service/pdf`, { responseType: 'blob' }),
  anomalies: (id: number) =>
    client.get<{
      peut_lancer: boolean;
      anomalies_orga: Array<{ id: number; matricule: string; nom_complet: string; direction: string | null; fonction: string | null }>;
      nb_anomalies_orga: number;
      erreurs_parametrage: string[];
      note_service_signee: boolean;
    }>(`/eval/campagnes/${id}/anomalies`),
};

// ── API Référentiels ───────────────────────────────────────────────────────

export const evalReferentielsApi = {
  list: () => client.get<EvalReferentiel[]>('/eval/referentiels'),
  show: (id: number) => client.get<{ referentiel: EvalReferentiel }>(`/eval/referentiels/${id}`),
  create: (data: Partial<EvalReferentiel>) =>
    client.post<EvalReferentiel>('/eval/referentiels', data),
  seed: (data?: { code?: string; libelle?: string }) =>
    client.post<EvalReferentiel>('/eval/referentiels/seed', data ?? {}),
};

// ── API Fiches ─────────────────────────────────────────────────────────────

export const evalFichesApi = {
  list: (params?: {
    campagne_id?: number;
    statut?: string;
    evaluateur_id?: number;
    direction?: string;
    service?: string;
    categorie_agent?: string;
  }) => client.get<EvalFicheAnn[]>('/eval/fiches', { params }),
  creer: (data: {
    campagne_id: number;
    employee_id: number;
    evaluateur_id?: number;
    categorie_agent?: string;
  }) => client.post<EvalFicheAnn>('/eval/fiches', data),
  creerLot: (data: {
    campagne_id: number;
    employee_ids: number[];
    evaluateur_id?: number;
    categorie_agent?: string;
  }) => client.post<{ crees: number; deja_existants: number; message: string }>('/eval/fiches/creer-lot', data),
  show: (id: number) =>
    client.get<{
      fiche: EvalFicheAnn;
      criteres: EvalCritereAnn[];
      statut_libelle: string;
      sous_procedure: string;
      transitions: string[];
      is_readonly: boolean;
    }>(`/eval/fiches/${id}`),
  planifier: (
    id: number,
    data: { date_entretien: string; heure_entretien?: string; lieu_entretien?: string }
  ) => client.put<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/planifier`, data),
  replanifier: (
    id: number,
    data: { motif: string; nouvelle_date_entretien: string; heure_entretien?: string; lieu_entretien?: string }
  ) => client.post<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/replanifier`, data),
  noter: (
    id: number,
    data: {
      notations: { critere_id: number; note: number; commentaire?: string }[];
      observations_evaluateur?: string;
    }
  ) => client.put<EvalFicheAnn>(`/eval/fiches/${id}/noter`, data),
  signerEvaluateur: (id: number, data?: { observations_evaluateur?: string }) =>
    client.put<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/signer-evaluateur`, data ?? {}),
  signerAgent: (id: number, data: { refus_signature?: boolean; motif_refus_signature?: string }) =>
    client.put<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/signer-agent`, data),
  transmettreDAF: (id: number) =>
    client.put<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/transmettre-daf`, {}),
  changerEvaluateur: (id: number, data: { evaluateur_id: number; motif?: string }) =>
    client.put<{ message: string; fiche: EvalFicheAnn }>(`/eval/fiches/${id}/changer-evaluateur`, data),
  refFp: (id: number, data: { ref_notation_fp: string }) =>
    client.put<{ message: string; ref_notation_fp: string }>(`/eval/fiches/${id}/ref-fp`, data),
  criteres: (id: number) =>
    client.get<{ criteres: EvalCritereAnn[]; note_min: number; note_max: number; taux_completion: number }>(
      `/eval/fiches/${id}/criteres`
    ),
  pdf: (id: number) => `/api/eval/fiches/${id}/pdf`,
};

// ── API Synthèses ──────────────────────────────────────────────────────────

export const evalSynthesesApi = {
  list: (params?: { campagne_id?: number }) =>
    client.get<{ syntheses: EvalSyntheseAnn[] }>('/eval/syntheses', { params }),
  generer: (data: { campagne_id: number }) =>
    client.post<{ message: string; synthese: EvalSyntheseAnn }>('/eval/syntheses', data),
  show: (id: number) =>
    client.get<{ synthese: EvalSyntheseAnn }>(`/eval/syntheses/${id}`),
  transmettreAuDg: (id: number) =>
    client.post<{ message: string; synthese: EvalSyntheseAnn }>(`/eval/syntheses/${id}/transmettre-dg`, {}),
  exportPdf: (id: number) =>
    client.get(`/eval/syntheses/${id}/export-pdf`, { responseType: 'blob' }),
};

// ── API Décisions DG (SP5) ─────────────────────────────────────────────────

export const evalDecisionsDgApi = {
  ouvrirEtude: (syntheseId: number) =>
    client.post<{ message: string; synthese: EvalSyntheseAnn }>(
      `/eval/decisions-dg/${syntheseId}/ouvrir-etude`,
      {}
    ),
  annoterFiche: (syntheseId: number, ficheId: number, data: { annotation: string }) =>
    client.put<{ message: string; fiche: EvalFicheAnn }>(
      `/eval/decisions-dg/${syntheseId}/fiches/${ficheId}/annoter`,
      data
    ),
  annoterSynthese: (syntheseId: number, data: { annotation: string }) =>
    client.put<{ message: string; synthese: EvalSyntheseAnn }>(
      `/eval/decisions-dg/${syntheseId}/annoter-synthese`,
      data
    ),
  gratification: (
    syntheseId: number,
    ficheId: number,
    data: { type_decision: EvalTypeDecision; commentaire?: string }
  ) =>
    client.post<{ message: string; gratification: EvalGratification }>(
      `/eval/decisions-dg/${syntheseId}/fiches/${ficheId}/gratification`,
      data
    ),
  listeGratifications: (syntheseId: number) =>
    client.get<{ gratifications: EvalGratification[] }>(
      `/eval/decisions-dg/${syntheseId}/gratifications`
    ),
  valider: (syntheseId: number) =>
    client.post<{ message: string; synthese: EvalSyntheseAnn }>(
      `/eval/decisions-dg/${syntheseId}/valider`,
      {}
    ),
};

// ── API Notifications DAF (SP6) ────────────────────────────────────────────

export const evalNotifDafApi = {
  modeles: () =>
    client.get<{ modeles: EvalModeleNotification[]; variables: Record<string, string> }>(
      '/eval/notifications-daf/modeles'
    ),
  courriers: (syntheseId: number) =>
    client.get<{ courriers: EvalCourrier[] }>(`/eval/notifications-daf/${syntheseId}/courriers`),
  generer: (syntheseId: number, data: { modele_id: number }) =>
    client.post<{ courriers: EvalCourrier[]; nb: number }>(
      `/eval/notifications-daf/${syntheseId}/generer`,
      data
    ),
  archiverLot: (syntheseId: number) =>
    client.post<{ message: string; nb_archivees: number }>(
      `/eval/notifications-daf/${syntheseId}/archiver-lot`,
      {}
    ),
  signer: (courrierId: number) =>
    client.post(`/eval/notifications-daf/courriers/${courrierId}/signer`, {}),
  envoyer: (courrierId: number, data: { mode: EvalModeEnvoi }) =>
    client.post(`/eval/notifications-daf/courriers/${courrierId}/envoyer`, data),
  pdfUrl: (courrierId: number) => `/api/eval/notifications-daf/courriers/${courrierId}/pdf`,
};

// ── API Dashboard ──────────────────────────────────────────────────────────

export const evalDashboardApi = {
  get: () => client.get<EvalDashboard>('/eval/dashboard'),
};

// ── API RH (employees, departments, services) ──────────────────────────────

export interface EvalEmployee {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
  department_id?: number;
  organisation_unit_id?: number;
  manager_id?: number;
  manager?: { id: number; first_name: string; last_name: string };
  department?: { id: number; name: string };
  organisation_unit?: { id: number; libelle: string };
  position?: { id: number; title: string };
}

export interface EvalDepartment {
  id: number;
  name: string;
  code?: string;
  employees_count?: number;
}

export interface EvalOrganisationUnit {
  id: number;
  libelle: string;
  department_id?: number;
}

export const rhApi = {
  employees: (params?: { department_id?: number; organisation_unit_id?: number; status?: string; per_page?: number }) =>
    client.get<{ data: EvalEmployee[]; total: number }>('/employees', { params: { per_page: 500, ...params, status: params?.status ?? 'active' } }),
  departments: () =>
    client.get<EvalDepartment[]>('/departments'),
  organisationUnits: (params?: { department_id?: number }) =>
    client.get<EvalOrganisationUnit[]>('/organisation-units', { params }),
  affecterLot: (data: { employee_ids: number[]; department_id?: number; organisation_unit_id?: number; manager_id?: number }) =>
    client.put<{ message: string; updated: number }>('/employees/affecter-lot', data),
};

// ── Constantes workflow (pour affichage frontend) ──────────────────────────

export const EVAL_WORKFLOW_STEPS = [
  { label: 'Création',  sp: 'SP1', sublabel: 'Ouverture & transmission' },
  { label: 'Entretien', sp: 'SP2', sublabel: 'Planification & convocation' },
  { label: 'Notation',  sp: 'SP3', sublabel: 'Évaluation & signatures' },
  { label: 'DAF',       sp: 'SP4', sublabel: 'Réception & synthèse' },
  { label: 'Direction', sp: 'SP5', sublabel: 'Étude & décision DG' },
  { label: 'Notification', sp: 'SP6', sublabel: 'Courrier & information agent' },
  { label: 'Archivée',  sp: '✓',  sublabel: 'Clôture définitive' },
] as const;

export const STATUT_TO_STEP: Record<EvalStatutFicheAnn, number> = {
  cree: 0, transmise_responsable: 0,
  entretien_planifie: 1, agent_convoque: 1, entretien_reporte: 1,
  en_cours_notation: 2, notee_attente_discussion: 2, attente_signature_agent: 2,
  signature_refusee: 2, signee: 2, transmise_daf: 2,
  receptionee_daf: 3, integree_synthese: 3, tableau_transmis_dg: 3,
  etudiee_dg: 4, annotee_dg: 4, validee_notification: 4,
  courrier_etabli: 5, notifiee: 5,
  archivee: 6, cloturee_sortie: 6,
};

export const STATUT_LABELS: Record<EvalStatutFicheAnn, string> = {
  cree: 'Créée',
  transmise_responsable: 'Transmise au responsable',
  entretien_planifie: 'Entretien planifié',
  agent_convoque: 'Agent convoqué',
  entretien_reporte: 'Entretien reporté',
  en_cours_notation: 'En cours de notation',
  notee_attente_discussion: 'Notée — en attente',
  attente_signature_agent: 'Attente signature agent',
  signature_refusee: 'Signature refusée',
  signee: 'Signée',
  transmise_daf: 'Transmise au DAF',
  receptionee_daf: 'Réceptionnée DAF',
  integree_synthese: 'Intégrée synthèse',
  tableau_transmis_dg: 'Tableau transmis DG',
  etudiee_dg: 'Étudiée par le DG',
  annotee_dg: 'Annotée / gratification',
  validee_notification: 'Validée — notification',
  courrier_etabli: 'Courrier établi',
  notifiee: 'Notifiée',
  archivee: 'Archivée',
  cloturee_sortie: 'Clôturée — sortie effectif',
};

export const STATUT_COLORS: Record<EvalStatutFicheAnn, string> = {
  cree: '#94A3B8',
  transmise_responsable: '#3B82F6',
  entretien_planifie: '#6366F1',
  agent_convoque: '#8B5CF6',
  entretien_reporte: '#F97316',
  en_cours_notation: '#F59E0B',
  notee_attente_discussion: '#EAB308',
  attente_signature_agent: '#06B6D4',
  signature_refusee: '#EF4444',
  signee: '#10B981',
  transmise_daf: '#059669',
  receptionee_daf: '#0EA5E9',
  integree_synthese: '#0284C7',
  tableau_transmis_dg: '#0369A1',
  etudiee_dg: '#7C3AED',
  annotee_dg: '#6D28D9',
  validee_notification: '#4C1D95',
  courrier_etabli: '#FF7631',
  notifiee: '#EA580C',
  archivee: '#6B7280',
  cloturee_sortie: '#374151',
};

export const APPRECIATION_LABELS: Record<EvalAppreciationAnn, string> = {
  excellent: 'Excellent',
  tres_satisfaisant: 'Très satisfaisant',
  satisfaisant: 'Satisfaisant',
  a_ameliorer: 'À améliorer',
  insuffisant: 'Insuffisant',
};

export const CATEGORIE_LABELS: Record<EvalCategorieFiche, string> = {
  contractuel: 'Contractuel',
  mis_a_disposition: 'Mis à disposition',
  decisionnaire: 'Décisionnaire',
};

export const DECISION_LABELS: Record<EvalTypeDecision, string> = {
  prime: 'Prime',
  lettre_felicitation: 'Lettre de félicitations',
  promotion: 'Promotion',
  aucune: 'Aucune',
  avertissement: 'Avertissement',
};
