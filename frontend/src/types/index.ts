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
}

export interface Contract {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: 'CDI' | 'CDD' | 'Interim' | 'Freelance' | 'Stage' | 'Apprentissage';
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
  color: string;
  paid: boolean;
  max_days_per_year?: number;
  requires_justification?: boolean;
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
  total_employees: number;
  by_department: { id: number; name: string; color: string; count: number }[];
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
  type: 'attestation' | 'note_service';
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
  type: 'attestation' | 'note_service';
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
