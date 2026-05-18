// Twilio service helper functions
import { createBrowserSupabaseClient } from './supabase';

export interface Call {
  id: string;
  patient_id: string;
  caregiver_id: string;
  status: 'pending' | 'ringing' | 'active' | 'completed' | 'missed' | 'failed' | 'cancelled';
  call_method: 'notification' | 'twilio_callback' | 'twilio_conference' | 'webrtc';
  twilio_call_sid?: string;
  callback_number?: string;
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  duration?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const supabase = createBrowserSupabaseClient();

/**
 * Initiate a call to caregiver via Twilio
 */
export async function initiateCall(patientId: string, caregiverId: string): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const response = await fetch('/api/twilio/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, caregiverId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to initiate call');
    }

    return { success: true, callId: data.callId };
  } catch (error: any) {
    console.error('Twilio call error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get call history for a user
 */
export async function getCallHistory(userId: string, limit: number = 10): Promise<Call[]> {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`patient_id.eq.${userId},caregiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching call history:', error);
    return [];
  }
}

/**
 * Subscribe to call status updates
 */
export function subscribeToCallUpdates(callId: string, callback: (call: Call) => void) {
  const channel = supabase
    .channel(`call-${callId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`,
      },
      (payload: any) => {
        callback(payload.new as Call);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get active call for a user
 */
export async function getActiveCall(userId: string): Promise<Call | null> {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`patient_id.eq.${userId},caregiver_id.eq.${userId}`)
      .in('status', ['ringing', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
}
