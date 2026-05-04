// lib/task-service.ts
// Shared task/reminder service — localStorage backed, Supabase-ready
// Uses StorageEvent to sync across components in the same browser session

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

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function dispatch(tasks: SharedTask[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  // Fire a synthetic storage event so same-tab listeners also react
  window.dispatchEvent(
    new StorageEvent('storage', { key: TASKS_KEY, newValue: JSON.stringify(tasks) })
  );
}

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

export function subscribeToTasks(cb: (tasks: SharedTask[]) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === TASKS_KEY) {
      try { cb(e.newValue ? JSON.parse(e.newValue) : []); } catch { cb([]); }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
