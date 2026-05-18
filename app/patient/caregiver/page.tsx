'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, MapPin, Send, Users, Plus, Trash2, Shield,
  CheckCircle2, Loader2, Radio, MessageSquare, User, Mail, X,
  Clock, Navigation, Wifi, WifiOff,
} from 'lucide-react';
import {
  getContacts, addContact, removeContact, subscribeContacts, Contact,
  sendLocationUpdate, getLocationUpdates, subscribeLocation, LocationUpdate,
  initiateCall, updateCallStatus, getCalls, subscribeCalls, CallRecord,
} from '@/lib/contact-service';
import { sendAlert } from '@/lib/alert-service';
import { CallCaregiverButton } from '@/components/CallCaregiverButton';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

const QUICK_MSGS = ['🏠 I\'m home safe','🚶 Going for a walk','🛒 At the store','🏥 At the doctor','😊 I\'m feeling good','🍽️ Having lunch'];

export default function PatientCaregiverPage() {
  const [patientId, setPatientId] = useState('');
  const [caregiverId, setCaregiverId] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rel, setRel] = useState('Primary Caregiver');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [myLat, setMyLat] = useState<number|null>(null);
  const [myLng, setMyLng] = useState<number|null>(null);
  const [locSending, setLocSending] = useState(false);
  const [autoShare, setAutoShare] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [activeCall, setActiveCall] = useState<string|null>(null);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const autoRef = useRef<NodeJS.Timeout|null>(null);
  const callRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        setPatientId(user.id);
        // Get caregiver ID from patient_caregiver_links
        const { data: link, error } = await supabase
          .from('patient_caregiver_links')
          .select('caregiver_id')
          .eq('patient_id', user.id)
          .eq('status', 'active')
          .single();
        
        if (link && link.caregiver_id) {
          setCaregiverId(link.caregiver_id);
        } else {
          // If no caregiver link found, set a default to show the button
          console.log('No caregiver link found:', error);
          setCaregiverId(user.id);
        }
      }
    });
  }, []);

  useEffect(() => {
    setContacts(getContacts().filter(c => c.role === 'caregiver'));
    setLocations(getLocationUpdates()); setCalls(getCalls());
    const u1 = subscribeContacts(a => setContacts(a.filter(c => c.role === 'caregiver')));
    const u2 = subscribeLocation(a => setLocations(a));
    const u3 = subscribeCalls(a => setCalls(a));
    return () => { u1(); u2(); u3(); };
  }, []);

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      p => { setMyLat(p.coords.latitude); setMyLng(p.coords.longitude); }, () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  // Auto location sharing
  useEffect(() => {
    if (autoShare && myLat && myLng) {
      sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      autoRef.current = setInterval(() => {
        if (myLat && myLng) sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      }, 30000);
    } else { if (autoRef.current) clearInterval(autoRef.current); }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoShare, myLat, myLng]);

  const handleAddContact = () => {
    if (!name.trim() || !phone.trim()) return;
    addContact({ name: name.trim(), phone: phone.trim(), email: email.trim(), role: 'caregiver', relationship: rel });
    setName(''); setPhone(''); setEmail(''); setShowAdd(false);
  };

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

  const sendSOSAlert = async () => {
    if (!patientId || sendingSMS) return;
    
    setSendingSMS(true);
    setSmsStatus('sending');
    
    try {
      const response = await fetch('/api/twilio/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          type: 'sos',
          lat: myLat || null,
          lng: myLng || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSmsStatus('success');
        setTimeout(() => setSmsStatus('idle'), 3000);
      } else {
        throw new Error(data.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      console.error('SMS failed:', error);
      setSmsStatus('error');
      setTimeout(() => setSmsStatus('idle'), 3000);
    } finally {
      setSendingSMS(false);
    }
  };

  const handleSOS = () => {
    // Send SMS alert
    sendSOSAlert();
    // Send location
    if (myLat && myLng) {
      sendLocationUpdate({ lat: myLat, lng: myLng, timestamp: new Date().toISOString(), sender: 'patient' });
      setLocSending(true);
      setTimeout(() => setLocSending(false), 1500);
    }
    // Send alert to local system
    sendAlert({ sender: 'patient', message: '🆘 EMERGENCY SOS — Need immediate help!', priority: 'critical', type: 'sos', lat: myLat ?? undefined, lng: myLng ?? undefined });
  };

  const handleMsg = (text: string) => {
    sendAlert({ sender: 'patient', message: text, priority: 'info', type: 'message', lat: myLat ?? undefined, lng: myLng ?? undefined });
    setSent(true); setTimeout(() => setSent(false), 1500);
  };

  const handleCustomMsg = () => { if (!msg.trim()) return; handleMsg(msg.trim()); setMsg(''); };

  const caregivers = contacts;
  const myCallHistory = calls.filter(c => c.from === 'patient').slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-violet-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity:0,y:-16 }} animate={{ opacity:1,y:0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20"><Users className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">My Caregiver</h1>
              <p className="text-slate-500 text-xs">Call, message & share location in real-time</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <Wifi className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-medium">Live Connected</span>
            </div>
          </div>
        </motion.div>

        {/* Call + Location + SOS Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Call - Twilio Integration */}
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.05 }}
            className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden">
            {patientId && caregiverId ? (
              <div className="w-full flex items-center justify-center py-2">
                <CallCaregiverButton 
                  patientId={patientId} 
                  caregiverId={caregiverId}
                />
              </div>
            ) : (
              <div className="text-center py-5">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
                <span className="text-sm font-bold text-emerald-400 mt-2 block">Loading...</span>
              </div>
            )}
          </motion.div>

          {/* Send Location */}
          <motion.button initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.08 }}
            whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={handleSendLocation} disabled={!myLat}
            className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 flex flex-col items-center gap-2 transition-all disabled:opacity-40">
            {locSending ? <CheckCircle2 className="w-7 h-7 text-emerald-400" /> : <MapPin className="w-7 h-7 text-sky-400" />}
            <span className="text-sm font-bold text-sky-400">{locSending ? 'Sent!' : 'Send Location'}</span>
            {myLat && <span className="text-[9px] text-slate-500">{myLat.toFixed(4)}, {myLng?.toFixed(4)}</span>}
          </motion.button>

          {/* SOS - SMS Integration */}
          <motion.button initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.11 }}
            whileHover={{ scale: sendingSMS ? 1 : 1.02 }} whileTap={{ scale: sendingSMS ? 1 : 0.95 }} 
            onClick={handleSOS}
            disabled={sendingSMS}
            className={`p-5 rounded-2xl flex flex-col items-center gap-2 transition-all ${
              sendingSMS
                ? 'bg-slate-500/15 border-slate-500/25 cursor-not-allowed opacity-70'
                : smsStatus === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/25 hover:bg-emerald-500/25'
                : smsStatus === 'error'
                ? 'bg-orange-500/15 border-orange-500/25 hover:bg-orange-500/25'
                : 'bg-red-500/15 border-red-500/25 hover:bg-red-500/25'
            }`}>
            {sendingSMS ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-7 h-7 border-2 border-slate-400 border-t-transparent rounded-full"
                />
                <span className="text-sm font-bold text-slate-400">Sending...</span>
              </>
            ) : smsStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Alert Sent!</span>
              </>
            ) : smsStatus === 'error' ? (
              <>
                <Shield className="w-7 h-7 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">Try Again</span>
              </>
            ) : (
              <>
                <Shield className="w-7 h-7 text-red-400" />
                <span className="text-sm font-bold text-red-400">SOS</span>
                <span className="text-[9px] text-red-400/60">Emergency</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Auto Location Toggle */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.14 }}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
          <Navigation className={`w-5 h-5 ${autoShare ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">{autoShare ? 'Auto-sharing location' : 'Auto Location Sharing'}</p>
            <p className="text-[10px] text-slate-500">Sends GPS every 30 seconds to caregiver</p>
          </div>
          <button onClick={() => setAutoShare(!autoShare)}
            className={`w-12 h-6 rounded-full transition-all ${autoShare ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoShare ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          {autoShare && <span className="flex gap-1">{[1,2,3].map(i => <span key={i} className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" style={{animationDelay:`${i*0.3}s`}} />)}</span>}
        </motion.div>

        {/* Caregivers List + Add */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.18 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-500/20"><User className="w-4 h-4 text-violet-400" /></div>
            <h2 className="text-base font-semibold">My Caregivers</h2>
            <button onClick={() => setShowAdd(!showAdd)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-xs text-emerald-400 font-semibold hover:bg-emerald-500/25 transition">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="mb-3 p-4 rounded-2xl border border-emerald-500/20 overflow-hidden" style={{ background:'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name *" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50" />
                  <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone Number *" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50" />
                  <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email Address" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50" />
                  <select value={rel} onChange={e=>setRel(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400/50">
                    <option className="bg-slate-900" value="Primary Caregiver">Primary Caregiver</option>
                    <option className="bg-slate-900" value="Family Member">Family Member</option>
                    <option className="bg-slate-900" value="Doctor">Doctor</option>
                    <option className="bg-slate-900" value="Nurse">Nurse</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddContact} disabled={!name.trim()||!phone.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white disabled:opacity-40 hover:bg-emerald-600 transition flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Caregiver</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm text-slate-400 hover:text-white transition">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {caregivers.length > 0 ? (
            <div className="space-y-2">
              {caregivers.map(c => (
                <motion.div key={c.id} layout className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/20 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500"><Phone className="w-2.5 h-2.5" /> {c.phone}</span>
                      {c.email && <span className="flex items-center gap-1 text-[10px] text-slate-500"><Mail className="w-2.5 h-2.5" /> {c.email}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium shrink-0">{c.relationship}</span>
                  <button onClick={() => removeContact(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No caregivers added yet</p>
              <p className="text-xs text-slate-600 mt-1">Tap &quot;Add&quot; to add your caregiver&apos;s details</p>
            </div>
          )}
        </motion.div>

        {/* Quick Messages */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.24 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20"><MessageSquare className="w-4 h-4 text-sky-400" /></div>
            <h2 className="text-base font-semibold">Quick Messages</h2>
            {sent && <motion.span initial={{ scale:0 }} animate={{ scale:1 }} className="text-xs text-emerald-400 ml-2">✓ Sent!</motion.span>}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {QUICK_MSGS.map((q,i) => (
              <motion.button key={i} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={() => handleMsg(q)}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-300 transition text-center">{q}</motion.button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCustomMsg()}
              placeholder="Type a custom message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 transition-all" />
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={handleCustomMsg} disabled={!msg.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center gap-2 transition-all">
              <Send className="w-4 h-4" /> Send
            </motion.button>
          </div>
        </motion.div>

        {/* Call History */}
        {myCallHistory.length > 0 && (
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-slate-500/20"><Clock className="w-4 h-4 text-slate-400" /></div>
              <h2 className="text-base font-semibold">Recent Calls</h2>
            </div>
            <div className="space-y-1.5">
              {myCallHistory.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                  <Phone className={`w-3.5 h-3.5 ${c.status === 'ended' ? 'text-emerald-400' : c.status === 'missed' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="text-sm text-slate-300 flex-1">{c.status === 'ended' ? 'Call ended' : c.status === 'missed' ? 'Missed' : c.status === 'ringing' ? 'Ringing...' : 'Active'}</span>
                  {c.duration && <span className="text-[10px] text-slate-500">{Math.floor(c.duration/60)}:{(c.duration%60).toString().padStart(2,'0')}</span>}
                  <span className="text-[10px] text-slate-600">{new Date(c.started_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
