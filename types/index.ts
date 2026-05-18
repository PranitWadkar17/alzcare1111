// types/index.ts

export type UserRole = 'patient' | 'caregiver_primary' | 'caregiver_secondary';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  password_hint?: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  last_login_at?: string; // ISO string from Supabase
  login_attempts: number;
  locked_until?: string; // ISO string from Supabase
  remember_token?: string;
  avatar_url?: string;
  language: string;
  caregiver_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  schedule_time: string;
  schedule_days: string[];
  instructions?: string;
  taken_logs: TakenLog[];
  active: boolean;
  prescribed_by?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface TakenLog {
  date: string;
  taken: boolean;
  skipped: boolean;
  timestamp: string;
}

export interface PatientCaregiverLink {
  id: string;
  patient_id: string;
  caregiver_id: string;
  relationship: 'primary' | 'secondary';
  status: 'active' | 'pending' | 'rejected' | 'removed';
  invited_by?: string;
  permissions: CaregiverPermissions;
  created_at: string;
  updated_at: string;
}

export interface CaregiverPermissions {
  view_meds: boolean;
  edit_meds: boolean;
  view_location: boolean;
  edit_notes: boolean;
  view_tasks: boolean;
  edit_tasks: boolean;
  trigger_sos: boolean;
}

export interface Task {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  steps: string[];
  scheduled_time: string;
  completed: boolean;
  completed_at?: string;
  voice_prompt_url?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  caregiver_id: string;
  type: 'sos' | 'medication_missed' | 'geofence_breach' | 'system';
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Note {
  id: string;
  patient_id: string;
  author_id: string;
  author_name: string;
  content: string;
  timestamp: string;
  edited_at?: string;
  is_edited: boolean;
}

export interface Location {
  id: string;
  patient_id: string;
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
}

export interface WellnessLog {
  id: string;
  caregiver_id: string;
  stress_level: number; // 1-5
  sleep_hours: number;
  date: string;
  created_at: string;
}

// Auth related types
export interface LoginCredentials {
  email: string;
  password?: string;
  otp?: string;
}

export interface RegisterData {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  password?: string; // For caregiver
  patient_email?: string; // For caregiver to link
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  
}