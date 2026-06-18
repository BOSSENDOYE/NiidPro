import client from './client';

export interface AppRole {
  id: number;
  name: string;
  users_count: number;
  permissions: string[];
}

export interface RolesResponse {
  roles: AppRole[];
  permissions: string[];
}

export interface RolePayload {
  name: string;
  permissions: string[];
}

export const rolesApi = {
  list: () => client.get<RolesResponse>('/roles'),
  create: (data: RolePayload) => client.post<AppRole>('/roles', data),
  update: (id: number, data: RolePayload) => client.put<AppRole>(`/roles/${id}`, data),
  remove: (id: number) => client.delete(`/roles/${id}`),
};
