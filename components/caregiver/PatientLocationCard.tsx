// components/caregiver/PatientLocationCard.tsx
'use client';

import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation, User } from 'lucide-react';
import { Location } from '@/types';
import dynamic from 'next/dynamic';

const PatientMap = dynamic(() => import('./PatientMap').then(mod => mod.PatientMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Loading map...</span>
      </div>
    </div>
  ),
});

interface PatientLocationCardProps {
  patientId: string;
  patientName: string;
  location: Location | null;
  history: Location[];
  isOnline: boolean;
}

export function PatientLocationCard({
  patientId,
  patientName,
  location,
  history,
  isOnline,
}: PatientLocationCardProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCoordinate = (value: number, decimals: number = 6) => {
    return value.toFixed(decimals);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const locationTime = new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - locationTime) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">{patientName}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={`text-xs ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isOnline ? 'Live Tracking' : 'Last seen ' + (location ? getTimeAgo(location.timestamp) : 'unknown')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <PatientMap
          patientId={patientId}
          patientName={patientName}
          location={location}
          history={history}
          isOnline={isOnline}
        />
      </div>

      {location && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">Latitude</p>
                <p className="text-sm font-mono">{formatCoordinate(location.lat)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">Longitude</p>
                <p className="text-sm font-mono">{formatCoordinate(location.lng)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">
                Accuracy: {location.accuracy ? `±${Math.round(location.accuracy)}m` : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">
                {formatTime(location.timestamp)}
              </span>
            </div>
          </div>
        </div>
      )}

      {location && (
        <a
          href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-sm transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Open in Google Maps
        </a>
      )}
    </motion.div>
  );
}