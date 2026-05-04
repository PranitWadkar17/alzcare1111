// lib/alert-service.ts
// Real-time alert & messaging service between patient ↔ caregiver
// Uses same BroadcastChannel + CustomEvent pattern as task-service

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
  type?: 'message' | 'sos' | 'mood' | 'safety' | 'voice';
}

const ALERTS_KEY = 'alzcare_shared_alerts';
const EVENT_NAME = 'alzcare_alerts_updated';
const CHANNEL_NAME = 'alzcare_alerts_sync';

let _channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!_channel) { try { _channel = new BroadcastChannel(CHANNEL_NAME); } catch {} }
  return _channel;
}

function dispatch(alerts: SharedAlert[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  try { getChannel()?.postMessage('updated'); } catch {}
}

export function getAllAlerts(): SharedAlert[] {
  if (typeof window === 'undefined') return [];
  try { const r = localStorage.getItem(ALERTS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
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
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
  const alerts = getAllAlerts();
  alerts.push(alert);
  dispatch(alerts);
  return alert;
}

export function markAlertRead(id: string): void {
  const alerts = getAllAlerts();
  const a = alerts.find(x => x.id === id);
  if (a) { a.read = true; dispatch(alerts); }
}

export function dismissAlert(id: string): void {
  const alerts = getAllAlerts();
  const a = alerts.find(x => x.id === id);
  if (a) { a.dismissed = true; a.read = true; dispatch(alerts); }
}

export function deleteAlert(id: string): void {
  dispatch(getAllAlerts().filter(a => a.id !== id));
}

export function subscribeToAlerts(cb: (alerts: SharedAlert[]) => void): () => void {
  const refresh = () => { try { cb(getAllAlerts()); } catch { cb([]); } };
  const onCustom = () => refresh();
  window.addEventListener(EVENT_NAME, onCustom);
  const ch = getChannel();
  const onBC = () => refresh();
  ch?.addEventListener('message', onBC);
  const onStorage = (e: StorageEvent) => { if (e.key === ALERTS_KEY) refresh(); };
  window.addEventListener('storage', onStorage);
  const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    ch?.removeEventListener('message', onBC);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVis);
  };
}
