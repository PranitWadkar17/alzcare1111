// lib/activity-service.ts
// Multi-patient aware activity service.
// Supports subscriptions across all linked patients for caregivers.

import { supabase } from './supabase';

export interface ActivityLog {
  id: string;
  patient_id: string;
  message: string;
  scheduled_time: string; // HH:MM
  date: string;           // YYYY-MM-DD
  created_at: string;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createActivity(
  data: Omit<ActivityLog, 'id' | 'created_at'>
): Promise<ActivityLog> {
  const { data: result, error } = await supabase
    .from('activities')
    .insert([
      {
        patient_id: data.patient_id,
        message: data.message,
        scheduled_time: data.scheduled_time,
        date: data.date,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[ActivityService] Error creating activity:', error);
    throw error;
  }
  return result as ActivityLog;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Fetch all activities for a single patient. */
export async function getActivities(patientId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ActivityService] Error fetching activities:', error);
    return [];
  }
  return data as ActivityLog[];
}

/**
 * Fetch activities for MULTIPLE patients (caregiver use-case).
 * Returns activities from all linked patients, sorted newest-first.
 */
export async function getActivitiesForPatients(
  patientIds: string[]
): Promise<ActivityLog[]> {
  if (patientIds.length === 0) return [];

  let query = supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });

  if (patientIds.length === 1) {
    query = query.eq('patient_id', patientIds[0]);
  } else {
    query = query.in('patient_id', patientIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ActivityService] Error fetching activities for patients:', error);
    return [];
  }
  return (data as ActivityLog[]) || [];
}

// ── Realtime Subscriptions ────────────────────────────────────────────────────

/**
 * Subscribe to activity changes for a single patient.
 * Returns the Supabase channel (use supabase.removeChannel(channel) to clean up).
 */
export function subscribeToActivities(
  patientId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`activities_${patientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload: any) => {
        callback(payload);
      }
    )
    .subscribe();
}

/**
 * Subscribe to activity changes for MULTIPLE patients (caregiver use-case).
 * Uses patient_id=in.(...) filter when more than one patient is linked.
 * Returns an unsubscribe function.
 */
export function subscribeToActivitiesForPatients(
  patientIds: string[],
  callback: (payload: any) => void
): () => void {
  if (patientIds.length === 0) return () => {};

  const filter =
    patientIds.length === 1
      ? `patient_id=eq.${patientIds[0]}`
      : `patient_id=in.(${patientIds.join(',')})`;

  const channelName = `activities_multi_${patientIds.slice().sort().join('_')}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter,
      },
      (payload: any) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
