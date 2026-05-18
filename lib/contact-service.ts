// lib/contact-service.ts — Real-time contact storage for patient ↔ caregiver links
// Uses Supabase Broadcast Channels for guaranteed real-time cross-browser sync across devices
import { createBrowserSupabaseClient } from '@/lib/supabase';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'patient' | 'caregiver';
  relationship?: string;
  added_at: string;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  timestamp: string;
  sender: 'patient' | 'caregiver';
  autoShare?: boolean;
}

export interface CallRecord {
  id: string;
  from: 'patient' | 'caregiver';
  status: 'ringing' | 'active' | 'ended' | 'missed';
  started_at: string;
  duration?: number;
}

const CONTACTS_KEY = 'alzcare_contacts';
const LOCATION_KEY = 'alzcare_live_location';
const CALLS_KEY = 'alzcare_calls';
const CONTACTS_EVENT = 'alzcare_contacts_updated';
const LOCATION_EVENT = 'alzcare_location_updated';
const CALLS_EVENT = 'alzcare_calls_updated';

const supabase = createBrowserSupabaseClient();

// Support multiple patient IDs for caregivers
let _patientIds: string[] = [];
let _channel: any = null;

// Each subsystem gets its own local BroadcastChannel for reliable cross-tab sync
function makeCh(name: string): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  try { return new BroadcastChannel(name); } catch { return null; }
}

let _chContacts: BroadcastChannel | null = null;
let _chLocation: BroadcastChannel | null = null;
let _chCalls: BroadcastChannel | null = null;
function getChContacts() { if (!_chContacts) _chContacts = makeCh('alzcare_ch_contacts'); return _chContacts; }
function getChLocation() { if (!_chLocation) _chLocation = makeCh('alzcare_ch_location'); return _chLocation; }
function getChCalls() { if (!_chCalls) _chCalls = makeCh('alzcare_ch_calls'); return _chCalls; }

// Initialize Supabase client and link discovery for Broadcast channel
export async function initContactService() {
  if (typeof window === 'undefined') return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profiles } = await supabase.from('profiles').select('*').eq('id', user.id);
  if (!profiles || profiles.length === 0) return;
  const profile = profiles[0];

  if (profile.role === 'patient') {
    _patientIds = [user.id];
  } else if (profile.role === 'caregiver') {
    const { data: links } = await supabase.from('patient_caregiver_links')
      .select('patient_id')
      .eq('caregiver_id', user.id)
      .eq('status', 'active');
    if (links && links.length > 0) {
      _patientIds = links.map((l: any) => l.patient_id);
    }
  }

  if (_patientIds.length > 0) {
    setupContactSubscription(_patientIds);
  }
}

function setupContactSubscription(patientIds: string[]) {
  if (_channel) supabase.removeChannel(_channel);

  // Use a joined channel name for caregivers to get all patient updates
  const channelName = `contacts_realtime_sync_${patientIds.slice().sort().join('_')}`;

  _channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  _channel.on('broadcast', { event: 'sync_location' }, ({ payload }: any) => {
    console.log('[ContactService] Received location broadcast:', payload);
    const all = getLocationUpdates();
    all.push(payload.location);
    localStorage.setItem(LOCATION_KEY, JSON.stringify(all.slice(-50)));
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT));
  });

  _channel.on('broadcast', { event: 'sync_calls' }, ({ payload }: any) => {
    console.log('[ContactService] Received calls broadcast:', payload);
    let all = getCalls();
    if (payload.action === 'initiate') {
      all.push(payload.call);
    } else if (payload.action === 'update') {
      all = all.map(c => c.id === payload.call.id ? payload.call : c);
    }
    localStorage.setItem(CALLS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(CALLS_EVENT));
  });

  _channel.on('broadcast', { event: 'sync_contacts' }, ({ payload }: any) => {
    console.log('[ContactService] Received contacts broadcast:', payload);
    let all = getContacts();
    if (payload.action === 'add') {
      all.push(payload.contact);
    } else if (payload.action === 'remove') {
      all = all.filter(c => c.id !== payload.id);
    }
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(CONTACTS_EVENT));
  });

  _channel.subscribe((status: string) => {
    console.log('[ContactService] Channel status:', status);
  });
}

