'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Activity, Bell, MapPin, AlertTriangle,
  TrendingUp, CheckCircle2, XCircle, ChevronRight,
  Zap, Heart, Shield, HeartPulse, Brain, Moon,
} from 'lucide-react';
import { getLocationUpdates, subscribeLocation, LocationUpdate } from '@/lib/contact-service';
import { useRouter } from 'next/navigation';
import { getAllTasks, getTodaysTasks, subscribeToTasks, SharedTask } from '@/lib/task-service';

/* ─────────────────────────────────────────────────────────
   Particle Canvas  — same visual language as the landing page
   ───────────────────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16,185,129,0.55)';
        ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 140) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(16,185,129,${(1 - d / 140) * 0.12})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.7 }} />;
}

export default function CaregiverDashboard() {
  const router = useRouter();
  const [time, setTime] = useState('');
  const [greeting, setGreeting] = useState('');
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [patientLoc, setPatientLoc] = useState<LocationUpdate | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const h = now.getHours();
      setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTasks(getAllTasks());
    const unsub = subscribeToTasks(all => setTasks(all));
    return unsub;
  }, []);

  useEffect(() => {
    const locs = getLocationUpdates().filter(l => l.sender === 'patient');
    if (locs.length) setPatientLoc(locs[locs.length - 1]);
    const unsub2 = subscribeLocation(all => {
      const p = all.filter(l => l.sender === 'patient');
      if (p.length) setPatientLoc(p[p.length - 1]);
    });
    return unsub2;
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks   = tasks.filter(t => t.date === today);
  const pendingCount = todayTasks.filter(t => t.status === 'pending').length;
  const doneCount    = todayTasks.filter(t => t.status === 'done').length;
  const missedCount  = todayTasks.filter(t => t.status === 'missed').length;
  const lastActivity = todayTasks.filter(t => t.caregiver_label === 'patient').slice(-1)[0];
  const activityCount = todayTasks.filter(t => t.caregiver_label === 'patient').length;
  const nextReminder  = todayTasks.find(t => t.status === 'pending' && t.caregiver_label !== 'patient');
  const missedAlerts  = todayTasks.filter(t => t.status === 'missed');
  const pendingBadge  = tasks.filter(t => t.status === 'pending').length;

  /* ── Stat cards ── */
  const stats = [
    {
      label: 'Pending',  value: pendingCount, icon: Clock,
      gradient: 'from-amber-500/20 to-amber-600/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20',
      text: 'text-amber-400',
    },
    {
      label: 'Done',  value: doneCount, icon: CheckCircle2,
      gradient: 'from-emerald-500/20 to-teal-600/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
    },
    {
      label: 'Missed', value: missedCount, icon: XCircle,
      gradient: 'from-red-500/20 to-rose-600/5',
      border: 'border-red-500/20',
      iconBg: 'bg-red-500/20',
      text: 'text-red-400',
    },
    {
      label: 'Total',  value: todayTasks.length, icon: TrendingUp,
      gradient: 'from-violet-500/20 to-indigo-600/5',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/20',
      text: 'text-violet-400',
    },
  ];

  /* ── Quick actions ── */
  const quickActions = [
    {
      label: 'Patient Activity',
      sub: `${activityCount} logged today`,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/25',
      hoverBorder: 'hover:border-emerald-400/30',
      path: '/caregiver/activities',
    },
    {
      label: 'Reminders',
      sub: pendingBadge > 0 ? `${pendingBadge} pending` : 'All clear',
      icon: Bell,
      gradient: 'from-violet-500 to-purple-600',
      glow: 'shadow-violet-500/25',
      hoverBorder: 'hover:border-violet-400/30',
      path: '/caregiver/reminders',
      badge: pendingBadge,
    },
    {
      label: 'Track Location',
      sub: 'Live GPS monitoring',
      icon: MapPin,
      gradient: 'from-sky-500 to-blue-600',
      glow: 'shadow-sky-500/25',
      hoverBorder: 'hover:border-sky-400/30',
      path: '/caregiver/location',
    },
  ];

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#020617]">
      <ParticleCanvas />

      {/* Ambient glows — matching landing page */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-teal-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ══════════════════════════════════════
            HEADER
           ══════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">Live Monitoring</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
              {greeting} 👨‍⚕️
            </h1>
            <p className="text-slate-500 text-sm mt-1">Patient Monitoring Overview</p>
          </div>

          {/* Clock pill */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Current Time</p>
              <p className="text-xl font-bold font-mono text-white">{time}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ══════════════════════════════════════
            STATS ROW
           ══════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, gradient, border, iconBg, text }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className={`relative p-5 rounded-2xl bg-gradient-to-br ${gradient} backdrop-blur-xl border ${border} overflow-hidden cursor-default transition-all hover:border-white/20`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
                <span className={`text-3xl font-extrabold ${text} tabular-nums`}>{value}</span>
              </div>
              <p className="text-xs font-medium text-slate-400">{label} today</p>

              {/* Decorative corner glow */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5 blur-xl" />
            </motion.div>
          ))}
        </div>

        {/* ══════════════════════════════════════
            QUICK ACTIONS
           ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ label, sub, icon: Icon, gradient, glow, hoverBorder, path, badge }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(path)}
              className={`relative p-5 rounded-2xl cursor-pointer overflow-hidden group bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] transition-all ${hoverBorder}`}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${glow} mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge && badge > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-[10px] font-bold text-white shadow-sm">
                        {badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ══════════════════════════════════════
            BOTTOM INFO CARDS
           ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Patient Activity ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.015, y: -2 }}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/20 relative overflow-hidden transition-all"
          >
            {/* Left accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-2xl" />

            <div className="flex items-center gap-2.5 mb-4 pl-2">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-sm text-white">Patient Activity</h3>
            </div>

            {lastActivity ? (
              <div className="space-y-3 pl-2">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 shrink-0" />
                  <div>
                    <p className="text-sm text-white">{lastActivity.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{lastActivity.scheduled_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-5">
                  <TrendingUp className="w-3 h-3 text-emerald-400/60" />
                  <p className="text-xs text-slate-500">{activityCount} activities logged today</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-white/5 mb-3">
                  <Heart className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No patient activity yet</p>
                <p className="text-xs text-slate-600 mt-1">Activities will appear here</p>
              </div>
            )}
          </motion.div>

          {/* ── Next Medication ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            whileHover={{ scale: 1.015, y: -2 }}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-emerald-500/15 hover:border-emerald-400/30 relative overflow-hidden transition-all"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-2xl" />

            <div className="flex items-center gap-2.5 mb-4 pl-2">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-sm text-white">Next Medication</h3>
            </div>

            {nextReminder ? (
              <div className="pl-2">
                <p className="text-sm text-emerald-300 leading-relaxed">{nextReminder.message}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-medium">{nextReminder.scheduled_time}</span>
                  </div>
                  <span className="ml-auto text-xs text-emerald-400/70 truncate max-w-[120px]">{nextReminder.patient_label}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-500">No upcoming reminders</p>
                <p className="text-xs text-slate-600 mt-1">You're all caught up!</p>
              </div>
            )}
          </motion.div>

          {/* ── Alerts ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.49 }}
            whileHover={{ scale: 1.015, y: -2 }}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-red-500/15 hover:border-red-400/30 relative overflow-hidden transition-all"
          >
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${missedAlerts.length > 0 ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-slate-600 to-slate-700'}`} />

            <div className="flex items-center justify-between mb-4 pl-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${missedAlerts.length > 0 ? 'bg-red-500/20' : 'bg-white/5'}`}>
                  <AlertTriangle className={`w-4 h-4 ${missedAlerts.length > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                </div>
                <h3 className="font-semibold text-sm text-white">Alerts</h3>
              </div>
              {missedAlerts.length > 0 && (
                <AnimatePresence>
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 text-[11px] bg-red-500 text-white px-2.5 py-1 rounded-full font-bold shadow-lg shadow-red-500/30"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    {missedAlerts.length}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>

            {missedAlerts.length > 0 ? (
              <div className="space-y-2.5 pl-2">
                {missedAlerts.slice(0, 2).map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-red-300 font-medium truncate">{a.message}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{a.patient_label}</p>
                    </div>
                  </div>
                ))}
                {missedAlerts.length > 2 && (
                  <p className="text-xs text-slate-500 pl-2">+{missedAlerts.length - 2} more alerts</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-500">No alerts</p>
                <p className="text-xs text-slate-600 mt-1">Everything looks good</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════
            HEALTH & LOCATION ROW
           ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Health Vitals Mini */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            onClick={() => router.push('/caregiver/health')}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-rose-400/20 cursor-pointer transition-all group">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-rose-500/20"><HeartPulse className="w-4 h-4 text-rose-400" /></div>
              <h3 className="font-semibold text-sm text-white">Health Vitals</h3>
              <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: HeartPulse, label: 'Heart', value: '72', unit: 'bpm', color: '#f87171' },
                { icon: Brain, label: 'Cognitive', value: '78', unit: '/100', color: '#a78bfa' },
                { icon: Moon, label: 'Sleep', value: '7.2', unit: 'hrs', color: '#818cf8' },
              ].map((v, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <v.icon className="w-4 h-4 mx-auto mb-1" style={{ color: v.color }} />
                  <p className="text-lg font-bold" style={{ color: v.color }}>{v.value}<span className="text-[9px] text-slate-500 ml-0.5">{v.unit}</span></p>
                  <p className="text-[9px] text-slate-500">{v.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Patient Location */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            onClick={() => router.push('/caregiver/location')}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-sky-400/20 cursor-pointer transition-all group">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-sky-500/20"><MapPin className="w-4 h-4 text-sky-400" /></div>
              <h3 className="font-semibold text-sm text-white">Patient Location</h3>
              <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
            </div>
            {patientLoc ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#020617] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-emerald-300">{patientLoc.lat.toFixed(5)}, {patientLoc.lng.toFixed(5)}</p>
                    <p className="text-[10px] text-slate-500">{new Date(patientLoc.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Within safe zone</span>
                  {patientLoc.autoShare && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 ml-auto">Auto-tracking</span>}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-white/5 mb-3"><MapPin className="w-6 h-6 text-slate-600" /></div>
                <p className="text-sm text-slate-500">No location data yet</p>
                <p className="text-xs text-slate-600 mt-1">Patient will share location from their app</p>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
}