'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Activity, Bell, MapPin, Phone, Settings,
  AlertTriangle, CheckCircle2, ArrowRight, Sparkles,
  Clock, Shield, TrendingUp, Zap, Eye, Home,
  Users, ChevronRight, BarChart3, Pill, Brain,
  Target, Stethoscope, Calendar, MessageSquare,
  HeartPulse, UserPlus, Navigation, ClipboardList
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { getTodaysTasks, subscribeToTasks, SharedTask } from '@/lib/task-service';

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
    const ps = Array.from({ length: 70 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
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
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
        gradient.addColorStop(0, 'rgba(16,185,129,0.6)');
        gradient.addColorStop(0.5, 'rgba(6,182,212,0.4)');
        gradient.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      ps.forEach((a, i) =>
        ps.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 140) {
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
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-50" />;
}

const FEATURES = [
  {
    title: 'Patient Dashboard',
    desc: 'Monitor wellness scores and daily activities',
    icon: BarChart3,
    gradient: 'from-blue-500 to-indigo-600',
    path: '/caregiver/dashboard',
    color: 'blue',
  },
  {
    title: 'Manage Patients',
    desc: 'Link and oversee multiple patients',
    icon: Users,
    gradient: 'from-cyan-500 to-blue-600',
    path: '/caregiver/patients',
    color: 'cyan',
  },
  {
    title: 'Track Location',
    desc: 'Real-time GPS monitoring for safety',
    icon: MapPin,
    gradient: 'from-sky-500 to-cyan-600',
    path: '/caregiver/location',
    color: 'sky',
  },
  {
    title: 'Set Reminders',
    desc: 'Schedule medications and activities',
    icon: Bell,
    gradient: 'from-violet-500 to-purple-600',
    path: '/caregiver/reminders',
    color: 'violet',
  },
  {
    title: 'View Alerts',
    desc: 'Get notified of SOS and events',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-600',
    path: '/caregiver/alerts',
    color: 'red',
  },
  {
    title: 'Health Monitoring',
    desc: 'Track medications and health metrics',
    icon: HeartPulse,
    gradient: 'from-emerald-500 to-teal-600',
    path: '/caregiver/health',
    color: 'emerald',
  },
];

export default function CaregiverWelcomePage() {
  const router = useRouter();
  const [caregiverId, setCaregiverId] = useState('');
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    patientsCount: 0,
    alertsCount: 0
  });
  const [tasks, setTasks] = useState<SharedTask[]>([]);

  useEffect(() => {
    const unsub = subscribeToTasks(all => setTasks(all));
    return unsub;
  }, []);

  const tasksCount = tasks.filter(t => t.date === new Date().toISOString().split('T')[0]).length;

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCaregiverId(user.id);
        
        // Load stats
        const { data: links } = await supabase
          .from('patient_caregiver_links')
          .select('*')
          .eq('caregiver_id', user.id)
          .eq('status', 'active');
        
        setStats({
          patientsCount: links?.length || 0,
          alertsCount: 0 // Can be loaded from alerts table
        });
      }
      setIsLoading(false);
    };
    loadUser();

    // Check if user has seen welcome page
    const hasSeenWelcome = localStorage.getItem('alzcare_caregiver_welcome_seen');
    if (hasSeenWelcome === 'true') {
      router.push('/caregiver/dashboard');
    }
  }, [router]);

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('alzcare_caregiver_welcome_seen', 'true');
    }
    router.push('/caregiver/dashboard');
  };

  const handleGetStarted = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      if (dontShowAgain) {
        localStorage.setItem('alzcare_caregiver_welcome_seen', 'true');
      }
      router.push('/caregiver/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your caregiving center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <ParticleCanvas />

      {/* Ambient Glows - Emerald/Teal Theme */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.08, 0.12, 0.08],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-teal-400/8 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.06, 0.1, 0.06],
          }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-violet-400/6 rounded-full blur-[100px]"
        />
      </div>

      {/* Skip Button */}
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
                    scale: [1, 1.08, 1],
                    rotate: [0, 3, -3, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40"
                >
                  <Shield className="w-12 h-12 text-white" />
                </motion.div>
              </motion.div>

              {/* Welcome Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4 leading-tight">
                  <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
                    Welcome to Your
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-500 bg-clip-text text-transparent">
                    Caregiving Hub 💙
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-slate-400 mb-3 mt-6">
                  Your command center for compassionate care
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-medium">Powered by AlzCare Professional</span>
                </div>
              </motion.div>

              {/* Quick Stats Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 backdrop-blur-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                >
                  <Users className="w-7 h-7 text-emerald-400 mx-auto mb-3" />
                  <p className="text-3xl font-black text-emerald-400 mb-1">{stats.patientsCount}</p>
                  <p className="text-xs text-slate-400 font-medium">Patients</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-red-500/15 to-red-500/5 backdrop-blur-xl border border-red-500/30 shadow-lg shadow-red-500/10"
                >
                  <AlertTriangle className="w-7 h-7 text-red-400 mx-auto mb-3" />
                  <p className="text-3xl font-black text-red-400 mb-1">{stats.alertsCount}</p>
                  <p className="text-xs text-slate-400 font-medium">Active Alerts</p>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 backdrop-blur-xl border border-violet-500/30 shadow-lg shadow-violet-500/10"
                >
                  <ClipboardList className="w-7 h-7 text-violet-400 mx-auto mb-3" />
                  <p className="text-3xl font-black text-violet-400 mb-1">{tasksCount}</p>
                  <p className="text-xs text-slate-400 font-medium">Today's Tasks</p>
                </motion.div>
              </motion.div>

              {/* Feature Highlights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
              >
                {[
                  { icon: MapPin, label: 'GPS Tracking', color: 'sky' },
                  { icon: Bell, label: 'Smart Reminders', color: 'violet' },
                  { icon: HeartPulse, label: 'Health Monitor', color: 'emerald' },
                  { icon: Shield, label: 'SOS Alerts', color: 'red' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center gap-2"
                  >
                    <div className={`p-1.5 rounded-lg bg-${item.color}-500/20`}>
                      <item.icon className={`w-3.5 h-3.5 text-${item.color}-400`} />
                    </div>
                    <span className="text-xs font-medium text-slate-300">{item.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="space-y-4 pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(16,185,129,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="px-12 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-lg font-black shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all flex items-center gap-3 mx-auto"
                >
                  <Sparkles className="w-6 h-6" />
                  Let's Get Started
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
                <p className="text-sm text-slate-500">
                  Discover powerful tools to provide the best care
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
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Powerful Features</span>
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-white via-emerald-100 to-cyan-300 bg-clip-text text-transparent">
                  Everything You Need to Care
                </h2>
                <p className="text-lg text-slate-400">
                  Professional tools designed for effective caregiving
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
                    whileHover={{ scale: 1.04, y: -8 }}
                    onClick={() => router.push(feature.path)}
                    className="group p-6 rounded-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-emerald-400/40 cursor-pointer transition-all relative overflow-hidden shadow-xl"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.15] transition-opacity duration-500`} />
                    <div className="relative z-10">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-2xl shadow-${feature.color}-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-black text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-3">{feature.desc}</p>
                      <div className="flex items-center text-emerald-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-medium"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4"
                >
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-cyan-400 font-medium">Quick Start</span>
                </motion.div>
                <h2 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-white via-emerald-100 to-cyan-300 bg-clip-text text-transparent">
                  You're All Set! 🎉
                </h2>
                <p className="text-lg text-slate-400">
                  Here are some quick actions to begin your caregiving journey
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                {[
                  {
                    icon: UserPlus,
                    title: 'Link Your First Patient',
                    desc: 'Connect with a patient to start monitoring their wellness',
                    color: 'blue',
                    gradient: 'from-blue-500 to-indigo-600',
                    path: '/caregiver/patients',
                  },
                  {
                    icon: Bell,
                    title: 'Create a Reminder',
                    desc: 'Set up medication schedules and activity reminders',
                    color: 'violet',
                    gradient: 'from-violet-500 to-purple-600',
                    path: '/caregiver/reminders',
                  },
                  {
                    icon: Navigation,
                    title: 'Enable Location Tracking',
                    desc: 'Start monitoring patient location for safety and peace of mind',
                    color: 'sky',
                    gradient: 'from-sky-500 to-cyan-600',
                    path: '/caregiver/location',
                  },
                  {
                    icon: BarChart3,
                    title: 'Visit Dashboard',
                    desc: 'See patient overview, wellness data, and daily activities',
                    color: 'emerald',
                    gradient: 'from-emerald-500 to-teal-600',
                    path: '/caregiver/dashboard',
                  },
                ].map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, x: 8 }}
                    onClick={() => router.push(action.path)}
                    className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-emerald-400/40 cursor-pointer transition-all flex items-center gap-5 group shadow-lg hover:shadow-2xl"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xl shadow-${action.color}-500/30`}>
                      <action.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-white mb-1.5">{action.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{action.desc}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </motion.div>
                ))}
              </div>

              {/* Additional Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20 shrink-0">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Pro Tip</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Start by linking a patient and setting up their medication reminders. Enable location tracking for added safety, and check the dashboard daily to monitor their wellness score and activities.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Don't Show Again */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-3 pt-4"
              >
                <input
                  type="checkbox"
                  id="dontShow"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/20 cursor-pointer"
                />
                <label htmlFor="dontShow" className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                  Don't show this welcome page again
                </label>
              </motion.div>

              {/* Final CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-4 pt-4"
              >
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-medium"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(16,185,129,0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                  className="px-12 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-lg font-black shadow-2xl shadow-emerald-500/40 flex items-center gap-3"
                >
                  <Home className="w-6 h-6" />
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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5"
        >
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                step === i
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400 w-10 shadow-lg shadow-blue-400/50'
                  : 'bg-white/20 w-2.5 hover:bg-white/40'
              }`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
