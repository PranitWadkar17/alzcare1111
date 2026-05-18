'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse, Brain, Moon, Thermometer, Activity, Droplets, Shield,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, MapPin,
  Smile, Meh, Frown, Bell, Zap, Award, ChevronRight, Eye,
} from 'lucide-react';
import { getAllAlerts, subscribeToAlerts } from '@/lib/alert-service';
import { getLocationUpdates, subscribeLocation, LocationUpdate } from '@/lib/contact-service';
import { subscribeToVitals, VitalsData } from '@/lib/health-service';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const demoHRWeek = [71, 74, 68, 76, 73, 70, 72];
const demoCogWeek = [82, 80, 78, 75, 79, 81, 78];
const demoSleepWeek = [6.5, 7.0, 5.8, 7.2, 6.9, 8.1, 7.2];
const demoActivityWeek = [85, 70, 90, 60, 95, 75, 80];

export default function CaregiverHealthPage() {
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(97);
  const [temp, setTemp] = useState(98.4);
  const [bpSys, setBpSys] = useState(120);
  const [bpDia, setBpDia] = useState(80);
  const [cogScore, setCogScore] = useState(78);
  const [sleepHrs, setSleepHrs] = useState(7.2);
  const [sleepQuality, setSleepQuality] = useState(85);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [lastLoc, setLastLoc] = useState<LocationUpdate | null>(null);

  // Load linked patients and subscribe to vitals
  useEffect(() => {
    let unsubscribeVitals: () => void = () => {};

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: links } = await supabase
        .from('patient_caregiver_links')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .eq('status', 'active');

      if (links && links.length > 0) {
        const ids = links.map((l: any) => l.patient_id);
        
        // Subscribe to real-time vitals
        unsubscribeVitals = subscribeToVitals(ids, (vitals: VitalsData) => {
          setHr(vitals.heartRate);
          setSpo2(vitals.spo2);
          setTemp(vitals.temp);
          setBpSys(vitals.bpSys);
          setBpDia(vitals.bpDia);
          setCogScore(vitals.cogScore);
          setSleepHrs(vitals.sleepHrs);
          setSleepQuality(vitals.sleepQuality);
        });
      }
    };

    init();

    return () => {
      unsubscribeVitals();
    };
  }, []);

  useEffect(() => {
    setAlerts(getAllAlerts().filter((a: any) => a.sender === 'patient').slice(-5));
    const u = subscribeToAlerts((a: any[]) => setAlerts(a.filter((x: any) => x.sender === 'patient').slice(-5)));
    return u;
  }, []);

  useEffect(() => {
    const locs = getLocationUpdates().filter(l => l.sender === 'patient');
    if (locs.length) setLastLoc(locs[locs.length - 1]);
    const u = subscribeLocation(a => {
      const p = a.filter(l => l.sender === 'patient');
      if (p.length) setLastLoc(p[p.length - 1]);
    });
    return u;
  }, []);

  // Wellness score
  const wellness = useMemo(() => {
    const hrScore = hr >= 60 && hr <= 100 ? 100 : hr < 60 ? 60 : 50;
    const spo2Score = spo2 >= 95 ? 100 : spo2 >= 90 ? 70 : 40;
    const cogScr = Math.min(cogScore, 100);
    return Math.round((hrScore + spo2Score + cogScr + sleepQuality) / 4);
  }, [hr, spo2, cogScore, sleepQuality]);

  const wellnessColor = wellness >= 80 ? '#34d399' : wellness >= 60 ? '#fbbf24' : '#f87171';

  // Health alerts
  const healthAlerts = useMemo(() => {
    const a: { type: string; color: string; icon: any; msg: string }[] = [];
    if (hr > 95) a.push({ type: 'critical', color: '#f87171', icon: AlertTriangle, msg: `Heart rate elevated: ${hr.toFixed(0)} bpm — check on patient!` });
    if (spo2 < 94) a.push({ type: 'critical', color: '#f87171', icon: AlertTriangle, msg: `Oxygen level low: ${spo2.toFixed(0)}% — immediate attention needed` });
    if (cogScore < 72) a.push({ type: 'warning', color: '#fbbf24', icon: Bell, msg: `Cognitive score dropped to ${cogScore.toFixed(0)} — schedule assessment` });
    if (a.length === 0) a.push({ type: 'positive', color: '#34d399', icon: CheckCircle2, msg: 'All vitals normal — patient is doing well!' });
    return a;
  }, [hr, spo2, cogScore]);

  const Card = ({ children, className = '', delay = 0 }: any) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-2xl bg-white/[0.03] border border-white/[0.06] ${className}`}>
      {children}
    </motion.div>
  );

  // SVG ring gauge
  const RingGauge = ({ value, max, color, size = 80, strokeWidth = 6 }: { value: number; max: number; color: string; size?: number; strokeWidth?: number }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct) }} transition={{ duration: 1.5, ease: 'easeOut' }} />
      </svg>
    );
  };

  // Mini bar chart
  const MiniBar = ({ data, color, labels }: { data: number[]; color: string; labels: string[] }) => {
    const max = Math.max(...data);
    return (
      <div className="flex items-end gap-1.5 h-[60px]">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div initial={{ height: 0 }} animate={{ height: `${(v / max) * 48}px` }} transition={{ delay: i * 0.08 }}
              className="w-full rounded-t" style={{ background: color, minHeight: 4, opacity: i === data.length - 1 ? 1 : 0.6 }} />
            <span className="text-[8px] text-slate-600">{labels[i]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-violet-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-600/20 border border-rose-500/20">
            <HeartPulse className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Health Status</h1>
            <p className="text-slate-500 text-xs">Patient wellness monitoring & vitals dashboard</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/15">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-rose-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-rose-400" /></span>
            <span className="text-[10px] text-rose-400 font-medium">Live Monitoring</span>
          </div>
        </motion.div>

        {/* ── Wellness Score + Quick Stats ── */}
        <div className="grid grid-cols-12 gap-3">
          {/* Wellness Score */}
          <Card className="col-span-12 sm:col-span-4 p-5 flex flex-col items-center justify-center" delay={0.05}>
            <div className="relative mb-2">
              <RingGauge value={wellness} max={100} color={wellnessColor} size={110} strokeWidth={8} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span key={wellness} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                  className="text-3xl font-black" style={{ color: wellnessColor }}>{wellness}</motion.span>
                <span className="text-[9px] text-slate-500">/ 100</span>
              </div>
            </div>
            <p className="text-sm font-semibold" style={{ color: wellnessColor }}>
              {wellness >= 80 ? '🟢 Excellent' : wellness >= 60 ? '🟡 Good' : '🔴 Needs Attention'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Overall Wellness Score</p>
          </Card>

          {/* Vital Cards */}
          <div className="col-span-12 sm:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: HeartPulse, label: 'Heart Rate', value: `${hr.toFixed(0)}`, unit: 'bpm', color: '#f87171', max: 120 },
              { icon: Droplets, label: 'SpO₂', value: `${spo2.toFixed(0)}`, unit: '%', color: '#38bdf8', max: 100 },
              { icon: Thermometer, label: 'Temp', value: `${temp.toFixed(1)}`, unit: '°F', color: '#fb923c', max: 104 },
              { icon: Brain, label: 'Cognitive', value: `${cogScore.toFixed(0)}`, unit: '/100', color: '#a78bfa', max: 100 },
            ].map((v, i) => (
              <Card key={i} className="p-4 flex flex-col items-center" delay={0.05 + i * 0.03}>
                <div className="relative mb-1">
                  <RingGauge value={parseFloat(v.value)} max={v.max} color={v.color} size={56} strokeWidth={4} />
                  <v.icon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4" style={{ color: v.color }} />
                </div>
                <motion.p key={v.value} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  className="text-lg font-bold" style={{ color: v.color }}>{v.value}<span className="text-[9px] text-slate-500 ml-0.5">{v.unit}</span></motion.p>
                <p className="text-[10px] text-slate-500">{v.label}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Blood Pressure + Sleep + Location Row ── */}
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-6 sm:col-span-4 p-4" delay={0.18}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-rose-500/20"><Activity className="w-3.5 h-3.5 text-rose-400" /></div>
              <span className="text-xs font-medium text-slate-400">Blood Pressure</span>
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span key={bpSys.toFixed(0)} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-black text-rose-400">{bpSys.toFixed(0)}</motion.span>
              <span className="text-slate-500 text-sm">/</span>
              <motion.span key={bpDia.toFixed(0)} initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="text-xl font-bold text-rose-300">{bpDia.toFixed(0)}</motion.span>
              <span className="text-[10px] text-slate-500 ml-1">mmHg</span>
            </div>
            <p className="text-[10px] text-emerald-400 mt-1">✓ Normal range</p>
          </Card>

          <Card className="col-span-6 sm:col-span-4 p-4" delay={0.21}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/20"><Moon className="w-3.5 h-3.5 text-indigo-400" /></div>
              <span className="text-xs font-medium text-slate-400">Sleep Quality</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-400">{sleepHrs}</span>
              <span className="text-[10px] text-slate-500">hrs</span>
              <span className="text-lg font-bold text-indigo-300 ml-auto">{sleepQuality}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 mt-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${sleepQuality}%` }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" transition={{ duration: 1 }} />
            </div>
          </Card>

          <Card className="col-span-12 sm:col-span-4 p-4" delay={0.24}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20"><MapPin className="w-3.5 h-3.5 text-emerald-400" /></div>
              <span className="text-xs font-medium text-slate-400">Location Status</span>
            </div>
            {lastLoc ? (
              <div>
                <p className="text-sm font-mono text-emerald-300">{lastLoc.lat.toFixed(4)}, {lastLoc.lng.toFixed(4)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{new Date(lastLoc.timestamp).toLocaleTimeString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Within safe zone</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No location data</p>
            )}
          </Card>
        </div>

        {/* ── Weekly Trends ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20"><TrendingUp className="w-4 h-4 text-sky-400" /></div>
            <h2 className="text-base font-semibold">Weekly Trends</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { title: 'Heart Rate', data: demoHRWeek, color: '#f87171', trend: '+2%', up: true },
              { title: 'Cognitive Score', data: demoCogWeek, color: '#a78bfa', trend: '-3%', up: false },
              { title: 'Sleep Hours', data: demoSleepWeek, color: '#818cf8', trend: '+12%', up: true },
              { title: 'Activity Score', data: demoActivityWeek, color: '#34d399', trend: '+5%', up: true },
            ].map((c, i) => (
              <Card key={i} className="p-3" delay={0.3 + i * 0.03}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-medium">{c.title}</span>
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${c.up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {c.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {c.trend}
                  </span>
                </div>
                <MiniBar data={c.data} color={c.color} labels={WEEK_LABELS} />
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── Health Alerts ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><AlertTriangle className="w-4 h-4 text-amber-400" /></div>
            <h2 className="text-base font-semibold">Health Alerts</h2>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {healthAlerts.map((a, i) => (
                <motion.div key={a.msg} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: `${a.color}10`, border: `1px solid ${a.color}30` }}>
                  <a.icon className="w-4 h-4 shrink-0" style={{ color: a.color }} />
                  <p className="text-sm flex-1" style={{ color: a.color }}>{a.msg}</p>
                  <span className="text-[9px] text-slate-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Patient SOS History (real-time) ── */}
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/20"><Zap className="w-4 h-4 text-red-400" /></div>
              <h2 className="text-base font-semibold">Patient Alerts</h2>
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full ml-auto">Real-time</span>
            </div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {alerts.reverse().map((a: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-sm text-slate-300 flex-1 truncate">{a.message}</span>
                  <span className="text-[10px] text-slate-600">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Daily Check-in Status ── */}
        <Card className="p-4" delay={0.5}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-300">Daily Safety Check-in</p>
              <p className="text-[10px] text-slate-500">Patient last confirmed &quot;I&apos;m OK&quot; today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">7-day streak</span>
          </div>
        </Card>

      </div>
    </div>
  );
}
