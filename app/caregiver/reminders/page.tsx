'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Trash2, CheckCircle, Clock, User,
  MessageSquare, Calendar, Send, AlertCircle, RotateCcw,
  Sparkles, Filter, CheckCircle2, XCircle, TimerReset,
} from 'lucide-react';
import {
  createTask, getAllTasks, deleteTask, updateTaskStatus,
  subscribeToTasks, refreshTasks, SharedTask, TaskStatus,
} from '@/lib/task-service';
import { getLinkedPatientsForCaregiver, PatientProfile } from '@/lib/patient-service';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

const DEMO_PATIENTS = [
  'Pranit Wadkar',
  'Abhishek chavan ',
];

const STATUS_CFG: Record<TaskStatus, {
  label: string; color: string; bg: string; border: string;
  badgeBg: string; Icon: React.ElementType; dot: string;
}> = {
  pending: {
    label: 'Pending',   color: 'text-amber-300',   bg: 'bg-amber-500/10',
    border: 'border-amber-500/25', badgeBg: 'bg-amber-500/20',
    Icon: Clock,         dot: 'bg-amber-400',
  },
  done: {
    label: 'Done',      color: 'text-emerald-300', bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25', badgeBg: 'bg-emerald-500/20',
    Icon: CheckCircle2,  dot: 'bg-emerald-400',
  },
  missed: {
    label: 'Missed',    color: 'text-red-300',     bg: 'bg-red-500/10',
    border: 'border-red-500/25',   badgeBg: 'bg-red-500/20',
    Icon: XCircle,       dot: 'bg-red-400',
  },
};

const QUICK_MESSAGES = [
  'Take morning medication with water',
  'Eat lunch and take afternoon pills',
  'Evening walk for 20 minutes',
  'Take blood pressure reading',
  'Drink 2 glasses of water',
  'Physical therapy exercises',
];

