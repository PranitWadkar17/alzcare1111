// lib/wellness-service.ts
import { supabase } from './supabase';
import { WellnessLog } from '@/types';

/**
 * Fetch all wellness logs for a given caregiver, ordered by date descending.
 */
export async function getWellnessLogs(caregiverId: string): Promise<WellnessLog[]> {
  const { data, error } = await supabase
    .from('wellness_logs')
    .select('*')
    .eq('caregiver_id', caregiverId)
    .order('date', { ascending: false });

  if (error) {
    console.error('[WellnessService] Error fetching wellness logs:', error);
    return [];
  }
  return data || [];
}

/**
 * Add a new wellness log entry for a caregiver.
 */
export async function addWellnessLog(
  caregiverId: string,
  stressLevel: number,
  sleepHours: number,
  date?: string
): Promise<{ data: WellnessLog | null; error: any }> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Try to find if a log already exists for this date to avoid duplicate entries
  const { data: existing } = await supabase
    .from('wellness_logs')
    .select('id')
    .eq('caregiver_id', caregiverId)
    .eq('date', targetDate)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('wellness_logs')
      .update({
        stress_level: stressLevel,
        sleep_hours: sleepHours,
      })
      .eq('id', existing.id)
      .select()
      .single();

    return { data, error };
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('wellness_logs')
      .insert({
        caregiver_id: caregiverId,
        stress_level: stressLevel,
        sleep_hours: sleepHours,
        date: targetDate,
      })
      .select()
      .single();

    return { data, error };
  }
}

/**
 * Get average wellness stats for the past 7 entries.
 */
export async function getWellnessStats(caregiverId: string) {
  const logs = await getWellnessLogs(caregiverId);
  if (!logs || logs.length === 0) {
    return {
      avgSleep: 0,
      avgStress: 0,
      recentLogs: [],
      burnoutRisk: 'Low',
    };
  }

  const recent = logs.slice(0, 7).reverse();
  const totalSleep = recent.reduce((sum, log) => sum + log.sleep_hours, 0);
  const totalStress = recent.reduce((sum, log) => sum + log.stress_level, 0);
  const avgSleep = parseFloat((totalSleep / recent.length).toFixed(1));
  const avgStress = parseFloat((totalStress / recent.length).toFixed(1));

  // Determine burnout risk
  // High risk if sleep is low (< 6 hrs) and stress is high (>= 4)
  let burnoutRisk = 'Low';
  if (avgSleep < 6 && avgStress >= 4) {
    burnoutRisk = 'High';
  } else if (avgSleep < 6.5 || avgStress >= 3.5) {
    burnoutRisk = 'Moderate';
  }

  return {
    avgSleep,
    avgStress,
    recentLogs: recent,
    burnoutRisk,
  };
}
