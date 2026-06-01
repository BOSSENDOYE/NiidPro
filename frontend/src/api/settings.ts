import client from './client';

export const settingsApi = {
  get: () => client.get<{ company_name: string }>('/settings'),
};
