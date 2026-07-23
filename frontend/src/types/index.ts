export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
  employee?: Employee;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  color?: string;
  is_active: boolean;
  parent_id?: number;
  employees_count?: number;
  parent?: Department;
  children?: Department[];
  manager?: Employee;
}

export interface Position {
  id: number;
  title: string;
  code: string;
  department_id: number;
  base_salary_min?: number;
  base_salary_max?: number;
}

export interface Employee {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  professional_email: string;
  personal_email?: string;
  phone_personal?: string;
  phone_professional?: string;
  /** @deprecated use phone_personal / phone_professional */
  phone?: string;
  hire_date: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  nationality?: string;
  national_id?: string;
  address?: string;
  postal_code?: string;
  base_salary: number;
  status: 'active' | 'inactive' | 'suspended' | 'on_leave' | 'terminated';
  department?: Department;
  position?: Position;
  department_id: number;
  position_id: number;
  country?: string;
  city?: string;
  annual_leave_days: number;
  photo_url?: string;
  nbre_jour_restant?:      number;
  nbre_jour_conge?:        number;
  nombre_enfants_charge?:  number;
  a_medaille_travail?:     boolean;
  anciennete_recrutement?: string;
  family_members?:         EmployeeFamilyMember[];
  payroll_template_id?:    number | null;
  indice_id?:              number | null;
  indice?:                 RecruitmentIndice;
  part_ir?:                number | null;
  part_trimf?:             number | null;
  // Carrière
  categorie_emploi?: string;
  echelon?: string;
  fonction?: string;
  qualification?: string;
  // Filière organisationnelle
  organisation_unit_id?: number | null;
  organisation_unit?: import('../api/organisationUnits').OrgUnit;
}

export interface EnrollmentRequest {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  date_naissance: string;
  lieu_naissance: string;
  date_embauche: string;
  fonction: string;
  telephone: string;
  email: string;
  categorie_emploi?: string;
  qualification?: string;
  photo_path?: string;
  photo_url?: string;
  status: 'pending' | 'validated' | 'rejected';
  rejection_reason?: string;
  matched_employee_id?: number;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  reviewer?: { id: number; name: string };
  matched_employee?: Employee;
}

export interface EmployeeFamilyMember {
  id?: number;
  employee_id?: number;
  relation: 'Conjoint(e)' | 'Fils' | 'Fille' | 'Autre';
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  gender?: 'M' | 'F' | null;
  activity?: string | null;
  document_type?: string | null;
  age?: number | null;
  is_child?: boolean;
}

export interface Contract {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'CDI' | 'CDD' | 'DECRET' | 'DETACHEMENT' | 'Stage' | 'Alternance' | 'Prestation' | 'Autre';
  start_date: string;
  end_date?: string;
  salary: number;
  working_hours_per_week: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee?: Employee;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'holiday' | 'remote';
  worked_minutes?: number;
  source: 'web' | 'mobile' | 'badge' | 'manual';
  notes?: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  category?: string;
  color: string;
  paid: boolean;
  max_days_per_year?: number | null;
  requires_justification?: boolean;
  is_active?: boolean;
}

export interface Leave {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leaveType?: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  comment?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
}

export interface ExpiringContract {
  contract_id: number;
  employee_id: number;
  employee_name: string;
  department: string;
  contract_type: string;
  end_date: string;
  days_left: number;
}

export interface DashboardStats {
  today_attendance: {
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    on_leave: number;
  };
  pending_leaves: number;
  pending_justifications: number;
  expiring_contracts: number;
  expiring_contracts_list: ExpiringContract[];
  total_employees: number;
  by_department: { id: number; name: string; color: string; count: number }[];
  by_fonction:   { fonction: string; count: number }[];
  by_categorie:  { categorie: string; count: number }[];
  recent_activity: { type: string; message: string; date: string }[];
}

export interface Availability {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'remote' | 'mission' | 'training' | 'secondment' | 'personal' | 'suspension';
  start_date: string;
  end_date: string;
  location?: string;
  description?: string;
  status: 'pending' | 'approved' | 'active' | 'ended' | 'cancelled';
  approved_by?: string;
  created_at: string;
}

