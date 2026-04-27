//app/Page.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Link from 'next/link';
import {
  Heart,
  Shield,
  Activity,
  MapPin,
  Bell,
  CheckCircle,
  Users,
  Brain,
  Pill,
  Phone,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  X,
  Menu,
  ArrowRight,
  Zap,
  Lock,
  Clock,
} from 'lucide-react';

// ── Particle Canvas ──────────────────────────────────────────────
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

    const PARTICLE_COUNT = 80;
    const MAX_DISTANCE = 150;
    const COLOR = '16, 185, 129';

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      radius: number; opacity: number;
    }

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLOR}, ${p.opacity})`;
        ctx.fill();

        particles.forEach(q => {
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${COLOR}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.8 }}
    />
  );
}

// ── Animated Counter ─────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// ── Section Wrapper ───────────────────────────────────────────────
function Section({ children, id, className = '' }: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ── Alert Popup ───────────────────────────────────────────────────
function AlertPopup({ type, onClose }: {
  type: 'medication' | 'geofence' | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!type) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [type, onClose]);

  const isMed = type === 'medication';

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4`}
        >
          <div className={`p-4 rounded-2xl backdrop-blur-xl border flex items-start gap-3 shadow-2xl ${
            isMed
              ? 'bg-red-500/20 border-red-500/40 shadow-red-500/20'
              : 'bg-orange-500/20 border-orange-500/40 shadow-orange-500/20'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isMed ? 'bg-red-500/30' : 'bg-orange-500/30'
            }`}>
              {isMed
                ? <Pill className="w-5 h-5 text-red-400" />
                : <MapPin className="w-5 h-5 text-orange-400" />
              }
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${isMed ? 'text-red-300' : 'text-orange-300'}`}>
                {isMed ? 'Missed Medication Alert' : 'Safe Zone Exit Alert'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isMed
                  ? 'Patient has not taken their 8:00 AM medication. Caregiver notified.'
                  : 'Patient has exited the designated safe zone. Last location: Main Street.'}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [alert, setAlert] = useState<'medication' | 'geofence' | null>(null);
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const closeAlert = useCallback(() => setAlert(null), []);

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Demo', id: 'demo' },
    { label: 'Team', id: 'team' },
  ];

  const patientFeatures = [
    { icon: Pill, title: 'Smart Medication Reminder', desc: 'Timely reminders with voice prompts ensure patients never miss a dose.' },
    { icon: ClipboardList, title: 'Guided Routine Mode', desc: 'Step-by-step daily task guidance keeps patients calm and structured.' },
    { icon: Phone, title: 'Emergency SOS', desc: 'One tap sends an instant alert to all linked caregivers with location.' },
    { icon: Heart, title: 'Comfort Mode', desc: 'Simplified, calming interface reduces anxiety and cognitive overload.' },
  ];

  const caregiverFeatures = [
    { icon: MapPin, title: 'Live Location Monitoring', desc: 'Real-time GPS tracking with safe zone alerts and breach notifications.' },
    { icon: Activity, title: 'Medication Log Tracking', desc: 'Complete timeline of taken and missed medications with trend analysis.' },
    { icon: TrendingUp, title: 'Task Completion Overview', desc: 'Visual dashboards showing daily routine adherence and progress.' },
    { icon: Brain, title: 'Wellness Input Panel', desc: 'Track caregiver stress and sleep to prevent burnout before it happens.' },
  ];

  const steps = [
    { icon: Bell, title: 'Patient receives reminder', desc: 'Smart notification sent at the right time with voice prompt support.' },
    { icon: CheckCircle, title: 'Action is logged', desc: 'Every interaction is automatically recorded in real-time.' },
    { icon: Activity, title: 'Caregiver sees update', desc: 'Dashboard updates instantly — no manual reporting needed.' },
    { icon: AlertTriangle, title: 'Alert if needed', desc: 'If action is missed, caregiver is notified immediately.' },
  ];

  const teamMembers = [
    { name: 'Pranit Wadkar', role: 'Role / Designation', },
    { name: 'Abhishek Chavan', role: 'Role / Designation' },
    { name: 'Sharmin Shaikh', role: 'Role / Designation' },
    { name: 'Shreya Raut', role: 'Role / Designation' },
    { name: 'Pranita Chougale', role: 'Role / Designation' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">

      {/* Alert Popup */}
      <AlertPopup type={alert} onClose={closeAlert} />

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-[#020617]/80 backdrop-blur-xl border-b border-white/5' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-linear-to-r from-white to-emerald-300 bg-clip-text text-transparent">
                AlzCare
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-slate-400 hover:text-emerald-400 transition-colors text-sm font-medium"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </motion.button>
              </Link>
              <Link href="/patient/dashboard">
                <motion.button>Get Started</motion.button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-slate-400 hover:text-white transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#020617]/95 backdrop-blur-xl border-b border-white/5"
            >
              <div className="px-4 py-4 space-y-3">
                {navLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="block w-full text-left text-slate-400 hover:text-emerald-400 transition-colors text-sm py-2"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="flex gap-3 pt-2">
                  <Link href="/login" className="flex-1">
                    <button className="w-full py-2 text-sm text-slate-300 border border-white/10 rounded-xl">
                      Login
                    </button>
                  </Link>
                  <Link href="/register?role=patient" className="flex-1">
                    <button className="w-full py-2 text-sm bg-emerald-500 text-white font-semibold rounded-xl">
                      Get Started
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <ParticleCanvas />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#020617]/20 to-[#020617]" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="w-14 h-14 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-6xl md:text-8xl font-bold bg-linear-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
              AlzCare
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-300 mb-4 font-light"
          >
            A Smarter Way to Care for Alzheimer&apos;s Patients
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-base md:text-lg text-emerald-400/80 mb-10 max-w-2xl mx-auto font-medium"
          >
            Because every moment of clarity deserves to be protected — and every caregiver deserves peace of mind.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToFeatures}
              className="px-8 py-4 bg-linear-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl text-base flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <Users className="w-5 h-5" />
              Explore Patient Side
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToFeatures}
              className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-violet-400/40 text-white font-semibold rounded-2xl text-base flex items-center gap-2 transition-all"
            >
              <Shield className="w-5 h-5 text-violet-400" />
              Explore Caregiver Side
            </motion.button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer"
              onClick={() => scrollToSection('problem')}
            >
              <span className="text-xs">Scroll to explore</span>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Problem Section ── */}
      <Section id="problem" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-emerald-400 text-sm font-semibold tracking-widest uppercase"
            >
              The Challenge
            </motion.span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-4">
              The Reality We Face
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Alzheimer&apos;s disease is not just a medical condition — it is a daily crisis for millions of families around the world.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                stat: '55M+',
                label: 'People worldwide living with dementia',
                desc: 'A number projected to triple by 2050 without intervention.',
                color: 'emerald',
              },
              {
                icon: MapPin,
                stat: '60%',
                label: 'Of patients wander at least once',
                desc: 'Wandering is the leading cause of injury and death in Alzheimer\'s patients.',
                color: 'red',
              },
              {
                icon: Heart,
                stat: '70%',
                label: 'Of caregivers report severe burnout',
                desc: 'Most caregivers receive little to no support for their own mental health.',
                color: 'violet',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/20 transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  item.color === 'emerald' ? 'bg-emerald-500/20' :
                  item.color === 'red' ? 'bg-red-500/20' : 'bg-violet-500/20'
                }`}>
                  <item.icon className={`w-6 h-6 ${
                    item.color === 'emerald' ? 'text-emerald-400' :
                    item.color === 'red' ? 'text-red-400' : 'text-violet-400'
                  }`} />
                </div>
                <div className="text-4xl font-bold text-white mb-1">{item.stat}</div>
                <div className="text-emerald-400 font-semibold text-sm mb-2">{item.label}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Solution Section ── */}
      <Section id="solution" className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
            Our Answer
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-6">
            Integrated Safety + Adherence + Caregiver Support
          </h2>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-emerald-400/20 mb-8 text-left"
          >
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              AlzCare is a unified care ecosystem that connects patients and caregivers through intelligent monitoring, proactive alerts, and compassionate design. We do not just track — we anticipate, adapt, and act.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Built specifically for Alzheimer&apos;s care, AlzCare bridges the gap between patient independence and caregiver oversight — giving patients dignity while giving caregivers confidence. Every feature is designed with cognitive accessibility at its core.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Zap, label: 'Real-time alerts' },
              { icon: Lock, label: 'OTP secured login' },
              { icon: Shield, label: 'HIPAA compliant' },
              { icon: Clock, label: '24/7 monitoring' },
              { icon: Heart, label: 'Caregiver wellness' },
              { icon: Brain, label: 'Cognitive UX design' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Features Section ── */}
      <section id="features" ref={featuresRef} className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
              Platform Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-3">
              Built for Every Role
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Patient side */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Patient Side</h3>
                  <p className="text-slate-400 text-sm">Designed for simplicity and calm</p>
                </div>
              </div>
              <div className="space-y-4">
                {patientFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/30 transition-all cursor-default"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <feature.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Caregiver side */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Caregiver Side</h3>
                  <p className="text-slate-400 text-sm">Designed for oversight and peace of mind</p>
                </div>
              </div>
              <div className="space-y-4">
                {caregiverFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-violet-400/30 transition-all cursor-default"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <feature.icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <Section id="how-it-works" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
              The Process
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-3">
              How AlzCare Works
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-linear-to-b from-emerald-500/50 via-emerald-500/20 to-transparent" />

            <div className="space-y-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-6 pl-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 relative z-10">
                    <step.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-400/60 text-xs font-mono">0{i + 1}</span>
                      <h3 className="text-white font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Demo Simulation ── */}
      <Section id="demo" className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
            Live Demo
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-4">
            See AlzCare in Action
          </h2>
          <p className="text-slate-400 mb-12 max-w-xl mx-auto">
            Click the buttons below to simulate real alerts that caregivers receive. This is exactly what happens in the real system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAlert('medication')}
              className="px-8 py-4 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 text-red-300 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <Pill className="w-5 h-5" />
              Simulate Missed Medication
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(249,115,22,0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAlert('geofence')}
              className="px-8 py-4 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/60 text-orange-300 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <MapPin className="w-5 h-5" />
              Simulate Safe Zone Exit
            </motion.button>
          </div>

          {/* Demo info cards */}
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-semibold text-sm">Missed Medication Alert</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                When a patient misses their scheduled medication, AlzCare immediately notifies all linked caregivers with the medication name, scheduled time, and patient location.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 font-semibold text-sm">Safe Zone Exit Alert</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                If a patient leaves a designated safe zone, caregivers receive an instant alert with the patient&apos;s last known location and a direct link to live tracking.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Impact Section ── */}
      <Section id="impact" className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
            Our Impact
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-16">
            Numbers That Matter
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { target: 10000, suffix: '+', label: 'Patients Protected', icon: Users },
              { target: 50000, suffix: '+', label: 'Alerts Triggered', icon: Bell },
              { target: 200000, suffix: '+', label: 'Tasks Completed', icon: CheckCircle },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10"
              >
                <item.icon className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
                <div className="text-5xl font-bold text-white mb-2">
                  <Counter target={item.target} suffix={item.suffix} />
                </div>
                <div className="text-slate-400 font-medium">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 max-w-3xl mx-auto"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Our Vision</h3>
            <p className="text-slate-300 leading-relaxed">
              We envision a world where Alzheimer&apos;s patients live with dignity, independence, and safety — and where caregivers are empowered rather than overwhelmed. AlzCare is our step toward making intelligent, compassionate healthcare accessible to every family — regardless of geography, income, or technical expertise.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ── Team Section ── */}
      <Section id="team" className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
            The Team
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-3 mb-4">
            Meet the Builders
          </h2>
          <p className="text-slate-400 mb-4">
            — Insert Institution Name —
          </p>
          {/* <p className="text-emerald-400/70 text-sm mb-12">
            — Insert Event / Hackathon Name —
          </p> */}

          <div className="flex flex-wrap justify-center gap-6">
            {teamMembers.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/20 transition-all w-44"
              >
                <div className="w-14 h-14 rounded-full bg-linear-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-400/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-400 font-bold text-lg">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">{member.name}</h4>
                <p className="text-slate-400 text-xs">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="py-12 px-4 border-t border-white/5">
        {/* Animated gradient line */}
        <div className="h-px w-full max-w-7xl mx-auto mb-10 bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">AlzCare</span>
              <span className="text-slate-500 text-sm ml-2">— Intelligent Alzheimer&apos;s Care</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <Link href="/login" className="hover:text-emerald-400 transition-colors">Login</Link>
              <Link href="/register?role=patient" className="hover:text-emerald-400 transition-colors">Register</Link>
              <Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link>
              <Link href="/privacy-policy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-4 text-slate-500 text-xs">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-slate-600 text-xs">
            © {new Date().getFullYear()} AlzCare. Built with care for Alzheimer&apos;s patients and their families.
          </div>
        </div>
      </footer>

    </div>
  );
}