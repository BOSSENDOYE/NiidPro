import client from './client';

export interface CompanySettings {
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  pointage_radius: number | null;
  rccm: string | null;
  ninea: string | null;
  primary_color: string | null;
  description: string | null;
  // compat
  company_name: string;
}

export const settingsApi = {
  get: () => client.get<CompanySettings>('/settings'),

  update: (formData: FormData) =>
    client.post<CompanySettings>('/settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteLogo:  () => client.delete<CompanySettings>('/settings/logo'),
  deleteStamp: () => client.delete<CompanySettings>('/settings/stamp'),
};
