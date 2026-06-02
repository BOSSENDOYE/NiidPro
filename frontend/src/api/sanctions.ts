import client from './client';
import type { Sanction } from '../types';

export const sanctionsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Sanction[]>('/sanctions', { params }),

  get: (id: number) => client.get<Sanction>(`/sanctions/${id}`),

  create: (data: {
    employee_id: number;
    type: string;
    reason: string;
    sanction_date: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    decided_by?: string;
    reference?: string;
    status?: string;
    notes?: string;
    document?: File;
  }) => {
    const fd = new FormData();
    fd.append('employee_id',   String(data.employee_id));
    fd.append('type',          data.type);
    fd.append('reason',        data.reason);
    fd.append('sanction_date', data.sanction_date);
    if (data.start_date)    fd.append('start_date',    data.start_date);
    if (data.end_date)      fd.append('end_date',      data.end_date);
    if (data.duration_days) fd.append('duration_days', String(data.duration_days));
    if (data.decided_by)    fd.append('decided_by',    data.decided_by);
    if (data.reference)     fd.append('reference',     data.reference);
    if (data.status)        fd.append('status',        data.status);
    if (data.notes)         fd.append('notes',         data.notes);
    if (data.document)      fd.append('document',      data.document);
    return client.post<Sanction>('/sanctions', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (id: number, data: Partial<{
    type: string; reason: string; sanction_date: string;
    start_date: string; end_date: string; duration_days: number;
    decided_by: string; reference: string; status: string; notes: string;
    document: File;
  }>) => {
    const fd = new FormData();
    fd.append('_method', 'PUT');
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (k === 'document' && v instanceof File) fd.append('document', v);
        else fd.append(k, String(v));
      }
    });
    return client.post<Sanction>(`/sanctions/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) => client.delete(`/sanctions/${id}`),
};
