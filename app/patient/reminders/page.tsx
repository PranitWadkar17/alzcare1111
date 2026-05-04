'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
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
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="text-emerald-400" />
          Reminders
        </h1>
        <p className="text-slate-400 text-sm">Reminders from your caregiver</p>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-8">
        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          {pending.length} Pending
        </div>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          {done.length} Done
        </div>
        <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          {missed.length} Missed
        </div>
      </div>

      {/* Missed */}
      {missed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Missed
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {missed.map(r => (
                <motion.div
                  key={r.id} layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm">{r.message}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.scheduled_time}
                    </p>
                  </div>
                  <button
                    onClick={() => markDone(r.id)}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm transition"
                  >
                    <CheckCircle size={16} /> Done
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Pending / Today */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Today</h2>
        <div className="space-y-4">
          <AnimatePresence>
            {pending.map(r => (
              <motion.div
                key={r.id} layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                className="p-5 rounded-2xl border bg-emerald-500/10 border-emerald-400/30 flex justify-between items-center transition"
              >
                <div>
                  <p className="text-xs text-emerald-400 mb-1">Next</p>
                  <p className="text-sm">{r.message}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {r.scheduled_time}
                    {r.caregiver_label && r.caregiver_label !== 'patient' && (
                      <span className="ml-2 flex items-center gap-1 text-slate-600">
                        <User className="w-3 h-3" /> {r.caregiver_label}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => markDone(r.id)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-sm transition"
                >
                  <CheckCircle size={16} /> Done
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {pending.length === 0 && missed.length === 0 && caregiverTasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 text-center rounded-2xl bg-white/5 border border-white/10"
            >
              <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No reminders from your caregiver yet.</p>
              <p className="text-slate-600 text-xs mt-1">Your caregiver will send reminders here.</p>
            </motion.div>
          )}

          {pending.length === 0 && caregiverTasks.length > 0 && (
            <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
              <p className="text-slate-400 text-sm">All tasks completed 🎉</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-slate-400">Completed</h2>
          <div className="space-y-3">
            {done.map(r => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-slate-400 line-through">{r.message}</p>
                  <p className="text-xs text-slate-600">{r.scheduled_time}</p>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Done</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}