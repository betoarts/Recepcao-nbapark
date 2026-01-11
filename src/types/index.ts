
export type UserRole = 'receptionist' | 'employee' | 'admin';
export type UserStatus = 'available' | 'busy' | 'meeting' | 'out_of_office';
export type AccountStatus = 'active' | 'blocked' | 'paused';
export type AppointmentType = 'internal' | 'external' | 'personal';

export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department_id?: string;
  status: UserStatus;
  account_status?: AccountStatus;
  photo_url?: string;
  work_hours?: Record<string, { start: string; end: string }>;
}

export interface Appointment {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  guest_name?: string;
  type: AppointmentType;
  created_by: string;
  webhook_count?: number;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: 'appointment' | 'message' | 'system';
  title: string;
  content: string;
  related_id?: string;
  read: boolean;
  created_at: string;
}

