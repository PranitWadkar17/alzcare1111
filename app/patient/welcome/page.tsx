'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Activity, Bell, MapPin, Phone, Settings,
  AlertTriangle, CheckCircle2, ArrowRight, Sparkles,
  Clock, Shield, TrendingUp, Zap, Eye, Home,
  Droplets, Brain, Smile, Users, ChevronRight,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { getTodaysTasks } from '@/lib/task-service';

// Helper: safe capitalization



const supabase = createBrowserSupabaseClient();

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let id: number;
    let w = (c.width = window.innerWidth);
    let h = (c.height = window.innerHeight);
    const ps = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16,185,129,0.6)';
        ctx.fill();
      });
      ps.forEach((a, i) =>
        ps.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(16,185,129,${(1 - d / 150) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        })
      );
      id = requestAnimationFrame(draw);
    };
    draw();
    const rs = () => {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
    };
    window.addEventListener('resize', rs);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', rs);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-60" />;
}

const FEATURES = [
  {
    title: 'Track Activities',
    desc: 'Log daily activities like meals, medicine, and exercise',
    icon: Activity,
    gradient: 'from-emerald-500 to-teal-600',
    path: '/patient/activities',
    color: 'emerald',
  },
  {
    title: 'View Reminders',
    desc: 'Stay on schedule with caregiver reminders',
    icon: Bell,
    gradient: 'from-violet-500 to-purple-600',
    path: '/patient/reminders',
    color: 'violet',
  },
  {
    title: 'Share Location',
    desc: 'Let your caregiver know where you are',
    icon: MapPin,
    gradient: 'from-sky-500 to-blue-600',
    path: '/patient/location',
    color: 'sky',
  },
  {
    title: 'Call Caregiver',
    desc: 'Quick access to contact your caregiver',
    icon: Phone,
    gradient: 'from-emerald-500 to-teal-600',
    path: '/patient/dashboard',
    color: 'emerald',
  },
  {
    title: 'Emergency SOS',
    desc: 'Instant alert for urgent situations',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-600',
    path: '/patient/dashboard',
    color: 'red',
  },
  {
    title: 'Settings',
    desc: 'Customize your experience and preferences',
    icon: Settings,
    gradient: 'from-slate-500 to-slate-600',
    path: '/patient/settings',
    color: 'slate',
  },
];

