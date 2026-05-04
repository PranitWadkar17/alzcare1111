'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Pill, Utensils, Droplets, Brain, Moon, Smile, Heart,
  Clock, CheckCircle2, AlertTriangle, TrendingUp, Calendar,
  ChevronDown, ChevronRight, Footprints, Eye, Shield, Flame,
  BarChart3, Bell,
} from 'lucide-react';
import { getAllTasks, subscribeToTasks, SharedTask } from '@/lib/task-service';

/* ── Category detection for icons ── */
const CATEGORIES: { match: string[]; icon: typeof Pill; color: string; bg: string }[] = [
  { match: ['medicine','pill','tablet','medication','donepezil'], icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { match: ['food','ate','meal','lunch','dinner','breakfast','eat'], icon: Utensils, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { match: ['water','drank','hydrat'], icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  { match: ['walk','outside','exercise','gym','yoga'], icon: Footprints, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  { match: ['brain','puzzle','read','game','memory'], icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  { match: ['nap','sleep','rest'], icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  { match: ['feeling','mood','happy','good','great'], icon: Smile, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  { match: ['health','checkup','doctor','bp','pressure'], icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/15' },
];

function getCat(msg: string) {
  const lower = msg.toLowerCase();
  for (const c of CATEGORIES) {
    if (c.match.some(m => lower.includes(m))) return c;
  }
  return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/15' };
}

function formatDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (dt.getTime() === today.getTime()) return 'Today';
  if (dt.getTime() === yest.getTime()) return 'Yesterday';
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ── Expected daily activities ── */
const EXPECTED = [
  { name: 'Medicine', keywords: ['medicine','pill','tablet','medication'], icon: Pill, color: 'text-emerald-400' },
  { name: 'Breakfast', keywords: ['breakfast','ate food'], icon: Utensils, color: 'text-amber-400' },
  { name: 'Lunch', keywords: ['lunch','food'], icon: Utensils, color: 'text-amber-400' },
  { name: 'Water', keywords: ['water','drank'], icon: Droplets, color: 'text-cyan-400' },
  { name: 'Exercise', keywords: ['walk','exercise','outside','gym'], icon: Footprints, color: 'text-sky-400' },
];

export default function CaregiverActivitiesPage() {
  const [allTasks, setAllTasks] = useState<SharedTask[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAllTasks(getAllTasks());
    const unsub = subscribeToTasks(all => setAllTasks(all));
    return unsub;
  }, []);

  /* derived */
  const patientLogs = allTasks.filter(t => t.caregiver_label === 'patient');
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patientLogs.filter(t => t.date === today);
  const grouped = patientLogs.reduce<Record<string, SharedTask[]>>((a, t) => { (a[t.date] ??= []).push(t); return a; }, {});
  const sortedDates = Object.keys(grouped).sort().reverse();

  /* weekly heatmap */
  const weekDays: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ds = d.toISOString().split('T')[0];
    weekDays.push({
      date: ds,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: patientLogs.filter(t => t.date === ds).length,
    });
  }
  const maxWeek = Math.max(1, ...weekDays.map(d => d.count));

  /* missed checks */
  const todayLower = todayLogs.map(t => t.message.toLowerCase());
  const checklist = EXPECTED.map(e => ({
    ...e,
    done: e.keywords.some(k => todayLower.some(m => m.includes(k))),
  }));
  const missedCount = checklist.filter(c => !c.done).length;

  /* last activity time */
  const lastLog = todayLogs.length > 0
    ? [...todayLogs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    : null;

  /* category breakdown */
  const catBreakdown: Record<string, number> = {};
  todayLogs.forEach(t => {
    const c = getCat(t.message);
    const name = CATEGORIES.find(ct => ct.icon === c.icon)
      ? CATEGORIES.find(ct => ct.icon === c.icon)!.match[0]
      : 'other';
    catBreakdown[name] = (catBreakdown[name] || 0) + 1;
  });

  const toggleDay = (d: string) => {
    setExpandedDays(p => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n; });
  };

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Patient Activity</h1>
              <p className="text-slate-500 text-xs">Real-time monitoring of patient&apos;s daily activities</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs text-emerald-400 font-semibold">Live</span>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Today\'s Activities', value: String(todayLogs.length), icon: TrendingUp, grad: 'from-emerald-500/20 to-teal-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'Tasks Completed', value: String(checklist.filter(c => c.done).length) + '/' + checklist.length, icon: CheckCircle2, grad: 'from-sky-500/20 to-blue-600/5', border: 'border-sky-500/20', text: 'text-sky-400' },
            { label: 'Needs Attention', value: String(missedCount), icon: AlertTriangle, grad: 'from-amber-500/20 to-orange-600/5', border: 'border-amber-500/20', text: missedCount > 2 ? 'text-red-400' : 'text-amber-400' },
            { label: 'Last Active', value: lastLog ? lastLog.scheduled_time : '—', icon: Clock, grad: 'from-violet-500/20 to-purple-600/5', border: 'border-violet-500/20', text: 'text-violet-400' },
          ].map(({ label, value, icon: Icon, grad, border, text }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${grad} border ${border} relative overflow-hidden`}>
              <Icon className={`w-4 h-4 ${text} mb-2`} />
              <p className={`text-2xl font-extrabold ${text} tabular-nums`}>{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white/5 blur-xl" />
            </motion.div>
          ))}
        </div>

        {/* ── Daily Checklist ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20"><Shield className="w-4 h-4 text-sky-400" /></div>
            <h2 className="text-base font-semibold">Daily Wellness Checklist</h2>
            <span className="text-xs text-slate-500 ml-auto">{checklist.filter(c => c.done).length}/{checklist.length} completed</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {checklist.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.04 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  c.done ? 'bg-emerald-500/15 border border-emerald-400/25' : 'bg-white/[0.03] border border-white/[0.06]'
                }`}>
                <c.icon className={`w-5 h-5 mx-auto mb-1.5 ${c.done ? 'text-emerald-400' : 'text-slate-600'}`} />
                <p className={`text-[11px] font-medium ${c.done ? 'text-emerald-300' : 'text-slate-500'}`}>{c.name}</p>
                {c.done
                  ? <span className="text-[9px] text-emerald-400 font-bold mt-0.5 block">✓ Done</span>
                  : <span className="text-[9px] text-slate-600 mt-0.5 block">Pending</span>
                }
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Weekly Heatmap ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-violet-500/20"><BarChart3 className="w-4 h-4 text-violet-400" /></div>
            <h2 className="text-base font-semibold">7-Day Activity Overview</h2>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const intensity = d.count / maxWeek;
              const isToday = d.date === today;
              return (
                <div key={i} className="text-center">
                  <p className={`text-[10px] mb-2 font-medium ${isToday ? 'text-emerald-400' : 'text-slate-500'}`}>{d.label}</p>
                  <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                    d.count === 0
                      ? 'bg-white/[0.03] text-slate-600 border border-white/[0.05]'
                      : intensity > 0.7
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        : intensity > 0.3
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/15'
                          : 'bg-emerald-500/8 text-emerald-500 border border-emerald-500/10'
                  }`}>
                    {d.count}
                  </div>
                  {isToday && <div className="w-1 h-1 rounded-full bg-emerald-400 mx-auto mt-1.5" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Missed Alerts ── */}
        {missedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/20"><Bell className="w-4 h-4 text-amber-400" /></div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Attention Required</p>
                <p className="text-xs text-slate-500">Patient hasn&apos;t completed these yet today</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {checklist.filter(c => !c.done).map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15">
                  <c.icon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-300 font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Today's Live Feed ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><Activity className="w-4 h-4 text-emerald-400" /></div>
            <h2 className="text-base font-semibold">Today&apos;s Live Feed</h2>
            <span className="text-xs text-slate-500 ml-auto">{todayLogs.length} activities</span>
          </div>

          {todayLogs.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent" />
              <div className="space-y-3">
                <AnimatePresence>
                  {[...todayLogs].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((t, i) => {
                    const cat = getCat(t.message);
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="relative flex items-start gap-3">
                        <div className={`absolute -left-6 top-3 w-[9px] h-[9px] rounded-full ring-4 ring-offset-1 ring-offset-[#020617] ${
                          i === 0 ? 'bg-emerald-400 ring-emerald-500/30' : 'bg-slate-500 ring-slate-500/20'
                        }`} />
                        <div className="flex-1 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-emerald-400/20 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${cat.bg}`}>
                              <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium">{t.message}</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">Logged by patient</p>
                            </div>
                            <span className="text-xs text-slate-500 font-mono shrink-0">{t.scheduled_time}</span>
                            {i === 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Latest</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="p-4 rounded-full bg-white/5 mb-4"><Activity className="w-8 h-8 text-slate-600" /></div>
              <p className="text-sm text-slate-400 font-medium">No activity from patient today yet</p>
              <p className="text-xs text-slate-600 mt-1">Activities will appear here in real-time as the patient logs them</p>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                Listening for updates...
              </div>
            </div>
          )}
        </motion.div>

        {/* ── History ── */}
        {sortedDates.filter(d => d !== today).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/20"><Calendar className="w-4 h-4 text-violet-400" /></div>
              <h2 className="text-base font-semibold">Activity History</h2>
            </div>
            <div className="space-y-2">
              {sortedDates.filter(d => d !== today).map(date => {
                const dayTasks = grouped[date];
                const isOpen = expandedDays.has(date);
                return (
                  <div key={date} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                    <button onClick={() => toggleDay(date)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-white font-medium">{formatDate(date)}</p>
                          <p className="text-xs text-slate-500">{date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">{dayTasks.length}</span>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                            {dayTasks.map(t => {
                              const cat = getCat(t.message);
                              return (
                                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03]">
                                  <div className={`p-1 rounded-lg ${cat.bg}`}><cat.icon className={`w-3 h-3 ${cat.color}`} /></div>
                                  <span className="text-sm text-slate-300 flex-1">{t.message}</span>
                                  <span className="text-xs text-slate-600 font-mono">{t.scheduled_time}</span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Care Insight ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-violet-500/5 blur-3xl" />
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-violet-500/15 shrink-0"><Flame className="w-6 h-6 text-violet-400" /></div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">🧠 Care Insight</p>
              <p className="text-sm font-semibold text-white">
                {todayLogs.length >= 4 ? 'Patient is having an active day!'
                  : todayLogs.length >= 2 ? 'Moderate activity detected — consider a check-in.'
                  : todayLogs.length === 1 ? 'Low activity today — patient may need encouragement.'
                  : 'No activity logged yet — consider reaching out to the patient.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {todayLogs.length >= 4 ? 'Multiple activities logged shows good engagement. Keep monitoring for consistency.'
                  : todayLogs.length >= 2 ? 'The patient has logged some activities. A gentle reminder for pending items could help.'
                  : 'Regular activity logging helps track the patient\'s wellbeing. Send a reminder to encourage logging.'}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
