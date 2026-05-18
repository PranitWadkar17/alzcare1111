'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MapPin, Send, Users, User, Mail,
  CheckCircle2, ExternalLink, Navigation, Wifi,
  MessageSquare, Radio, Activity, Shield, Loader2,
  RefreshCw, UserCheck, Clock,
} from 'lucide-react';
import {
  getLocationUpdates, subscribeLocation, LocationUpdate,
  getCalls, subscribeCalls, CallRecord,
} from '@/lib/contact-service';
import { getAllAlerts, sendAlert, subscribeToAlerts, SharedAlert } from '@/lib/alert-service';
import { getAllTasks, subscribeToTasks, refreshTasks, SharedTask } from '@/lib/task-service';
import {
  getLinkedPatientsForCaregiver,
  subscribeToLinkedPatientsChanges,
  PatientProfile,
} from '@/lib/patient-service';
import { supabase } from '@/lib/supabase';

const QUICK_REPLIES = [
  '✅ Noted!', '🏃 On my way!', '💊 Take your medicine',
  '📍 Share your location', '🍽️ Time to eat', '❤️ Stay safe',
];

export default function CaregiverPatientsPage() {
  // ── Supabase-driven patient list ──
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [caregiverId, setCaregiverId] = useState<string | null>(null);

  // ── Contact-service driven data ──
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [alerts, setAlerts] = useState<SharedAlert[]>([]);
  const [tasks, setTasks] = useState<SharedTask[]>([]);

  // ── Messaging ──
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  // ── Load caregiver ID from auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) setCaregiverId(user.id);
    });
  }, []);

  // ── Fetch linked patients from Supabase ──
  const loadPatients = useCallback(async () => {
    if (!caregiverId) return;
    setPatientsLoading(true);
    const data = await getLinkedPatientsForCaregiver(caregiverId);
    setPatients(data);
    setPatientsLoading(false);
  }, [caregiverId]);

  useEffect(() => {
    if (!caregiverId) return;
    loadPatients();

    // Real-time subscription: refresh when links change
    const unsub = subscribeToLinkedPatientsChanges(caregiverId, loadPatients);
    return unsub;
  }, [caregiverId, loadPatients]);

  // ── Subscribe to activity/location/alerts ──
  useEffect(() => {
    setLocations(getLocationUpdates());
    setCalls(getCalls());
    setAlerts(getAllAlerts());
    setTasks(getAllTasks());

    const u2 = subscribeLocation(a => setLocations(a));
    const u3 = subscribeCalls(a => setCalls(a));
    const u4 = subscribeToAlerts(a => setAlerts(a));
    const u5 = subscribeToTasks(a => setTasks(a));
    
    refreshTasks();
    const handleFocus = () => refreshTasks();
    window.addEventListener('focus', handleFocus);
    
    return () => { 
      u2(); u3(); u4(); u5(); 
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // ── Messaging ──
  const handleMsg = (text: string) => {
    sendAlert({ sender: 'caregiver', message: text, priority: 'info', type: 'message' });
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  };
  const handleCustomMsg = () => {
    if (!msg.trim()) return;
    handleMsg(msg.trim());
    setMsg('');
  };

  // ── Derived data ──
  const patientLocs = locations.filter(l => l.sender === 'patient');
  const lastLoc = patientLocs.length > 0 ? patientLocs[patientLocs.length - 1] : null;
  const autoLocs = patientLocs.filter(l => l.autoShare);
  const isAutoSharing =
    autoLocs.length > 0 &&
    Date.now() - new Date(autoLocs[autoLocs.length - 1]?.timestamp).getTime() < 60000;
  const patientCalls = calls.filter(c => c.from === 'patient').slice(-5).reverse();
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.caregiver_label === 'patient' && t.date === today);
  const sosAlerts = alerts.filter(
    a => a.sender === 'patient' && a.type === 'sos' && a.created_at.startsWith(today)
  );
  const patientMsgs = alerts
    .filter(a => a.sender === 'patient' && !a.dismissed && a.type === 'message')
    .slice(-10)
    .reverse();

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-emerald-500/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/20 border border-sky-500/20">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                My Patients
              </h1>
              <p className="text-slate-500 text-xs">
                Real-time location, calls & messages — {patients.length} patient{patients.length !== 1 ? 's' : ''} linked
              </p>
            </div>
            {sosAlerts.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/25"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-red-400" />
                </span>
                <span className="text-xs text-red-400 font-bold">{sosAlerts.length} SOS today</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className={`p-4 rounded-2xl text-center border ${lastLoc ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}
          >
            <MapPin className={`w-5 h-5 mx-auto mb-1 ${lastLoc ? 'text-emerald-400' : 'text-slate-500'}`} />
            <p className="text-sm font-bold text-emerald-400">{lastLoc ? 'Located' : 'No Data'}</p>
            <p className="text-[10px] text-slate-500">
              {lastLoc ? new Date(lastLoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className={`p-4 rounded-2xl text-center border ${isAutoSharing ? 'bg-sky-500/10 border-sky-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}
          >
            <Navigation className={`w-5 h-5 mx-auto mb-1 ${isAutoSharing ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <p className={`text-sm font-bold ${isAutoSharing ? 'text-sky-400' : 'text-slate-400'}`}>
              {isAutoSharing ? 'Auto-Sharing' : 'Off'}
            </p>
            <p className="text-[10px] text-slate-500">Live Tracking</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center"
          >
            <Activity className="w-5 h-5 mx-auto mb-1 text-amber-400" />
            <p className="text-sm font-bold text-amber-400">{todayTasks.length}</p>
            <p className="text-[10px] text-slate-500">Activities</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center"
          >
            <Phone className="w-5 h-5 mx-auto mb-1 text-violet-400" />
            <p className="text-sm font-bold text-violet-400">{patientCalls.length}</p>
            <p className="text-[10px] text-slate-500">Calls Today</p>
          </motion.div>
        </div>

        {/* ── Linked Patients List (Supabase-driven) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20">
              <UserCheck className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-semibold">Linked Patients</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-medium ml-1">
              {patients.length} linked
            </span>
            <button
              onClick={loadPatients}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-sky-400 transition"
              title="Refresh patients"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {patientsLoading ? (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              <p className="text-sm text-slate-500">Loading linked patients…</p>
            </div>
          ) : patients.length > 0 ? (
            <div className="space-y-2">
              {patients.map((patient, i) => (
                <motion.div
                  key={patient.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 hover:border-sky-500/20 hover:bg-sky-500/5 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/20 flex items-center justify-center shrink-0">
                    {patient.avatar_url ? (
                      <img
                        src={patient.avatar_url}
                        alt={patient.name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-sky-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{patient.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Mail className="w-2.5 h-2.5" /> {patient.email || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Status + meta */}
                  <div className="flex items-center gap-2 shrink-0">
                    {patient.linked_at && (
                      <span className="hidden sm:flex items-center gap-1 text-[9px] text-slate-600">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(patient.linked_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      <Wifi className="w-2.5 h-2.5" /> Active
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-medium">
                      Patient
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No patients linked yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Ask a patient to register with your email as their caregiver, or use the link flow.
              </p>
            </div>
          )}
        </motion.div>

        {/* Live Location */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold">Patient Location</h2>
            {isAutoSharing && (
              <span className="flex items-center gap-1.5 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                <Radio className="w-3 h-3 animate-pulse" /> Auto-tracking
              </span>
            )}
          </div>
          {lastLoc ? (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/15">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-sm text-sky-300 font-medium">
                    {lastLoc.lat.toFixed(5)}, {lastLoc.lng.toFixed(5)}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${lastLoc.lat},${lastLoc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-sm text-emerald-400 font-semibold hover:bg-emerald-500/25 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Map
                </a>
                <span className="text-[10px] text-slate-500 ml-auto">
                  {new Date(lastLoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {patientLocs.length > 1 && (
                <div className="mt-3 pt-3 border-t border-emerald-500/10">
                  <p className="text-[10px] text-slate-500 mb-2">Recent locations ({patientLocs.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {patientLocs.slice(-6).reverse().map((l, i) => (
                      <a
                        key={i}
                        href={`https://www.google.com/maps?q=${l.lat},${l.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-400 hover:text-sky-400 hover:border-sky-500/20 transition flex items-center gap-1"
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {l.autoShare && <span className="text-sky-400">•</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No location data yet</p>
              <p className="text-xs text-slate-600 mt-1">Patient hasn&apos;t shared their location</p>
            </div>
          )}
        </motion.div>

        {/* Patient Messages */}
        {patientMsgs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <MessageSquare className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-base font-semibold">Patient Messages</h2>
            </div>
            <div className="space-y-2">
              {patientMsgs.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <span className="text-sm">💬</span>
                  <p className="text-sm text-slate-300 flex-1">{a.message}</p>
                  <span className="text-[10px] text-slate-600">
                    {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Call Log */}
        {patientCalls.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <Phone className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-base font-semibold">Incoming Calls</h2>
            </div>
            <div className="space-y-1.5">
              {patientCalls.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <Phone
                    className={`w-3.5 h-3.5 ${c.status === 'ended' ? 'text-emerald-400' : c.status === 'ringing' ? 'text-amber-400 animate-pulse' : 'text-sky-400'}`}
                  />
                  <span className="text-sm text-slate-300 flex-1">From Patient — {c.status}</span>
                  {c.duration && (
                    <span className="text-[10px] text-slate-500">
                      {Math.floor(c.duration / 60)}:{(c.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-600">
                    {new Date(c.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Reply + Custom Message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="p-5 rounded-2xl border border-white/10"
          style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.06),rgba(255,255,255,0.02))' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20">
              <Send className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-semibold">Send to Patient</h2>
            {sent && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs text-emerald-400 ml-2">
                ✓ Sent!
              </motion.span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_REPLIES.map((q, i) => (
              <button
                key={i}
                onClick={() => handleMsg(q)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-400 hover:text-white hover:bg-sky-500/10 hover:border-sky-500/20 transition"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomMsg()}
              placeholder="Type a message to patient..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCustomMsg}
              disabled={!msg.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-semibold shadow-lg shadow-sky-500/25 disabled:opacity-40 flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" /> Send
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