export default function CaregiverRemindersPage() {
  const [tasks, setTasks]          = useState<SharedTask[]>([]);
  const [filter, setFilter]        = useState<'all' | TaskStatus>('all');
  const [success, setSuccess]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customPatient, setCustomPatient] = useState('');
  const [showQuick, setShowQuick]  = useState(false);
  const [linkedPatients, setLinkedPatients] = useState<PatientProfile[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [form, setForm] = useState({
    patient_label:  '',
    message:        '',
    scheduled_time: '',
    date:           new Date().toISOString().split('T')[0],
  });

  // Load linked patients dynamically
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const patientsList = await getLinkedPatientsForCaregiver(user.id);
          setLinkedPatients(patientsList);
          if (patientsList.length > 0) {
            setForm(p => ({ ...p, patient_label: patientsList[0].name }));
          } else {
            setForm(p => ({ ...p, patient_label: DEMO_PATIENTS[0] }));
          }
        }
      } catch (err) {
        console.error('[Reminders] Error loading linked patients:', err);
      } finally {
        setLoadingPatients(false);
      }
    };
    loadPatients();
  }, []);

  useEffect(() => {
    setTasks(getAllTasks());
    const unsub = subscribeToTasks(all => setTasks(all));
    
    refreshTasks();
    const handleFocus = () => refreshTasks();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      unsub();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = form.patient_label === '__custom__' ? customPatient.trim() : form.patient_label;
    if (!label || !form.message.trim() || !form.scheduled_time) return;
    setSubmitting(true);

    // Find if the selected patient label corresponds to a real linked patient to pass patient_id
    const targetPatient = linkedPatients.find(p => p.name === label);

    createTask({
      patient_label:   label,
      caregiver_label: 'Caregiver',
      message:         form.message.trim(),
      scheduled_time:  form.scheduled_time,
      date:            form.date,
      patient_id:      targetPatient?.id || undefined
    });
    setTasks(getAllTasks());
    setForm(p => ({ ...p, message: '', scheduled_time: '' }));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2200);
  };

  const remove    = (id: string) => { deleteTask(id); setTasks(getAllTasks()); };
  const setStatus = (id: string, s: TaskStatus) => { updateTaskStatus(id, s); setTasks(getAllTasks()); };

  const counts = {
    all:     tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    done:    tasks.filter(t => t.status === 'done').length,
    missed:  tasks.filter(t => t.status === 'missed').length,
  };

  const visible = (filter === 'all' ? tasks : tasks.filter(t => t.status === filter))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/8 transition-all';

  return (
    <div className="min-h-screen text-white">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-500/20">
            <Bell className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Reminders &amp; Tasks
            </h1>
            <p className="text-slate-500 text-xs">Create and manage patient reminders in real-time</p>
          </div>
        </div>
      </motion.div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {([
          { key: 'all',     label: 'Total',   grad: 'from-slate-500/20 to-slate-600/10',   border: 'border-white/10',        text: 'text-white'       },
          { key: 'pending', label: 'Pending', grad: 'from-amber-500/20 to-amber-600/10',   border: 'border-amber-500/25',    text: 'text-amber-300'   },
          { key: 'done',    label: 'Done',    grad: 'from-emerald-500/20 to-teal-600/10',  border: 'border-emerald-500/25',  text: 'text-emerald-300' },
          { key: 'missed',  label: 'Missed',  grad: 'from-red-500/20 to-rose-600/10',      border: 'border-red-500/25',      text: 'text-red-300'     },
        ] as const).map(({ key, label, grad, border, text }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilter(key)}
            className={`p-4 rounded-2xl bg-gradient-to-br ${grad} border ${border} text-center cursor-pointer transition-all relative overflow-hidden ${filter === key ? 'ring-2 ring-emerald-400/30 ring-offset-1 ring-offset-transparent' : ''}`}
          >
            <p className={`text-3xl font-bold ${text}`}>{counts[key]}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
            {filter === key && (
              <motion.div
                layoutId="stat-active"
                className="absolute inset-0 bg-white/4 rounded-2xl"
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── FORM PANEL (2/5) ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <div className="p-6 rounded-2xl border border-white/10 h-fit"
            style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,0.03))' }}
          >
            {/* Form header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Plus className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-base font-semibold">Create Reminder</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                  <User className="w-3 h-3" /> Patient
                </label>
                <select
                  value={form.patient_label}
                  onChange={e => setForm(p => ({ ...p, patient_label: e.target.value }))}
                  className={inputCls + ' cursor-pointer'}
                >
                  {linkedPatients.length > 0 ? (
                    linkedPatients.map(p => (
                      <option key={p.id} value={p.name} className="bg-slate-900">{p.name}</option>
                    ))
                  ) : (
                    DEMO_PATIENTS.map(n => (
                      <option key={n} value={n} className="bg-slate-900">{n}</option>
                    ))
                  )}
                  <option value="__custom__" className="bg-slate-900">+ Enter custom name…</option>
                </select>
                <AnimatePresence>
                  {form.patient_label === '__custom__' && (
                    <motion.input
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      type="text" placeholder="Patient name…" value={customPatient}
                      onChange={e => setCustomPatient(e.target.value)}
                      className={inputCls + ' mt-2'} required
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MessageSquare className="w-3 h-3" /> Message
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuick(v => !v)}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
                  >
                    <Sparkles className="w-3 h-3" /> Quick fill
                  </button>
                </div>

                <AnimatePresence>
                  {showQuick && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="mb-2 grid grid-cols-1 gap-1.5"
                    >
                      {QUICK_MESSAGES.map(msg => (
                        <button
                          key={msg} type="button"
                          onClick={() => { setForm(p => ({ ...p, message: msg })); setShowQuick(false); }}
                          className="text-left text-xs px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/15 text-violet-300 hover:bg-violet-500/20 transition"
                        >
                          {msg}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="e.g. Take 2 tablets of Donepezil with water…"
                  rows={3}
                  className={inputCls + ' resize-none'}
                  required
                />
              </div>

              {/* Time + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <Clock className="w-3 h-3" /> Time
                  </label>
                  <input type="time" value={form.scheduled_time}
                    onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
                    className={inputCls} required />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <Calendar className="w-3 h-3" /> Date
                  </label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className={inputCls} required />
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting || !form.message.trim() || !form.scheduled_time}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                  success
                    ? 'bg-emerald-500 shadow-emerald-500/30 text-white'
                    : 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/25 hover:shadow-violet-500/40 text-white'
                }`}
              >
                {success
                  ? <><CheckCircle className="w-4 h-4" /> Sent to Patient!</>
                  : <><Send className="w-4 h-4" /> Send Reminder</>
                }
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* ── TASK LIST (3/5) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {(['all', 'pending', 'done', 'missed'] as const).map(f => {
              const cfg = f !== 'all' ? STATUS_CFG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all flex items-center gap-1.5 ${
                    filter === f
                      ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                  {f}{f !== 'all' && ` (${counts[f]})`}
                </button>
              );
            })}
          </div>

          {/* Task cards */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {visible.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/10"
                >
                  <div className="p-4 rounded-full bg-white/5 mb-3">
                    <Bell className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">No reminders yet</p>
                  <p className="text-slate-600 text-xs mt-1">Use the form to create one</p>
                </motion.div>
              ) : (
                visible.map(task => {
                  const { bg, border, color, label, Icon, dot } = STATUS_CFG[task.status];
                  return (
                    <motion.div
                      key={task.id} layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.96 }}
                      className={`rounded-2xl border ${border} overflow-hidden group`}
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      {/* Top color bar */}
                      <div className={`h-0.5 w-full ${dot.replace('bg-', 'bg-')}`}
                        style={{
                          background: task.status === 'pending' ? 'linear-gradient(90deg,#f59e0b,transparent)'
                            : task.status === 'done' ? 'linear-gradient(90deg,#10b981,transparent)'
                            : 'linear-gradient(90deg,#ef4444,transparent)'
                        }}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Status + time */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>
                                <Icon className="w-3 h-3" />
                                {label}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                                <Clock className="w-3 h-3" />
                                {task.scheduled_time}
                                <span className="mx-1 text-slate-700">·</span>
                                {task.date}
                              </div>
                            </div>

                            {/* Message */}
                            <p className="text-sm text-white leading-snug">{task.message}</p>

                            {/* Patient */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/8">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400">{task.patient_label}</span>
                              </div>
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => remove(task.id)}
                            className="p-1.5 rounded-lg bg-transparent hover:bg-red-500/15 text-slate-700 hover:text-red-400 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        {task.status === 'pending' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                            <motion.button
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setStatus(task.id, 'done')}
                              className="flex-1 py-2 rounded-xl text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-300 transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Done
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setStatus(task.id, 'missed')}
                              className="flex-1 py-2 rounded-xl text-xs font-medium bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300 transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Missed
                            </motion.button>
                          </div>
                        )}

                        {task.status !== 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            onClick={() => setStatus(task.id, 'pending')}
                            className="mt-3 pt-3 border-t border-white/5 w-full text-xs text-slate-600 hover:text-slate-300 flex items-center justify-center gap-1.5 transition"
                          >
                            <TimerReset className="w-3 h-3" /> Reset to Pending
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
