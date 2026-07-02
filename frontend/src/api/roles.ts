import client from './client';

export interface AppRole {
  id: number;
  name: string;
  users_count: number;
  permissions: string[];
}

export interface PermEntry {
  name: string;
  label: string;
}

export interface PermModule {
  label: string;
  icon: string;
  perms: PermEntry[];
}

export interface RolesResponse {
  roles: AppRole[];
  modules: PermModule[];
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
