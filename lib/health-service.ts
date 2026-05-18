// lib/health-service.ts
// Real-time Health & Vitals service using Supabase alerts table

import { createBrowserSupabaseClient } from '@/lib/supabase';
import { sendAlert } from './alert-service';

export interface VitalsData {
  heartRate: number;
  spo2: number;
  temp: number;
  bpSys: number;
  bpDia: number;
  cogScore: number;
  sleepHrs: number;
  sleepQuality: number;
  timestamp: string;
}

const supabase = createBrowserSupabaseClient();
const EVENT_NAME = 'alzcare_vitals_updated';
let _latestVitals: VitalsData | null = null;
let _patientId: string | null = null;
let _subscription: any = null;

// Helper to generate simulated normal vitals
export function generateNormalVitals(): VitalsData {
  return {
    heartRate: Math.round(70 + Math.random() * 15),
    spo2: Math.round(96 + Math.random() * 3),
    temp: parseFloat((97.8 + Math.random() * 1.2).toFixed(1)),
    bpSys: Math.round(115 + Math.random() * 15),
    bpDia: Math.round(75 + Math.random() * 10),
    cogScore: Math.round(75 + Math.random() * 10),
    sleepHrs: parseFloat((6.5 + Math.random() * 2).toFixed(1)),
    sleepQuality: Math.round(75 + Math.random() * 20),
    timestamp: new Date().toISOString(),
  };
}

// Patient: Start broadcasting vitals to database
export function startVitalsBroadcaster(patientId: string, intervalMs = 30000): () => void {
  _patientId = patientId;
  
  const sendUpdate = () => {
    const vitals = generateNormalVitals();
    // Save to alerts table as a system vitals_update
    sendAlert({
      sender: 'patient',
      message: JSON.stringify({ _is_vitals: true, ...vitals }),
      priority: 'info',
      type: 'system' as any
    });
  };

  // Send first update immediately
  sendUpdate();

  const interval = setInterval(sendUpdate, intervalMs);
  return () => clearInterval(interval);
}

// Caregiver/Patient: Subscribe to latest vitals
export function subscribeToVitals(patientIds: string[], cb: (vitals: VitalsData) => void): () => void {
  if (patientIds.length === 0) return () => {};

  const fetchLatest = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .in('patient_id', patientIds)
      .eq('type', 'system')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Find the first alert that has vitals payload
      for (const row of data) {
        try {
          const payload = JSON.parse(row.message);
          if (payload._is_vitals) {
            _latestVitals = payload;
            cb(payload);
            break;
          }
        } catch {}
      }
    }
  };

  fetchLatest();

  // Listen to real-time alerts changes to intercept new vitals
  const filter = patientIds.length === 1 
    ? `patient_id=eq.${patientIds[0]}` 
    : `patient_id=in.(${patientIds.join(',')})`;

  _subscription = supabase.channel(`vitals_realtime_${patientIds.slice().sort().join('_')}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter }, (payload: any) => {
      try {
        console.log('[HealthService] realtime vitals event:', payload);
        const row = payload.new;
        if (row && row.type === 'system') {
          const parsed = JSON.parse(row.message);
          if (parsed._is_vitals) {
            _latestVitals = parsed;
            cb(parsed);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })
    .subscribe();

  return () => {
    if (_subscription) supabase.removeChannel(_subscription);
  };
}

export function getLatestVitals(): VitalsData | null {
  return _latestVitals;
}
