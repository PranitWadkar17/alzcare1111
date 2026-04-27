// components/caregiver/PatientMap.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Location } from '@/types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src || markerIcon2x,
  iconUrl: markerIcon.src || markerIcon,
  shadowUrl: markerShadow.src || markerShadow,
});

const onlineIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #10b981;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const offlineIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #f59e0b;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface PatientMapProps {
  patientId: string;
  patientName: string;
  location: Location | null;
  history: Location[];
  isOnline: boolean;
}

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);

  return null;
}

export function PatientMap({
  patientName,
  location,
  history,
  isOnline,
}: PatientMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-64 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading map...</span>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="w-full h-64 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">No location data available</p>
          <p className="text-sm text-slate-500">Patient hasn&apos;t shared location yet</p>
        </div>
      </div>
    );
  }

  const position: [number, number] = [location.lat, location.lng];
  
  const pathPositions: [number, number][] = history.length > 1 
    ? history.map((loc) => [loc.lat, loc.lng])
    : [];

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater lat={location.lat} lng={location.lng} />
        
        <Marker position={position} icon={isOnline ? onlineIcon : offlineIcon}>
          <Popup>
            <div className="text-gray-800">
              <strong>{patientName}</strong>
              <br />
              {isOnline ? '🟢 Online' : '🟡 Offline'}
              <br />
              Last seen: {new Date(location.timestamp).toLocaleTimeString()}
            </div>
          </Popup>
        </Marker>
        
        {pathPositions.length > 1 && (
          <Polyline
            positions={pathPositions}
            color="#10b981"
            weight={3}
            opacity={0.6}
          />
        )}
      </MapContainer>

      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm z-400">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span className="text-xs text-white">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
