'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle, Clock, AlertCircle, User,
  CheckCircle2, Shield, TrendingUp,
} from 'lucide-react';
import {
  getTodaysTasks, updateTaskStatus, subscribeToTasks, SharedTask,
} from '@/lib/task-service';

export default function PatientRemindersPage() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);

  useEffect(() => {
    setTasks(getTodaysTasks());
    const unsub = subscribeToTasks(() => setTasks(getTodaysTasks()));
    return unsub;
  }, []);

  const markDone = (id: string) => {
    updateTaskStatus(id, 'done');
    setTasks(getTodaysTasks());
  };

  // Only show caregiver-created tasks on this page
  const caregiverTasks = tasks.filter(t => t.caregiver_label !== 'patient');
  const missed  = caregiverTasks.filter(t => t.status === 'missed');
  const pending = caregiverTasks.filter(t => t.status === 'pending');
  const done    = caregiverTasks.filter(t => t.status === 'done');

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 border border-violet-500/20">
              <Bell className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Reminders
              </h1>
              <p className="text-slate-500 text-xs">Reminders from your caregiver</p>
            </div>
          </div>
        </motion.div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', count: pending.length, gradient: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400', icon: Clock },
            { label: 'Done', count: done.length, gradient: 'from-emerald-500/20 to-teal-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'Missed', count: missed.length, gradient: 'from-red-500/20 to-rose-600/5', border: 'border-red-500/20', text: 'text-red-400', icon: AlertCircle },
          ].map(({ label, count, gradient, border, text, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} border ${border} text-center relative overflow-hidden`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${text}`} />
                <span className={`text-2xl font-extrabold ${text} tabular-nums`}>{count}</span>
              </div>
              <p className="text-xs text-slate-400">{label}</p>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white/5 blur-xl" />
            </motion.div>
          ))}
        </div>

        {/* ── Missed Section ── */}
        {missed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-red-400">Missed</h2>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {missed.map(r => (
                  <motion.div
                    key={r.id} layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{r.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" /> {r.scheduled_time}
                        </div>
                        {r.caregiver_label && r.caregiver_label !== 'patient' && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <User className="w-3 h-3" /> {r.caregiver_label}
                          </div>
                        )}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => markDone(r.id)}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-red-500/20 shrink-0"
                    >
                      <CheckCircle size={16} /> Done
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Pending / Today ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Today</h2>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {pending.map(r => (
                <motion.div
                  key={r.id} layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex justify-between items-center gap-3 group relative overflow-hidden"
                >
                  {/* Left accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-2xl" />

                  <div className="flex-1 min-w-0 pl-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wide mb-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      Pending
                    </span>
                    <p className="text-sm text-white">{r.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" /> {r.scheduled_time}
                      </div>
                      {r.caregiver_label && r.caregiver_label !== 'patient' && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <User className="w-3 h-3" /> {r.caregiver_label}
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => markDone(r.id)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-emerald-500/20 shrink-0"
                  >
                    <CheckCircle size={16} /> Done
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty states */}
            {pending.length === 0 && missed.length === 0 && caregiverTasks.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-12 text-center rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="p-4 rounded-full bg-white/5 mb-4">
                  <Bell className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 font-medium">No reminders from your caregiver yet</p>
                <p className="text-xs text-slate-600 mt-1">Your caregiver will send reminders here</p>
              </motion.div>
            )}

            {pending.length === 0 && caregiverTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-8 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/15"
              >
                <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm text-emerald-400 font-medium">All tasks completed 🎉</p>
                <p className="text-xs text-slate-500 mt-1">Great job keeping up with your schedule!</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Completed ── */}
        {done.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-slate-400">Completed</h2>
              <span className="text-xs text-slate-600 ml-1">{done.length} tasks</span>
            </div>

            <div className="space-y-2">
              {done.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3"
                >
                  <div className="p-1 rounded-lg bg-emerald-500/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-400 line-through truncate">{r.message}</p>
                    <p className="text-xs text-slate-600">{r.scheduled_time}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg font-medium shrink-0">
                    Done
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}