export interface Distinction {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'medal' | 'commendation' | 'award' | 'diploma' | 'certificate';
  name: string;
  issuing_authority?: string;
  award_date: string;
  level?: 'national' | 'regional' | 'local' | 'internal';
  description?: string;
  created_at: string;
}

export interface Evaluation {
  id: number;
  employee_id: number;
  employee?: Employee;
  evaluator_name?: string;
  period: string;           // ex: "T1 2025", "Annuelle 2025"
  evaluation_date: string;
  score_performance: number;    // 1–5
  score_punctuality: number;    // 1–5
  score_teamwork: number;       // 1–5
  score_initiative: number;     // 1–5
  score_communication: number;  // 1–5
  overall_score: number;        // moyenne arrondie à 2 déc.
  rating: 'excellent' | 'good' | 'satisfactory' | 'insufficient';
  status: 'draft' | 'submitted' | 'validated';
  comments?: string;
  objectives?: string;
  created_at: string;
}

export interface DocumentTemplateSettings {
  ministry?:         string;
  signataire_name?:  string;
  signataire_title?: string;
  ampliations?:      string[];
  objet?:            string;
  document_title?:   string;
}

export interface DocumentTemplate {
  id: number;
  type: string;
  name: string;
  content: string;
  status: 'active' | 'archived';
  description?: string;
  settings?: DocumentTemplateSettings;
  created_by?: number;
  creator?: User;
  generated_documents_count?: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: number;
  template_id: number;
  template?: DocumentTemplate;
  employee_id: number;
  employee?: Employee;
  type: string;
  reference: string;
  content_final: string;
  generated_by?: number;
  generator?: User;
  created_at: string;
}

