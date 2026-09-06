import { Trip, Member, ItineraryDay, Expense } from '../types';
import { Message } from '../context/ChatContext';
import { normalizeJoinCode } from './joinCodeEngine';

export interface TripPackage {
  trip: Trip;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  members?: Member[];
  itineraryDays?: ItineraryDay[];
  expenses?: Expense[];
  messages?: Message[];
  updatedAt: string;
}

export type RealtimeTripEventType =
  | 'MEMBER_JOINED'
  | 'CHAT_MESSAGE'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'ITINERARY_UPDATED'
  | 'TRIP_UPDATED';

export interface RealtimeTripEvent {
  id: string;
  type: RealtimeTripEventType;
  tripId: string;
  joinCode: string;
  senderId?: string;
  senderName?: string;
  payload: any;
  timestamp: string;
}

type EventListener = (event: RealtimeTripEvent) => void;

class CloudSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private activeStreams: Map<string, EventSource> = new Map();
  private pollIntervals: Map<string, any> = new Map();
  private processedEventIds = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('travora_global_sync');
        this.broadcastChannel.onmessage = (msgEvent) => {
          if (msgEvent.data && msgEvent.data.type && msgEvent.data.joinCode) {
            this.notifyListeners(msgEvent.data.joinCode, msgEvent.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed:', err);
      }
    }
  }

  private getTopic(joinCode: string): string {
    const clean = normalizeJoinCode(joinCode).toLowerCase();
    return `travora_cloud_trip_${clean}`;
  }

  /**
   * Publishes a full trip package to the global cloud relay
   * and local BroadcastChannel.
   */
  async publishTripPackage(tripPkg: TripPackage): Promise<boolean> {
    const cleanCode = normalizeJoinCode(tripPkg.trip.joinCode || '');
    if (!cleanCode) return false;

    const topic = this.getTopic(cleanCode);
    const payload = JSON.stringify({
      type: 'TRIP_PACKAGE_SYNC',
      joinCode: cleanCode,
      package: tripPkg,
      timestamp: new Date().toISOString(),
    });

    let success = false;

    // 1. Publish to global cloud relay (ntfy.sh)
    try {
      const response = await fetch(`https://ntfy.sh/${topic}?poll=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': `Travora Trip: ${cleanCode}`,
        },
        body: payload,
      });
      if (response.ok) {
        success = true;
      }
    } catch (err) {
      console.warn('[CLOUD SYNC] Global cloud relay publish warning:', err);
    }

    // 2. Broadcast via BroadcastChannel (for local tabs/windows)
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'TRIP_PACKAGE_SYNC',
          joinCode: cleanCode,
          package: tripPkg,
        });
      }
    } catch (err) {
      console.warn('[CLOUD SYNC] Local BroadcastChannel error:', err);
    }

    // 3. Fallback: Save to LocalStorage registry of public trips
    try {
      if (typeof window !== 'undefined') {
        const storedRegistry = JSON.parse(localStorage.getItem('@travora_public_trips') || '{}');
        storedRegistry[cleanCode] = tripPkg;
        localStorage.setItem('@travora_public_trips', JSON.stringify(storedRegistry));
      }
    } catch {
      // Ignore storage errors
    }

    return success;
  }

  /**
   * Fetches a full trip package by join code from local storage or global cloud relay.
   */
  async fetchTripPackageByJoinCode(joinCode: string): Promise<TripPackage | null> {
    const cleanCode = normalizeJoinCode(joinCode);
    if (!cleanCode) return null;

    // 1. Check local public trips registry first
    try {
      if (typeof window !== 'undefined') {
        const storedRegistry = JSON.parse(localStorage.getItem('@travora_public_trips') || '{}');
        if (storedRegistry[cleanCode]) {
          return storedRegistry[cleanCode];
        }
      }
    } catch {
      // Ignore
    }

    // 2. Check global cloud relay
    try {
      const topic = this.getTopic(cleanCode);
      const url = `https://ntfy.sh/${topic}/json?poll=1&since=all`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const text = await response.text();
        // ntfy returns newline-delimited JSON
        const lines = text.trim().split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const entry = JSON.parse(lines[i]);
            if (entry.message) {
              const parsedMsg = typeof entry.message === 'string' ? JSON.parse(entry.message) : entry.message;
              if (parsedMsg.package && parsedMsg.package.trip) {
                return parsedMsg.package as TripPackage;
              }
            }
          } catch {
            // Continue parsing previous entries
          }
        }
      }
    } catch (err) {
      console.warn('[CLOUD SYNC] Error reading from global cloud relay:', err);
    }

    return null;
  }

  /**
   * Broadcasts a real-time event (e.g. Chat Message, Member Joined, Expense Added)
   * to all connected devices for this trip.
   */
  async broadcastTripEvent(joinCode: string, event: Omit<RealtimeTripEvent, 'id' | 'timestamp' | 'joinCode'>): Promise<void> {
    const cleanCode = normalizeJoinCode(joinCode);
    if (!cleanCode) return;

    const fullEvent: RealtimeTripEvent = {
      ...event,
      id: 'ev_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
      joinCode: cleanCode,
      timestamp: new Date().toISOString(),
    };

    this.processedEventIds.add(fullEvent.id);

    // 1. BroadcastChannel (immediate same-device delivery)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullEvent);
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. Global Cloud Relay (multi-device delivery)
    const topic = this.getTopic(cleanCode);
    try {
      await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      });
    } catch (err) {
      console.warn('[CLOUD SYNC] Broadcast event error:', err);
    }
  }

  /**
   * Subscribes to real-time events for a specific trip join code.
   * Works across different computers and mobile devices.
   */
  subscribeToTripRealtime(joinCode: string, callback: EventListener): () => void {
    const cleanCode = normalizeJoinCode(joinCode);
    if (!cleanCode) return () => {};

    if (!this.listeners.has(cleanCode)) {
      this.listeners.set(cleanCode, new Set());
    }
    this.listeners.get(cleanCode)!.add(callback);

    const topic = this.getTopic(cleanCode);

    // Setup EventSource / SSE if not already active
    if (!this.activeStreams.has(cleanCode) && typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        const streamUrl = `https://ntfy.sh/${topic}/sse`;
        const es = new EventSource(streamUrl);

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.message) {
              const eventData: RealtimeTripEvent = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
              if (eventData && eventData.id && !this.processedEventIds.has(eventData.id)) {
                this.processedEventIds.add(eventData.id);
                this.notifyListeners(cleanCode, eventData);
              }
            }
          } catch {
            // Ignore malformed message
          }
        };

        es.onerror = () => {
          // EventSource will automatically attempt to reconnect
        };

        this.activeStreams.set(cleanCode, es);
      } catch (err) {
        console.warn('[CLOUD SYNC] EventSource failed, falling back to polling:', err);
      }
    }

    // Secondary lightweight polling fallback (every 4 seconds) to ensure reliability
    if (!this.pollIntervals.has(cleanCode)) {
      let lastTime = Math.floor(Date.now() / 1000) - 10;
      const pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=${lastTime}`);
          if (res.ok) {
            const text = await res.text();
            const lines = text.trim().split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (entry.time) {
                  lastTime = Math.max(lastTime, entry.time);
                }
                if (entry.message) {
                  const eventData = typeof entry.message === 'string' ? JSON.parse(entry.message) : entry.message;
                  if (eventData && eventData.id && !this.processedEventIds.has(eventData.id)) {
                    this.processedEventIds.add(eventData.id);
                    this.notifyListeners(cleanCode, eventData);
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        } catch {
          // Ignore network errors in polling
        }
      }, 4000);

      this.pollIntervals.set(cleanCode, pollTimer);
    }

    return () => {
      const set = this.listeners.get(cleanCode);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(cleanCode);
          // Clean up stream
          const stream = this.activeStreams.get(cleanCode);
          if (stream) {
            stream.close();
            this.activeStreams.delete(cleanCode);
          }
          // Clean up poller
          const timer = this.pollIntervals.get(cleanCode);
          if (timer) {
            clearInterval(timer);
            this.pollIntervals.delete(cleanCode);
          }
        }
      }
    };
  }

  private notifyListeners(joinCode: string, event: RealtimeTripEvent) {
    const cleanCode = normalizeJoinCode(joinCode);
    const set = this.listeners.get(cleanCode);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error('[CLOUD SYNC] Listener callback error:', err);
        }
      });
    }
  }
}

export const cloudSyncService = new CloudSyncService();
