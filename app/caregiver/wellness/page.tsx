'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Moon, Smile, Sparkles, AlertTriangle, CheckCircle2,
  Calendar, Activity, Award, Compass, Heart, Shield, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addWellnessLog, getWellnessStats } from '@/lib/wellness-service';
// @ts-ignore
import confetti from 'canvas-confetti';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

/* ─────────────────────────────────────────────────────────
   Particle Canvas background
   ───────────────────────────────────────────────────────── */
function StarryBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-[90px]" />
    </div>
  );
}

export default function CaregiverWellnessPage() {
  const { profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [stressLevel, setStressLevel] = useState<number>(2);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats State
  const [stats, setStats] = useState<{
    avgSleep: number;
    avgStress: number;
    recentLogs: any[];
    burnoutRisk: string;
  }>({
    avgSleep: 0,
    avgStress: 0,
    recentLogs: [],
    burnoutRisk: 'Low',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStats = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await getWellnessStats(profile.id);
      setStats(data);
    } catch (e) {
      console.error('Error loading stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadStats();
    }
  }, [profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    setFeedbackMsg(null);

    const { data, error } = await addWellnessLog(profile.id, stressLevel, sleepHours, logDate);

    setSaving(false);
    if (error) {
      setFeedbackMsg({ type: 'error', text: 'Failed to save wellness log. Please try again.' });
    } else {
      setFeedbackMsg({ type: 'success', text: 'Wellness log submitted successfully!' });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#8b5cf6', '#3b82f6'],
      });
      loadStats();
    }
  };

  // Predefined Stress Level Options
  const stressOptions = [
    { value: 1, label: '🟢 Peaceful', desc: 'Relaxed, clear mind' },
    { value: 2, label: '🔵 Balanced', desc: 'Low stress, focused' },
    { value: 3, label: '🟡 Tension', desc: 'Minor daily pressure' },
    { value: 4, label: '🟠 Stressed', desc: 'Anxious, tight schedule' },
    { value: 5, label: '🔴 Burnout', desc: 'Overwhelmed, exhausted' },
  ];

  const getSleepQualityInfo = (hours: number) => {
    if (hours < 6) return { text: 'Critical Sleep Deficit', color: 'text-rose-400', desc: 'Burnout risk highly elevated.' };
    if (hours < 7.5) return { text: 'Sub-Optimal Sleep', color: 'text-amber-400', desc: 'Moderate rest, keep tracking.' };
    return { text: 'Excellent Rest', color: 'text-emerald-400', desc: 'Brain is fully restored and ready!' };
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    if (risk === 'Moderate') return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen text-white bg-[#020617] overflow-hidden py-8 px-4 sm:px-6 lg:px-8">
      <StarryBackdrop />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
              <span className="text-xs text-purple-400 font-semibold tracking-wide uppercase">Mental & Physical Resilience</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              Caregiver Wellness Hub
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Prevent burnout by tracking your mental stress and restorative sleep logs.
            </p>
          </div>

          <button
            onClick={loadStats}
            className="self-start sm:self-center flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/20 transition-all hover:bg-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            Refresh Hub
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Log Form (Grid span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Wellness Logging</h2>
                  <p className="text-xs text-slate-400">Save log for caregiver wellness tracking</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    Log Date
                  </label>
                  <input
                    type="date"
                    value={logDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                </div>

                {/* Sleep hours slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-purple-400" />
                      Sleep Hours
                    </label>
                    <span className="text-sm font-bold text-purple-400 font-mono bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                      {sleepHours} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-purple-500"
                  />
                  {/* Dynamic Sleep Info Card */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className={`text-xs font-bold ${getSleepQualityInfo(sleepHours).color}`}>
                      {getSleepQualityInfo(sleepHours).text}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      — {getSleepQualityInfo(sleepHours).desc}
                    </div>
                  </div>
                </div>

                {/* Stress levels custom radio grid */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-purple-400" />
                    Mental Stress Level
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {stressOptions.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => setStressLevel(opt.value)}
                        className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all ${
                          stressLevel === opt.value
                            ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/5'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                        </div>
                        {stressLevel === opt.value && (
                          <span className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status messages */}
                <AnimatePresence mode="wait">
                  {feedbackMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-semibold ${
                        feedbackMsg.type === 'success'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                          : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                      }`}
                    >
                      {feedbackMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div>{feedbackMsg.text}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 font-bold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      Saving Wellness Log...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                      Log Wellness Status
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Column: Statistics & Burnout Risk Assessment (Grid span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Avg Sleep */}
              <motion.div
                whileHover={{ y: -3 }}
                className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Sleep</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-transparent bg-gradient-to-br from-indigo-300 to-purple-300 bg-clip-text">
                    {loading ? '...' : stats.avgSleep}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">hrs / day</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.avgSleep / 8) * 100)}%` }}
                  />
                </div>
              </motion.div>

              {/* Avg Stress */}
              <motion.div
                whileHover={{ y: -3 }}
                className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Stress</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-transparent bg-gradient-to-br from-emerald-300 to-teal-300 bg-clip-text">
                    {loading ? '...' : stats.avgStress}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">out of 5</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.avgStress / 5) * 100)}%` }}
                  />
                </div>
              </motion.div>

              {/* Burnout Risk Assessment */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`p-5 rounded-2xl border transition-colors ${getRiskColor(stats.burnoutRisk)}`}
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Burnout Risk</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <span className="text-2xl font-black uppercase tracking-wider">
                    {loading ? '...' : stats.burnoutRisk}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 font-medium">
                  {stats.burnoutRisk === 'High' && '⚠️ Critically exhausted. Take a break immediately.'}
                  {stats.burnoutRisk === 'Moderate' && '🔔 Rest encouraged. Moderate strain detected.'}
                  {stats.burnoutRisk === 'Low' && '✅ Great job! Self-care levels are stable.'}
                </p>
              </motion.div>
            </div>

            {/* Recharts historical line trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20">
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-sm">7-Day Wellness Trend</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-400" /> Sleep</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Stress</span>
                </div>
              </div>

              <div className="h-[260px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-500/50" />
                  </div>
                ) : stats.recentLogs.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.recentLogs}>
                      <defs>
                        <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        stroke="#475569"
                        fontSize={10}
                        fontWeight="bold"
                        tickFormatter={(v) => v.substring(5)}
                      />
                      <YAxis stroke="#475569" fontSize={10} fontWeight="bold" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sleep_hours"
                        stroke="#818cf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSleep)"
                        name="Sleep (hrs)"
                      />
                      <Area
                        type="monotone"
                        dataKey="stress_level"
                        stroke="#34d399"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorStress)"
                        name="Stress Level"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center">
                    <Compass className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-sm text-slate-500">No logs logged yet</p>
                    <p className="text-xs text-slate-600 mt-0.5">Submit your first log to generate wellness insights</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Smart Caregiver Burnout Warning Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-950/15 to-emerald-950/5 border border-white/[0.06] flex items-start gap-4 relative overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/20 shrink-0">
                <Compass className="w-6 h-6 text-purple-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Resilience & Burnout Preventer
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold uppercase px-2 py-0.5 rounded-full border border-purple-500/10">
                    Smart Guard
                  </span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Caregiving for Alzheimers patients requires significant cognitive energy and empathy. Remember to rest, hydrate, and maintain sleep levels &gt; 7 hours. If your stress indices peak, AlzCare will recommend optimal intervals for rest, and alert you or connected backup caregivers to assist with patient routines.
                </p>
              </div>
            </motion.div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
