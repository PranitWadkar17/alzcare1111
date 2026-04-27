'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Activity, Bell, MapPin, AlertTriangle } from 'lucide-react';

export default function CaregiverDashboard() {

  const [time, setTime] = useState('');
  const [greeting, setGreeting] = useState('');

  const [activities, setActivities] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // ⏰ TIME + GREETING
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      const hour = now.getHours();

      if (hour < 12) setGreeting('Good Morning 👨‍⚕️');
      else if (hour < 18) setGreeting('Good Afternoon ☀️');
      else setGreeting('Good Evening 🌙');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // 📦 LOAD DATA
  useEffect(() => {
    const act = localStorage.getItem("activities");
    const rem = localStorage.getItem("reminders");
    const al = localStorage.getItem("alerts");

    if (act) setActivities(JSON.parse(act));
    if (rem) setReminders(JSON.parse(rem));
    if (al) setAlerts(JSON.parse(al));
  }, []);

  // 🔥 DATA
  const lastActivity = activities[0];
  const activityCount = activities.length;
  const nextReminder = reminders.find(r => r.next && !r.done);
  const latestAlert = alerts[0];

  // 🌌 PARTICLES (same)
  function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationId: number;
      let width = canvas.width = window.innerWidth;
      let height = canvas.height = window.innerHeight;

      const particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16,185,129,0.6)';
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
    <div className="relative min-h-screen text-white overflow-hidden">

      <ParticleCanvas />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/60 to-[#020617]" />

      <div className="relative z-10">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <h1 className="text-2xl font-bold">{greeting} 👋</h1>
          <p className="text-slate-400 text-sm">Patient Monitoring Overview</p>
        </motion.div>

        {/* TIME */}
        <motion.div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 border border-emerald-400/30 mb-6 flex items-center gap-4">
          <Clock className="text-emerald-400" />
          <div>
            <p className="text-sm">Current Time</p>
            <h2 className="text-xl">{time}</h2>
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = '/caregiver/activities'}
            className="p-5 rounded-2xl bg-white/10 border border-white/20 text-center cursor-pointer"
          >
            <Activity className="mx-auto text-emerald-400 mb-2" />
            View Activity
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = '/caregiver/reminders'}
            className="p-5 rounded-2xl bg-white/10 border border-white/20 text-center cursor-pointer"
          >
            <Bell className="mx-auto text-emerald-400 mb-2" />
            Manage Reminders
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = '/caregiver/location'}
            className="p-5 rounded-2xl bg-white/10 border border-white/20 text-center"
          >
            <MapPin className="mx-auto text-emerald-400 mb-2" />
            Track Location
          </motion.div>

        </div>

        {/* ACTIVITY SUMMARY */}
        <div className="p-6 rounded-2xl bg-white/10 border border-white/20 mb-6">
          <h2 className="text-lg mb-2">Patient Activity</h2>

          {lastActivity ? (
            <>
              <p className="text-sm">✔ Last: {lastActivity.text}</p>
              <p className="text-xs text-slate-400">{lastActivity.time}</p>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No activity recorded</p>
          )}

          <p className="text-xs mt-2 text-slate-400">
            {activityCount} activities today
          </p>
        </div>

        {/* NEXT MEDICATION */}
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 mb-6">
          <h2 className="text-lg mb-2">Next Medication</h2>

          {nextReminder ? (
            <p className="text-emerald-300 text-sm">
              {nextReminder.text} at {nextReminder.time}
            </p>
          ) : (
            <p className="text-slate-400 text-sm">
              No upcoming reminders
            </p>
          )}
        </div>

        {/* ALERT SECTION */}
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-400/30">
          <h2 className="text-lg mb-2">Alerts 🚨</h2>

          {latestAlert ? (
            <p className="text-red-300 text-sm">
              {latestAlert.text}
            </p>
          ) : (
            <p className="text-slate-400 text-sm">
              No alerts
            </p>
          )}
        </div>

      </div>
    </div>
  );
}