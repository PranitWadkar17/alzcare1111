'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle } from 'lucide-react';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([
    { id: 1, text: "Medicine at 8 AM", time: "08:00", next: false, missed: true, done: false },
    { id: 2, text: "Lunch at 1 PM", time: "13:00", next: true, missed: false, done: false },
    { id: 3, text: "Medicine at 8 PM", time: "20:00", next: false, missed: false, done: false },
  ]);

  const markAsDone = (id: number) => {
    setReminders(reminders.map(r =>
      r.id === id ? { ...r, done: true, next: false, missed: false } : r
    ));
  };

  const missedReminders = reminders.filter(r => r.missed && !r.done);
  const todayReminders = reminders.filter(r => !r.missed && !r.done);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="text-emerald-400" />
          Reminders
        </h1>
        <p className="text-slate-400 text-sm">Manage your daily reminders</p>
      </div>

      {/* Missed Reminders */}
      {missedReminders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-red-400 mb-3">Missed</h2>

          <div className="space-y-4">
            {missedReminders.map(r => (
              <motion.div
                key={r.id}
                whileHover={{ scale: 1.02 }}
                className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center"
              >
                <span className="text-sm">{r.text}</span>

                <button
                  onClick={() => markAsDone(r.id)}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm"
                >
                  <CheckCircle size={16} />
                  Done
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Today Reminders */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today</h2>

        <div className="space-y-4">
          {todayReminders.map(r => (
            <motion.div
              key={r.id}
              whileHover={{ scale: 1.02 }}
              className={`p-5 rounded-2xl border flex justify-between items-center transition ${
                r.next
                  ? 'bg-emerald-500/10 border-emerald-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div>
                {r.next && (
                  <p className="text-xs text-emerald-400 mb-1">Next</p>
                )}
                <span className="text-sm">{r.text}</span>
              </div>

              <button
                onClick={() => markAsDone(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
                  r.next
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <CheckCircle size={16} />
                Done
              </button>
            </motion.div>
          ))}

          {todayReminders.length === 0 && (
            <div className="p-6 text-center rounded-2xl bg-white/5 border border-white/10">
              <p className="text-slate-400 text-sm">All tasks completed 🎉</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}