export default function PatientWelcomePage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [userName, setUserName] = useState('');
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { lat, lng, isTracking } = useLocationTracker({ patientId, enabled: true, interval: 5000 });

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setPatientId(user.id);
        // Prefer name stored in Supabase profiles table
        // (this is what was provided during account creation)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          const nameFromProfile = profile?.name;

          // Fallback to auth metadata / email local-part
          const fallback = user.user_metadata?.name || user.email?.split('@')[0] || 'Patient';
          const finalName = nameFromProfile || fallback;

          setUserName(finalName.charAt(0).toUpperCase() + finalName.slice(1));
        } catch {
          const fallback = user.user_metadata?.name || user.email?.split('@')[0] || 'Patient';
          setUserName(fallback.charAt(0).toUpperCase() + fallback.slice(1));
        }
      }
      setIsLoading(false);
    };
    loadUser();

    // Check if user has seen welcome page
    const hasSeenWelcome = localStorage.getItem('alzcare_welcome_seen');
    if (hasSeenWelcome === 'true') {
      router.push('/patient/dashboard');
    }
  }, [router]);

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('alzcare_welcome_seen', 'true');
    }
    router.push('/patient/dashboard');
  };

  const handleGetStarted = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      if (dontShowAgain) {
        localStorage.setItem('alzcare_welcome_seen', 'true');
      }
      router.push('/patient/dashboard');
    }
  };

  const tasks = getTodaysTasks();
  const selfLogs = tasks.filter((t) => t.caregiver_label === 'patient');
  const caregiverTasks = tasks.filter((t) => t.caregiver_label !== 'patient');
  const pendingCount = caregiverTasks.filter((t) => t.status === 'pending').length;
  const wellnessScore = Math.min(100, selfLogs.length * 18 + (isTracking ? 10 : 0));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <ParticleCanvas />

      {/* Ambient Glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.08, 0.12, 0.08],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.06, 0.1, 0.06],
          }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-violet-500/8 rounded-full blur-[90px]"
        />
      </div>

      {/* Skip Button - Always Visible */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleSkip}
        className="fixed top-6 right-6 z-50 px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
      >
        Skip to Dashboard →
      </motion.button>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 min-h-screen flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 0: Welcome Hero */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-8 max-w-3xl"
            >
              {/* Logo & Brand */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-4 mb-8"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
                >
                  <Heart className="w-10 h-10 text-white" />
                </motion.div>
              </motion.div>

              {/* Welcome Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4">
                  <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
Welcome, {userName || 'Patient'} ! 👋
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-slate-400 mb-2">
                  Your personal health companion
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-medium">Powered by AlzCare</span>
                </div>
              </motion.div>

              {/* Quick Stats Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
              >
                <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{wellnessScore}</p>
                  <p className="text-xs text-slate-500">Wellness Score</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-violet-500/20">
                  <Bell className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-violet-400">{pendingCount}</p>
                  <p className="text-xs text-slate-500">Reminders</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-sky-500/20">
                  <MapPin className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-sky-400">{isTracking ? 'Active' : 'Off'}</p>
                  <p className="text-xs text-slate-500">GPS Status</p>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="px-10 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-bold shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center gap-3 mx-auto"
                >
                  Let's Get Started
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
                <p className="text-sm text-slate-500">
                  Take a quick tour to discover what you can do
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 1: Features Grid */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl space-y-8"
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Discover Features</span>
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Everything You Need
                </h2>
                <p className="text-lg text-slate-400">
                  Powerful tools designed to keep you healthy and connected
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => router.push(feature.path)}
                    className="group p-6 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-emerald-400/30 cursor-pointer transition-all relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg shadow-${feature.color}-500/25 group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-3">{feature.desc}</p>
                      <div className="flex items-center text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-center gap-4 pt-8"
              >
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: Quick Start Guide */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl space-y-8"
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4"
                >
                  <Zap className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-violet-400 font-medium">Quick Start</span>
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  You're All Set! 🎉
                </h2>
                <p className="text-lg text-slate-400">
                  Here are some quick actions to get you started
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                {[
                  {
                    icon: Activity,
                    title: 'Log Your First Activity',
                    desc: 'Track what you did today - meals, medicine, or exercise',
                    color: 'emerald',
                    path: '/patient/activities',
                  },
                  {
                    icon: Bell,
                    title: 'Check Your Reminders',
                    desc: 'See if your caregiver has scheduled any tasks for you',
                    color: 'violet',
                    path: '/patient/reminders',
                  },
                  {
                    icon: MapPin,
                    title: 'Enable Location Sharing',
                    desc: 'Let your caregiver know where you are for safety',
                    color: 'sky',
                    path: '/patient/location',
                  },
                  {
                    icon: Home,
                    title: 'Visit Your Dashboard',
                    desc: 'See your wellness score and daily overview',
                    color: 'emerald',
                    path: '/patient/dashboard',
                  },
                ].map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    onClick={() => router.push(action.path)}
                    className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-emerald-400/30 cursor-pointer transition-all flex items-center gap-4 group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${action.color}-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{action.title}</h3>
                      <p className="text-sm text-slate-400">{action.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  </motion.div>
                ))}
              </div>

              {/* Don't Show Again */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-3 pt-4"
              >
                <input
                  type="checkbox"
                  id="dontShow"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/20"
                />
                <label htmlFor="dontShow" className="text-sm text-slate-400 cursor-pointer">
                  Don't show this welcome page again
                </label>
              </motion.div>

              {/* Final CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-4 pt-4"
              >
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-bold shadow-2xl shadow-emerald-500/30 flex items-center gap-3"
                >
                  Go to Dashboard
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === i
                  ? 'bg-emerald-400 w-8'
                  : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
