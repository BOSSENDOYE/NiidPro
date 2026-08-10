import client from './client';

export const agentIAApi = {
  chat: (message: string): Promise<{ reply: string }> =>
    client.post<{ reply: string }>('/ia/chat', { message }).then(r => r.data),

  clearHistory: (): Promise<{ message: string }> =>
    client.delete<{ message: string }>('/ia/history').then(r => r.data),
};
