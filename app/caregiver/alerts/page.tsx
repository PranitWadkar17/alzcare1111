'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Bell, Send, MessageSquare, CheckCircle2, Clock,
  Shield, Pill, Utensils, Activity, Droplets, Eye, X,
  AlertCircle, Info, Flame, Filter, Trash2, MapPin, ExternalLink,
  Mic, MicOff, ShieldCheck, Smile,
} from 'lucide-react';
import { getAllTasks, subscribeToTasks, SharedTask } from '@/lib/task-service';
import {
  getAllAlerts, sendAlert, dismissAlert, markAlertRead,
  subscribeToAlerts, SharedAlert,
} from '@/lib/alert-service';
import { useVoiceRecorder, VoicePlayer } from '@/hooks/useVoiceRecorder';

const PRIORITY_CFG = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', dot: 'bg-red-400', icon: AlertCircle },
  warning:  { label: 'Warning', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', dot: 'bg-amber-400', icon: AlertTriangle },
  info:     { label: 'Info', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/20', dot: 'bg-sky-400', icon: Info },
};

const QUICK_REPLIES = [
  '🏃 On my way!', '💊 Take your medicine', '📍 Stay where you are',
  '📞 I\'ll call you', '❤️ Stay calm, I\'m here', '🍽️ Time to eat',
];

const MOOD_EMOJI: Record<string, string> = { great: '😊', okay: '🙂', not_good: '😟', bad: '😰' };
const TYPE_ICON: Record<string, string> = { sos: '🆘', mood: '🎭', safety: '🛡️', voice: '🎤', message: '💬' };

export default function CaregiverAlertsPage() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [alerts, setAlerts] = useState<SharedAlert[]>([]);
  const [msg, setMsg] = useState('');
  const [priority, setPriority] = useState<'critical'|'warning'|'info'>('info');
  const [sent, setSent] = useState(false);
  const [filter, setFilter] = useState<'all'|'critical'|'warning'|'info'>('all');
  const { recording, duration, start: startRec, stop: stopRec } = useVoiceRecorder(10);

  useEffect(() => {
    setTasks(getAllTasks()); setAlerts(getAllAlerts());
    const u1 = subscribeToTasks(all => setTasks(all));
    const u2 = subscribeToAlerts(all => setAlerts(all));
    return () => { u1(); u2(); };
  }, []);

  const handleSend = () => {
    if (!msg.trim()) return;
    sendAlert({ sender: 'caregiver', message: msg.trim(), priority, type: 'message' });
    setMsg(''); setSent(true); setTimeout(() => setSent(false), 2000);
  };

  const handleQuickReply = (text: string) => {
    sendAlert({ sender: 'caregiver', message: text, priority: 'info', type: 'message' });
  };

  const handleVoice = async () => {
    if (recording) {
      const result = await stopRec();
      if (result) {
        sendAlert({ sender: 'caregiver', message: '🎤 Voice Note', priority: 'info', voiceNote: result.base64, voiceDuration: result.duration, type: 'voice' });
      }
    } else { startRec(); }
  };

  const today = new Date().toISOString().split('T')[0];
  const patientLogs = tasks.filter(t => t.caregiver_label === 'patient' && t.date === today);
  const lowerLogs = patientLogs.map(t => t.message.toLowerCase());

  const systemAlerts: { msg: string; priority: 'critical'|'warning'|'info'; icon: typeof Pill }[] = [];
  if (!lowerLogs.some(m => m.includes('medicine') || m.includes('pill')))
    systemAlerts.push({ msg: 'Patient hasn\'t taken medication today', priority: 'critical', icon: Pill });
  if (!lowerLogs.some(m => m.includes('food') || m.includes('ate') || m.includes('meal')))
    systemAlerts.push({ msg: 'No meals logged by patient today', priority: 'warning', icon: Utensils });
  if (!lowerLogs.some(m => m.includes('water') || m.includes('drank')))
    systemAlerts.push({ msg: 'Patient hasn\'t logged hydration today', priority: 'warning', icon: Droplets });
  if (patientLogs.length === 0)
    systemAlerts.push({ msg: 'No activity from patient today', priority: 'warning', icon: Activity });
  if (patientLogs.length >= 5)
    systemAlerts.push({ msg: 'Patient is having an active day! 5+ logged', priority: 'info', icon: Flame });
  const overdueReminders = tasks.filter(t => t.caregiver_label !== 'patient' && t.status === 'pending' && t.date === today);
  if (overdueReminders.length > 0)
    systemAlerts.push({ msg: `${overdueReminders.length} reminder(s) still pending`, priority: 'warning', icon: Bell });

  const patientAlerts = alerts.filter(a => a.sender === 'patient' && !a.dismissed);
  const caregiverAlerts = alerts.filter(a => a.sender === 'caregiver' && !a.dismissed);
  const unreadFromPatient = patientAlerts.filter(a => !a.read).length;

  // Safety & mood tracking
  const hasSafetyToday = alerts.some(a => a.sender === 'patient' && a.type === 'safety' && a.created_at.startsWith(today));
  const todayMoods = alerts.filter(a => a.sender === 'patient' && a.type === 'mood' && a.created_at.startsWith(today) && a.mood);
  const latestMood = todayMoods.length > 0 ? todayMoods.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : null;

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-red-500/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-amber-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/30 to-rose-600/20 border border-red-500/20"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Alerts Center</h1>
              <p className="text-slate-500 text-xs">Real-time alerts, voice notes & patient monitoring</p>
            </div>
            {unreadFromPatient > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-red-400" /></span>
                <span className="text-xs text-red-400 font-bold">{unreadFromPatient} new from patient</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Patient Status Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className={`p-4 rounded-2xl border text-center ${hasSafetyToday ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <ShieldCheck className={`w-5 h-5 mx-auto mb-1.5 ${hasSafetyToday ? 'text-emerald-400' : 'text-red-400'}`} />
            <p className={`text-sm font-bold ${hasSafetyToday ? 'text-emerald-400' : 'text-red-400'}`}>{hasSafetyToday ? 'Safe ✓' : 'No Check-in'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Daily Safety</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
            <Smile className="w-5 h-5 mx-auto mb-1.5 text-amber-400" />
            <p className="text-sm font-bold">{latestMood ? `${MOOD_EMOJI[latestMood.mood!]} ${latestMood.mood?.replace('_', ' ')}` : '—'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Patient Mood</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
            <Activity className="w-5 h-5 mx-auto mb-1.5 text-sky-400" />
            <p className="text-sm font-bold text-sky-400">{patientLogs.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Today&apos;s Activities</p>
          </motion.div>
        </div>

        {/* System Alerts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><Shield className="w-4 h-4 text-amber-400" /></div>
            <h2 className="text-base font-semibold">Auto-Generated Alerts</h2>
            <span className="text-xs text-slate-500 ml-auto">{systemAlerts.length} active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemAlerts.map((sa, i) => {
              const cfg = PRIORITY_CFG[sa.priority];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 + i * 0.04 }}
                  className={`p-4 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-start gap-3`}>
                  <div className={`p-2 rounded-xl ${cfg.bg}`}><sa.icon className={`w-4 h-4 ${cfg.color}`} /></div>
                  <div><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${sa.priority === 'critical' ? 'animate-pulse' : ''}`} /></div><p className="text-sm text-white">{sa.msg}</p></div>
                </motion.div>
              );
            })}
            {systemAlerts.length === 0 && (
              <div className="col-span-2 p-6 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-emerald-400 font-medium">All clear!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Send Message + Voice */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl border border-white/10" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.06),rgba(255,255,255,0.02))' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-violet-500/20"><MessageSquare className="w-4 h-4 text-violet-400" /></div>
            <h2 className="text-base font-semibold">Send to Patient</h2>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleVoice}
              className={`ml-auto p-2 rounded-xl transition-all ${recording ? 'bg-red-500/20 border border-red-500/30 animate-pulse' : 'bg-violet-500/15 border border-violet-500/20 hover:bg-violet-500/25'}`}>
              {recording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-violet-400" />}
            </motion.button>
            {recording && <span className="text-xs text-red-400">{duration}s</span>}
          </div>
          {/* Quick Replies */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_REPLIES.map((q, i) => (
              <button key={i} onClick={() => handleQuickReply(q)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition">{q}</button>
            ))}
          </div>
          {/* Priority + Input */}
          <div className="flex gap-2 mb-3">
            {(['info','warning','critical'] as const).map(p => {
              const c = PRIORITY_CFG[p];
              return (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center gap-1.5 transition-all ${
                    priority === p ? `${c.bg} ${c.border} border ${c.color}` : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                  }`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {p}</button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input type="text" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400/50 transition-all" />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!msg.trim()}
              className={`px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all ${
                sent ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/25'
              }`}>
              {sent ? <><CheckCircle2 className="w-4 h-4" /> Sent!</> : <><Send className="w-4 h-4" /> Send</>}
            </motion.button>
          </div>
        </motion.div>

        {/* Messages from Patient */}
        {patientAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20"><Bell className="w-4 h-4 text-emerald-400" /></div>
              <h2 className="text-base font-semibold">From Patient</h2>
              {unreadFromPatient > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{unreadFromPatient} new</span>}
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {patientAlerts.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(a => {
                  const cfg = PRIORITY_CFG[a.priority];
                  const typeIcon = TYPE_ICON[a.type || 'message'];
                  return (
                    <motion.div key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-2xl ${a.read ? 'bg-white/[0.03]' : cfg.bg} border ${a.read ? 'border-white/[0.06]' : cfg.border} group relative overflow-hidden`}>
                      {!a.read && a.type === 'sos' && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-red-600 rounded-l-2xl" />}
                      {!a.read && a.type !== 'sos' && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-2xl" />}
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${cfg.bg} shrink-0`}><cfg.icon className={`w-4 h-4 ${cfg.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px]">{typeIcon}</span>
                            <span className={`text-[10px] font-bold uppercase ${a.type === 'sos' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {a.type === 'sos' ? 'SOS ALERT' : a.type === 'mood' ? 'Mood Update' : a.type === 'safety' ? 'Safety Check' : a.type === 'voice' ? 'Voice Note' : 'Message'}
                            </span>
                            {!a.read && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                            {a.read && <span className="text-[10px] text-slate-600">✓✓ Read</span>}
                            <span className="text-[10px] text-slate-600 ml-auto">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-white">{a.message}</p>
                          {a.voiceNote && <div className="mt-2"><VoicePlayer src={a.voiceNote} dur={a.voiceDuration} /></div>}
                          {a.lat && a.lng && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/15">
                                <MapPin className="w-3.5 h-3.5 text-sky-400" /><span className="text-[11px] text-sky-300 font-medium">{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</span>
                              </div>
                              <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-[11px] text-emerald-400 font-semibold hover:bg-emerald-500/25 transition-all">
                                <ExternalLink className="w-3 h-3" /> View Location
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!a.read && <button onClick={() => markAlertRead(a.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-500 hover:text-emerald-400 transition"><Eye className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => dismissAlert(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Sent History */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-slate-500/20"><Clock className="w-4 h-4 text-slate-400" /></div>
            <h2 className="text-base font-semibold">Sent History</h2>
            <div className="flex items-center gap-1.5 ml-auto">
              <Filter className="w-3 h-3 text-slate-500" />
              {(['all','critical','warning','info'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium capitalize transition ${
                    filter === f ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-white'
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          {caregiverAlerts.length > 0 ? (
            <div className="space-y-2">
              {caregiverAlerts.filter(a => filter === 'all' || a.priority === filter).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(a => {
                const cfg = PRIORITY_CFG[a.priority];
                return (
                  <div key={a.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 group">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{a.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-600">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        {a.voiceNote && <span className="text-[10px] text-violet-400">🎤</span>}
                        {a.read && <span className="text-[10px] text-sky-400">✓✓</span>}
                      </div>
                    </div>
                    {a.voiceNote && <VoicePlayer src={a.voiceNote} dur={a.voiceDuration} />}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium capitalize shrink-0`}>{a.priority}</span>
                    <button onClick={() => dismissAlert(a.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-slate-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="p-3 rounded-full bg-white/5 mb-3"><Send className="w-6 h-6 text-slate-600" /></div>
              <p className="text-sm text-slate-500">No alerts sent yet</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
