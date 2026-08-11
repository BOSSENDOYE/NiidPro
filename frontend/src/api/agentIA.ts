import client from './client';

export interface IAFile {
  id:            number;
  filename:      string;
  media_type:    string;
  size_kb:       number;
  is_persistent: boolean;
  type_label:    'image' | 'pdf' | 'texte' | 'document';
  created_at?:   string;
}

export const agentIAApi = {
  chat: (message: string, fileId?: number): Promise<{ reply: string }> =>
    client.post<{ reply: string }>('/ia/chat', {
      message,
      ...(fileId !== undefined ? { file_id: fileId } : {}),
    }).then(r => r.data),

  clearHistory: (): Promise<{ message: string }> =>
    client.delete<{ message: string }>('/ia/history').then(r => r.data),

  uploadFile: (file: File): Promise<IAFile> => {
    const form = new FormData();
    form.append('file', file);
    return client.post<IAFile>('/ia/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  listFiles: (): Promise<IAFile[]> =>
    client.get<IAFile[]>('/ia/files').then(r => r.data),

  deleteFile: (id: number): Promise<void> =>
    client.delete(`/ia/files/${id}`).then(() => undefined),

  togglePersistent: (id: number): Promise<IAFile> =>
    client.patch<IAFile>(`/ia/files/${id}/persistent`).then(r => r.data),
};
