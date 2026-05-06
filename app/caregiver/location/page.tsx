'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Shield, Clock, Radio, ExternalLink,
  AlertTriangle, CheckCircle2, Users, Eye, Bell, Locate, Target,
} from 'lucide-react';
import {
  getLocationUpdates, subscribeLocation, LocationUpdate,
  sendLocationUpdate,
} from '@/lib/contact-service';
import { sendAlert } from '@/lib/alert-service';

const SAFE_RADIUS_KM = 2;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Demo patients for safe zone visualization
const DEMO_CENTER = { lat: 19.0760, lng: 72.8777 }; // Mumbai
const DEMO_PATIENTS = [
  { name: 'Ramesh P.', lat: 19.0780, lng: 72.8800, status: 'safe' as const },
  { name: 'Sunita D.', lat: 19.0610, lng: 72.8550, status: 'warning' as const },
  { name: 'Anil K.', lat: 19.0950, lng: 72.9100, status: 'sos' as const },
];

export default function CaregiverLocationPage() {
  const [locations, setLocations] = useState<LocationUpdate[]>([]);
  const [now, setNow] = useState(Date.now());
  const [demoAlerts, setDemoAlerts] = useState<{ name: string; msg: string; time: string; type: string }[]>([]);
  const [showDemo, setShowDemo] = useState(true);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    setLocations(getLocationUpdates());
    const u = subscribeLocation(a => setLocations(a));
    return () => { u(); };
  }, []);

  // Demo SOS alerts
  useEffect(() => {
    const t1 = setTimeout(() => {
      setDemoAlerts(a => [...a, { name: 'Anil K.', msg: '🆘 SOS — Patient outside safe zone (3.2 km away)', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'sos' }]);
    }, 3000);
    const t2 = setTimeout(() => {
      setDemoAlerts(a => [...a, { name: 'Sunita D.', msg: '⚠️ Warning — Patient approaching zone boundary (1.8 km)', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'warning' }]);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const requestLocation = () => {
    sendAlert({ sender: 'caregiver', message: '📍 Please share your location', priority: 'warning', type: 'message' });
  };

  const patientLocs = locations.filter(l => l.sender === 'patient');
  const lastLoc = patientLocs.length > 0 ? patientLocs[patientLocs.length - 1] : null;
  const autoLocs = patientLocs.filter(l => l.autoShare);
  const isAutoSharing = autoLocs.length > 0 && (Date.now() - new Date(autoLocs[autoLocs.length - 1]?.timestamp).getTime()) < 60000;
  const history = patientLocs.slice(-20).reverse();

  // Check safe zone for real patient
  let homeLoc: { lat: number; lng: number } | null = null;
  try { homeLoc = JSON.parse(localStorage.getItem('alzcare_home_location') || 'null'); } catch {}
  const patientDist = (lastLoc && homeLoc) ? haversine(lastLoc.lat, lastLoc.lng, homeLoc.lat, homeLoc.lng) : null;
  const patientOutside = patientDist !== null && patientDist > SAFE_RADIUS_KM;

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-emerald-500/4 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/20 border border-sky-500/20">
              <MapPin className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Location Tracking</h1>
              <p className="text-slate-500 text-xs">Monitor patient locations & safe zones in real-time</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={requestLocation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/20 text-sky-400 text-xs font-semibold hover:bg-sky-500/25 transition">
              <Locate className="w-3.5 h-3.5" /> Request Location
            </motion.button>
          </div>
        </motion.div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: lastLoc ? 'Located' : 'No Data', sub: lastLoc ? new Date(lastLoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', color: lastLoc ? 'emerald' : 'slate' },
            { icon: Radio, label: isAutoSharing ? 'Auto-Tracking' : 'Off', sub: 'Live Feed', color: isAutoSharing ? 'sky' : 'slate', pulse: isAutoSharing },
            { icon: Shield, label: patientOutside ? 'OUTSIDE' : patientDist !== null ? 'Safe' : 'Unknown', sub: patientDist ? `${patientDist.toFixed(1)} km` : '—', color: patientOutside ? 'red' : patientDist !== null ? 'emerald' : 'slate' },
            { icon: Clock, label: `${history.length}`, sub: 'Updates Today', color: 'violet' },
          ].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03 }}
              className={`p-4 rounded-2xl text-center border bg-${c.color}-500/10 border-${c.color}-500/20`}
              style={{ background: `rgba(${c.color === 'emerald' ? '16,185,129' : c.color === 'sky' ? '14,165,233' : c.color === 'red' ? '239,68,68' : c.color === 'violet' ? '139,92,246' : '100,116,139'},0.08)` }}>
              <c.icon className={`w-5 h-5 mx-auto mb-1 text-${c.color}-400 ${c.pulse ? 'animate-pulse' : ''}`} style={{ color: c.color === 'emerald' ? '#34d399' : c.color === 'sky' ? '#38bdf8' : c.color === 'red' ? '#f87171' : c.color === 'violet' ? '#a78bfa' : '#94a3b8' }} />
              <p className="text-sm font-bold" style={{ color: c.color === 'emerald' ? '#34d399' : c.color === 'sky' ? '#38bdf8' : c.color === 'red' ? '#f87171' : c.color === 'violet' ? '#a78bfa' : '#94a3b8' }}>{c.label}</p>
              <p className="text-[10px] text-slate-500">{c.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Real Patient Location */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><Navigation className="w-4 h-4 text-emerald-400" /></div>
            <h2 className="text-base font-semibold">Patient Live Location</h2>
            {isAutoSharing && <span className="flex items-center gap-1.5 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full"><Radio className="w-3 h-3 animate-pulse" /> Live</span>}
          </div>
          {lastLoc ? (
            <div className="p-5 rounded-2xl border border-emerald-500/15" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))' }}>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><MapPin className="w-6 h-6 text-emerald-400" /></div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#020617] animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-mono text-emerald-300">{lastLoc.lat.toFixed(6)}, {lastLoc.lng.toFixed(6)}</p>
                  <p className="text-[10px] text-slate-500">{new Date(lastLoc.timestamp).toLocaleString()}</p>
                </div>
                <a href={`https://www.google.com/maps?q=${lastLoc.lat},${lastLoc.lng}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition">
                  <ExternalLink className="w-3.5 h-3.5" /> Map
                </a>
              </div>
              {patientOutside && (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
                  <p className="text-sm text-red-300 flex-1">Patient is <strong>{patientDist?.toFixed(1)} km</strong> outside the safe zone!</p>
                  <a href={`https://www.google.com/maps/dir/${lastLoc.lat},${lastLoc.lng}/${homeLoc?.lat},${homeLoc?.lng}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-red-400 underline shrink-0">Get Directions</a>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No location data from patient yet</p>
              <p className="text-xs text-slate-600 mt-1">Click &quot;Request Location&quot; to ask patient to share</p>
            </div>
          )}
        </motion.div>

        {/* Demo Safe Zone Map */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><Target className="w-4 h-4 text-amber-400" /></div>
            <h2 className="text-base font-semibold">Safe Zone Monitor</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium ml-auto">DEMO</span>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {/* Visual Map Demo */}
            <div className="relative w-full h-[300px] rounded-xl bg-[#0a1628] border border-white/10 overflow-hidden mb-4">
              {/* Grid lines */}
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              {/* Safe zone circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border-2 border-dashed border-emerald-500/40 bg-emerald-500/5">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full border border-emerald-500/20 bg-emerald-500/5" />
              </div>
              {/* Center (Home) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[9px] text-emerald-400 mt-1 font-medium">HOME</span>
              </div>
              {/* Safe patient - inside circle */}
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-[42%] left-[55%] flex flex-col items-center z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center">
                  <Users className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[8px] text-emerald-400 mt-0.5">Ramesh P.</span>
              </motion.div>
              {/* Warning patient - near boundary */}
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute top-[65%] left-[28%] flex flex-col items-center z-10">
                <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center animate-pulse">
                  <Users className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-[8px] text-amber-400 mt-0.5">Sunita D.</span>
              </motion.div>
              {/* SOS patient - outside circle */}
              <motion.div animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-[18%] right-[12%] flex flex-col items-center z-10">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-red-500/40 border-2 border-red-400 flex items-center justify-center">
                    <Users className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
                </div>
                <span className="text-[8px] text-red-400 mt-0.5 font-bold">Anil K. 🆘</span>
              </motion.div>
              {/* Radius label */}
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-white/5 border border-white/10">
                <p className="text-[9px] text-slate-500">Safe Zone: {SAFE_RADIUS_KM} km radius</p>
              </div>
              {/* Legend */}
              <div className="absolute top-3 left-3 space-y-1">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[9px] text-slate-400">Safe</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[9px] text-slate-400">Warning</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[9px] text-slate-400">SOS</span></div>
              </div>
            </div>

            {/* Demo Alerts */}
            <AnimatePresence>
              {demoAlerts.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
                  className={`p-3 rounded-xl mb-2 flex items-center gap-3 ${a.type === 'sos' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                  {a.type === 'sos' ? <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" /> : <Bell className="w-4 h-4 text-amber-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: a.type === 'sos' ? '#f87171' : '#fbbf24' }}>{a.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.msg}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{a.time}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Location History */}
        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-slate-500/20"><Clock className="w-4 h-4 text-slate-400" /></div>
              <h2 className="text-base font-semibold">Location History</h2>
            </div>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {history.map((l, i) => (
                <a key={i} href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 hover:bg-white/[0.06] transition group">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-sm text-slate-300 font-mono flex-1">{l.lat.toFixed(5)}, {l.lng.toFixed(5)}</span>
                  {l.autoShare && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">auto</span>}
                  <span className="text-[10px] text-slate-600">{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-sky-400 transition" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
