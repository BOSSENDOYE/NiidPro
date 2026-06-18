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

export interface MatchResult {
  filename: string;
  type: string | null;
  status: 'matched' | 'ambiguous' | 'none';
  employee_id: number | null;
  employee_name: string | null;
  employee_number: string | null;
  candidates: { id: number; name: string }[];
}

export const contractArchivesApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<ContractArchive[]>('/contract-archives', { params }),

  match: (filenames: string[]) =>
    client.post<MatchResult[]>('/contract-archives/match', { filenames }),

  upload: (formData: FormData, onUploadProgress?: (pct: number) => void) =>
    client.post<ContractArchive[]>('/contract-archives', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min : évite une requête suspendue indéfiniment
      onUploadProgress: (e) => {
        if (onUploadProgress && e.total) {
          onUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }),

  preview: (id: number) =>
    client.get(`/contract-archives/${id}/preview`, { responseType: 'blob' }),

  delete: (id: number) =>
    client.delete(`/contract-archives/${id}`),
};
