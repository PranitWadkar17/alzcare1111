// lib/location-service.ts
// Multi-patient aware location service.
// Supports subscriptions across all linked patients for caregivers.

import { createBrowserSupabaseClient } from './supabase';
import { Location } from '@/types';

const supabase = createBrowserSupabaseClient();

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

// ── Single-patient operations (patient-side) ──────────────────────────────────

export async function saveLocation(patientId: string, data: LocationData): Promise<void> {
  const { data: insertedData, error } = await supabase.from('locations').insert({
    patient_id: patientId,
    lat: data.lat,
    lng: data.lng,
    accuracy: data.accuracy,
    timestamp: new Date().toISOString(),
  }).select();

  if (error) {
    console.error(error);
    throw error;
  } else {
    console.log(insertedData);
  }
}

export async function getLatestLocation(patientId: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle(); // safe alternative to .single() — returns null instead of error on no rows

  if (error) {
    console.error('[LocationService] Error fetching location:', error);
    throw error;
  }

  return data as Location | null;
}

export async function getLocationHistory(patientId: string): Promise<Location[]> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('patient_id', patientId)
    .gte('timestamp', twentyFourHoursAgo.toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[LocationService] Error fetching location history:', error);
    throw error;
  }

  return (data as Location[]) || [];
}

export async function cleanupOldLocations(patientId: string): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('patient_id', patientId)
    .lt('timestamp', twentyFourHoursAgo.toISOString());

  if (error) {
    console.error('[LocationService] Error cleaning up old locations:', error);
    throw error;
  }
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

/**
 * Subscribe to location updates for a single patient.
 * Returns the Supabase channel (call supabase.removeChannel(channel) to clean up).
 */
export function subscribeToLocationUpdates(
  patientId: string,
  callback: (location: Location) => void
) {
  const channel = supabase
    .channel(`location_updates_${patientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'locations',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload: any) => {
        console.log('[LocationService] realtime event:', payload);
        callback(payload.new as Location);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to location updates for MULTIPLE patients (caregiver use-case).
 * Uses patient_id=in.(...) filter when more than one patient is linked.
 * Returns an unsubscribe function.
 */
export function subscribeToLocationUpdatesForPatients(
  patientIds: string[],
  callback: (location: Location) => void
): () => void {
  if (patientIds.length === 0) return () => {};

  const filter =
    patientIds.length === 1
      ? `patient_id=eq.${patientIds[0]}`
      : `patient_id=in.(${patientIds.join(',')})`;

  const channelName = `location_multi_${patientIds.slice().sort().join('_')}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'locations',
        filter,
      },
      (payload: any) => {
        console.log('[LocationService] realtime multi event:', payload);
        callback(payload.new as Location);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Caregiver helpers ─────────────────────────────────────────────────────────

/**
 * Fetch all patient IDs linked to a caregiver (IDs only, no profile data).
 * For full profile data, use patient-service.ts → getLinkedPatientsForCaregiver().
 */
export async function getLinkedPatients(caregiverId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select('patient_id')
    .eq('caregiver_id', caregiverId)
    .eq('status', 'active');

  if (error) {
    console.error('[LocationService] Error fetching linked patients:', error);
    throw error;
  }

  return data?.map((link: any) => link.patient_id) || [];
}

/**
 * Fetch the latest location record for EACH linked patient.
 * Returns a map of patientId → Location | null.
 */
export async function getLatestLocationsForPatients(
  patientIds: string[]
): Promise<Record<string, Location | null>> {
  if (patientIds.length === 0) return {};

  const result: Record<string, Location | null> = {};

  // Fetch in parallel for all patients
  await Promise.all(
    patientIds.map(async patientId => {
      try {
        result[patientId] = await getLatestLocation(patientId);
      } catch {
        result[patientId] = null;
      }
    })
  );

  return result;
}

/**
 * Fetch a single patient's profile (name, email, avatar).
 */
export async function getPatientProfile(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', patientId)
    .maybeSingle();

  if (error) {
    console.error('[LocationService] Error fetching patient profile:', error);
    throw error;
  }

  return data;
}