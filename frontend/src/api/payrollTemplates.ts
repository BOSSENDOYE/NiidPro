import client from './client';

export type TemplateLineType = 'base' | 'augmentation' | 'ipress' | 'ipm' | 'css' | 'ir' | 'trimf' | 'retenue';

export interface PayrollTemplateLine {
  id?: number;
  template_id?: number;
  type: TemplateLineType;
  rubrique_id?: number | null;
  rubrique_type?: string | null;
  code?: string;
  libelle: string;
  nombre: number;
  base_calcul: number;
  gain: number;
  taux_salarial: number;
  retenu_salarial: number;
  taux_patronal: number;
  retenu_patronal: number;
  ordre?: number;
}

export interface PayrollTemplate {
  id: number;
  name: string;
  description?: string;
  creation_date?: string;
  is_active: boolean;
  lines?: PayrollTemplateLine[];
  created_at?: string;
  updated_at?: string;
}

export interface RubriqueOption {
  id: number;
  rubrique_type: string;
  code: string;
  libelle: string;
  taux_salarial: number;
  taux_patronal: number;
  // extras selon le type
  unite?: string;
  sens?: string;
  plafond?: number;
  valeur?: number;  // montant fixe (retenues diverses)
}

// ── API calls ──────────────────────────────────────────────────────────────

export const getPayrollTemplates = () =>
  client.get<PayrollTemplate[]>('/payroll-templates').then(r => r.data);

export const getPayrollTemplate = (id: number) =>
  client.get<PayrollTemplate>(`/payroll-templates/${id}`).then(r => r.data);

export const createPayrollTemplate = (data: Omit<PayrollTemplate, 'id'> & { lines: PayrollTemplateLine[] }) =>
  client.post<PayrollTemplate>('/payroll-templates', data).then(r => r.data);

export const updatePayrollTemplate = (
  id: number,
  data: Partial<PayrollTemplate> & { lines?: PayrollTemplateLine[] }
) => client.put<PayrollTemplate>(`/payroll-templates/${id}`, data).then(r => r.data);

export const deletePayrollTemplate = (id: number) =>
  client.delete(`/payroll-templates/${id}`).then(r => r.data);

export const getRubriquesForType = (type: TemplateLineType) =>
  client.get<RubriqueOption[]>(`/payroll-templates/rubriques/${type}`).then(r => r.data);
