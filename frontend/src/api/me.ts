import client from './client';
import type { Employee, Leave } from '../types';

export interface MeAttendanceRow {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_minutes: number | null;
  status: string;
  distance_metres: number | null;
}

export interface MeAttendances {
  today: MeAttendanceRow | null;
  history: MeAttendanceRow[];
}

export interface MeTask {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  creator?: { id: number; name: string };
  created_at: string;
}

export interface MeDocument {
  id: number;
  reference: string;
  type: string;
  title: string;
  created_at: string;
}

export interface LeaveBalance {
  employee_id: number;
  employee_name: string;
  [k: string]: unknown;
}

export interface ProfileUpdate {
  personal_email?: string | null;
  phone_personal?: string | null;
  phone_professional?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  birth_place?: string | null;
  nationality?: string | null;
  bank_account?: string | null;
  national_id?: string | null;
}

export const meApi = {
  profile: () => client.get<Employee>('/me/profile'),
  updateProfile: (data: ProfileUpdate) => client.put<Employee>('/me/profile', data),
  leaves: () => client.get<Leave[]>('/me/leaves'),
  leaveBalance: () => client.get<LeaveBalance>('/me/leave-balance'),
  createLeave: (data: { leave_type_id: number; start_date: string; end_date: string; reason?: string }) =>
    client.post('/me/leaves', data),

  attendances: () => client.get<MeAttendances>('/me/attendances'),
  checkIn: (coords?: { latitude: number; longitude: number }) =>
    client.post('/me/attendances/check-in', coords ?? {}),
  checkOut: (coords?: { latitude: number; longitude: number }) =>
    client.post('/me/attendances/check-out', coords ?? {}),

  tasks: () => client.get<MeTask[]>('/me/tasks'),
  updateTaskStatus: (id: number, status: MeTask['status']) =>
    client.patch(`/me/tasks/${id}/status`, { status }),

  documents: () => client.get<MeDocument[]>('/me/documents'),
};
