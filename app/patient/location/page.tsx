'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Send, Shield, Home, Clock, Radio, Wifi,
  AlertTriangle, CheckCircle2, Compass, ArrowUpRight, Eye, Locate,
} from 'lucide-react';
import {
  sendLocationUpdate, getLocationUpdates, subscribeLocation, LocationUpdate,
} from '@/lib/contact-service';
import { sendAlert } from '@/lib/alert-service';

import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PatientLocationPage() {
  const [safeRadius, setSafeRadius] = useState<number>(2);
  const [hasAlertedOutside, setHasAlertedOutside] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [autoShare, setAutoShare] = useState(false);
  const [sending, setSending] = useState(false);
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const autoRef = useRef<NodeJS.Timeout | null>(null);
  const [now, setNow] = useState(Date.now());

  // Load safe radius from Supabase settings
  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      const user = res.data?.user;
      if (user?.user_metadata?.alzcare_settings?.safeRadius) {
        setSafeRadius(parseFloat(user.user_metadata.alzcare_settings.safeRadius));
      }
    });
  }, []);

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); setAccuracy(p.coords.accuracy); },
      () => {}, { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  // Load home
  useEffect(() => {
    try { const h = JSON.parse(localStorage.getItem('alzcare_home_location') || 'null'); if (h) { setHomeLat(h.lat); setHomeLng(h.lng); } } catch {}
    setLocations(getLocationUpdates().filter(l => l.sender === 'patient'));
    const u = subscribeLocation(a => setLocations(a.filter(l => l.sender === 'patient')));
    return () => { u(); };
  }, []);

  // Auto-share
  useEffect(() => {
    if (autoShare && lat && lng) {
      sendLocationUpdate({ lat, lng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      autoRef.current = setInterval(() => {
        if (lat && lng) sendLocationUpdate({ lat, lng, timestamp: new Date().toISOString(), sender: 'patient', autoShare: true });
      }, 30000);
    } else { if (autoRef.current) clearInterval(autoRef.current); }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoShare, lat, lng]);

  const setHome = () => {
    if (!lat || !lng) return;
    setHomeLat(lat); setHomeLng(lng);
    localStorage.setItem('alzcare_home_location', JSON.stringify({ lat, lng }));
  };

  const shareNow = () => {
    if (!lat || !lng) return;
    setSending(true);
    sendLocationUpdate({ lat, lng, timestamp: new Date().toISOString(), sender: 'patient' });
    sendAlert({ sender: 'patient', message: '📍 Shared live location', priority: 'info', lat, lng, type: 'message' });
    setTimeout(() => setSending(false), 1500);
  };

  const distHome = (homeLat && homeLng && lat && lng) ? haversine(lat, lng, homeLat, homeLng) : null;
  const isOutside = distHome !== null && distHome > safeRadius;

  // Auto geofence SOS trigger
  useEffect(() => {
    if (isOutside && !hasAlertedOutside && lat && lng) {
      sendAlert({
        sender: 'patient',
        message: `🚨 Geofence Breach — Patient left safe zone! Currently ${distHome?.toFixed(2)} km from home.`,
        priority: 'critical',
        type: 'sos',
        lat,
        lng
      });
      setHasAlertedOutside(true);
    } else if (!isOutside) {
      setHasAlertedOutside(false);
    }
  }, [isOutside, lat, lng, distHome, hasAlertedOutside]);

  const myHistory = locations.slice(-20).reverse();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-sky-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border border-emerald-500/20">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">My Location</h1>
              <p className="text-slate-500 text-xs">Share & track your location in real-time</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-emerald-400" /></span>
              <span className="text-[10px] text-emerald-400 font-medium">GPS Active</span>
            </div>
          </div>
        </motion.div>

        {/* Live GPS Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl border border-emerald-500/20" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.04))' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <Locate className="w-7 h-7 text-emerald-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#020617] animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white">Current Position</p>
              {lat && lng ? (
                <p className="text-sm text-emerald-400 font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
              ) : (
                <p className="text-sm text-slate-500">Acquiring GPS signal...</p>
              )}
            </div>
            {accuracy && <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">±{accuracy.toFixed(0)}m</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={shareNow} disabled={!lat}
              className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm disabled:opacity-40 hover:bg-emerald-500/25 transition">
              {sending ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              {sending ? 'Sent!' : 'Share Now'}
            </motion.button>
            <a href={lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '#'} target="_blank" rel="noopener noreferrer"
              className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center gap-2 text-sky-400 font-semibold text-sm hover:bg-sky-500/20 transition">
              <Compass className="w-5 h-5" /> Open Map
            </a>
          </div>
        </motion.div>

        {/* Auto-Share + Safe Zone Row */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Radio className={`w-5 h-5 ${autoShare ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{autoShare ? 'Auto-Sharing ON' : 'Auto-Share'}</p>
                <p className="text-[10px] text-slate-500">Every 30 seconds</p>
              </div>
              <button onClick={() => setAutoShare(!autoShare)}
                className={`w-12 h-6 rounded-full transition-all ${autoShare ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoShare ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            className={`p-4 rounded-2xl border ${isOutside ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${isOutside ? 'text-red-400' : distHome !== null ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{isOutside ? '⚠️ Outside Zone' : distHome !== null ? '✅ Safe Zone' : 'Safe Zone'}</p>
                <p className="text-[10px] text-slate-500">{distHome !== null ? `${distHome.toFixed(2)} km from home` : 'Set home first'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Home Location + Direction */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-violet-500/20"><Home className="w-4 h-4 text-violet-400" /></div>
            <h2 className="text-base font-semibold">Home Location</h2>
          </div>
          {homeLat && homeLng ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 font-mono">{homeLat.toFixed(5)}, {homeLng.toFixed(5)}</span>
                <button onClick={setHome} className="text-[10px] text-violet-400 underline">Update to current</button>
              </div>
              {isOutside && lat && lng && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                    <p className="text-sm font-bold text-amber-400">You are {distHome?.toFixed(2)} km from home</p>
                  </div>
                  <a href={`https://www.google.com/maps/dir/${lat},${lng}/${homeLat},${homeLng}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition w-fit">
                    <Navigation className="w-4 h-4" /> Get Directions Home
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </motion.div>
              )}
              {!isOutside && distHome !== null && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>You&apos;re within the safe zone ({safeRadius} km radius)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">Set your home location to enable safe zone monitoring</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={setHome} disabled={!lat}
                className="px-5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-sm font-semibold disabled:opacity-40 hover:bg-violet-500/25 transition">
                <Home className="w-4 h-4 inline mr-2" /> Set Current as Home
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Caregiver Watching Status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 flex items-center gap-3">
          <Eye className="w-5 h-5 text-sky-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-300">Caregiver Monitoring</p>
            <p className="text-[10px] text-slate-500">{autoShare ? 'Your caregiver can see your live location' : 'Enable auto-share so your caregiver can track you'}</p>
          </div>
          {autoShare && <span className="flex gap-1">{[1, 2, 3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" style={{ animationDelay: `${i * 0.3}s` }} />)}</span>}
        </motion.div>

        {/* Location History */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-slate-500/20"><Clock className="w-4 h-4 text-slate-400" /></div>
            <h2 className="text-base font-semibold">Shared History</h2>
            <span className="text-[10px] text-slate-600 ml-auto">{myHistory.length} entries</span>
          </div>
          {myHistory.length > 0 ? (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {myHistory.map((l, i) => (
                <a key={i} href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 hover:bg-white/[0.06] transition group">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300 font-mono flex-1">{l.lat.toFixed(5)}, {l.lng.toFixed(5)}</span>
                  {l.autoShare && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">auto</span>}
                  <span className="text-[10px] text-slate-600">{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition" />
                </a>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No locations shared yet</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}