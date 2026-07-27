import client from './client';

export interface AssistantConfig {
  provider:      string;
  model:         string;
  system_prompt: string;
  max_tokens:    number;
  temperature:   number;
  is_active:     boolean;
  has_api_key:   boolean;
}

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface UploadedFile {
  type:      'image' | 'document' | 'text';
  content:   string;          // base64 pour image/document, texte brut pour text
  mime?:     string;
  filename:  string;
  size_kb:   number;
}

export const assistantApi = {
  getConfig: () =>
    client.get<AssistantConfig>('/assistant/config').then(r => r.data),

  updateConfig: (data: Partial<AssistantConfig> & { api_key?: string }) =>
    client.put<AssistantConfig & { message: string }>('/assistant/config', data).then(r => r.data),

  test: () =>
    client.post<{ ok: boolean; message: string }>('/assistant/test').then(r => r.data),

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<UploadedFile>('/assistant/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  chat: (message: string, history: ChatMessage[], file?: UploadedFile) =>
    client.post<{ reply: string }>('/assistant/chat', { message, history, file }).then(r => r.data),
};
