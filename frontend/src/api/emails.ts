import client from './client';

export interface SendEmailPayload {
  to_email: string;
  to_name?: string;
  subject: string;
  body: string;
  employee_id?: number;
}

export const emailsApi = {
  send: (data: SendEmailPayload) => client.post('/emails/send', data),
  list: (params?: Record<string, unknown>) => client.get('/emails', { params }),
};
