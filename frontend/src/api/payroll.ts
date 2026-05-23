import client from './client';

export interface Payslip {
  id: number;
  employee_id: number;
  employee?: {
    id: number; first_name: string; last_name: string;
    employee_number: string; department?: { name: string };
  };
  month: number;
  year: number;
  gross_salary: number;
  net_salary: number;
  base_salary: number;
  bonuses: number;
  deductions: number;
  employer_charges: number;
  employee_charges: number;
  status: 'draft' | 'validated' | 'paid';
  paid_at?: string;
  pdf_url?: string;
  created_at: string;
}

export const payrollApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Payslip[]>('/payroll', { params }),
  get: (id: number) => client.get<Payslip>(`/payroll/${id}`),
  generate: (month: number, year: number) =>
    client.post<Payslip[]>('/payroll/generate', { month, year }),
  validate: (id: number) => client.post(`/payroll/${id}/validate`),
  markPaid: (id: number) => client.post(`/payroll/${id}/pay`),
  download: (id: number) => client.get(`/payroll/${id}/pdf`, { responseType: 'blob' }),
};
