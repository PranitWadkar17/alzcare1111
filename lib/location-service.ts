// lib/location-service.ts
import { createBrowserSupabaseClient } from './supabase';
import { Location } from '@/types';

const supabase = createBrowserSupabaseClient();

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export async function saveLocation(patientId: string, data: LocationData): Promise<void> {
  const { error } = await supabase.from('locations').insert({
    patient_id: patientId,
    lat: data.lat,
    lng: data.lng,
    accuracy: data.accuracy,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

export async function getLatestLocation(patientId: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching location:', error);
    throw error;
  }

  return data as Location;
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
    console.error('Error fetching location history:', error);
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
    console.error('Error cleaning up old locations:', error);
    throw error;
  }
}

export function subscribeToLocationUpdates(
  patientId: string,
  callback: (location: Location) => void
) {
  const channel = supabase
    .channel(`location_updates_${patientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'locations',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => {
        callback(payload.new as Location);
      }
    )
    .subscribe();

  return channel;
}

export async function getLinkedPatients(caregiverId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select('patient_id')
    .eq('caregiver_id', caregiverId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching linked patients:', error);
    throw error;
  }

  return data?.map((link) => link.patient_id) || [];
}

export async function getPatientProfile(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', patientId)
    .single();

  if (error) {
    console.error('Error fetching patient profile:', error);
    throw error;
  }

  return data;
}