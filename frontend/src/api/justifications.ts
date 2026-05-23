import client from './client';

export interface Justification {
  id: number;
  employee_id: number;
  employee?: {
    id: number; first_name: string; last_name: string;
    employee_number: string; department?: { name: string };
  };
  attendance_id?: number;
  date: string;
  reason: string;
  file_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
}

export const justificationsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Justification[]>('/justifications', { params }),
  pending: () => client.get<Justification[]>('/justifications/pending'),
  get: (id: number) => client.get<Justification>(`/justifications/${id}`),
  approve: (id: number, comment?: string) =>
    client.post(`/justifications/${id}/approve`, { comment }),
  reject: (id: number, comment?: string) =>
    client.post(`/justifications/${id}/reject`, { comment }),
};
