// lib/task-service.ts
// Supabase Real-time synced Shared task/reminder service
// Multi-patient caregiver architecture: 1 caregiver ↔ N patients

import { supabase } from './supabase';

export type TaskStatus = 'pending' | 'done' | 'missed';

export interface SharedTask {
  id: string;
  patient_id?: string;       // which patient this task belongs to
  patient_label: string;
  caregiver_label: string;
  message: string;
  scheduled_time: string;
  date: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

// ── Module state ──────────────────────────────────────────────────────────────

let _tasks: SharedTask[] = [];
let _listeners: Set<(tasks: SharedTask[]) => void> = new Set();

// ALL patient IDs the current user tracks (array even for single patient)
let _patientIds: string[] = [];
// The "write" patient ID — only used when creating tasks (patient's own ID)
let _currentPatientId: string | null = null;
let _userRole: 'patient' | 'caregiver' | null = null;
let _subscription: any = null;
let _initialized = false;

// ── Utilities ─────────────────────────────────────────────────────────────────

function notify() {
  _listeners.forEach(cb => cb([..._tasks]));
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapTaskToShared(t: any): SharedTask {
  let meta: any = {};
  try {
    if (t.description) meta = JSON.parse(t.description);
  } catch (_) { }

  return {
    id: t.id,
    patient_id: t.patient_id,
    patient_label: meta.patient_label || 'Patient',
    caregiver_label: meta.caregiver_label || 'Caregiver',
    message: t.title,
    scheduled_time: t.scheduled_time,
    date:
      meta.date ||
      (t.created_at ? t.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    status: meta.status || (t.completed ? 'done' : 'pending'),
    created_at: t.created_at || new Date().toISOString(),
    updated_at: t.completed_at || t.created_at || new Date().toISOString(),
    completed_at: t.completed_at || null,
  };
}

function mapSharedToTask(s: SharedTask, patientId: string) {
  return {
    id: s.id,
    patient_id: patientId,
    title: s.message,
    description: JSON.stringify({
      patient_label: s.patient_label,
      caregiver_label: s.caregiver_label,
      date: s.date,
      status: s.status,
    }),
    steps: [],
    scheduled_time: s.scheduled_time,
    completed: s.status === 'done',
    completed_at: s.status === 'done' ? (s.completed_at || new Date().toISOString()) : null,
    created_at: s.created_at,
  };
}

/** Optional filter, removed for reliability. We do client-side filtering instead. */
function buildPatientFilter(): string {
  if (_patientIds.length === 1) {
    return `patient_id=eq.${_patientIds[0]}`;
  }
  return `patient_id=in.(${_patientIds.join(',')})`;
}

// ── Initialization ────────────────────────────────────────────────────────────

async function initService() {
  if (typeof window === 'undefined') return;
  console.log('[TaskService] Initializing...');

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (!user) {
    console.log('[TaskService] No user found.', userErr);
    return;
  }

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id);
  if (!profiles || profiles.length === 0) {
    console.log('[TaskService] No profile found.', profileErr);
    return;
  }
  const profile = profiles[0];

  _userRole = profile.role as 'patient' | 'caregiver';
  console.log('[TaskService] Role:', _userRole);

  if (_userRole === 'patient') {
    _currentPatientId = user.id;
    _patientIds = [user.id];
  } else {
    // Caregiver: fetch ALL linked patients (multi-patient support)
    const { data: links, error: linksErr } = await supabase
      .from('patient_caregiver_links')
      .select('patient_id')
      .eq('caregiver_id', user.id)
      .eq('status', 'active');

    if (linksErr) console.error('[TaskService] Error fetching links:', linksErr);

    if (links && links.length > 0) {
      _patientIds = links.map((l: any) => l.patient_id);
      _currentPatientId = _patientIds[0]; // legacy compat — used for task creation
    } else {
      console.log('[TaskService] No active patient links found for caregiver.');
    }
  }

  console.log('[TaskService] Tracking patient IDs:', _patientIds);

  if (_patientIds.length > 0) {
    await fetchTasksFromSupabase();
    setupSubscription();
    _initialized = true;
  } else {
    // Retry once after 2 s — links may not be committed yet
    console.log('[TaskService] Retrying link fetch in 2s...');
    setTimeout(async () => {
      if (_patientIds.length > 0) return; // already resolved

      if (_userRole === 'patient') {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (u) {
          _currentPatientId = u.id;
          _patientIds = [u.id];
        }
      } else {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (u) {
          const { data: retryLinks } = await supabase
            .from('patient_caregiver_links')
            .select('patient_id')
            .eq('caregiver_id', u.id)
            .eq('status', 'active');
          if (retryLinks && retryLinks.length > 0) {
            _patientIds = retryLinks.map((l: any) => l.patient_id);
            _currentPatientId = _patientIds[0];
          }
        }
      }

      console.log('[TaskService] Retry patient IDs:', _patientIds);
      if (_patientIds.length > 0) {
        await fetchTasksFromSupabase();
        setupSubscription();
        _initialized = true;
      }
    }, 2000);
  }
}

// ── Supabase Data Fetching ────────────────────────────────────────────────────

async function fetchTasksFromSupabase() {
  if (_patientIds.length === 0) {
    console.log('[TaskService] fetchTasks aborted: no patient IDs');
    return;
  }

  console.log('[TaskService] Fetching tasks for patients:', _patientIds);

  // Fetch tasks across all linked patients
  let query = supabase.from('tasks').select('*');
  if (_patientIds.length === 1) {
    query = query.eq('patient_id', _patientIds[0]);
  } else {
    query = query.in('patient_id', _patientIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[TaskService] Fetch error:', error);
  } else if (data) {
    console.log(`[TaskService] Fetched ${data.length} tasks from ${_patientIds.length} patient(s).`);
    _tasks = data.map(mapTaskToShared);
    notify();
  }
}

// ── Realtime Subscriptions ────────────────────────────────────────────────────

function broadcastUpdate(payload: any) {
  if (_subscription && _subscription.state === 'SUBSCRIBED') {
    _subscription
      .send({ type: 'broadcast', event: 'task_sync', payload })
      .catch((err: any) => console.error('[TaskService] Broadcast send error:', err));
  } else if (_subscription) {
    setTimeout(() => {
      if (_subscription?.state === 'SUBSCRIBED') {
        _subscription
          .send({ type: 'broadcast', event: 'task_sync', payload })
          .catch((err: any) => console.error('[TaskService] Broadcast send error:', err));
      }
    }, 1000);
  }
}

function setupSubscription() {
  if (_patientIds.length === 0) return;

  if (_subscription) {
    supabase.removeChannel(_subscription);
    _subscription = null;
  }

  // Channel name: use all patient IDs to avoid collisions on shared channels
  const channelId = _patientIds.slice().sort().join('_');
  console.log('[TaskService] Setting up realtime subscription, channel:', channelId);

  _subscription = supabase
    .channel(`tasks_rt_${channelId}`, {
      config: { broadcast: { self: false } },
    })
    .on('broadcast', { event: 'task_sync' }, (payload: any) => {
      console.log('[TaskService] Realtime Broadcast received:', payload);
      const { action, task, id } = payload.payload;
      if (action === 'insert') {
        if (!_tasks.find(t => t.id === task.id)) {
          _tasks = [..._tasks, task];
          notify();
        }
      } else if (action === 'update') {
        _tasks = _tasks.map(t => (t.id === task.id ? task : t));
        notify();
      } else if (action === 'delete') {
        _tasks = _tasks.filter(t => t.id !== id);
        notify();
      }
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      (payload: any) => {
        console.log('[TaskService] Realtime Postgres change received:', payload);
        
        // Client-side filtering to ensure reliability
        const row = payload.new || payload.old;
        if (row && row.patient_id && !_patientIds.includes(row.patient_id)) {
          console.log('[TaskService] Ignoring Postgres change for untracked patient_id:', row.patient_id);
          return;
        }

        if (payload.eventType === 'INSERT') {
          const newTask = mapTaskToShared(payload.new);
          if (!_tasks.find(t => t.id === newTask.id)) {
            _tasks = [..._tasks, newTask];
            notify();
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapTaskToShared(payload.new);
          _tasks = _tasks.map(t => (t.id === updated.id ? updated : t));
          notify();
        } else if (payload.eventType === 'DELETE') {
          _tasks = _tasks.filter(t => t.id !== payload.old.id);
          notify();
        }
      }
    )
    .subscribe((status: string) => {
      console.log(`[TaskService] Subscription status for channel tasks_rt_${channelId}:`, status);
    });
}

// ── Auth State Listener ───────────────────────────────────────────────────────

supabase.auth.onAuthStateChange((event: any, session: any) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session?.user) {
      // Reset state then re-init
      _patientIds = [];
      _currentPatientId = null;
      _userRole = null;
      _initialized = false;
      initService();
    }
  } else if (event === 'SIGNED_OUT') {
    _patientIds = [];
    _currentPatientId = null;
    _userRole = null;
    _tasks = [];
    _initialized = false;
    if (_subscription) {
      supabase.removeChannel(_subscription);
      _subscription = null;
    }
    notify();
  }
});

// Auto-init on first import (page reloads)
initService();

// ── Async Helper ──────────────────────────────────────────────────────────────

/** Wait up to 5 s for a patient ID to be resolved (patient write operations). */
async function ensurePatientId(): Promise<string | null> {
  let waited = 0;
  while (!_currentPatientId && waited < 50) {
    await new Promise(r => setTimeout(r, 100));
    waited++;
  }
  return _currentPatientId;
}

// ── Public Read API ───────────────────────────────────────────────────────────

/** All tasks across all linked patients. */
export function getAllTasks(): SharedTask[] {
  return _tasks;
}

/** Tasks for today across all linked patients. */
export function getTodaysTasks(): SharedTask[] {
  const today = new Date().toISOString().split('T')[0];
  return _tasks.filter(t => t.date === today);
}

/** Tasks filtered to a specific patient ID. */
export function getTasksForPatient(patientId: string): SharedTask[] {
  return _tasks.filter(t => t.patient_id === patientId);
}

/** All patient IDs currently being tracked. */
export function getLinkedPatientIds(): string[] {
  return [..._patientIds];
}

/** Whether the service has finished initializing. */
export function isInitialized(): boolean {
  return _initialized;
}

/** Fallback to manually refresh tasks from DB */
export async function refreshTasks(): Promise<void> {
  console.log('[TaskService] Manual refresh requested.');
  if (_patientIds.length > 0) {
    await fetchTasksFromSupabase();
  }
}

// ── Public Write API ──────────────────────────────────────────────────────────

export function createTask(data: {
  patient_label: string;
  caregiver_label: string;
  message: string;
  scheduled_time: string;
  date?: string;
  patient_id?: string;
}): SharedTask {
  const task: SharedTask = {
    id: uuidv4(),
    patient_id: data.patient_id,
    patient_label: data.patient_label,
    caregiver_label: data.caregiver_label,
    message: data.message,
    scheduled_time: data.scheduled_time,
    date: data.date ?? new Date().toISOString().split('T')[0],
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Optimistic update
  _tasks = [..._tasks, task];
  notify();
  broadcastUpdate({ action: 'insert', task });

  // Background DB sync
  const targetPatientId = data.patient_id;
  ensurePatientId().then(patientId => {
    const finalPatientId = targetPatientId || patientId;
    if (finalPatientId) {
      supabase
        .from('tasks')
        .insert([mapSharedToTask(task, finalPatientId)])
        .then(({ error }: any) => {
          if (error) console.error('[TaskService] Failed to sync new task:', error);
        });
    }
  });

  return task;
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  const idx = _tasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  const now = new Date().toISOString();
  const updatedTask = { 
    ..._tasks[idx], 
    status, 
    updated_at: now,
    completed_at: status === 'done' ? now : null 
  };
  _tasks = [..._tasks];
  _tasks[idx] = updatedTask;
  notify();
  broadcastUpdate({ action: 'update', task: updatedTask });

  const targetPatientId = updatedTask.patient_id;
  ensurePatientId().then(patientId => {
    const finalPatientId = targetPatientId || patientId;
    if (finalPatientId) {
      supabase
        .from('tasks')
        .update(mapSharedToTask(updatedTask, finalPatientId))
        .eq('id', id)
        .then(({ error }: any) => {
          if (error) console.error('[TaskService] Failed to sync task update:', error);
          else console.log('[TaskService] Successfully synced task update to Supabase.');
        });
    }
  });
}

export function deleteTask(id: string): void {
  const idx = _tasks.findIndex(t => t.id === id);
  const targetPatientId = idx !== -1 ? _tasks[idx].patient_id : null;

  _tasks = _tasks.filter(t => t.id !== id);
  notify();
  broadcastUpdate({ action: 'delete', id });

  ensurePatientId().then(patientId => {
    const finalPatientId = targetPatientId || patientId;
    if (finalPatientId) {
      supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .then(({ error }: any) => {
          if (error) console.error('[TaskService] Failed to sync task deletion:', error);
        });
    }
  });
}

// ── Subscribe ─────────────────────────────────────────────────────────────────

/** Subscribe to task updates. Fires immediately with current state. Returns unsubscribe fn. */
export function subscribeToTasks(cb: (tasks: SharedTask[]) => void): () => void {
  _listeners.add(cb);
  cb([..._tasks]); // fire immediately with current state
  return () => {
    _listeners.delete(cb);
  };
}
