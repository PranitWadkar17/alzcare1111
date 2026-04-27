// components/patient/LocationStatus.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

// ---- Fix Leaflet default marker icons ----
function useLeafletIcon() {
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    })();
  }, []);
}

// ---- Dynamic RecenterMap component (uses useMap inside MapContainer) ----
const RecenterMap = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const { useMap } = mod;
      return function RecenterMapInner({
        lat,
        lng,
        trigger,
      }: {
        lat: number;
        lng: number;
        trigger: number;
      }) {
        const map = useMap();
        // Recenter smoothly on every trigger change or coord change
        useEffect(() => {
          map.setView([lat, lng], map.getZoom(), { animate: true });
        }, [lat, lng, trigger, map]);
        return null;
      };
    }),
  { ssr: false }
);

// ----------------------------------------------------------------

interface LocationStatusProps {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  lastUpdated: Date | null;
  isTracking: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function LocationStatus({
  lat,
  lng,
  accuracy,
  lastUpdated,
  isTracking,
  error,
  onRefresh,
}: LocationStatusProps) {
  useLeafletIcon();

  // Recenter trigger — incremented when user clicks "Recenter"
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Default center (fallback when no coords yet)
  const center: [number, number] = useMemo(
    () => [lat ?? 20.5937, lng ?? 78.9629],
    [lat, lng]
  );

  const hasCoords = lat !== null && lng !== null;
  const isLowAccuracy = accuracy !== null && accuracy > 100;

  const handleRecenter = useCallback(() => {
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  // Human-readable error with icon hint
  const getErrorInfo = (err: string) => {
    if (err.includes('permission') || err.includes('denied')) {
      return { icon: '🔒', hint: 'Go to browser Settings → Site permissions → Location → Allow' };
    }
    if (err.includes('unavailable') || err.includes('GPS')) {
      return { icon: '📡', hint: 'Enable GPS/Location Services on your device' };
    }
    if (err.includes('timed out') || err.includes('timeout')) {
      return { icon: '⏱️', hint: 'Move to an area with better signal or try again' };
    }
    return { icon: '⚠️', hint: '' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-white/5 border border-white/10"
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isTracking ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}
          >
            <MapPin
              className={`w-5 h-5 ${
                isTracking ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Location Tracking</h3>
            <p className="text-sm text-slate-400">
              {isTracking
                ? 'Sharing location with caregivers'
                : 'Location tracking paused'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Recenter button */}
          {hasCoords && (
            <button
              onClick={handleRecenter}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Recenter map on current location"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
          )}
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh location"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ---- Body ---- */}
      {error ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              {getErrorInfo(error).hint && (
                <p className="text-xs text-red-400/70 mt-1">
                  {getErrorInfo(error).icon} {getErrorInfo(error).hint}
                </p>
              )}
            </div>
          </div>
          {/* Show a placeholder map area when there's an error */}
          <div
            className="rounded-xl overflow-hidden border border-white/5 flex items-center justify-center bg-white/[0.02]"
            style={{ height: 200 }}
          >
            <div className="text-center text-slate-600">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Map unavailable</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tracking status pill */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span
              className={`text-sm ${
                isTracking ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {isTracking ? '● Live Tracking Active' : '○ Tracking Paused'}
            </span>
          </div>

          {/* Low accuracy warning */}
          {isLowAccuracy && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">
                Location accuracy is low (±{Math.round(accuracy!)}m). Move
                outdoors or enable precise location.
              </p>
            </div>
          )}

          {/* ---- Interactive Map ---- */}
          <div
            className="rounded-xl overflow-hidden border border-white/10 relative"
            style={{ height: 350 }}
          >
            {hasCoords ? (
              <MapContainer
                center={center}
                zoom={17}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Accuracy radius circle */}
                {accuracy && accuracy > 0 && (
                  <Circle
                    center={center}
                    radius={accuracy}
                    pathOptions={{
                      color: '#10b981',
                      fillColor: '#10b981',
                      fillOpacity: 0.1,
                      weight: 1.5,
                      dashArray: '4 4',
                    }}
                  />
                )}

                {/* Patient marker */}
                <Marker position={center}>
                  <Popup>
                    <div style={{ color: '#1e293b', minWidth: 160 }}>
                      <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                        📍 Patient current location
                      </p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        Lat: {lat!.toFixed(6)}
                        <br />
                        Lng: {lng!.toFixed(6)}
                        <br />
                        Accuracy: ±{accuracy ? Math.round(accuracy) : '?'}m
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Recenter controller */}
                <RecenterMap
                  lat={lat!}
                  lng={lng!}
                  trigger={recenterTrigger}
                />
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-white/[0.02] text-slate-500 gap-2">
                <div className="w-6 h-6 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-sm">Acquiring location…</p>
              </div>
            )}
          </div>

          {/* Accuracy + last updated footer */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {isLowAccuracy ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
              <span
                className={
                  isLowAccuracy ? 'text-amber-300' : 'text-slate-400'
                }
              >
                Accuracy: {accuracy ? `±${Math.round(accuracy)}m` : 'Unknown'}
              </span>
            </div>
            <span className="text-slate-500">
              Last updated: {formatTime(lastUpdated)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}