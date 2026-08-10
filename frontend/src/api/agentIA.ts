import client from './client';

export const agentIAApi = {
  chat: (message: string): Promise<{ reply: string }> =>
    client.post<{ reply: string }>('/ia/chat', { message }).then(r => r.data),
};
