// lib/patient-service.ts
// Source of truth: patient_caregiver_links table
// Supports 1 caregiver ↔ N patients  |  1 patient ↔ N caregivers

import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  link_status: string;
  linked_at?: string;
}

export interface CaregiverProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  relationship?: string;
  link_status: string;
  linked_at?: string;
}

export interface CurrentUserInfo {
  id: string;
  role: string;
  name: string;
  email: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch all patients linked to the given caregiver (with full profile data).
 * Uses patient_caregiver_links as the source of truth.
 */
export async function getLinkedPatientsForCaregiver(
  caregiverId: string
): Promise<PatientProfile[]> {
  // Step 1: get all active links for this caregiver
  const { data: links, error: linksErr } = await supabase
    .from('patient_caregiver_links')
    .select('patient_id, status, created_at')
    .eq('caregiver_id', caregiverId)
    .eq('status', 'active');

  if (linksErr) {
    console.error('[PatientService] Error fetching linked patients:', linksErr);
    return [];
  }
  if (!links || links.length === 0) return [];

  const patientIds = links.map((l: any) => l.patient_id);

  // Step 2: fetch profile data for each patient
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role')
    .in('id', patientIds);

  if (profilesErr) {
    console.error('[PatientService] Error fetching patient profiles:', profilesErr);
    // Return partial data with just IDs
    return links.map((l: any) => ({
      id: l.patient_id,
      name: 'Unknown Patient',
      email: '',
      role: 'patient',
      link_status: l.status,
      linked_at: l.created_at,
    }));
  }

  // Step 3: merge links + profiles
  return links.map((link: any) => {
    const profile = (profiles || []).find((p: any) => p.id === link.patient_id);
    return {
      id: link.patient_id,
      name: profile?.name || 'Unknown Patient',
      email: profile?.email || '',
      avatar_url: profile?.avatar_url ?? null,
      role: profile?.role || 'patient',
      link_status: link.status,
      linked_at: link.created_at,
    };
  });
}

/**
 * Fetch all caregivers linked to the given patient (with full profile data).
 * Uses patient_caregiver_links as the source of truth.
 */
export async function getLinkedCaregiversForPatient(
  patientId: string
): Promise<CaregiverProfile[]> {
  // Step 1: get all active links for this patient
  const { data: links, error: linksErr } = await supabase
    .from('patient_caregiver_links')
    .select('caregiver_id, status, created_at')
    .eq('patient_id', patientId)
    .eq('status', 'active');

  if (linksErr) {
    console.error('[PatientService] Error fetching linked caregivers:', linksErr);
    return [];
  }
  if (!links || links.length === 0) return [];

  const caregiverIds = links.map((l: any) => l.caregiver_id);

  // Step 2: fetch profile data for each caregiver
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role')
    .in('id', caregiverIds);

  if (profilesErr) {
    console.error('[PatientService] Error fetching caregiver profiles:', profilesErr);
    return links.map((l: any) => ({
      id: l.caregiver_id,
      name: 'Unknown Caregiver',
      email: '',
      role: 'caregiver',
      relationship: 'Primary Caregiver',
      link_status: l.status,
      linked_at: l.created_at,
    }));
  }

  // Step 3: merge links + profiles
  return links.map((link: any) => {
    const profile = (profiles || []).find((p: any) => p.id === link.caregiver_id);
    return {
      id: link.caregiver_id,
      name: profile?.name || 'Unknown Caregiver',
      email: profile?.email || '',
      avatar_url: profile?.avatar_url ?? null,
      role: profile?.role || 'caregiver',
      relationship: 'Primary Caregiver',
      link_status: link.status,
      linked_at: link.created_at,
    };
  });
}

/**
 * Get just the patient IDs linked to a caregiver (lightweight, no profile join).
 */
export async function getLinkedPatientIdsForCaregiver(
  caregiverId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select('patient_id')
    .eq('caregiver_id', caregiverId)
    .eq('status', 'active');

  if (error) {
    console.error('[PatientService] Error fetching patient IDs:', error);
    return [];
  }
  return (data || []).map((l: any) => l.patient_id);
}

/**
 * Get the current authenticated user's profile.
 */
export async function getCurrentUserInfo(): Promise<CurrentUserInfo | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) return null;
  return profile as CurrentUserInfo;
}

/**
 * Subscribe to real-time changes in patient_caregiver_links for a caregiver.
 * Returns an unsubscribe function.
 */
export function subscribeToLinkedPatientsChanges(
  caregiverId: string,
  onChanged: () => void
): () => void {
  const channel = supabase
    .channel(`pcl_caregiver_${caregiverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_caregiver_links',
        filter: `caregiver_id=eq.${caregiverId}`,
      },
      () => onChanged()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time changes in patient_caregiver_links for a patient.
 * Returns an unsubscribe function.
 */
export function subscribeToLinkedCaregiversChanges(
  patientId: string,
  onChanged: () => void
): () => void {
  const channel = supabase
    .channel(`pcl_patient_${patientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_caregiver_links',
        filter: `patient_id=eq.${patientId}`,
      },
      () => onChanged()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