async function broadcastContactUpdate(event: string, payload: any, retryCount = 0) {
  if (!_channel || _patientIds.length === 0) {
    if (retryCount < 10) {
      setTimeout(() => broadcastContactUpdate(event, payload, retryCount + 1), 500);
    }
    return;
  }
  _channel.send({ type: 'broadcast', event, payload }).then((resp: any) => {
    console.log(`[ContactService] Broadcast ${event} status:`, resp);
  });
}

if (typeof window !== 'undefined') {
  initContactService();
}

// Generic dispatch: store → CustomEvent → BroadcastChannel
function dispatch(key: string, event: string, data: any, ch: BroadcastChannel | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(event));
  try { ch?.postMessage('updated'); } catch {}
}

// Generic subscribe: CustomEvent + BroadcastChannel + StorageEvent + visibilitychange
function subscribe(key: string, event: string, ch: BroadcastChannel | null, cb: () => void): () => void {
  const onCustom = () => cb();
  window.addEventListener(event, onCustom);
  const onBC = () => cb();
  ch?.addEventListener('message', onBC);
  const onStorage = (e: StorageEvent) => { if (e.key === key) cb(); };
  window.addEventListener('storage', onStorage);
  const onVis = () => { if (document.visibilityState === 'visible') cb(); };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    window.removeEventListener(event, onCustom);
    ch?.removeEventListener('message', onBC);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVis);
  };
}

// ── Contacts ──
export function getContacts(): Contact[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]'); } catch { return []; }
}

export function addContact(c: Omit<Contact, 'id' | 'added_at'>): Contact {
  const contact: Contact = { ...c, id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, added_at: new Date().toISOString() };
  const all = getContacts(); all.push(contact);
  dispatch(CONTACTS_KEY, CONTACTS_EVENT, all, getChContacts());
  broadcastContactUpdate('sync_contacts', { action: 'add', contact });
  return contact;
}

export function removeContact(id: string) {
  dispatch(CONTACTS_KEY, CONTACTS_EVENT, getContacts().filter(c => c.id !== id), getChContacts());
  broadcastContactUpdate('sync_contacts', { action: 'remove', id });
}

export function subscribeContacts(cb: (c: Contact[]) => void) {
  const refresh = () => { try { cb(getContacts()); } catch { cb([]); } };
  return subscribe(CONTACTS_KEY, CONTACTS_EVENT, getChContacts(), refresh);
}

// ── Live Location ──
export function getLocationUpdates(): LocationUpdate[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCATION_KEY) || '[]'); } catch { return []; }
}

export function sendLocationUpdate(u: LocationUpdate) {
  const all = getLocationUpdates();
  all.push(u);
  dispatch(LOCATION_KEY, LOCATION_EVENT, all.slice(-50), getChLocation());
  broadcastContactUpdate('sync_location', { location: u });
}

export function subscribeLocation(cb: (u: LocationUpdate[]) => void) {
  const refresh = () => { try { cb(getLocationUpdates()); } catch { cb([]); } };
  return subscribe(LOCATION_KEY, LOCATION_EVENT, getChLocation(), refresh);
}

// ── Calls ──
export function getCalls(): CallRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CALLS_KEY) || '[]'); } catch { return []; }
}

export function initiateCall(from: 'patient' | 'caregiver'): CallRecord {
  const call: CallRecord = { id: `call_${Date.now()}`, from, status: 'ringing', started_at: new Date().toISOString() };
  const all = getCalls(); all.push(call);
  dispatch(CALLS_KEY, CALLS_EVENT, all, getChCalls());
  broadcastContactUpdate('sync_calls', { action: 'initiate', call });
  return call;
}

export function updateCallStatus(id: string, status: 'active' | 'ended' | 'missed', duration?: number) {
  const all = getCalls();
  const c = all.find(x => x.id === id);
  if (c) {
    c.status = status;
    if (duration) c.duration = duration;
    dispatch(CALLS_KEY, CALLS_EVENT, all, getChCalls());
    broadcastContactUpdate('sync_calls', { action: 'update', call: c });
  }
}

export function subscribeCalls(cb: (c: CallRecord[]) => void) {
  const refresh = () => { try { cb(getCalls()); } catch { cb([]); } };
  return subscribe(CALLS_KEY, CALLS_EVENT, getChCalls(), refresh);
}
