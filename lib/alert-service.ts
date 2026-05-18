// lib/alert-service.ts
// Real-time alert & messaging service between patient ↔ caregiver
// Upgraded to use Supabase instead of local BroadcastChannels

import { createBrowserSupabaseClient } from '@/lib/supabase';

export type AlertPriority = 'critical' | 'warning' | 'info';
export type AlertSender = 'patient' | 'caregiver' | 'system';
export type MoodType = 'great' | 'okay' | 'not_good' | 'bad' | null;

export interface SharedAlert {
  id: string;
  sender: AlertSender;
  message: string;
  priority: AlertPriority;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  lat?: number;
  lng?: number;
  voiceNote?: string;       // base64 audio
  voiceDuration?: number;   // seconds
  mood?: MoodType;
  type?: 'message' | 'sos' | 'mood' | 'safety' | 'voice' | 'system';
}

const supabase = createBrowserSupabaseClient();

let _alerts: SharedAlert[] = [];
const EVENT_NAME = 'alzcare_alerts_updated';
let _userRole: 'patient' | 'caregiver' | null = null;
let _patientIds: string[] = [];
let _currentPatientId: string | null = null;
let _subscription: any = null;

// Convert DB row to SharedAlert
function mapRowToSharedAlert(row: any): SharedAlert {
  // We stringified the extra metadata into the 'message' column if it's JSON
  let meta: any = {};
  let msg = row.message;
  
  try {
    const parsed = JSON.parse(row.message);
    if (parsed.message !== undefined && parsed._alzcare_alert === true) {
      meta = parsed;
      msg = parsed.message;
    }
  } catch (e) {
    // It's just a normal string message
  }

  let frontendPriority: AlertPriority = 'info';
  if (row.priority === 'high' || row.priority === 'critical') {
    frontendPriority = 'critical';
  } else if (row.priority === 'medium' || row.priority === 'warning') {
    frontendPriority = 'warning';
  } else {
    frontendPriority = 'info';
  }

  return {
    id: row.id,
    sender: meta.sender || (row.caregiver_id ? 'caregiver' : 'patient'),
    message: msg,
    priority: frontendPriority,
    read: row.read || false,
    dismissed: meta.dismissed || false,
    created_at: row.timestamp || row.created_at || new Date().toISOString(),
    lat: meta.lat || (row.location ? row.location.lat : undefined),
    lng: meta.lng || (row.location ? row.location.lng : undefined),
    voiceNote: meta.voiceNote,
    voiceDuration: meta.voiceDuration,
    mood: meta.mood,
    type: row.type || meta.type || 'message',
  };
}

// Convert SharedAlert to DB row
function mapSharedAlertToRow(a: SharedAlert, patientId: string) {
  // We encode extra properties into a JSON string in the message column
  // to bypass strict DB schema requirements.
  const payload = JSON.stringify({
    _alzcare_alert: true,
    message: a.message,
    sender: a.sender,
    dismissed: a.dismissed,
    lat: a.lat,
    lng: a.lng,
    voiceNote: a.voiceNote,
    voiceDuration: a.voiceDuration,
    mood: a.mood,
    type: a.type
  });

  let dbPriority: 'high' | 'medium' | 'low' = 'low';
  if (a.priority === 'critical' || a.priority === 'high') {
    dbPriority = 'high';
  } else if (a.priority === 'warning' || a.priority === 'medium') {
    dbPriority = 'medium';
  } else {
    dbPriority = 'low';
  }

  return {
    id: a.id,
    patient_id: patientId,
    type: a.type === 'sos' ? 'sos' : 'system',
    priority: dbPriority,
    message: payload,
    read: a.read,
    timestamp: a.created_at,
  };
}

function buildPatientFilter(): string {
  if (_patientIds.length === 1) return `patient_id=eq.${_patientIds[0]}`;
  return `patient_id=in.(${_patientIds.join(',')})`;
}

async function initService() {
  if (typeof window === 'undefined') return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profiles } = await supabase.from('profiles').select('role').eq('id', user.id);
  if (!profiles || profiles.length === 0) return;

  const profile = profiles[0];
  _userRole = profile.role as 'patient' | 'caregiver';

  if (_userRole === 'patient') {
    _currentPatientId = user.id;
    _patientIds = [user.id];
  } else {
    const { data: links } = await supabase.from('patient_caregiver_links').select('patient_id').eq('caregiver_id', user.id).eq('status', 'active');
    if (links && links.length > 0) {
      _patientIds = links.map((l: any) => l.patient_id);
      _currentPatientId = _patientIds[0];
    }
  }

  if (_patientIds.length > 0) {
    await fetchAlertsFromSupabase();
    setupSupabaseSubscription();
  }
}

