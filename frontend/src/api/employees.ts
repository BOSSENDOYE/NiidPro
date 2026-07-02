import client from './client';
import type { Employee, PaginatedResponse } from '../types';

export interface IrppResult {
  trinf:        number;
  impo_sur_revn: number;
  montant_irpp: number;
}

export interface EmployeePayeData {
  employee_id: number;
  matricule: string;
  nom_complet: string;
  salaire_base: number;
  sursalaire: number;
  payroll_template_id: number | null;
  modele_libelle: string | null;
  Part_TRIMF: number;
  Part_IR: number;
  Part_Sociale: number;
  categorie_agent: string | null;
  Prime_de_sujection: number;
  rapel_avancement: number;
  indice_code: string | null;
  mld_solde: number;
}

export const employeesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Employee>>('/employees', { params }),

  get: (id: number) => client.get<Employee>(`/employees/${id}`),

  create: (data: Partial<Employee> | Record<string, unknown>) => client.post<Employee>('/employees', data),

  update: (id: number, data: Partial<Employee> | Record<string, unknown>) => client.put<Employee>(`/employees/${id}`, data),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return client.post<Employee>(`/employees/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) => client.delete(`/employees/${id}`),

  payeData: (id: number) =>
    client.get<EmployeePayeData>(`/employees/${id}/paye-data`),

  calculIrpp: (
    id: number,
    data: { sal_brut_social: number; indem_risque_sante: number; transport: number }
  ) => client.post<IrppResult>(`/employees/${id}/calcul-irpp`, data),

  heuresSup: (id: number, mois: number, annee: number) =>
    client.get<{ nbr_heure_sup: number; montant_heure_sup: number }>(
      `/employees/${id}/heures-sup`, { params: { mois, annee } }
    ),

  heuresCoupure: (id: number, mois: number, annee: number) =>
    client.get<{ nbr_heure_coupure: number }>(
      `/employees/${id}/heures-coupure`, { params: { mois, annee } }
    ),

  counts: () =>
    client.get<{ total: number; active: number; inactive: number; suspended: number }>('/employees/counts'),

  export: (params?: Record<string, string>) =>
    client.get('/employees/export', { params, responseType: 'blob' }),

  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<{ created: number; skipped: string[]; message: string }>(
      '/employees/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};
