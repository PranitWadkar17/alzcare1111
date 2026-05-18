'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, MapPin, Send, Users, Shield,
  CheckCircle2, Loader2, Radio, MessageSquare, User, Mail, X,
  Clock, Navigation, Wifi, WifiOff, UserCheck, RefreshCw,
} from 'lucide-react';
import {
  sendLocationUpdate, getLocationUpdates, subscribeLocation, LocationUpdate,
  initiateCall, updateCallStatus, getCalls, subscribeCalls, CallRecord,
} from '@/lib/contact-service';
import { sendAlert } from '@/lib/alert-service';
import {
  getLinkedCaregiversForPatient,
  subscribeToLinkedCaregiversChanges,
  CaregiverProfile,
} from '@/lib/patient-service';
import { supabase } from '@/lib/supabase';

const QUICK_MSGS = [
  '🏠 I\'m home safe', '🚶 Going for a walk', '🛒 At the store',
  '🏥 At the doctor', '😊 I\'m feeling good', '🍽️ Having lunch',
];

export default function PatientCaregiverPage() {
  // ── Auth ──
  const [patientId, setPatientId] = useState<string | null>(null);

  // ── Supabase-driven caregiver list ──
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [caregiversLoading, setCaregiversLoading] = useState(true);

  // ── Contact-service driven data ──
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);

  // ── UI State ──
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [locSending, setLocSending] = useState(false);
  const [autoShare, setAutoShare] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [activeCall, setActiveCall] = useState<string | null>(null);

  const autoRef = useRef<NodeJS.Timeout | null>(null);
  const callRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load patient ID from auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) setPatientId(user.id);
    });
  }, []);

  // ── Fetch linked caregivers from Supabase ──
  const loadCaregivers = useCallback(async () => {
    if (!patientId) return;
    setCaregiversLoading(true);
    const data = await getLinkedCaregiversForPatient(patientId);
    setCaregivers(data);
    setCaregiversLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    loadCaregivers();
    // Real-time subscription: refresh when links change
    const unsub = subscribeToLinkedCaregiversChanges(patientId, loadCaregivers);
    return unsub;
  }, [patientId, loadCaregivers]);

  // ── Subscribe to location/calls ──
  useEffect(() => {
    setLocations(getLocationUpdates());
    setCalls(getCalls());
    const u2 = subscribeLocation(a => setLocations(a));
    const u3 = subscribeCalls(a => setCalls(a));
    return () => { u2(); u3(); };
  }, []);

  // ── GPS tracking ──
  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      p => { setMyLat(p.coords.latitude); setMyLng(p.coords.longitude); },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  // ── Auto location sharing ──
  useEffect(() => {
    if (autoShare && myLat && myLng) {
      sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      autoRef.current = setInterval(() => {
        if (myLat && myLng)
          sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      }, 30000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoShare, myLat, myLng]);

  // ── Handlers ──
  const handleSendLocation = () => {
    if (!myLat || !myLng) return;
    setLocSending(true);
    sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient' });
    sendAlert({ sender: 'patient', message: `📍 Shared live location`, priority: 'info', lat: myLat, lng: myLng, type: 'message' });
    setTimeout(() => setLocSending(false), 1500);
  };

  const handleCall = () => {
    if (calling) {
      if (activeCall) updateCallStatus(activeCall, 'ended', callTimer);
      setCalling(false); setCallTimer(0); setActiveCall(null);
      if (callRef.current) clearInterval(callRef.current);
    } else {
      const c = initiateCall('patient');
      setActiveCall(c.id); setCalling(true); setCallTimer(0);
      sendAlert({ sender: 'patient', message: '📞 Patient is calling...', priority: 'warning', type: 'message', lat: myLat ?? undefined, lng: myLng ?? undefined });
      setTimeout(() => { if (c) updateCallStatus(c.id, 'active'); }, 2000);
      callRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    }
  };

  const handleSOS = () => {
    sendAlert({ sender: 'patient', message: '🆘 EMERGENCY SOS — Need immediate help!', priority: 'critical', type: 'sos', lat: myLat ?? undefined, lng: myLng ?? undefined });
    if (myLat && myLng)
      sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient' });
  };

  const handleMsg = (text: string) => {
    sendAlert({ sender: 'patient', message: text, priority: 'info', type: 'message', lat: myLat ?? undefined, lng: myLng ?? undefined });
    setSent(true); setTimeout(() => setSent(false), 1500);
  };

  const handleCustomMsg = () => { if (!msg.trim()) return; handleMsg(msg.trim()); setMsg(''); };

  const myCallHistory = calls.filter(c => c.from === 'patient').slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-violet-500/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                My Caregiver
              </h1>
              <p className="text-slate-500 text-xs">Call, message & share location in real-time</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">Live Connected</span>
            </div>
          </div>
        </motion.div>

        {/* Call + Location + SOS Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Call */}
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleCall}
            className={`p-5 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
              calling ? 'bg-red-500/15 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
            }`}
          >
            {calling ? <PhoneOff className="w-7 h-7 text-red-400" /> : <Phone className="w-7 h-7 text-emerald-400" />}
            <span className={`text-sm font-bold ${calling ? 'text-red-400' : 'text-emerald-400'}`}>
              {calling ? `End ${Math.floor(callTimer / 60)}:${(callTimer % 60).toString().padStart(2, '0')}` : 'Call'}
            </span>
            {calling && (
              <span className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            )}
          </motion.button>

          {/* Send Location */}
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSendLocation}
            disabled={!myLat}
            className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 flex flex-col items-center gap-2 transition-all disabled:opacity-40"
          >
            {locSending ? <CheckCircle2 className="w-7 h-7 text-emerald-400" /> : <MapPin className="w-7 h-7 text-sky-400" />}
            <span className="text-sm font-bold text-sky-400">{locSending ? 'Sent!' : 'Send Location'}</span>
            {myLat && <span className="text-[9px] text-slate-500">{myLat.toFixed(4)}, {myLng?.toFixed(4)}</span>}
          </motion.button>

          {/* SOS */}
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
            onClick={handleSOS}
            className="p-5 rounded-2xl bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 flex flex-col items-center gap-2 transition-all"
          >
            <Shield className="w-7 h-7 text-red-400" />
            <span className="text-sm font-bold text-red-400">SOS</span>
            <span className="text-[9px] text-red-400/60">Emergency</span>
          </motion.button>
        </div>

        {/* Auto Location Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3"
        >
          <Navigation className={`w-5 h-5 ${autoShare ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">{autoShare ? 'Auto-sharing location' : 'Auto Location Sharing'}</p>
            <p className="text-[10px] text-slate-500">Sends GPS every 30 seconds to caregiver</p>
          </div>
          <button
            onClick={() => setAutoShare(!autoShare)}
            className={`w-12 h-6 rounded-full transition-all ${autoShare ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoShare ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          {autoShare && (
            <span className="flex gap-1">
              {[1, 2, 3].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </span>
          )}
        </motion.div>

        {/* ── Linked Caregivers List (Supabase-driven) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-500/20">
              <UserCheck className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-base font-semibold">My Caregivers</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium ml-1">
              {caregivers.length} linked
            </span>
            <button
              onClick={loadCaregivers}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-violet-400 transition"
              title="Refresh caregivers"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {caregiversLoading ? (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <p className="text-sm text-slate-500">Loading linked caregivers…</p>
            </div>
          ) : caregivers.length > 0 ? (
            <div className="space-y-2">
              {caregivers.map((cg, i) => (
                <motion.div
                  key={cg.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 hover:border-violet-500/20 hover:bg-violet-500/5 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 flex items-center justify-center shrink-0">
                    {cg.avatar_url ? (
                      <img
                        src={cg.avatar_url}
                        alt={cg.name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-violet-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{cg.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Mail className="w-2.5 h-2.5" /> {cg.email || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      <Wifi className="w-2.5 h-2.5" /> Active
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                      {cg.relationship || 'Caregiver'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No caregiver linked yet</p>
              <p className="text-xs text-slate-600 mt-1">Your caregiver will appear here once they set up your link</p>
            </div>
          )}
        </motion.div>

        {/* Quick Messages */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20">
              <MessageSquare className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-semibold">Quick Messages</h2>
            {sent && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs text-emerald-400 ml-2">
                ✓ Sent!
              </motion.span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {QUICK_MSGS.map((q, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleMsg(q)}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300 transition text-center"
              >
                {q}
              </motion.button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomMsg()}
              placeholder="Type a custom message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCustomMsg}
              disabled={!msg.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" /> Send
            </motion.button>
          </div>
        </motion.div>

        {/* Call History */}
        {myCallHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-slate-500/20">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <h2 className="text-base font-semibold">Recent Calls</h2>
            </div>
            <div className="space-y-1.5">
              {myCallHistory.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <Phone
                    className={`w-3.5 h-3.5 ${c.status === 'ended' ? 'text-emerald-400' : c.status === 'missed' ? 'text-red-400' : 'text-amber-400'}`}
                  />
                  <span className="text-sm text-slate-300 flex-1">
                    {c.status === 'ended' ? 'Call ended' : c.status === 'missed' ? 'Missed' : c.status === 'ringing' ? 'Ringing...' : 'Active'}
                  </span>
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

      </div>
    </div>
  );
}
