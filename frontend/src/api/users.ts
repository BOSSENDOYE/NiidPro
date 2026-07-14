import client from './client';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  role: string | null;
  photo_url: string | null;
  employee_id: number | null;
  employee_name: string | null;
  employee_number: string | null;
  department_id: number | null;
  department_name: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role?: string | null;
  is_active?: boolean;
  employee_id?: number | null;
  department_id?: number | null;
}

export const usersApi = {
  list: () => client.get<ManagedUser[]>('/users'),
  create: (data: UserPayload) => client.post<ManagedUser>('/users', data),
  update: (id: number, data: UserPayload) => client.put<ManagedUser>(`/users/${id}`, data),
  remove: (id: number) => client.delete(`/users/${id}`),
};
