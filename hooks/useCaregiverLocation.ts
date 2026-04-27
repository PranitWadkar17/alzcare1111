// hooks/useCaregiverLocation.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { Location } from '@/types';
import {
  getLatestLocation,
  getLocationHistory,
  subscribeToLocationUpdates,
} from '@/lib/location-service';

interface PatientLocation {
  patientId: string;
  patientName: string;
  location: Location | null;
  history: Location[];
  isOnline: boolean;
}

interface UseCaregiverLocationOptions {
  patientIds: string[];
  patientNames: Record<string, string>;
}

export function useCaregiverLocation({ patientIds, patientNames }: UseCaregiverLocationOptions) {
  const [patientLocations, setPatientLocations] = useState<Record<string, PatientLocation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const channelsRef = useRef<any[]>([]);

  const patientIdsStr = JSON.stringify(patientIds);
  const patientNamesStr = JSON.stringify(patientNames);

  useEffect(() => {
    const fetchInitialLocations = async () => {
      setIsLoading(true);
      const locations: Record<string, PatientLocation> = {};

      for (const patientId of patientIds) {
        try {
          const [latest, history] = await Promise.all([
            getLatestLocation(patientId),
            getLocationHistory(patientId),
          ]);

          locations[patientId] = {
            patientId,
            patientName: patientNames[patientId] || 'Unknown Patient',
            location: latest,
            history,
            isOnline: isLocationRecent(latest),
          };
        } catch (err) {
          console.error(`Error fetching location for patient ${patientId}:`, err);
          locations[patientId] = {
            patientId,
            patientName: patientNames[patientId] || 'Unknown Patient',
            location: null,
            history: [],
            isOnline: false,
          };
        }
      }

      setPatientLocations(locations);
      setIsLoading(false);
    };

    if (patientIds.length > 0) {
      fetchInitialLocations();
    } else {
      setIsLoading(false);
    }
  }, [patientIdsStr, patientNamesStr]);

  useEffect(() => {
    channelsRef.current.forEach((channel) => channel.unsubscribe());
    channelsRef.current = [];

    if (patientIds.length === 0) return;

    patientIds.forEach((patientId) => {
      const channel = subscribeToLocationUpdates(patientId, (newLocation) => {
        setPatientLocations((prev) => ({
          ...prev,
          [patientId]: {
            ...prev[patientId],
            patientId,
            patientName: patientNames[patientId] || prev[patientId]?.patientName || 'Unknown Patient',
            location: newLocation,
            isOnline: true,
          },
        }));
      });

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach((channel) => channel.unsubscribe());
      channelsRef.current = [];
    };
  }, [patientIdsStr, patientNamesStr]);

  useEffect(() => {
    const checkOnlineStatus = () => {
      setPatientLocations((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((patientId) => {
          updated[patientId] = {
            ...updated[patientId],
            isOnline: isLocationRecent(updated[patientId].location),
          };
        });
        return updated;
      });
    };

    const interval = setInterval(checkOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    patientLocations,
    isLoading,
    patients: Object.values(patientLocations),
  };
}

function isLocationRecent(location: Location | null): boolean {
  if (!location) return false;
  const locationTime = new Date(location.timestamp).getTime();
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return locationTime > twoMinutesAgo;
}