import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Trip, Member, ItineraryDay, Expense } from '../types';
import { Message } from '../context/ChatContext';
import {
  generateRawJoinCode,
  generateUniqueJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  formatTripInviteMessage,
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
} from './joinCodeEngine';
import { cloudSyncService, TripPackage } from './cloudSyncService';

export {
  generateRawJoinCode,
  generateUniqueJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  formatTripInviteMessage,
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
};

// In-memory fallback clipboard buffer
let inMemoryClipboard: string = '';

/**
 * Copies the join code to clipboard with standard Web Navigator API and fallback.
 */
export const copyJoinCodeToClipboard = async (joinCode: string): Promise<boolean> => {
  const cleanCode = normalizeJoinCode(joinCode);
  if (!cleanCode) return false;
  inMemoryClipboard = cleanCode;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cleanCode);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, using memory fallback:', err);
  }
  return true;
};

/**
 * Copies a full direct invite link (e.g. https://domain.com/?join=CODE) to clipboard.
 */
export const copyJoinLinkToClipboard = async (joinCode: string): Promise<boolean> => {
  const cleanCode = normalizeJoinCode(joinCode);
  if (!cleanCode) return false;
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://travora.app';
  const link = `${origin}/?join=${cleanCode}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write link failed:', err);
  }
  return true;
};

/**
 * Reads the current clipboard content.
 */
export const getJoinCodeFromClipboard = async (): Promise<string | null> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        // If text is a full URL like https://...?join=SANTO1, extract join param
        if (text.includes('join=')) {
          const match = text.match(/[?&]join=([A-Za-z0-9]+)/);
          if (match && match[1]) {
            const normalizedParam = normalizeJoinCode(match[1]);
            if (isValidJoinCode(normalizedParam)) return normalizedParam;
          }
        }
        const normalized = normalizeJoinCode(text);
        if (isValidJoinCode(normalized)) {
          return normalized;
        }
      }
    }
  } catch {
    // Fallback to in-memory clipboard
  }
  return inMemoryClipboard && isValidJoinCode(inMemoryClipboard) ? inMemoryClipboard : null;
};

/**
 * Triggers Web Share API or copies the invite message.
 */
export const shareTripInvite = async (
  trip: { name?: string; destination: string; dates?: string },
  joinCode: string
): Promise<boolean> => {
  const message = formatTripInviteMessage(trip, joinCode);
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://travora.app';
  const directLink = `${origin}/?join=${joinCode}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: `Join my trip to ${trip.destination}`,
        text: message,
        url: directLink,
      });
      return true;
    }
  } catch (err) {
    // Fallback: Copy to clipboard
    await copyJoinCodeToClipboard(joinCode);
    return true;
  }
  await copyJoinCodeToClipboard(joinCode);
  return true;
};

export interface TripLookupResult {
  id: string;
  name: string;
  destination: string;
  dates: string;
  image: string;
  budget: string;
  budgetAmount?: number;
  groupSize: string;
  interests: string[];
  joinCode: string;
  memberCount: number;
  creatorName?: string;
  creatorAvatar?: string;
  package?: TripPackage;
}

/**
 * Searches for an existing trip by 6-character join code across:
 * 1. Local cached trips
 * 2. Universal Global Cloud Relay (ntfy.sh / JSON sync)
 * 3. Supabase DB (if configured)
 */
