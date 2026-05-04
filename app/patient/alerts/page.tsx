'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Bell, Send, MessageSquare, CheckCircle2, Clock,
  Shield, Pill, Utensils, Droplets, Activity, Eye, X,
  AlertCircle, Info, Heart, MapPin, Loader2, Mic, MicOff, ShieldCheck,
} from 'lucide-react';
import { getAllTasks, subscribeToTasks, SharedTask } from '@/lib/task-service';
import {
  getAllAlerts, sendAlert, dismissAlert, markAlertRead,
  subscribeToAlerts, SharedAlert, MoodType,
} from '@/lib/alert-service';
import { useVoiceRecorder, VoicePlayer } from '@/hooks/useVoiceRecorder';

const PRIORITY_CFG = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', dot: 'bg-red-400', icon: AlertCircle },
  warning:  { label: 'Warning', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', dot: 'bg-amber-400', icon: AlertTriangle },
  info:     { label: 'Info', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/20', dot: 'bg-sky-400', icon: Info },
};

const SOS_ITEMS = [
  { text: '🆘 I fell down!', priority: 'critical' as const },
  { text: '😵 I feel dizzy', priority: 'critical' as const },
  { text: '📍 I\'m lost', priority: 'critical' as const },
  { text: '🤒 I feel sick', priority: 'warning' as const },
  { text: '💊 Need medicine', priority: 'warning' as const },
  { text: '🆘 Need help now!', priority: 'critical' as const },
];

const MOODS: { value: MoodType; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great', color: 'bg-emerald-500/20 border-emerald-500/25' },
  { value: 'okay', emoji: '🙂', label: 'Okay', color: 'bg-sky-500/20 border-sky-500/25' },
  { value: 'not_good', emoji: '😟', label: 'Not Good', color: 'bg-amber-500/20 border-amber-500/25' },
  { value: 'bad', emoji: '😰', label: 'Bad', color: 'bg-red-500/20 border-red-500/25' },
];

export default function PatientAlertsPage() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [alerts, setAlerts] = useState<SharedAlert[]>([]);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [safetySent, setSafetySent] = useState(false);
  const { recording, duration, start: startRec, stop: stopRec } = useVoiceRecorder(10);

  useEffect(() => {
    setTasks(getAllTasks()); setAlerts(getAllAlerts());
    const u1 = subscribeToTasks(all => setTasks(all));
    const u2 = subscribeToAlerts(all => setAlerts(all));
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      p => { setMyLat(p.coords.latitude); setMyLng(p.coords.longitude); }, () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  const getGPS = (): Promise<{ lat?: number; lng?: number }> => new Promise(res => {
    if (!navigator.geolocation) { res({ lat: myLat ?? undefined, lng: myLng ?? undefined }); return; }
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({ lat: myLat ?? undefined, lng: myLng ?? undefined }),
      { enableHighAccuracy: true, timeout: 3000 }
    );
  });

  const handleSend = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    const gps = await getGPS();
    sendAlert({ sender: 'patient', message: msg.trim(), priority: 'info', ...gps, type: 'message' });
    setMsg(''); setSent(true); setSending(false); setTimeout(() => setSent(false), 2000);
  };

  const handleSOS = async (text: string, priority: 'critical' | 'warning') => {
    const gps = await getGPS();
    sendAlert({ sender: 'patient', message: text, priority, ...gps, type: 'sos' });
  };

  const handleMood = async (mood: MoodType) => {
    const gps = await getGPS();
    const label = MOODS.find(m => m.value === mood);
    sendAlert({ sender: 'patient', message: `Mood: ${label?.emoji} ${label?.label}`, priority: 'info', ...gps, mood, type: 'mood' });
  };

  const handleSafety = async () => {
    const gps = await getGPS();
    sendAlert({ sender: 'patient', message: '✅ I\'m okay — daily safety check-in', priority: 'info', ...gps, type: 'safety' });
    setSafetySent(true);
  };

  const handleVoice = async () => {
    if (recording) {
      const result = await stopRec();
      if (result) {
        const gps = await getGPS();
        sendAlert({ sender: 'patient', message: '🎤 Voice Note', priority: 'info', ...gps, voiceNote: result.base64, voiceDuration: result.duration, type: 'voice' });
      }
    } else { startRec(); }
  };

  const today = new Date().toISOString().split('T')[0];
  const myLogs = tasks.filter(t => t.caregiver_label === 'patient' && t.date === today);
  const lower = myLogs.map(t => t.message.toLowerCase());

  const systemAlerts: { msg: string; priority: 'critical'|'warning'|'info'; icon: typeof Pill }[] = [];
  if (!lower.some(m => m.includes('medicine') || m.includes('pill')))
    systemAlerts.push({ msg: 'Don\'t forget to take your medication today!', priority: 'critical', icon: Pill });
  if (!lower.some(m => m.includes('food') || m.includes('ate') || m.includes('meal')))
    systemAlerts.push({ msg: 'You haven\'t logged a meal yet — remember to eat!', priority: 'warning', icon: Utensils });
  if (!lower.some(m => m.includes('water') || m.includes('drank')))
    systemAlerts.push({ msg: 'Stay hydrated! Drink a glass of water', priority: 'warning', icon: Droplets });
  if (myLogs.length >= 5)
    systemAlerts.push({ msg: 'Amazing! You\'ve been very active today! 🎉', priority: 'info', icon: Heart });

  const caregiverAlerts = alerts.filter(a => a.sender === 'caregiver' && !a.dismissed);
  const myAlerts = alerts.filter(a => a.sender === 'patient' && !a.dismissed);
  const unreadFromCaregiver = caregiverAlerts.filter(a => !a.read).length;
  const pendingReminders = tasks.filter(t => t.caregiver_label !== 'patient' && t.status === 'pending' && t.date === today);
  const hasSafetyToday = alerts.some(a => a.sender === 'patient' && a.type === 'safety' && a.created_at.startsWith(today));

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-emerald-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/30 to-rose-600/20 border border-red-500/20"><Bell className="w-5 h-5 text-red-400" /></div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">My Alerts</h1>
              <p className="text-slate-500 text-xs">Notifications, voice notes & messages</p>
            </div>
            {unreadFromCaregiver > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/25">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-violet-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-violet-400" /></span>
                <span className="text-xs text-violet-400 font-bold">{unreadFromCaregiver} new</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Quick SOS */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-red-500/20"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
            <h2 className="text-base font-semibold">Quick SOS</h2>
            <p className="text-xs text-slate-500 ml-1">Tap to send emergency alert + GPS</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SOS_ITEMS.map((s, i) => (
              <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleSOS(s.text, s.priority)}
                className={`p-3 rounded-xl text-center text-[11px] font-medium transition-all ${
                  s.priority === 'critical' ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300' : 'bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300'
                }`}>
                {s.text}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Mood + Safety + Voice Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mood */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs text-slate-400 font-medium mb-2">How are you feeling?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => handleMood(m.value)}
                  className={`p-2 rounded-xl text-center hover:scale-105 transition-all border ${m.color}`}>
                  <span className="text-lg block">{m.emoji}</span>
                  <span className="text-[9px] text-slate-400">{m.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Safety Check */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <ShieldCheck className={`w-8 h-8 mb-2 ${hasSafetyToday || safetySent ? 'text-emerald-400' : 'text-slate-500'}`} />
            <p className="text-xs text-slate-400 mb-2">Daily Safety Check-In</p>
            {hasSafetyToday || safetySent ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent today</span>
            ) : (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSafety}
                className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-xs text-emerald-400 font-semibold hover:bg-emerald-500/25 transition">
                I&apos;m Okay ✓
              </motion.button>
            )}
          </motion.div>

          {/* Voice Note */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <p className="text-xs text-slate-400 mb-3">Send Voice Note</p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleVoice}
              className={`p-4 rounded-2xl transition-all ${
                recording ? 'bg-red-500/20 border border-red-500/30 animate-pulse' : 'bg-violet-500/15 border border-violet-500/20 hover:bg-violet-500/25'
              }`}>
              {recording ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-violet-400" />}
            </motion.button>
            <p className="text-[10px] text-slate-500 mt-2">{recording ? `Recording... ${duration}s (tap to stop)` : 'Tap to record (max 10s)'}</p>
          </motion.div>
        </div>

        {/* Caregiver Messages */}
        {caregiverAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/20"><MessageSquare className="w-4 h-4 text-violet-400" /></div>
              <h2 className="text-base font-semibold">From Your Caregiver</h2>
              {unreadFromCaregiver > 0 && <span className="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full font-bold">{unreadFromCaregiver} new</span>}
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {caregiverAlerts.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(a => {
                  const cfg = PRIORITY_CFG[a.priority];
                  return (
                    <motion.div key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-2xl ${a.read ? 'bg-white/[0.03]' : cfg.bg} border ${a.read ? 'border-white/[0.06]' : cfg.border} group relative overflow-hidden`}>
                      {!a.read && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-400 to-purple-500 rounded-l-2xl" />}
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${cfg.bg} shrink-0`}><cfg.icon className={`w-4 h-4 ${cfg.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                            {!a.read && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
                            {a.read && <span className="text-[10px] text-slate-600">✓✓ Read</span>}
                            <span className="text-[10px] text-slate-600 ml-auto">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-white leading-relaxed">{a.message}</p>
                          {a.voiceNote && <div className="mt-2"><VoicePlayer src={a.voiceNote} dur={a.voiceDuration} /></div>}
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

        {/* Pending Reminders */}
        {pendingReminders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20"><Clock className="w-4 h-4 text-amber-400" /></div>
              <h2 className="text-base font-semibold">Pending Reminders</h2>
              <span className="text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-medium">{pendingReminders.length}</span>
            </div>
            <div className="space-y-2">
              {pendingReminders.map(r => (
                <div key={r.id} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center gap-3">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1"><p className="text-sm text-white truncate">{r.message}</p><p className="text-[10px] text-slate-500">Scheduled: {r.scheduled_time}</p></div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-medium shrink-0">Pending</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Health Reminders */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20"><Shield className="w-4 h-4 text-sky-400" /></div>
            <h2 className="text-base font-semibold">Health Reminders</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemAlerts.map((sa, i) => {
              const cfg = PRIORITY_CFG[sa.priority];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + i * 0.04 }}
                  className={`p-4 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-start gap-3`}>
                  <div className={`p-2 rounded-xl ${cfg.bg}`}><sa.icon className={`w-4 h-4 ${cfg.color}`} /></div>
                  <div><span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span><p className="text-sm text-white mt-0.5">{sa.msg}</p></div>
                </motion.div>
              );
            })}
            {systemAlerts.length === 0 && (
              <div className="col-span-2 p-6 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-emerald-400 font-medium">All caught up! 🎉</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Send Message */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="p-5 rounded-2xl border border-white/10" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><Send className="w-4 h-4 text-emerald-400" /></div>
            <h2 className="text-base font-semibold">Message Your Caregiver</h2>
          </div>
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">{myLat && myLng ? `📍 Location attached (${myLat.toFixed(4)}, ${myLng.toFixed(4)})` : '📍 Acquiring GPS...'}</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 transition-all" />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!msg.trim() || sending}
              className={`px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all ${
                sent ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25'
              }`}>
              {sent ? <><CheckCircle2 className="w-4 h-4" /> Sent!</> : sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
            </motion.button>
          </div>
        </motion.div>

        {/* Sent History */}
        {myAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-slate-500/20"><Clock className="w-4 h-4 text-slate-400" /></div>
              <h2 className="text-base font-semibold">My Sent Messages</h2>
            </div>
            <div className="space-y-2">
              {myAlerts.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{a.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-slate-600">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {a.lat && a.lng && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><MapPin className="w-2.5 h-2.5" /> 📍</span>}
                      {a.voiceNote && <span className="text-[10px] text-violet-400">🎤 Voice</span>}
                      {a.read && <span className="text-[10px] text-sky-400">✓✓</span>}
                    </div>
                  </div>
                  {a.voiceNote && <VoicePlayer src={a.voiceNote} dur={a.voiceDuration} />}
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg font-medium shrink-0">Sent</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