export interface Sanction {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'avertissement' | 'blame' | 'mise_a_pied' | 'retrogradation' | 'licenciement' | 'autre';
  reason: string;
  sanction_date: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  decided_by?: string;
  reference?: string;
  status: 'active' | 'lifted';
  notes?: string;
  document_path?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingType {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface TrainingProvider {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface TrainingBudget {
  id: number;
  name: string;
  department_id?: number | null;
  department?: Department;
  year: number;
  amount: number;
  consumed_amount?: number;
  remaining_amount?: number;
}

export interface TrainingCostCenter {
  id: number;
  name: string;
  code: string;
  department_id?: number | null;
  department?: Department;
  description?: string;
  is_active: boolean;
}

export interface TrainingDocument {
  id: number;
  training_id: number;
  employee_id?: number | null;
  employee?: Employee;
  category: 'piece_jointe' | 'support' | 'certificat' | 'rapport' | 'autre';
  name: string;
  file_path: string;
  url?: string;
  mime_type?: string;
  file_size?: number;
  uploaded_by?: number;
  created_at: string;
}

export interface TrainingStatistics {
  year: number;
  kpis: {
    total: number; pending: number; approved: number; planned: number;
    in_progress: number; completed: number; rejected: number; total_cost: number;
  };
  by_service: { service: string; count: number; completed: number; cost: number }[];
  by_type: { type: string; count: number }[];
  by_employee: { employee_id: number; name: string; department: string; trainings: number; present: number }[];
  participation_rate: number;
  by_year: { year: number; total: number; completed: number; cost: number }[];
}

export interface TrainingEmployeeHistory {
  training_id: number;
  title: string;
  type?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  score?: number;
}

export interface Training {
  id: number;
  title: string;
  training_type_id: number;
  trainingType?: TrainingType;
  provider_id?: number | null;
  provider?: TrainingProvider;
  is_internal: boolean;
  objectives: string;
  justification: string;
  participants_count: number;
  desired_date?: string;
  duration_days: number;
  location?: string;
  estimated_cost?: number | null;
  funding_source?: string;
  cost_center_id?: number | null;
  costCenter?: TrainingCostCenter;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'needs_info' | 'approved' | 'rejected' | 'planned' | 'in_progress' | 'completed' | 'archived';
  approved_by?: number;
  approved_at?: string;
  start_date?: string;
  end_date?: string;
  actual_cost?: number;
  rejection_reason?: string;
  info_request?: string;
  report?: string;
  recommendations?: string;
  overall_score?: number;
  created_by?: number;
  creator?: User;
  approver?: User;
  participants?: TrainingParticipant[];
  attendances?: TrainingAttendance[];
  evaluations?: TrainingEvaluation[];
  documents?: TrainingDocument[];
  created_at: string;
}

export interface TrainingParticipant {
  id: number;
  training_id: number;
  employee_id: number;
  employee?: Employee;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmed_at?: string;
  notes?: string;
}

export interface TrainingAttendance {
  id: number;
  training_id: number;
  employee_id: number;
  employee?: Employee;
  attendance_date: string;
  present: boolean;
  absence_reason?: string;
}

export interface TrainingRequest {
  id: number;
  training_id: number;
  training?: Training;
  employee_id: number;
  employee?: Employee;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface TrainingEvaluation {
  id: number;
  training_id: number;
  training?: Training;
  employee_id: number;
  employee?: Employee;
  score?: number;
  feedback?: string;
  evaluator_name?: string;
  evaluation_date?: string;
  recommendations?: string;
  status?: 'pending' | 'completed';
  created_at: string;
}

// ─── RECRUTEMENT ──────────────────────────────────────────────────────────────

export interface RecruitmentRequest {
  id: number;
  department_id: number;
  department?: Department;
  position_title: string;
  number_of_positions: number;
  contract_type: 'CDI' | 'CDD' | 'Stage' | 'Consultant' | 'Freelance' | 'Autre';
  desired_start_date?: string;
  justification: string;
  hierarchical_level?: string;
  budget?: number;
  requested_by: number;
  requester?: User;
  status: 'draft' | 'pending_rh' | 'approved' | 'rejected' | 'in_progress' | 'closed';
  rejection_reason?: string;
  approved_by?: number;
  approver?: User;
  approved_at?: string;
  job_postings?: JobPosting[];
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: number;
  recruitment_request_id?: number;
  recruitment_request?: RecruitmentRequest;
  department_id: number;
  department?: Department;
  title: string;
  location?: string;
  supervisor_id?: number;
  supervisor?: Employee;
  description?: string;
  missions?: string;
  responsibilities?: string;
  education_level?: string;
  required_diplomas?: string;
  required_experience_years?: number;
  technical_skills?: string[];
  behavioral_skills?: string[];
  required_certifications?: string;
  required_languages?: string[];
  publication_type: 'internal' | 'external' | 'both';
  status: 'draft' | 'published' | 'closed' | 'archived';
  published_at?: string;
  closing_date?: string;
  created_by: number;
  creator?: User;
  criteria?: JobPostingCriterion[];
  applications?: JobApplication[];
  applications_count?: number;
  created_at: string;
  updated_at: string;
}

export interface JobPostingCriterion {
  id: number;
  job_posting_id: number;
  name: string;
  weight: number;
  minimum_level: number;
  is_eliminatory: boolean;
  created_at: string;
}

export interface JobApplication {
  id: number;
  job_posting_id: number;
  job_posting?: JobPosting;
  application_number: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone?: string;
  application_date: string;
  status: 'received' | 'pre_selected' | 'rejected_pre' | 'convoked' | 'interviewed' | 'rejected' | 'selected' | 'hired';
  cv_path?: string;
  cover_letter_path?: string;
  overall_score?: number;
  notes?: string;
  is_internal: boolean;
  employee_id?: number;
  employee?: Employee;
  documents?: ApplicationDocument[];
  interviews?: Interview[];
  created_at: string;
}

export interface ApplicationDocument {
  id: number;
  application_id: number;
  type: 'cv' | 'lettre_motivation' | 'diplome' | 'certificat' | 'autre';
  name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  created_at: string;
}

export interface Interview {
  id: number;
  job_posting_id: number;
  job_posting?: JobPosting;
  application_id: number;
  application?: JobApplication;
  scheduled_at: string;
  location?: string;
  type: 'entretien' | 'test_technique' | 'test_psychotechnique';
  status: 'scheduled' | 'completed' | 'cancelled';
  result: 'pending' | 'admitted' | 'rejected';
  notes?: string;
  created_by: number;
  creator?: User;
  evaluations?: InterviewEvaluation[];
  created_at: string;
}

export interface InterviewEvaluation {
  id: number;
  interview_id: number;
  evaluator_id: number;
  evaluator?: User;
  criterion_id?: number;
  criterion?: JobPostingCriterion;
  criterion_name?: string;
  score: number;
  comment?: string;
  created_at: string;
}

// ─── PARAMÈTRES RECRUTEMENT ───────────────────────────────────────────────────

export interface RecruitmentIndice {
  id: number;
  code: string;
  hierarchy_id?: number | null;
  hierarchy?: RecruitmentHierarchy;
  classe?: string;
  echelon_label?: string;
  valeur_point?: number | null;
  valeur: number;
  solde_mensuelle?: number | null;
  garde?: string;
  description?: string;
  is_active: boolean;
  augmentations?: RecruitmentAugmentation[];
  created_at: string;
}

export interface RecruitmentHierarchy {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  ordre: number;
  is_active: boolean;
  created_at: string;
}

export interface PaieClasse {
  id: number;
  hierarchy_id: number;
  hierarchy?: RecruitmentHierarchy;
  code: string;
  libelle: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface PaieEchelon {
  id: number;
  class_id: number;
  classe?: PaieClasse;
  numero: number;
  libelle?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface RecruitmentAugmentation {
  id: number;
  libelle: string;
  type: 'indiciaire' | 'indemnitaire' | 'prime' | 'autre';
  taux?: number | null;
  unite?: 'pourcentage' | 'montant' | null;
  date_effet?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  pivot?: { montant?: number | null };
}

export interface PayrollCotisation {
  id: number;
  code?: string | null;
  libelle: string;
  type: 'IPRES' | 'CSS' | 'IPM' | 'IR' | 'TRIMF' | 'autre';
  taux_salarial?: number | null;
  taux_patronal?: number | null;
  plafond?: number | null;
  assiette: 'brut' | 'net' | 'autre';
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface PayrollAutreRubrique {
  id: number;
  code?: string | null;
  libelle: string;
  type: 'prime' | 'avantage_nature' | 'deduction' | 'retenue' | 'allocation' | 'autre';
  sens: 'gain' | 'retenue';
  unite?: 'pourcentage' | 'montant' | null;
  valeur?: number | null;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface RecruitmentBareme {
  id: number;
  hierarchy_id?: number | null;
  hierarchy?: RecruitmentHierarchy;
  indice_id?: number | null;
  indice?: RecruitmentIndice;
  echelon?: number;
  salaire_base?: number;
  date_application?: string;
  is_active: boolean;
  revenu_brut?: number;
  trimf_pers?: number;
  part_1?: number;
  part_1_5?: number;
  part_2?: number;
  part_2_5?: number;
  part_3?: number;
  part_3_5?: number;
  part_4?: number;
  part_4_5?: number;
  part_5?: number;
  id_bareme?: string;
  created_at: string;
}

export interface RecruitmentStatistics {
  requests: {
    total: number; draft: number; pending_rh: number;
    approved: number; in_progress: number; closed: number;
  };
  postings: { total: number; draft: number; published: number; closed: number };
  applications: { total: number; received: number; pre_selected: number; hired: number };
  interviews: { total: number; scheduled: number; completed: number };
  by_department: { department_id: number; total: number; department?: Department }[];
}

// ─── Plan de Recrutement ────────────────────────────────────────────────────

export type ClassificationCCNI = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type EtapeRecrutement =
  | 'analyse_besoin' | 'elaboration_fiche' | 'publication' | 'selection_cv'
  | 'tests_ecrits' | 'entretien_rh' | 'entretien_commission' | 'deliberation'
  | 'decision_dg' | 'integration' | 'essai' | 'cloture';

export interface PlanPoste {
  id: number;
  titre: string;
  direction_id: number;
  direction?: Department;
  classification_ccni: ClassificationCCNI;
  type_contrat_defaut: 'CDI' | 'CDD' | 'DECRET' | 'Stage';
  statut: 'actif' | 'inactif';
  description?: string;
  created_at: string;
}

export interface BesoinRecrutement {
  id: number;
  poste_id: number;
  poste?: PlanPoste;
  direction_id: number;
  direction?: Department;
  motif: 'depart' | 'nouveau_besoin' | 'projet';
  date_constat: string;
  description?: string;
  statut: 'collecte' | 'valide' | 'rejete';
  created_by?: number;
  createdBy?: User;
  created_at: string;
}

export interface PlanRecrutement {
  id: number;
  annee: number;
  titre: string;
  periode_debut: string;
  periode_fin: string;
  enveloppe_budgetaire?: number;
  statut: 'brouillon' | 'valide_dg';
  valide_par_user_id?: number;
  validePar?: User;
  date_validation?: string;
  notes?: string;
  lignes?: LignePlan[];
  lignes_count?: number;
  created_at: string;
}

export interface LignePlan {
  id: number;
  plan_recrutement_id: number;
  planRecrutement?: PlanRecrutement;
  besoin_id?: number;
  besoin?: BesoinRecrutement;
  classification_ccni: ClassificationCCNI;
  type_contrat: 'CDI' | 'CDD' | 'DECRET' | 'Stage';
  duree_cdd?: number;
  salaire_base_estime?: number;
  cout_estime?: number;
  urgence_operationnelle: number;
  impact_reglementaire: number;
  disponibilite_budgetaire: number;
  profil_marche_disponible: number;
  priorite_score?: number;
  notes?: string;
  processus?: ProcessusRecrutement[];
  created_at: string;
}

export interface FichePoste {
  id: number;
  poste_id: number;
  poste?: PlanPoste;
  version: number;
  contenu_json: Record<string, unknown>;
  classification_ccni: ClassificationCCNI;
  statut: 'brouillon' | 'valide_sg';
  valide_par_user_id?: number;
  validePar?: User;
  date_validation?: string;
  created_at: string;
}

export interface ProcessusRecrutement {
  id: number;
  ligne_plan_id: number;
  lignePlan?: LignePlan;
  etape_courante: EtapeRecrutement;
  statut: 'en_cours' | 'cloture' | 'abandonne';
  date_demarrage: string;
  notes?: string;
  etapesHistorique?: EtapeHistorique[];
  commissionMembres?: CommissionMembre[];
  candidatures?: CandidaturePlan[];
  decisions?: DecisionRecrutement[];
  created_at: string;
}

export interface EtapeHistorique {
  id: number;
  processus_id: number;
  etape: EtapeRecrutement;
  date_entree: string;
  date_sortie?: string;
  valide_par_user_id?: number;
  validePar?: User;
  role_validateur?: string;
  commentaire?: string;
  created_at: string;
}

export interface CommissionMembre {
  id: number;
  processus_id: number;
  user_id: number;
  user?: User;
  role: 'president' | 'rrh' | 'expert_technique';
  created_at: string;
}

export interface CandidaturePlan {
  id: number;
  processus_id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  cv_path?: string;
  lettre_path?: string;
  statut: 'recu' | 'shortliste' | 'test' | 'entretien' | 'retenu' | 'rejete';
  score?: number;
  notes?: string;
  created_at: string;
}

export interface DecisionRecrutement {
  id: number;
  processus_id: number;
  candidature_id?: number;
  candidature?: CandidaturePlan;
  type: 'recrute' | 'non_recrute' | 'reporte' | 'annule';
  commentaire?: string;
  valide_par_dg_user_id?: number;
  validePar?: User;
  date_decision: string;
  contrat?: ContratRecrutement;
  created_at: string;
}

export interface ContratRecrutement {
  id: number;
  decision_id: number;
  type_contrat: 'CDI' | 'CDD' | 'DECRET' | 'Stage';
  date_debut: string;
  date_fin?: string;
  date_fin_essai?: string;
  salaire_base: number;
  notes?: string;
  rapportsEssai?: PeriodeEssaiRapport[];
  created_at: string;
}

export interface PeriodeEssaiRapport {
  id: number;
  contrat_id: number;
  date_rapport: string;
  tuteur_id?: number;
  tuteur?: User;
  appreciation: 'insuffisant' | 'satisfaisant' | 'bien' | 'tres_bien';
  recommandation: 'confirmer' | 'prolonger' | 'rompre';
  observations?: string;
  created_at: string;
}

export interface PlanRecrutementDashboard {
  total_plans: number;
  besoins_by_statut: Record<string, number>;
  processus_by_statut: Record<string, number>;
  candidatures_by_statut: Record<string, number>;
}

// ─── Plan de Formation ────────────────────────────────────────────────────────

export type TypePrestataire = 'externe' | 'public' | 'interne' | 'bailleurs';
export type CategorieFormation = 'reglementaire' | 'manageriale' | 'metier' | 'rh' | 'developpement_personnel' | 'integration';
export type ModeFormation = 'presentiel' | 'distanciel' | 'mixte' | 'tutorat';
export type CaractereFormation = 'obligatoire' | 'prioritaire' | 'complementaire';
export type SourceFinancement = 'budget_propre' | '3fpt' | 'cooperation' | 'bailleurs';
export type SourceBesoinFormation = 'entretien_annuel' | 'direction' | 'rh' | 'reglementaire';
export type StatutSession = 'planifiee' | 'en_cours' | 'realisee' | 'annulee';
export type StatutInscription = 'inscrit' | 'present' | 'absent' | 'certifie';
export type TypeEvaluation = 'a_chaud' | 'acquis_j30' | 'transfert_n90';

export interface FormationPrestataire {
  id: number;
  nom: string;
  type: TypePrestataire;
  contact_nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  statut: 'actif' | 'inactif';
  created_at: string;
}

export interface FormationAction {
  id: number;
  intitule: string;
  objectifs_pedagogiques?: string;
  categorie: CategorieFormation;
  duree_jours: number;
  mode: ModeFormation;
  caractere: CaractereFormation;
  cout_unitaire_estime?: number;
  prestataire_id?: number;
  prestataire?: FormationPrestataire;
  statut: 'actif' | 'inactif';
  created_at: string;
}

export interface FormationBesoin {
  id: number;
  action_id?: number;
  action?: FormationAction;
  intitule_libre?: string;
  direction_id: number;
  direction?: { id: number; name: string };
  employee_id?: number;
  employee?: Employee;
  annee: number;
  source: SourceBesoinFormation;
  commentaire?: string;
  statut: 'collecte' | 'retenu' | 'rejete';
  created_by?: number;
  created_at: string;
}

export interface PlanFormation {
  id: number;
  annee: number;
  titre: string;
  periode_debut: string;
  periode_fin: string;
  enveloppe_budgetaire?: number;
  statut: 'brouillon' | 'soumis' | 'valide_dg';
  valide_par_user_id?: number;
  validePar?: User;
  date_validation?: string;
  notes?: string;
  lignes?: LignePlanFormation[];
  lignes_count?: number;
  created_at: string;
}

export interface LignePlanFormation {
  id: number;
  plan_formation_id: number;
  plan?: PlanFormation;
  action_id: number;
  action?: FormationAction;
  besoin_id?: number;
  besoin?: FormationBesoin;
  direction_id: number;
  direction?: { id: number; name: string };
  nb_participants_prevu: number;
  dates_previsionnelles?: string;
  cout_unitaire?: number;
  cout_total?: number;
  source_financement: SourceFinancement;
  caractere: CaractereFormation;
  notes?: string;
  sessions?: FormationSession[];
  created_at: string;
}

export interface FormationSession {
  id: number;
  ligne_plan_id: number;
  lignePlan?: LignePlanFormation;
  date_debut: string;
  date_fin: string;
  lieu?: string;
  prestataire_id?: number;
  prestataire?: FormationPrestataire;
  nb_participants_reel?: number;
  cout_reel?: number;
  statut: StatutSession;
  notes?: string;
  inscriptions?: FormationInscription[];
  created_at: string;
}

export interface FormationInscription {
  id: number;
  session_id: number;
  session?: FormationSession;
  employee_id: number;
  employee?: Employee;
  statut: StatutInscription;
  attestation_path?: string;
  date_attestation?: string;
  notes?: string;
  evaluations?: FormationEvaluation[];
  created_at: string;
}

export interface FormationEvaluation {
  id: number;
  inscription_id: number;
  inscription?: FormationInscription;
  type: TypeEvaluation;
  score?: number;
  commentaire?: string;
  evalue_par_user_id?: number;
  evaluePar?: User;
  date_evaluation: string;
  created_at: string;
}

export interface PlanFormationDashboard {
  kpis: {
    taux_acces: number;
    jours_moyen: number;
    taux_budget: number;
    taux_satisfaction: number | null;
    taux_transfert: number | null;
    taux_realisation: number;
    agents_formes: number;
    budget_alloue: number;
    budget_consomme: number;
  };
  prochaines_sessions: FormationSession[];
  plans_recents: PlanFormation[];
}

// ── Évaluation Période d'Essai ────────────────────────────────────────────────

export type TypeEvaluationEssai = '3_mois' | '6_mois';
export type CategorieEssai = 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'D' | 'E';
export type StatutEvaluation = 'brouillon' | 'auto_evaluation' | 'entretien' | 'signe' | 'valide_rrh' | 'decision_dg' | 'archive';
export type StatutDossierEvaluation = 'en_cours' | 'confirme' | 'renouvele' | 'non_confirme' | 'en_attente';
export type AppreciationEvaluation = 'insuffisant' | 'passable' | 'satisfaisant' | 'excellent';
export type DecisionEvaluation = 'confirmation' | 'renouvellement' | 'non_confirmation';
export type GroupeCritere = 'competences_techniques' | 'comportement_relations' | 'aptitudes_personnelles';

export interface EvaluationCritere {
  id: number;
  code: string;
  libelle: string;
  groupe: GroupeCritere;
  poids: number;
  ordre: number;
  actif: boolean;
}

export interface EvaluationNote {
  id: number;
  evaluation_id: number;
  critere_id: number;
  note: number | null;
  note_ponderee: number | null;
  commentaire_agent: string | null;
  commentaire_hierarchique: string | null;
  critere?: EvaluationCritere;
}

export interface EvaluationHistoriqueItem {
  id: number;
  evaluation_id: number;
  user_id: number | null;
  etape: string;
  commentaire: string | null;
  created_at: string;
  user?: { id: number; name: string };
}

export interface EvaluationPeriodeEssai {
  id: number;
  employee_id: number;
  responsable_id: number | null;
  type: TypeEvaluationEssai;
  categorie: CategorieEssai;
  date_prise_poste: string;
  date_fin_periode: string;
  date_envoi_fiche: string | null;
  date_entretien: string | null;
  note_globale: number | null;
  appreciation: AppreciationEvaluation | null;
  decision_recommandee: DecisionEvaluation | null;
  commentaire_general: string | null;
  plan_amelioration: string | null;
  statut: StatutEvaluation;
  statut_dossier: StatutDossierEvaluation;
  signe_agent_at: string | null;
  signe_hierarchique_at: string | null;
  valide_rrh_at: string | null;
  valide_rrh_user_id: number | null;
  decision_dg_at: string | null;
  decision_dg_user_id: number | null;
  decision_finale: DecisionEvaluation | null;
  remarques_dg: string | null;
  employee?: Employee;
  responsable?: { id: number; name: string };
  valide_rrh_user?: { id: number; name: string };
  decision_dg_user?: { id: number; name: string };
  notations?: EvaluationNote[];
  historique?: EvaluationHistoriqueItem[];
}

export interface EvaluationDashboard {
  total: number;
  en_cours: number;
  confirmes: number;
  renouveles: number;
  non_confirmes: number;
  en_attente: number;
  prochains_entretiens: EvaluationPeriodeEssai[];
  recents: EvaluationPeriodeEssai[];
  repartition: { appreciation: string; count: number }[];
  a_echoir: EvaluationPeriodeEssai[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ÉVALUATION ANNUELLE — CDC-ANASER-EVAL-2026-01
// ═══════════════════════════════════════════════════════════════════════════════

export type EvalStatutCampagne = 'preparation' | 'active' | 'synthese' | 'cloturee';

export type EvalStatutFiche =
  | 'a_planifier'
  | 'planifiee'
  | 'en_cours'
  | 'signee_evaluateur'
  | 'signee_agent'
  | 'transmise_daf'
  | 'annotee_dg'
  | 'notifiee'
  | 'archivee';

export type EvalAppreciation =
  | 'excellent'
  | 'tres_satisfaisant'
  | 'satisfaisant'
  | 'a_ameliorer'
  | 'insuffisant';

export type EvalCategorieCritere = 'base' | 'complementaire' | 'fonctionnaire';
export type EvalStatutAgent = 'contractuel' | 'fonctionnaire' | 'decisionnaire';
export type EvalPrioriteFormation = 'haute' | 'moyenne' | 'faible';

export interface EvalCampagne {
  id: number;
  exercice: number;
  titre: string;
  statut: EvalStatutCampagne;
  date_lancement: string | null;
  date_limite_planification: string | null;
  date_limite_entretiens: string | null;
  date_limite_transmission: string | null;
  date_limite_synthese: string | null;
  date_cloture: string | null;
  periode_debut: string | null;
  periode_fin: string | null;
  note_service: string | null;
  cree_par: number | null;
  lance_par: number | null;
  lance_at: string | null;
  createur?: { id: number; name: string };
  lanceur?: { id: number; name: string };
  stats?: EvalCampagneStats;
  created_at: string;
  updated_at: string;
}

export interface EvalCampagneStats {
  total: number;
  a_planifier: number;
  planifiees: number;
  en_cours: number;
  signees: number;
  transmises: number;
  notifiees: number;
  archivees: number;
}

export interface EvalCritere {
  id: number;
  code: string;
  libelle: string;
  categorie: EvalCategorieCritere;
  ordre: number;
  actif: boolean;
}

export interface EvalNotation {
  id?: number;
  fiche_id: number;
  critere_id: number;
  note: 1 | 2 | 3 | 4 | 5 | null;
  observation: string | null;
  critere?: EvalCritere;
}

export interface EvalBesoinFormation {
  id?: number;
  fiche_id?: number;
  intitule: string;
  priorite: EvalPrioriteFormation;
  ordre?: number;
}

export interface EvalObjectif {
  id?: number;
  fiche_id?: number;
  objectif: string;
  indicateur: string | null;
  echeance: string | null;
  ordre?: number;
}

export interface EvalDecisionRh {
  id?: number;
  fiche_id?: number;
  formation: boolean;
  coaching: boolean;
  mobilite: boolean;
  felicitations: boolean;
  suivi_particulier: boolean;
  gratification: boolean;
  montant_gratification: string | null;
  autre: string | null;
  commentaire: string | null;
  decideur_id?: number | null;
  decide_at?: string | null;
}

export interface EvalFiche {
  id: number;
  campagne_id: number;
  employee_id: number;
  evaluateur_id: number | null;
  statut: EvalStatutFiche;
  statut_agent: EvalStatutAgent;
  snapshot_direction: string | null;
  snapshot_service: string | null;
  snapshot_fonction: string | null;
  snapshot_matricule: string | null;
  snapshot_superieur: string | null;
  snapshot_anciennete_mois: number | null;
  date_entretien: string | null;
  lieu_entretien: string | null;
  entretien_tenu: boolean;
  entretien_tenu_at: string | null;
  moyenne: number | null;
  appreciation: EvalAppreciation | null;
  realisations: string | null;
  difficultes: string | null;
  competences_demontrees: string | null;
  observations_evaluateur: string | null;
  observations_agent: string | null;
  refus_signature_agent: boolean;
  motif_refus_signature: string | null;
  signe_evaluateur_at: string | null;
  signe_agent_at: string | null;
  transmise_daf_at: string | null;
  notifiee_at: string | null;
  archivee_at: string | null;
  avis_chef_service: string | null;
  avis_dg: string | null;
  employee?: Employee;
  evaluateur?: { id: number; name: string };
  campagne?: EvalCampagne;
  notations?: EvalNotation[];
  besoins_formation?: EvalBesoinFormation[];
  objectifs?: EvalObjectif[];
  decision_rh?: EvalDecisionRh | null;
  created_at: string;
  updated_at: string;
}

export interface EvalSyntheseAgent {
  id: number;
  matricule: string | null;
  nom_complet: string;
  fonction: string | null;
  moyenne: number | null;
  appreciation: EvalAppreciation | null;
  decisions: EvalDecisionRh | null;
  besoins: string[];
}

export interface EvalSyntheseDirection {
  direction: string;
  nb_agents: number;
  moyenne_direction: number;
  agents: EvalSyntheseAgent[];
}

export interface EvalSynthese {
  campagne: { id: number; exercice: number; titre: string };
  synthese: EvalSyntheseDirection[];
  total_fiches: number;
  moyenne_globale: number;
}