export const lookupTripByJoinCode = async (
  code: string,
  currentUser?: any,
  cachedTrips: Trip[] = []
): Promise<TripLookupResult | null> => {
  const normalized = normalizeJoinCode(code);
  if (!normalized || normalized.length !== JOIN_CODE_LENGTH) {
    return null;
  }

  // 1. Check local cached trips first
  const localMatch = cachedTrips.find((t) => t.joinCode && normalizeJoinCode(t.joinCode) === normalized);
  if (localMatch) {
    return {
      id: localMatch.id,
      name: localMatch.name,
      destination: localMatch.destination,
      dates: localMatch.dates,
      image: localMatch.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      budget: localMatch.budget,
      budgetAmount: localMatch.budgetAmount,
      groupSize: localMatch.groupSize,
      interests: localMatch.interests || [],
      joinCode: localMatch.joinCode || normalized,
      memberCount: 2,
    };
  }

  // 2. Check Universal Global Cloud Relay
  try {
    const cloudPkg = await cloudSyncService.fetchTripPackageByJoinCode(normalized);
    if (cloudPkg && cloudPkg.trip) {
      return {
        id: cloudPkg.trip.id,
        name: cloudPkg.trip.name || `Trip to ${cloudPkg.trip.destination}`,
        destination: cloudPkg.trip.destination,
        dates: cloudPkg.trip.dates || '',
        image: cloudPkg.trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
        budget: cloudPkg.trip.budget || 'Standard',
        budgetAmount: cloudPkg.trip.budgetAmount,
        groupSize: cloudPkg.trip.groupSize || 'Friends',
        interests: cloudPkg.trip.interests || [],
        joinCode: cloudPkg.trip.joinCode || normalized,
        memberCount: cloudPkg.members ? cloudPkg.members.length : 2,
        creatorName: cloudPkg.creator?.name || 'Travel Buddy',
        creatorAvatar: cloudPkg.creator?.avatar,
        package: cloudPkg,
      };
    }
  } catch (err) {
    console.warn('[JOIN CODE] Global cloud relay lookup notice:', err);
  }

  // 3. Check Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data: dbTrip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('join_code', normalized)
        .maybeSingle();

      if (error) {
        console.warn('Database error looking up join code:', error);
      } else if (dbTrip) {
        return {
          id: dbTrip.id,
          name: dbTrip.name || `Trip to ${dbTrip.destination}`,
          destination: dbTrip.destination,
          dates: dbTrip.dates || '',
          image: dbTrip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
          budget: dbTrip.budget || 'Standard',
          budgetAmount: Number(dbTrip.budget_amount || 0),
          groupSize: dbTrip.group_size || 'Friends',
          interests: dbTrip.interests || [],
          joinCode: dbTrip.join_code,
          memberCount: 2,
        };
      }
    } catch (err) {
      console.warn('Supabase join code lookup failed:', err);
    }
  }

  return null;
};

export interface JoinTripSuccessPayload {
  trip: Trip;
  package?: TripPackage;
}

/**
 * Executes the join operation for a user joining a trip via join code.
 * Handles member registration, cloud broadcast, and returns the joined trip details.
 */
export const executeJoinTripByCode = async (
  code: string,
  currentUser: any,
  cachedTrips: Trip[] = [],
  onJoinedSuccess?: (payload: JoinTripSuccessPayload) => Promise<void> | void
): Promise<string> => {
  const normalized = normalizeJoinCode(code);
  if (!normalized) throw new Error('Invalid join code provided.');

  const lookup = await lookupTripByJoinCode(normalized, currentUser, cachedTrips);
  if (!lookup) {
    throw new Error('Trip not found. Please double check the 6-character code.');
  }

  const tripToAdd: Trip = {
    id: lookup.id,
    name: lookup.name,
    destination: lookup.destination,
    dates: lookup.dates,
    image: lookup.image,
    budget: lookup.budget,
    budgetAmount: lookup.budgetAmount,
    groupSize: lookup.groupSize,
    interests: lookup.interests,
    status: 'Active',
    joinCode: lookup.joinCode,
  };

  // Broadcast Member Joined event to Cloud Relay
  const newMemberInfo: Member = {
    id: currentUser?.id || ('m_' + Date.now().toString()),
    tripId: lookup.id,
    name: currentUser?.name || 'Traveler Friend',
    avatar: currentUser?.photo || '',
    email: currentUser?.email || '',
    role: 'Member',
  };

  cloudSyncService.broadcastTripEvent(lookup.joinCode, {
    type: 'MEMBER_JOINED',
    tripId: lookup.id,
    senderId: newMemberInfo.id,
    senderName: newMemberInfo.name,
    payload: newMemberInfo,
  });

  // If Supabase is available and user is authenticated
  if (isSupabaseConfigured && currentUser && !currentUser.isGuest) {
    try {
      await supabase.from('trip_members').insert({
        trip_id: lookup.id,
        user_id: currentUser.id,
        role: 'member',
      });
    } catch {
      // Ignore if already joined or table not ready
    }
  }

  const successPayload: JoinTripSuccessPayload = {
    trip: tripToAdd,
    package: lookup.package,
  };

  if (onJoinedSuccess) {
    await onJoinedSuccess(successPayload);
  }

  return lookup.id;
};
