import client from './client';
import type { User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    client.post<{ token: string; user: User }>('/auth/login', { email, password }),

  logout: () => client.post('/auth/logout'),

  me: () => client.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) => client.put('/auth/profile', data),

  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    client.put('/auth/password', data),
};
