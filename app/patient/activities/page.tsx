'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Pill, Utensils, Activity, Clock,
  CheckCircle2, TrendingUp, Calendar, Flame, Zap,
  ChevronDown, ChevronRight, Plus, Send, Droplets,
  Brain, Moon, Footprints, Heart, Smile,
} from 'lucide-react';
import {
  createTask, getAllTasks, subscribeToTasks, SharedTask,
} from '@/lib/task-service';

/* ── Quick-log presets ── */
const QUICK_ITEMS = [
  { name: 'Took Medicine',   icon: Pill,        gradient: 'from-emerald-500 to-teal-600',  glow: 'shadow-emerald-500/20' },
  { name: 'Ate Food',        icon: Utensils,    gradient: 'from-amber-500 to-orange-600',  glow: 'shadow-amber-500/20' },
  { name: 'Went Outside',    icon: Footprints,  gradient: 'from-sky-500 to-blue-600',      glow: 'shadow-sky-500/20' },
  { name: 'Drank Water',     icon: Droplets,    gradient: 'from-cyan-500 to-sky-600',      glow: 'shadow-cyan-500/20' },
  { name: 'Did Exercise',    icon: Activity,    gradient: 'from-rose-500 to-pink-600',     glow: 'shadow-rose-500/20' },
  { name: 'Brain Activity',  icon: Brain,       gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20' },
  { name: 'Took a Nap',      icon: Moon,        gradient: 'from-indigo-500 to-blue-600',   glow: 'shadow-indigo-500/20' },
  { name: 'Feeling Good',    icon: Smile,       gradient: 'from-yellow-500 to-amber-600',  glow: 'shadow-yellow-500/20' },
  { name: 'Health Checkup',  icon: Heart,       gradient: 'from-red-500 to-rose-600',      glow: 'shadow-red-500/20' },
];

/* ── Helpers ── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getStreakDays(tasks: SharedTask[]): number {
  const selfLogs = tasks.filter(t => t.caregiver_label === 'patient');
  const uniqueDates = [...new Set(selfLogs.map(t => t.date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
    const curr = new Date(uniqueDates[i] + 'T00:00:00');
    if ((prev.getTime() - curr.getTime()) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

const MOTIVATIONAL = [
  '🌟 Great start to the day!',
  '💪 Keep up the amazing work!',
  '🎯 You\'re doing wonderfully!',
  '❤️ Every step counts!',
  '✨ Consistency is key!',
];

export default function PatientActivitiesPage() {
  const [allTasks, setAllTasks]         = useState<SharedTask[]>([]);
  const [logged, setLogged]             = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [customText, setCustomText]     = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [justAdded, setJustAdded]       = useState(false);

  useEffect(() => {
    setAllTasks(getAllTasks());
    const unsub = subscribeToTasks(all => setAllTasks(all));
    return unsub;
  }, []);

  /* quick-log a preset */
  const logActivity = (name: string) => {
    if (logged.has(name)) return;
    const now = new Date();
    createTask({
      patient_label: 'patient', caregiver_label: 'patient',
      message: name,
      scheduled_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toISOString().split('T')[0],
    });
    setLogged(prev => new Set(prev).add(name));
  };

  /* manual custom log */
  const logCustom = () => {
    if (!customText.trim()) return;
    const now = new Date();
    createTask({
      patient_label: 'patient', caregiver_label: 'patient',
      message: customText.trim(),
      scheduled_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toISOString().split('T')[0],
    });
    setCustomText('');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  /* derived */
  const selfLogs  = allTasks.filter(t => t.caregiver_label === 'patient');
  const today     = new Date().toISOString().split('T')[0];
  const todayLogs = selfLogs.filter(t => t.date === today);
  const streak    = getStreakDays(allTasks);
  const grouped   = selfLogs.reduce<Record<string, SharedTask[]>>((acc, t) => { (acc[t.date] ??= []).push(t); return acc; }, {});
  const sortedDates = Object.keys(grouped).sort().reverse();
  const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weekDays  = new Set(selfLogs.filter(t => t.date >= weekAgo).map(t => t.date)).size;
  const motivation = MOTIVATIONAL[todayLogs.length % MOTIVATIONAL.length];

  const toggleDay = (date: string) => {
    setExpandedDays(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">My Activities</h1>
              <p className="text-slate-500 text-xs">Track and log your daily activities</p>
            </div>
          </div>
          {/* Motivational banner */}
          {todayLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/15 text-center"
            >
              <p className="text-sm text-emerald-300 font-medium">{motivation}</p>
              <p className="text-xs text-slate-500 mt-0.5">You&apos;ve logged {todayLogs.length} activit{todayLogs.length === 1 ? 'y' : 'ies'} today</p>
            </motion.div>
          )}
        </motion.div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: String(todayLogs.length), icon: TrendingUp, gradient: 'from-emerald-500/20 to-teal-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'This Week', value: `${weekDays}/7`, icon: Calendar, gradient: 'from-sky-500/20 to-blue-600/5', border: 'border-sky-500/20', text: 'text-sky-400' },
            { label: 'Streak', value: `${streak}🔥`, icon: Flame, gradient: 'from-amber-500/20 to-orange-600/5', border: 'border-amber-500/20', text: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, gradient, border, text }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} border ${border} text-center relative overflow-hidden`}
            >
              <Icon className={`w-4 h-4 ${text} mx-auto mb-1.5`} />
              <p className={`text-xl font-extrabold ${text} tabular-nums`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white/5 blur-xl" />
            </motion.div>
          ))}
        </div>

        {/* ── Manual Add Activity ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Plus className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Log Custom Activity</h2>
            </div>
            <button onClick={() => setShowForm(v => !v)}
              className="text-xs text-violet-400 hover:text-violet-300 transition px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15"
            >
              {showForm ? 'Hide' : 'Add Custom'}
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(255,255,255,0.02))' }}
                >
                  <p className="text-xs text-slate-400 mb-3">Describe what you did — e.g. &quot;Walked in the garden for 15 mins&quot;</p>
                  <div className="flex gap-2">
                    <input
                      type="text" value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && logCustom()}
                      placeholder="What did you do?"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 transition-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={logCustom}
                      disabled={!customText.trim()}
                      className={`px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                        justAdded
                          ? 'bg-emerald-500 shadow-emerald-500/25 text-white'
                          : 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/25 text-white'
                      }`}
                    >
                      {justAdded ? <><CheckCircle2 className="w-4 h-4" /> Added!</> : <><Send className="w-4 h-4" /> Log</>}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Quick Log Grid ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><Zap className="w-4 h-4 text-emerald-400" /></div>
            <h2 className="text-base font-semibold text-white">Quick Log</h2>
            <p className="text-xs text-slate-500 ml-1">Tap to log instantly</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {QUICK_ITEMS.map((act, i) => {
              const done = logged.has(act.name);
              return (
                <motion.div key={i}
                  whileHover={{ scale: done ? 1 : 1.04, y: done ? 0 : -2 }}
                  whileTap={{ scale: done ? 1 : 0.97 }}
                  onClick={() => logActivity(act.name)}
                  className={`p-3 sm:p-4 rounded-2xl cursor-pointer text-center transition-all ${
                    done ? 'bg-emerald-500/15 border border-emerald-400/30' : 'bg-white/[0.04] border border-white/[0.08] hover:border-emerald-400/30'
                  }`}
                >
                  <div className={`mx-auto w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1.5 ${
                    done ? 'bg-emerald-500/20' : `bg-gradient-to-br ${act.gradient} shadow-lg ${act.glow}`
                  }`}>
                    <act.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${done ? 'text-emerald-400' : 'text-white'}`} />
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium leading-tight">{act.name}</p>
                  {done && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Today's Timeline ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><Clock className="w-4 h-4 text-emerald-400" /></div>
            <h2 className="text-base font-semibold text-white">Today&apos;s Timeline</h2>
            <span className="text-xs text-slate-500 ml-auto">{todayLogs.length} activities</span>
          </div>
          {todayLogs.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent" />
              <div className="space-y-3">
                <AnimatePresence>
                  {[...todayLogs].reverse().map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-3 w-[9px] h-[9px] rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 ring-offset-1 ring-offset-[#020617]" />
                      <div className="flex-1 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-emerald-400/20 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm text-white font-medium">{t.message}</span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{t.scheduled_time}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="p-3 rounded-full bg-white/5 mb-3"><Activity className="w-6 h-6 text-slate-600" /></div>
              <p className="text-sm text-slate-500">No activities logged today</p>
              <p className="text-xs text-slate-600 mt-1">Use Quick Log or Add Custom above</p>
            </div>
          )}
        </motion.div>

        {/* ── History ── */}
        {sortedDates.filter(d => d !== today).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/20"><Calendar className="w-4 h-4 text-violet-400" /></div>
              <h2 className="text-base font-semibold text-white">Activity History</h2>
            </div>
            <div className="space-y-2">
              {sortedDates.filter(d => d !== today).map(date => {
                const dayTasks = grouped[date];
                const isOpen = expandedDays.has(date);
                return (
                  <motion.div key={date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                    <button onClick={() => toggleDay(date)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-violet-400" /></div>
                        <div className="text-left">
                          <p className="text-sm text-white font-medium">{formatDate(date)}</p>
                          <p className="text-xs text-slate-500">{date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">{dayTasks.length} {dayTasks.length === 1 ? 'activity' : 'activities'}</span>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                            {dayTasks.map(t => (
                              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                                <span className="text-sm text-slate-300 flex-1">{t.message}</span>
                                <span className="text-xs text-slate-600 font-mono">{t.scheduled_time}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
