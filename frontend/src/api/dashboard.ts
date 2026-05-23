import client from './client';
import type { DashboardStats } from '../types';

export const dashboardApi = {
  stats: () => client.get<DashboardStats>('/dashboard'),
};
