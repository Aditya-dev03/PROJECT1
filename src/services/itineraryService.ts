import { Itinerary, ItineraryDay } from '../types';
import { supabase } from '../lib/supabase';

export const itineraryService = {
  /**
   * Caches or uploads an itinerary to Supabase (if online/logged in) or local store fallback.
   */
  async saveItinerary(tripId: string, days: ItineraryDay[]): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session || !session.session) {
        // Fallback silently if guest mode or offline
        return false;
      }

      const payload: Record<string, any> = {
        trip_id: tripId,
        days_json: days,
      };

      const { error } = await supabase
        .from('itineraries')
        .upsert({
          ...payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'trip_id' });

      if (error) {
        if (error.code === 'PGRST204') {
          // Column mismatch in Supabase schema cache - retry with plain payload
          const { error: retryError } = await supabase
            .from('itineraries')
            .upsert(payload, { onConflict: 'trip_id' });
          if (!retryError) return true;
        }
        console.warn('Failed to sync itinerary to Supabase (relying on local storage):', error.message || error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Network offline or DB error during itinerary sync:', e);
      return false;
    }
  },

  /**
   * Loads an itinerary from Supabase.
   */
  async loadItinerary(tripId: string): Promise<ItineraryDay[] | null> {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('days_json')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data.days_json as ItineraryDay[];
    } catch {
      return null;
    }
  },
};
