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
  absence_type?: string;
  reason: string;
  file_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  reviewer?: { name: string };
  created_at: string;
}

export const justificationsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Justification[]>('/justifications', { params }),

  pending: () => client.get<Justification[]>('/justifications/pending'),

  get: (id: number) => client.get<Justification>(`/justifications/${id}`),

  create: (data: {
    employee_id: number;
    absence_date: string;
    absence_type: string;
    reason: string;
    document?: File;
    attendance_id?: number;
  }) => {
    const fd = new FormData();
    fd.append('employee_id',  String(data.employee_id));
    fd.append('absence_date', data.absence_date);
    fd.append('absence_type', data.absence_type);
    fd.append('reason',       data.reason);
    if (data.attendance_id) fd.append('attendance_id', String(data.attendance_id));
    if (data.document)      fd.append('document', data.document);
    return client.post<Justification>('/justifications', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  approve: (id: number, comment?: string) =>
    client.post(`/justifications/${id}/approve`, { comment }),

  reject: (id: number, comment?: string) =>
    client.post(`/justifications/${id}/reject`, { comment }),
};
