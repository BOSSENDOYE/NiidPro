import client from './client';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: number;
  assignee?: { id: number; name: string };
  due_date?: string;
  created_by: number;
  creator?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export const tasksApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<Task[]>('/tasks', { params }),
  get: (id: number) => client.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => client.post<Task>('/tasks', data),
  update: (id: number, data: Partial<Task>) => client.put<Task>(`/tasks/${id}`, data),
  delete: (id: number) => client.delete(`/tasks/${id}`),
  updateStatus: (id: number, status: Task['status']) =>
    client.patch(`/tasks/${id}/status`, { status }),
};
