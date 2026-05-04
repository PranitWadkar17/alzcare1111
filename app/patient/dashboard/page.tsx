'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, ClipboardList, Bell, Users, MapPin,
  Settings, LogOut, Menu, Pill, Utensils, Activity,
} from 'lucide-react';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { LocationStatus } from '@/components/patient/LocationStatus';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
  createTask, getTodaysTasks, subscribeToTasks, SharedTask,
} from '@/lib/task-service';

const supabase = createBrowserSupabaseClient();

const ACTIVITY_ITEMS = [
  { name: 'Took Medicine', icon: Pill,     time: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { name: 'Ate Food',      icon: Utensils, time: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { name: 'Went Outside',  icon: Activity, time: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
];

export default function PatientDashboard() {
  const [open, setOpen]           = useState(true);
  const [patientId, setPatientId] = useState<string>('');
  const [tasks, setTasks]         = useState<SharedTask[]>([]);
  const [logged, setLogged]       = useState<Set<string>>(new Set());
  const router = useRouter();

  /* auth */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setPatientId(user.id);
    });
  }, []);

  /* tasks */
  useEffect(() => {
    setTasks(getTodaysTasks());
    const unsub = subscribeToTasks(() => setTasks(getTodaysTasks()));
    return unsub;
  }, []);

  /* location tracker */
  const { lat, lng, accuracy, lastUpdated, isTracking, error, refreshLocation } =
    useLocationTracker({ patientId, interval: 3000, enabled: !!patientId });

  /* quick-log an activity */
  const logActivity = (name: string) => {
    if (logged.has(name)) return;
    const now = new Date();
    createTask({
      patient_label:  'patient',
      caregiver_label: 'patient',
      message:         name,
      scheduled_time:  now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date:            now.toISOString().split('T')[0],
    });
    setLogged(prev => new Set(prev).add(name));
    setTasks(getTodaysTasks());
  };

  /* derived data */
  const caregiverTasks   = tasks.filter(t => t.caregiver_label !== 'patient');
  const selfLogs         = tasks.filter(t => t.caregiver_label === 'patient');
  const nextReminder     = caregiverTasks.find(t => t.status === 'pending');

  const menuItems = [
    { name: 'Home',          icon: Home,          path: '/patient/dashboard' },
    { name: 'My Activities', icon: ClipboardList,  path: '/patient/activities' },
    { name: 'Reminders',     icon: Bell,           path: '/patient/reminders' },
    { name: 'Caregiver',     icon: Users,          path: '/patient/caregiver' },
    { name: 'Location',      icon: MapPin,         path: '/patient/location' },
    { name: 'Settings',      icon: Settings,       path: '/patient/settings' },
  ];

  function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let animationId: number;
      let width  = (canvas.width  = window.innerWidth);
      let height = (canvas.height = window.innerHeight);
      const particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      }));
      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > width)  p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16,185,129,0.5)';
          ctx.fill();
        });
        animationId = requestAnimationFrame(draw);
      };
      draw();
      return () => cancelAnimationFrame(animationId);
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />;
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <ParticleCanvas />

      <motion.div
        className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#020617]/40 to-[#020617]" />

      <div className="relative flex w-full">
        {/* SIDEBAR */}
        <div className={`bg-[#020617]/80 backdrop-blur-xl border-r border-white/10 p-4 transition-all duration-300 ${open ? 'w-64' : 'w-20'}`}>
          <button onClick={() => setOpen(!open)} className="mb-6 text-slate-400 hover:text-white">
            <Menu />
          </button>

          <div className="space-y-3">
            {menuItems.map((item, i) => (
              <div
                key={i}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 cursor-pointer transition"
              >
                <item.icon className="w-5 h-5 text-emerald-400" />
                {open && <span className="text-sm">{item.name}</span>}
              </div>
            ))}
          </div>

          <div className="absolute bottom-6 left-4 right-4">
            <div
              onClick={() => router.push('/')}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              {open && <span>Logout</span>}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6"
        >
          <h1 className="text-2xl font-bold mb-2">Hello 👋</h1>
          <p className="text-slate-400 mb-6">Here&apos;s your daily overview</p>

          {/* LOCATION */}
          <div className="mb-6">
            <LocationStatus
              lat={lat} lng={lng} accuracy={accuracy}
              lastUpdated={lastUpdated} isTracking={isTracking}
              error={error} onRefresh={refreshLocation}
            />
          </div>

          {/* QUICK LOG CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {ACTIVITY_ITEMS.map((act, i) => {
              const done = logged.has(act.name);
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: done ? 1 : 1.05 }}
                  onClick={() => logActivity(act.name)}
                  className={`p-5 rounded-2xl border cursor-pointer transition ${
                    done
                      ? 'bg-emerald-500/15 border-emerald-400/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <act.icon className={`w-8 h-8 ${done ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-sm">{act.name}</span>
                    {done && <span className="text-xs text-emerald-400">✓ Logged</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* TODAY'S ACTIVITY — from self-logged tasks */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <h2 className="text-lg font-semibold mb-3">Today&apos;s Activity</h2>
            {selfLogs.length > 0 ? (
              <div className="space-y-2">
                {selfLogs.map(t => (
                  <p key={t.id} className="text-sm text-slate-300">
                    ✔ {t.message}
                    <span className="text-xs text-slate-500 ml-2">{t.scheduled_time}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No activity logged yet. Tap a card above to log an activity.
              </p>
            )}
          </div>

          {/* CAREGIVER REMINDER — next pending from caregiver */}
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <h2 className="text-lg font-semibold mb-2">
              Reminder
              {caregiverTasks.filter(t => t.status === 'pending').length > 0 && (
                <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  {caregiverTasks.filter(t => t.status === 'pending').length} pending
                </span>
              )}
            </h2>
            {nextReminder ? (
              <p className="text-sm text-emerald-300">
                {nextReminder.message}
                <span className="ml-2 text-xs text-slate-400">at {nextReminder.scheduled_time}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400">No upcoming reminders from your caregiver.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}