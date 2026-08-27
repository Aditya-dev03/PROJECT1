import { useState, useEffect } from 'react';
import { Member } from '../types';
import { realtimeService, MemberLocation } from '../services/realtimeService';

export interface ExtendedMemberLocation extends MemberLocation {
  distanceStr: string;
  rawDistance: number;
}

export const useLiveLocation = (tripId: string, members: Member[]) => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [memberLocations, setMemberLocations] = useState<ExtendedMemberLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Haversine formula to calculate distance in km
  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (distanceInKm: number) => {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m away`;
    }
    return `${distanceInKm.toFixed(1)}km away`;
  };

  useEffect(() => {
    let isMounted = true;
    let watchId: number | null = null;
    let realtimeUnsubscribe: (() => void) | null = null;
    let currentReferenceCoords: { latitude: number; longitude: number } | null = null;

    const setupRealtimeSubscription = (referenceCoords: { latitude: number; longitude: number } | null) => {
      if (realtimeUnsubscribe) realtimeUnsubscribe();

      realtimeUnsubscribe = realtimeService.subscribeToLiveLocations(
        tripId,
        members,
        referenceCoords,
        (locations) => {
          if (!isMounted) return;

          const ref = currentReferenceCoords || { latitude: 36.4166, longitude: 25.4324 };

          const extendedLocations = locations.map((loc) => {
            const distance = getDistanceInKm(
              ref.latitude,
              ref.longitude,
              loc.latitude,
              loc.longitude
            );

            return {
              ...loc,
              distanceStr: formatDistance(distance),
              rawDistance: distance,
            };
          });

          extendedLocations.sort((a, b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            return a.rawDistance - b.rawDistance;
          });

          setMemberLocations(extendedLocations);
        }
      );
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          currentReferenceCoords = coords;
          setUserLocation(coords);
          setLoading(false);
          setupRealtimeSubscription(coords);
        },
        (err) => {
          console.warn('Geolocation fallback:', err.message);
          if (!isMounted) return;
          // Fallback coords (Santorini / default destination)
          const fallbackCoords = { latitude: 36.4166, longitude: 25.4324 };
          currentReferenceCoords = fallbackCoords;
          setUserLocation(fallbackCoords);
          setLoading(false);
          setupRealtimeSubscription(fallbackCoords);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          currentReferenceCoords = coords;
          setUserLocation(coords);
        },
        () => {},
        { enableHighAccuracy: false }
      );
    } else {
      const fallbackCoords = { latitude: 36.4166, longitude: 25.4324 };
      currentReferenceCoords = fallbackCoords;
      setUserLocation(fallbackCoords);
      setLoading(false);
      setupRealtimeSubscription(fallbackCoords);
    }

    return () => {
      isMounted = false;
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, [tripId, members.length]);

  return {
    userLocation,
    memberLocations,
    loading,
    error,
  };
};