async function fetchAlertsFromSupabase() {
  let query = supabase.from('alerts').select('*');
  
  if (_patientIds.length === 1) {
    query = query.eq('patient_id', _patientIds[0]);
  } else {
    query = query.in('patient_id', _patientIds);
  }

  const { data, error } = await query;
  if (!error && data) {
    _alerts = data.map(mapRowToSharedAlert);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

function setupSupabaseSubscription() {
  if (_subscription) supabase.removeChannel(_subscription);

  _subscription = supabase.channel(`alerts_realtime_sync_${_patientIds.slice().sort().join('_')}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: buildPatientFilter() }, (payload: any) => {
      if (payload.eventType === 'INSERT') {
        _alerts.push(mapRowToSharedAlert(payload.new));
      } else if (payload.eventType === 'UPDATE') {
        _alerts = _alerts.map(a => a.id === payload.new.id ? mapRowToSharedAlert(payload.new) : a);
      } else if (payload.eventType === 'DELETE') {
        _alerts = _alerts.filter(a => a.id !== payload.old.id);
      }
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    })
    .subscribe();
}

if (typeof window !== 'undefined') {
  initService();
}

export function getAllAlerts(): SharedAlert[] {
  return [..._alerts];
}

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function insertAlertIntoSupabase(alert: SharedAlert) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[AlertService] Error sending alert: No authenticated user found.', userError);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id);

    if (profileError || !profiles || profiles.length === 0) {
      console.error('[AlertService] Error sending alert: Profile not found.', profileError);
      return;
    }

    const role = profiles[0].role;

    if (role === 'patient') {
      const patientId = user.id;

      // Query active caregiver links
      const { data: links, error: linksError } = await supabase
        .from('patient_caregiver_links')
        .select('caregiver_id')
        .eq('patient_id', patientId)
        .eq('status', 'active');

      if (linksError) {
        console.error('[AlertService] Error fetching caregiver links:', linksError.message);
        return;
      }

      if (!links || links.length === 0) {
        console.warn('[AlertService] Warning: Alert NOT sent because patient has no active linked caregivers. Inserting null caregiver_id is prevented to avoid database constraints violation.');
        return;
      }

      const rows = links.map((link: any) => {
        const row = mapSharedAlertToRow(alert, patientId);
        return {
          ...row,
          caregiver_id: link.caregiver_id
        };
      });

      const { error: insertError } = await supabase.from('alerts').insert(rows);
      if (insertError) {
        console.error('[AlertService] Error inserting patient alerts:', insertError.message);
      } else {
        console.log(`[AlertService] Alert sent successfully to ${rows.length} caregivers.`);
      }
    } else {
      // Caregiver role
      const caregiverId = user.id;
      let patientId = _currentPatientId;

      if (!patientId) {
        const { data: links, error: linksError } = await supabase
          .from('patient_caregiver_links')
          .select('patient_id')
          .eq('caregiver_id', caregiverId)
          .eq('status', 'active');

        if (!linksError && links && links.length > 0) {
          patientId = links[0].patient_id;
        }
      }

      if (!patientId) {
        console.warn('[AlertService] Warning: Alert NOT sent because caregiver has no active linked patients.');
        return;
      }

      const row = mapSharedAlertToRow(alert, patientId);
      const rowWithCaregiver = {
        ...row,
        caregiver_id: caregiverId
      };

      const { error: insertError } = await supabase.from('alerts').insert(rowWithCaregiver);
      if (insertError) {
        console.error('[AlertService] Error inserting caregiver alert:', insertError.message);
      } else {
        console.log(`[AlertService] Alert sent successfully from caregiver to patient ${patientId}`);
      }
    }
  } catch (err) {
    console.error('[AlertService] Unexpected error sending alert:', err);
  }
}

export function sendAlert(data: {
  sender: AlertSender;
  message: string;
  priority?: AlertPriority;
  lat?: number;
  lng?: number;
  voiceNote?: string;
  voiceDuration?: number;
  mood?: MoodType;
  type?: 'message' | 'sos' | 'mood' | 'safety' | 'voice';
}): SharedAlert {
  const alert: SharedAlert = {
    id: generateUUID(),
    sender: data.sender,
    message: data.message,
    priority: data.priority ?? 'info',
    read: false,
    dismissed: false,
    created_at: new Date().toISOString(),
    lat: data.lat,
    lng: data.lng,
    voiceNote: data.voiceNote,
    voiceDuration: data.voiceDuration,
    mood: data.mood,
    type: data.type ?? 'message',
  };

  // Optimistic UI update
  _alerts.push(alert);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));

  // Async DB insert
  insertAlertIntoSupabase(alert);

  return alert;
}

export function markAlertRead(id: string): void {
  const a = _alerts.find(x => x.id === id);
  if (a) {
    a.read = true;
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    if (_currentPatientId) {
      supabase.from('alerts').update({ read: true }).eq('id', id).then();
    }
  }
}

export function dismissAlert(id: string): void {
  const a = _alerts.find(x => x.id === id);
  if (a) {
    a.dismissed = true;
    a.read = true;
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    if (_currentPatientId) {
      const row = mapSharedAlertToRow(a, _currentPatientId);
      supabase.from('alerts').update({ message: row.message, read: true }).eq('id', id).then();
    }
  }
}

export function deleteAlert(id: string): void {
  _alerts = _alerts.filter(a => a.id !== id);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  supabase.from('alerts').delete().eq('id', id).then();
}

export function subscribeToAlerts(cb: (alerts: SharedAlert[]) => void): () => void {
  const refresh = () => { try { cb(getAllAlerts()); } catch { cb([]); } };
  window.addEventListener(EVENT_NAME, refresh);
  
  // Try to fire immediately if data is already loaded
  if (_alerts.length > 0) {
    refresh();
  }

  return () => {
    window.removeEventListener(EVENT_NAME, refresh);
  };
}
