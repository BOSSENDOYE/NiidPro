import client from './client';

export interface OrgUnit {
  id: number;
  code: string;
  libelle: string;
  type: 'gouvernance' | 'appui' | 'cellule' | 'direction' | 'division';
  niveau: number;
  parent_id: number | null;
  ordre: number;
  nb_agents?: number;
}

export const organisationUnitApi = {
  list:   ()                           => client.get<OrgUnit[]>('/organisation-units'),
  create: (data: Partial<OrgUnit>)     => client.post<OrgUnit>('/organisation-units', data),
  update: (id: number, data: Partial<OrgUnit>) => client.put<OrgUnit>(`/organisation-units/${id}`, data),
  destroy:(id: number)                 => client.delete<{ message: string }>(`/organisation-units/${id}`),
  seed:   ()                           => client.post<{ message: string }>('/organisation-units/seed', {}),
};
