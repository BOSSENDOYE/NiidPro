import client from './client';

export interface ContractArchive {
  id: number;
  original_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  label?: string;
  employee_id?: number;
  employee?: { id: number; name: string; number: string };
  uploader?: { id: number; name: string };
  created_at: string;
}

export const contractArchivesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<ContractArchive[]>('/contract-archives', { params }),

  upload: (formData: FormData) =>
    client.post<ContractArchive[]>('/contract-archives', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  download: (id: number) =>
    client.get(`/contract-archives/${id}/download`, { responseType: 'blob' }),

  delete: (id: number) =>
    client.delete(`/contract-archives/${id}`),
};
