// hooks/useLocationTracker.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { saveLocation, cleanupOldLocations, LocationData } from '@/lib/location-service';

interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  lastUpdated: Date | null;
  isTracking: boolean;
  error: string | null;
}

interface UseLocationTrackerOptions {
  patientId: string;
  interval?: number; // Not strictly used with watchPosition but kept for API compat
  enabled?: boolean;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useLocationTracker({
  patientId,
  interval = 3000,
  enabled = true,
}: UseLocationTrackerOptions) {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    lastUpdated: null,
    isTracking: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const lastSavedRef = useRef<LocationData | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  const startTracking = useCallback(() => {
    if (!isMountedRef.current || !patientId || typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current !== null) return; // already tracking

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        if (!isMountedRef.current) return;

        const { latitude, longitude, accuracy } = position.coords;

        setState((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracy,
          lastUpdated: new Date(),
          isTracking: true,
          error: null,
        }));

        const now = Date.now();
        let shouldSave = true;

        if (lastSavedRef.current) {
          const dist = calculateDistance(
            lastSavedRef.current.lat,
            lastSavedRef.current.lng,
            latitude,
            longitude
          );
          
          // Save if moved > 20 meters, or if 2 minutes passed since last save to show live status
          if (dist < 20 && now - lastSavedTimeRef.current < 2 * 60 * 1000) {
            shouldSave = false;
          }
        }

        if (shouldSave) {
          const locData: LocationData = { lat: latitude, lng: longitude, accuracy };
          try {
            await saveLocation(patientId, locData);
            lastSavedRef.current = locData;
            lastSavedTimeRef.current = now;
          } catch (err) {
            console.error('Failed to save tracking location DB:', err);
          }
        }
      },
      (err) => {
        let errorMessage: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please allow location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'GPS is unavailable. Make sure location services are enabled on your device.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please check your connection and try again.';
            break;
          default:
            errorMessage = err.message || 'Failed to get location';
        }
        console.error('Location tracking error:', errorMessage);
        
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isTracking: false,
            error: errorMessage,
          }));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [patientId]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  const refreshLocation = useCallback(() => {
    stopTracking();
    setTimeout(() => {
      startTracking();
    }, 100);
  }, [stopTracking, startTracking]);

  const runCleanup = useCallback(async () => {
    if (!patientId) return;
    try {
      await cleanupOldLocations(patientId);
      console.log('Old locations cleaned up successfully');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, [patientId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !patientId) {
      stopTracking();
      return;
    }

    startTracking();
    runCleanup();

    cleanupIntervalRef.current = setInterval(runCleanup, 60 * 60 * 1000);

    return () => {
      isMountedRef.current = false;
      stopTracking();
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [enabled, patientId, startTracking, stopTracking, runCleanup]);

  return {
    ...state,
    startTracking,
    stopTracking,
    refreshLocation,
  };
}