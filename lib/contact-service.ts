// lib/contact-service.ts — Real-time contact storage for patient ↔ caregiver links
// Uses SEPARATE BroadcastChannels per subsystem (same pattern as working alert-service)

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

// Each subsystem gets its own BroadcastChannel for reliable cross-tab sync
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
  return contact;
}

export function removeContact(id: string) {
  dispatch(CONTACTS_KEY, CONTACTS_EVENT, getContacts().filter(c => c.id !== id), getChContacts());
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
  return call;
}

export function updateCallStatus(id: string, status: 'active' | 'ended' | 'missed', duration?: number) {
  const all = getCalls();
  const c = all.find(x => x.id === id);
  if (c) { c.status = status; if (duration) c.duration = duration; dispatch(CALLS_KEY, CALLS_EVENT, all, getChCalls()); }
}

export function subscribeCalls(cb: (c: CallRecord[]) => void) {
  const refresh = () => { try { cb(getCalls()); } catch { cb([]); } };
  return subscribe(CALLS_KEY, CALLS_EVENT, getChCalls(), refresh);
}
