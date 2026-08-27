import { supabase } from '../lib/supabase';
import { Trip } from '../types';
import {
  generateRawJoinCode,
  generateUniqueJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  formatTripInviteMessage,
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
} from './joinCodeEngine';

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
 * Reads the current clipboard content.
 */
export const getJoinCodeFromClipboard = async (): Promise<string | null> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
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
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: `Join my trip to ${trip.destination}`,
        text: message,
        url: window.location.origin,
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
  groupSize: string;
  interests: string[];
  joinCode: string;
  memberCount: number;
}

/**
 * Searches for an existing trip by 6-character join code.
 */
export const lookupTripByJoinCode = async (
  code: string,
  currentUser: any,
  cachedTrips: Trip[] = []
): Promise<TripLookupResult | null> => {
  const normalized = normalizeJoinCode(code);
  if (!normalized || normalized.length !== JOIN_CODE_LENGTH) {
    return null;
  }

  // 1. Check local cached trips
  const localMatch = cachedTrips.find((t) => t.joinCode && normalizeJoinCode(t.joinCode) === normalized);
  if (localMatch) {
    return {
      id: localMatch.id,
      name: localMatch.name,
      destination: localMatch.destination,
      dates: localMatch.dates,
      image: localMatch.image,
      budget: localMatch.budget,
      groupSize: localMatch.groupSize,
      interests: localMatch.interests || [],
      joinCode: localMatch.joinCode || normalized,
      memberCount: 2,
    };
  }

  // 2. Lookup in Supabase
  try {
    const { data: dbTrip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('join_code', normalized)
      .maybeSingle();

    if (error) {
      console.warn('Database error looking up join code:', error);
      return null;
    }

    if (dbTrip) {
      return {
        id: dbTrip.id,
        name: dbTrip.name || `Trip to ${dbTrip.destination}`,
        destination: dbTrip.destination,
        dates: dbTrip.dates || '',
        image: dbTrip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
        budget: dbTrip.budget || 'Standard',
        groupSize: dbTrip.group_size || 'Friends',
        interests: dbTrip.interests || [],
        joinCode: dbTrip.join_code,
        memberCount: 2,
      };
    }
  } catch (err) {
    console.warn('Supabase join code lookup failed:', err);
  }

  return null;
};

/**
 * Executes the join operation for a user joining a trip via join code.
 */
export const executeJoinTripByCode = async (
  code: string,
  currentUser: any,
  cachedTrips: Trip[] = [],
  onJoinedSuccess?: (tripId: string) => Promise<void>
): Promise<string> => {
  const normalized = normalizeJoinCode(code);
  if (!normalized) throw new Error('Invalid join code provided.');

  const lookup = await lookupTripByJoinCode(normalized, currentUser, cachedTrips);
  if (!lookup) {
    throw new Error('Trip not found. Please double check the code.');
  }

  // If Supabase is available and user is authenticated
  if (currentUser && !currentUser.isGuest) {
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

  if (onJoinedSuccess) {
    await onJoinedSuccess(lookup.id);
  }

  return lookup.id;
};
