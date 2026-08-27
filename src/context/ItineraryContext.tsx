import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Itinerary, ItineraryDay, Activity } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { itineraryService } from '../services/itineraryService';

interface ItineraryContextType {
  itineraries: Itinerary[];
  isLoaded: boolean;
  updateItinerary: (tripId: string, days: ItineraryDay[]) => void;
  getItineraryByTripId: (tripId: string) => Itinerary | undefined;
  addActivity: (tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => void;
  removeActivity: (tripId: string, dayId: string, activityId: string) => void;
  editActivity: (tripId: string, dayId: string, activityId: string, updates: Partial<Activity>) => void;
  deleteItineraryByTrip: (tripId: string) => void;
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

const SEED_ITINERARIES: Itinerary[] = [
  {
    id: 'it_1',
    tripId: '1',
    days: [
      {
        id: 'day-1',
        day: 'Day 1',
        activities: [
          { id: 'a1', time: '09:00 AM', name: 'Arrival at Santorini', icon: 'airplane-outline' },
          { id: 'a2', time: '12:00 PM', name: 'Hotel Check-in', icon: 'home-outline' },
          { id: 'a3', time: '07:00 PM', name: 'Sunset Dinner', icon: 'restaurant-outline' },
        ]
      },
      {
        id: 'day-2',
        day: 'Day 2',
        activities: [
          { id: 'a4', time: '10:00 AM', name: 'Oia Village Walk', icon: 'walk-outline' },
          { id: 'a5', time: '02:00 PM', name: 'Beach Time', icon: 'sunny-outline' },
        ]
      }
    ]
  }
];

export const ItineraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [itineraries, setItineraries, isLoaded] = usePersistedState<Itinerary[]>('@travora_itineraries', SEED_ITINERARIES);

  // Fetch all itineraries from Supabase
  const fetchSupabaseItineraries = useCallback(async () => {
    if (!user || user.isGuest) return;
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*');

      if (error) throw error;

      if (data) {
        const mappedItineraries: Itinerary[] = data.map((it: any) => ({
          id: it.trip_id,
          tripId: it.trip_id,
          days: it.days_json as ItineraryDay[],
        }));
        setItineraries(mappedItineraries);
      }
    } catch (err) {
      console.warn('Error fetching itineraries from Supabase:', err);
    }
  }, [user, setItineraries]);

  // Sync a single itinerary to Supabase
  const syncItinerary = useCallback(async (tripId: string, updatedDays: ItineraryDay[]) => {
    if (user && !user.isGuest) {
      await itineraryService.saveItinerary(tripId, updatedDays);
    }
  }, [user]);

  // Load from Supabase on mount or session change
  useEffect(() => {
    if (isLoaded && user && !user.isGuest) {
      fetchSupabaseItineraries();
    }
  }, [isLoaded, user, fetchSupabaseItineraries]);

  // Realtime subscription
  useEffect(() => {
    if (!user || user.isGuest) return;

    const channel = supabase
      .channel('public-itineraries-context-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itineraries' },
        () => {
          fetchSupabaseItineraries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSupabaseItineraries]);

  const getItineraryByTripId = useCallback((tripId: string) => {
    return itineraries.find(it => it.tripId === tripId);
  }, [itineraries]);

  const updateItinerary = useCallback((tripId: string, days: ItineraryDay[]) => {
    setItineraries(prev => {
      const exists = prev.find(it => it.tripId === tripId);
      if (exists) {
        return prev.map(it => it.tripId === tripId ? { ...it, days } : it);
      } else {
        return [...prev, { id: Date.now().toString(), tripId, days }];
      }
    });

    syncItinerary(tripId, days);
  }, [setItineraries, syncItinerary]);

  const addActivity = useCallback((tripId: string, dayId: string, activity: Omit<Activity, 'id'>) => {
    let finalDays: ItineraryDay[] = [];
    setItineraries(prev => {
      return prev.map(it => {
        if (it.tripId !== tripId) return it;
        const days = it.days.map(d => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            activities: [...(d.activities || []), { ...activity, id: Date.now().toString() }]
          };
        });
        finalDays = days;
        return { ...it, days };
      });
    });

    if (finalDays.length > 0) {
      syncItinerary(tripId, finalDays);
    }
  }, [setItineraries, syncItinerary]);

  const removeActivity = useCallback((tripId: string, dayId: string, activityId: string) => {
    let finalDays: ItineraryDay[] = [];
    setItineraries(prev => {
      return prev.map(it => {
        if (it.tripId !== tripId) return it;
        const days = it.days.map(d => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            activities: (d.activities || []).filter(a => a.id !== activityId)
          };
        });
        finalDays = days;
        return { ...it, days };
      });
    });

    if (finalDays.length > 0) {
      syncItinerary(tripId, finalDays);
    }
  }, [setItineraries, syncItinerary]);

  const editActivity = useCallback((tripId: string, dayId: string, activityId: string, updates: Partial<Activity>) => {
    let finalDays: ItineraryDay[] = [];
    setItineraries(prev => {
      return prev.map(it => {
        if (it.tripId !== tripId) return it;
        const days = it.days.map(d => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            activities: (d.activities || []).map(a => a.id === activityId ? { ...a, ...updates } : a)
          };
        });
        finalDays = days;
        return { ...it, days };
      });
    });

    if (finalDays.length > 0) {
      syncItinerary(tripId, finalDays);
    }
  }, [setItineraries, syncItinerary]);

  const deleteItineraryByTrip = useCallback((tripId: string) => {
    setItineraries(prev => prev.filter(it => it.tripId !== tripId));
  }, [setItineraries]);

  return (
    <ItineraryContext.Provider value={{ 
      itineraries, 
      isLoaded, 
      updateItinerary, 
      getItineraryByTripId,
      addActivity,
      removeActivity,
      editActivity,
      deleteItineraryByTrip
    }}>
      {children}
    </ItineraryContext.Provider>
  );
};

export const useItinerary = () => {
  const context = useContext(ItineraryContext);
  if (context === undefined) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
};
