import client from './client';

export interface MailSettings {
  mailer: string;
  host: string | null;
  port: number | null;
  username: string | null;
  has_password: boolean;
  encryption: string;       // tls | ssl | none
  from_address: string | null;
  from_name: string | null;
}

export interface MailSettingsPayload {
  mailer: string;
  host?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  encryption?: string;
  from_address?: string | null;
  from_name?: string | null;
}

export const mailSettingsApi = {
  get: () => client.get<MailSettings>('/mail-settings'),
  update: (data: MailSettingsPayload) => client.post<MailSettings>('/mail-settings', data),
  test: (to: string) => client.post<{ message: string }>('/mail-settings/test', { to }),
};
