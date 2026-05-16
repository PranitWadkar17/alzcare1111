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

// ---- Fix Leaflet default marker icons with pure CSS/SVG to avoid Tracking Prevention blocking external assets ----
function useLeafletIcon() {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((mod) => {
      setL(mod.default);
    });
  }, []);

  const customIcon = useMemo(() => {
    if (!L) return null;
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg z-10"></div>
          <div class="absolute -bottom-1 w-1 h-1 bg-emerald-600 rounded-full blur-[1px]"></div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, [L]);

  const lowAccIcon = useMemo(() => {
    if (!L) return null;
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-4 h-4 bg-amber-500 border-2 border-white rounded-full shadow-lg z-10"></div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, [L]);

  return { customIcon, lowAccIcon };
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
  const { customIcon, lowAccIcon } = useLeafletIcon();

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
  const isLowAccuracy = accuracy !== null && accuracy > 150; // Anything > 150m is likely not GPS

  // Calculate dynamic zoom based on accuracy
  const dynamicZoom = useMemo(() => {
    if (!accuracy || accuracy < 100) return 17; // GPS level
    if (accuracy < 500) return 15; // Street level
    if (accuracy < 2000) return 13; // Neighborhood level
    if (accuracy < 10000) return 11; // City level
    return 9; // Regional level (e.g. 50km)
  }, [accuracy]);

  const handleRecenter = useCallback(() => {
    setRecenterTrigger((prev) => prev + 1);
  }, []);

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
                ? 'Sharing live location with caregivers'
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
              <p className="text-sm text-red-300 font-medium">{error}</p>
              <p className="text-xs text-red-400/70 mt-1">
                🔒 Hint: Ensure browser location permissions are enabled.
              </p>
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
            {isLowAccuracy && isTracking && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                Low Accuracy
              </span>
            )}
          </div>

          {/* Low accuracy warning */}
          {isLowAccuracy && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Approximate Location
                </p>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Your browser is reporting a wide area (±{Math.round(accuracy! / 1000)}km).
                This usually happens on desktop PCs without GPS.
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-slate-400">• Windows: Settings → Privacy → Location (On)</p>
                <p className="text-[10px] text-slate-400">• Browser: Click lock icon in URL bar → Allow Location</p>
              </div>
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
                zoom={dynamicZoom}
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
                      color: isLowAccuracy ? '#f59e0b' : '#10b981',
                      fillColor: isLowAccuracy ? '#f59e0b' : '#10b981',
                      fillOpacity: 0.1,
                      weight: 1.5,
                      dashArray: '4 4',
                    }}
                  />
                )}

                {/* Patient marker */}
                {customIcon && (
                  <Marker position={center} icon={isLowAccuracy ? lowAccIcon : customIcon}>
                    <Popup>
                      <div style={{ color: '#1e293b', minWidth: 160 }}>
                        <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                          📍 {isLowAccuracy ? 'Estimated Area' : 'Exact Location'}
                        </p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                          Accuracy: ±{accuracy ? Math.round(accuracy) : '?'}m
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

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