'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bell, Volume2, Moon, Smartphone, Trash2, Shield, Globe,
  Clock, Eye, Lock, Palette, User, Mail, Phone, ChevronRight,
  CheckCircle2, AlertTriangle, Zap, Monitor, BellRing, MapPin,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/* ── Toggle Component ── */
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${value ? 'bg-emerald-500' : 'bg-slate-700'}`}>
      <motion.div layout
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-lg"
        style={{ left: value ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  );
}

export default function CaregiverSettingsPage() {
  const { profile, signOut } = useAuth();

  // Settings state
  const [sound, setSound] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [sosAlerts, setSosAlerts] = useState(true);
  const [locationAlerts, setLocationAlerts] = useState(true);
  const [autoTrack, setAutoTrack] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [safeRadius, setSafeRadius] = useState(2);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('emerald');
  const [saved, setSaved] = useState(false);

  // Load
  useEffect(() => {
    try {
      const s = localStorage.getItem('alzcare_settings');
      if (s) {
        const d = JSON.parse(s);
        if (d.sound !== undefined) setSound(d.sound);
        if (d.notifications !== undefined) setNotifications(d.notifications);
        if (d.darkMode !== undefined) setDarkMode(d.darkMode);
        if (d.vibration !== undefined) setVibration(d.vibration);
        if (d.sosAlerts !== undefined) setSosAlerts(d.sosAlerts);
        if (d.locationAlerts !== undefined) setLocationAlerts(d.locationAlerts);
        if (d.autoTrack !== undefined) setAutoTrack(d.autoTrack);
        if (d.quietHoursEnabled !== undefined) setQuietHoursEnabled(d.quietHoursEnabled);
        if (d.quietStart) setQuietStart(d.quietStart);
        if (d.quietEnd) setQuietEnd(d.quietEnd);
        if (d.safeRadius) setSafeRadius(d.safeRadius);
        if (d.language) setLanguage(d.language);
        if (d.theme) setTheme(d.theme);
      }
    } catch { }
  }, []);

  // Auto-save
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Auto-save (skip first render to prevent blink)
  useEffect(() => {
    if (!mounted) return;
    const data = { sound, notifications, darkMode, vibration, sosAlerts, locationAlerts, autoTrack, quietHoursEnabled, quietStart, quietEnd, safeRadius, language, theme };
    localStorage.setItem('alzcare_settings', JSON.stringify(data));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [sound, notifications, darkMode, vibration, sosAlerts, locationAlerts, autoTrack, quietHoursEnabled, quietStart, quietEnd, safeRadius, language, theme, mounted]);

  const clearData = () => {
    if (confirm('This will clear all app data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const Card = ({ children, delay = 0, className = '' }: any) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-2xl bg-white/[0.03] border border-white/[0.06] ${className}`}>
      {children}
    </motion.div>
  );

  const SectionTitle = ({ icon: Icon, title, color = 'emerald' }: any) => (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`p-1.5 rounded-lg bg-${color}-500/20`}
        style={{ background: `rgba(${color === 'emerald' ? '16,185,129' : color === 'sky' ? '14,165,233' : color === 'rose' ? '244,63,94' : color === 'violet' ? '139,92,246' : color === 'amber' ? '245,158,11' : '100,116,139'},0.15)` }}>
        <Icon className="w-4 h-4" style={{ color: color === 'emerald' ? '#34d399' : color === 'sky' ? '#38bdf8' : color === 'rose' ? '#fb7185' : color === 'violet' ? '#a78bfa' : color === 'amber' ? '#fbbf24' : '#94a3b8' }} />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, desc, children }: any) => (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="p-1.5 rounded-lg bg-white/5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {desc && <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-violet-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20">
            <Settings className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Settings</h1>
            <p className="text-slate-500 text-xs">Manage your preferences & notifications</p>
          </div>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">Saved</span>
            </motion.div>
          )}
        </motion.div>

        {/* Profile Card */}
        <Card delay={0.05} className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/15 flex items-center justify-center text-2xl font-bold text-emerald-400">
              {profile?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white">{profile?.name || 'Caregiver'}</p>
              <p className="text-sm text-slate-400">{profile?.email || 'caregiver@alzcare.com'}</p>
              <div className="flex items-center gap-3 mt-1">
                {profile?.phone && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {profile.phone}</span>}
                <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Caregiver</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">Active</span>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <div>
          <SectionTitle icon={Bell} title="Notifications" color="sky" />
          <Card delay={0.1} className="px-5">
            <SettingRow icon={BellRing} label="Push Notifications" desc="Receive alerts for patient activity">
              <Toggle value={notifications} onChange={() => setNotifications(!notifications)} />
            </SettingRow>
            <SettingRow icon={Volume2} label="Sound Alerts" desc="Play sound for incoming alerts">
              <Toggle value={sound} onChange={() => setSound(!sound)} />
            </SettingRow>
            <SettingRow icon={Smartphone} label="Vibration" desc="Vibrate on notifications">
              <Toggle value={vibration} onChange={() => setVibration(!vibration)} />
            </SettingRow>
            <SettingRow icon={AlertTriangle} label="SOS Alerts" desc="Emergency alerts from patient (critical)">
              <Toggle value={sosAlerts} onChange={() => setSosAlerts(!sosAlerts)} />
            </SettingRow>
            <SettingRow icon={MapPin} label="Location Alerts" desc="When patient leaves safe zone">
              <Toggle value={locationAlerts} onChange={() => setLocationAlerts(!locationAlerts)} />
            </SettingRow>
          </Card>
        </div>

        {/* Monitoring */}
        <div>
          <SectionTitle icon={Eye} title="Monitoring" color="violet" />
          <Card delay={0.15} className="px-5">
            <SettingRow icon={MapPin} label="Auto-Track Patient" desc="Automatically monitor patient location">
              <Toggle value={autoTrack} onChange={() => setAutoTrack(!autoTrack)} />
            </SettingRow>
            <SettingRow icon={Shield} label="Safe Zone Radius" desc={`Alert when patient goes beyond ${safeRadius} km`}>
              <div className="flex items-center gap-2">
                <input type="range" min={1} max={10} value={safeRadius} onChange={e => setSafeRadius(Number(e.target.value))}
                  className="w-20 h-1 accent-violet-500 bg-white/10 rounded-full" />
                <span className="text-sm text-violet-400 font-mono w-10 text-right">{safeRadius} km</span>
              </div>
            </SettingRow>
          </Card>
        </div>

        {/* Quiet Hours */}
        <div>
          <SectionTitle icon={Moon} title="Quiet Hours" color="amber" />
          <Card delay={0.2} className="px-5">
            <SettingRow icon={Clock} label="Enable Quiet Hours" desc="Mute non-critical alerts during set hours">
              <Toggle value={quietHoursEnabled} onChange={() => setQuietHoursEnabled(!quietHoursEnabled)} />
            </SettingRow>
            {quietHoursEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3 py-3 border-b border-white/[0.04]">
                <div className="p-1.5 rounded-lg bg-white/5"><Moon className="w-3.5 h-3.5 text-amber-400" /></div>
                <span className="text-sm text-slate-300">From</span>
                <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" />
                <span className="text-sm text-slate-300">to</span>
                <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" />
              </motion.div>
            )}
          </Card>
        </div>

        {/* Appearance */}
        <div>
          <SectionTitle icon={Palette} title="Appearance" color="rose" />
          <Card delay={0.25} className="px-5">
            <SettingRow icon={Moon} label="Dark Mode" desc="Use dark theme throughout">
              <Toggle value={darkMode} onChange={() => setDarkMode(!darkMode)} />
            </SettingRow>
            <div className="py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-white/5"><Palette className="w-3.5 h-3.5 text-slate-400" /></div>
                <p className="text-sm font-medium text-slate-200">Accent Color</p>
              </div>
              <div className="flex gap-3 ml-10">
                {[
                  { id: 'emerald', from: 'from-emerald-400', to: 'to-teal-600' },
                  { id: 'blue', from: 'from-blue-400', to: 'to-indigo-600' },
                  { id: 'purple', from: 'from-purple-400', to: 'to-pink-600' },
                  { id: 'rose', from: 'from-rose-400', to: 'to-orange-600' },
                  { id: 'cyan', from: 'from-cyan-400', to: 'to-sky-600' },
                ].map(t => (
                  <motion.button key={t.id} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setTheme(t.id)}
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.from} ${t.to} transition-all ${theme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#020617] scale-110' : 'opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            </div>
            <SettingRow icon={Globe} label="Language" desc="Select display language">
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
                <option value="en" className="bg-[#0a1628]">English</option>
                <option value="hi" className="bg-[#0a1628]">हिन्दी</option>
                <option value="mr" className="bg-[#0a1628]">मराठी</option>
              </select>
            </SettingRow>
          </Card>
        </div>

        {/* Security */}
        <div>
          <SectionTitle icon={Lock} title="Security & Data" color="slate" />
          <Card delay={0.3} className="px-5">
            <SettingRow icon={Lock} label="Session" desc={`Logged in as ${profile?.email || 'caregiver'}`}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => signOut()}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition">
                Sign Out
              </motion.button>
            </SettingRow>
            <SettingRow icon={Trash2} label="Clear App Data" desc="Remove all local storage data">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={clearData}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition">
                Clear Data
              </motion.button>
            </SettingRow>
          </Card>
        </div>

        {/* App Info */}
        <Card delay={0.35} className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">AlzCare</p>
              <p className="text-[10px] text-slate-500">Intelligent Alzheimer&apos;s Care Platform</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Version</p>
              <p className="text-sm font-mono text-emerald-400">1.0.0</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}