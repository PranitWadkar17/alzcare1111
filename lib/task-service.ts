// lib/task-service.ts
// Shared task/reminder service — localStorage backed, Supabase-ready
// Uses BroadcastChannel + CustomEvent + StorageEvent + visibilitychange
// for bulletproof real-time sync across tabs

export type TaskStatus = 'pending' | 'done' | 'missed';

export interface SharedTask {
  id: string;
  patient_label: string;   // patient's display name (used for matching)
  caregiver_label: string; // caregiver name or 'patient' for self-logs
  message: string;
  scheduled_time: string;  // "HH:MM"
  date: string;            // "YYYY-MM-DD"
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

const TASKS_KEY = 'alzcare_shared_tasks';
const EVENT_NAME = 'alzcare_tasks_updated';
const CHANNEL_NAME = 'alzcare_tasks_sync';

// ── BroadcastChannel (cross-tab, most reliable modern API) ──
let _channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!_channel) {
    try { _channel = new BroadcastChannel(CHANNEL_NAME); } catch { /* Safari < 15.4 */ }
  }
  return _channel;
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ── Dispatch: notify ALL listeners (same-tab + cross-tab) ──
function dispatch(tasks: SharedTask[]) {
  if (typeof window === 'undefined') return;

  // 1. Persist to localStorage
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));

  // 2. Same-tab: fire a CustomEvent (always works, synchronous)
  window.dispatchEvent(new CustomEvent(EVENT_NAME));

  // 3. Cross-tab: BroadcastChannel (modern browsers)
  try { getChannel()?.postMessage('updated'); } catch {}

  // 4. Cross-tab fallback: the native StorageEvent fires automatically
  //    in other tabs when localStorage.setItem is called — no action needed
}

// ── Read helpers ──
export function getAllTasks(): SharedTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTodaysTasks(): SharedTask[] {
  const today = new Date().toISOString().split('T')[0];
  return getAllTasks().filter(t => t.date === today);
}

// ── Write helpers ──
export function createTask(data: {
  patient_label: string;
  caregiver_label: string;
  message: string;
  scheduled_time: string;
  date?: string;
}): SharedTask {
  const task: SharedTask = {
    id: generateId(),
    patient_label: data.patient_label,
    caregiver_label: data.caregiver_label,
    message: data.message,
    scheduled_time: data.scheduled_time,
    date: data.date ?? new Date().toISOString().split('T')[0],
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const tasks = getAllTasks();
  tasks.push(task);
  dispatch(tasks);
  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  const tasks = getAllTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx].status = status;
    tasks[idx].updated_at = new Date().toISOString();
    dispatch(tasks);
  }
}

export function deleteTask(id: string): void {
  dispatch(getAllTasks().filter(t => t.id !== id));
}

// ── Subscribe: listen for changes from ALL sources ──
export function subscribeToTasks(cb: (tasks: SharedTask[]) => void): () => void {
  const refresh = () => {
    try { cb(getAllTasks()); } catch { cb([]); }
  };

  // 1. Same-tab updates (from dispatch's CustomEvent)
  const onCustom = () => refresh();
  window.addEventListener(EVENT_NAME, onCustom);

  // 2. Cross-tab updates via BroadcastChannel
  const ch = getChannel();
  const onBroadcast = () => refresh();
  ch?.addEventListener('message', onBroadcast);

  // 3. Cross-tab fallback via native StorageEvent
  const onStorage = (e: StorageEvent) => {
    if (e.key === TASKS_KEY) refresh();
  };
  window.addEventListener('storage', onStorage);

  // 4. Refresh when tab becomes visible (catches anything missed)
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    ch?.removeEventListener('message', onBroadcast);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
