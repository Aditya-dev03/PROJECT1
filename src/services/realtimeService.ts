import { Member } from '../types';

export interface MemberLocation {
  memberId: string;
  name: string;
  avatar: string;
  latitude: number;
  longitude: number;
  lastUpdated: string; // ISO String
  status: 'online' | 'offline';
  area: string;
}

type LiveLocationCallback = (locations: MemberLocation[]) => void;

class RealtimeService {
  private intervals: Record<string, NodeJS.Timeout> = {};

  /**
   * Simulates a Supabase Realtime channel subscription for member locations.
   * Generates location points centered around referenceCoords (if available) or Santorini fallback.
   */
  subscribeToLiveLocations(
    tripId: string,
    members: Member[],
    referenceCoords: { latitude: number; longitude: number } | null,
    onUpdate: LiveLocationCallback
  ) {
    this.unsubscribeFromLiveLocations(tripId);

    // Fallback coordinates (Santorini, Greece) if user GPS is off
    const baseCoords = referenceCoords || { latitude: 36.4166, longitude: 25.4324 };

    // Generate mock coordinates around the base coordinate
    let currentLocations: MemberLocation[] = members.map((member, index) => {
      // Define fixed initial offsets to make members spread out nicely
      const latOffset = (index === 0 ? 0.003 : index === 1 ? -0.004 : 0.002) + (Math.random() - 0.5) * 0.0005;
      const lngOffset = (index === 0 ? -0.003 : index === 1 ? 0.004 : 0.001) + (Math.random() - 0.5) * 0.0005;

      const areas = ['Oia Town Center', 'Fira Cliffside Path', 'Imerovigli Caldera', 'Amoudi Bay Marina', 'Kamari Black Beach'];
      const area = areas[index % areas.length];

      return {
        memberId: member.id,
        name: member.name,
        avatar: member.avatar,
        latitude: baseCoords.latitude + latOffset,
        longitude: baseCoords.longitude + lngOffset,
        lastUpdated: new Date().toISOString(),
        status: index % 2 === 0 ? 'online' : 'offline',
        area,
      };
    });

    onUpdate(currentLocations);

    // Simulate location updates/GPS drifting every 5 seconds
    const interval = setInterval(() => {
      currentLocations = currentLocations.map((loc) => {
        const isOnline = loc.status === 'online';

        // 10% chance to flip online/offline status
        const shouldToggleStatus = Math.random() < 0.1;
        const nextStatus = shouldToggleStatus
          ? (loc.status === 'online' ? 'offline' : 'online')
          : loc.status;

        if (isOnline && Math.random() < 0.6) {
          // Drifts latitude/longitude slightly (approx. 5-15 meters)
          const latMovement = (Math.random() - 0.5) * 0.0003;
          const lngMovement = (Math.random() - 0.5) * 0.0003;

          return {
            ...loc,
            latitude: loc.latitude + latMovement,
            longitude: loc.longitude + lngMovement,
            lastUpdated: new Date().toISOString(),
            status: nextStatus,
          };
        }

        return {
          ...loc,
          status: nextStatus,
        };
      });

      onUpdate(currentLocations);
    }, 5000);

    this.intervals[tripId] = interval;

    // Unsubscribe helper
    return () => {
      this.unsubscribeFromLiveLocations(tripId);
    };
  }

  unsubscribeFromLiveLocations(tripId: string) {
    if (this.intervals[tripId]) {
      clearInterval(this.intervals[tripId]);
      delete this.intervals[tripId];
    }
  }
}

export const realtimeService = new RealtimeService();
