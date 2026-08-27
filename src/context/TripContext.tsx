import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Trip } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { generateUniqueJoinCode, normalizeJoinCode } from '../services/joinCodeService';

interface TripContextType {
  trips: Trip[];
  isLoaded: boolean;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<Trip>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  getTripById: (id: string) => Trip | undefined;
  refreshTrips: () => Promise<void>;
  regenerateJoinCode: (tripId: string) => Promise<string>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const SEED_TRIPS: Trip[] = [
  {
    id: '1',
    name: 'Summer in Santorini',
    destination: 'Santorini, Greece',
    dates: 'Oct 12 - Oct 18, 2024',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    budget: 'Luxury',
    budgetAmount: 5000,
    groupSize: 'Friends',
    interests: ['Beaches', 'Cafes'],
    status: 'Active',
    joinCode: 'SANTO1',
  }
];

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips, isLoaded] = usePersistedState<Trip[]>('@travora_trips', SEED_TRIPS);

  // Self-healing migration: Ensure all trips have a status AND a guaranteed joinCode
  useEffect(() => {
    if (!isLoaded) return;

    let hasChanges = false;
    const existingCodes = trips.map(t => t.joinCode).filter(Boolean) as string[];

    const updatedTrips = trips.map(t => {
      let changed = false;
      const tripCopy = { ...t };

      if (!tripCopy.status) {
        tripCopy.status = 'Active';
        changed = true;
      }

      if (!tripCopy.joinCode || tripCopy.joinCode.trim().length === 0) {
        const newCode = generateUniqueJoinCode(existingCodes);
        existingCodes.push(newCode);
        tripCopy.joinCode = newCode;
        changed = true;
      }

      if (changed) hasChanges = true;
      return tripCopy;
    });

    if (hasChanges) {
      setTrips(updatedTrips);
    }
  }, [isLoaded, trips.length]);

  // Fetch trips from Supabase if logged in
  const fetchSupabaseTrips = useCallback(async () => {
    if (!user || user.isGuest) return;
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedTrips: Trip[] = data.map(t => ({
          id: t.id,
          name: t.name || `Trip to ${t.destination}`,
          destination: t.destination,
          budget: t.budget || 'Economy',
          budgetAmount: Number(t.budget_amount || 0),
          dates: t.dates || '',
          interests: t.interests || [],
          image: t.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          groupSize: t.group_size || 'Solo',
          status: t.status || 'Active',
          joinCode: t.join_code || generateUniqueJoinCode(),
        }));
        setTrips(mappedTrips);
      }
    } catch (err) {
      console.warn('Error fetching trips from Supabase, relying on cache:', err);
    }
  }, [user, setTrips]);

  // Refresh trips manually (e.g. after joining a trip)
  const refreshTrips = useCallback(async () => {
    await fetchSupabaseTrips();
  }, [fetchSupabaseTrips]);

  // Fetch on mount or when user session changes
  useEffect(() => {
    if (isLoaded && user && !user.isGuest) {
      fetchSupabaseTrips();
    }
  }, [isLoaded, user, fetchSupabaseTrips]);

  // Realtime listener for trip changes
  useEffect(() => {
    if (!user || user.isGuest) return;

    const tripsChannel = supabase
      .channel('public-trips-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          fetchSupabaseTrips();
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel('public-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members' },
        () => {
          fetchSupabaseTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [user, fetchSupabaseTrips]);

  const addTrip = useCallback(async (tripData: Omit<Trip, 'id'>) => {
    const existingCodes = trips.map(t => t.joinCode).filter(Boolean) as string[];

    // Guest Mode
    if (!user || user.isGuest) {
      const joinCode = generateUniqueJoinCode(existingCodes);
      const newTrip: Trip = {
        ...tripData,
        id: Date.now().toString(),
        status: 'Active',
        joinCode,
        image: tripData.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
      };
      setTrips(prev => [newTrip, ...prev]);
      return newTrip;
    }

    // Supabase Mode
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let joinCode = generateUniqueJoinCode(existingCodes);

      try {
        // Double check uniqueness in Supabase table
        const { data: existingDbCode } = await supabase
          .from('trips')
          .select('id')
          .eq('join_code', joinCode)
          .maybeSingle();

        if (existingDbCode) {
          existingCodes.push(joinCode);
          continue; // collision in DB, pick another code
        }

        const { data: newTripDb, error: insertError } = await supabase
          .from('trips')
          .insert({
            name: tripData.name,
            destination: tripData.destination,
            budget: tripData.budget,
            budget_amount: tripData.budgetAmount,
            dates: tripData.dates,
            interests: tripData.interests,
            image: tripData.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
            group_size: tripData.groupSize,
            status: 'Active',
            join_code: joinCode,
            user_id: user.id
          })
          .select()
          .single();

        if (insertError) {
          // If unique constraint violation on join_code (Postgres error 23505), retry with new code
          if (insertError.code === '23505') {
            console.warn(`Join code collision on ${joinCode}, retrying attempt ${attempt + 1}...`);
            existingCodes.push(joinCode);
            continue;
          }
          throw insertError;
        }

        const newTrip: Trip = {
          id: newTripDb.id,
          name: newTripDb.name,
          destination: newTripDb.destination,
          budget: newTripDb.budget,
          budgetAmount: Number(newTripDb.budget_amount),
          dates: newTripDb.dates,
          interests: newTripDb.interests,
          image: newTripDb.image,
          groupSize: newTripDb.group_size,
          status: newTripDb.status,
          joinCode: newTripDb.join_code,
        };

        setTrips(prev => [newTrip, ...prev]);
        return newTrip;
      } catch (err: any) {
        if (attempt === MAX_ATTEMPTS - 1) {
          console.warn('Failed to insert trip to Supabase after retries, creating locally:', err);
          // Fallback to local
          const fallbackTrip: Trip = {
            ...tripData,
            id: Date.now().toString(),
            status: 'Active',
            joinCode: generateUniqueJoinCode(existingCodes),
            image: tripData.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
          };
          setTrips(prev => [fallbackTrip, ...prev]);
          return fallbackTrip;
        }
      }
    }

    // Final fallback safeguard
    const finalFallbackTrip: Trip = {
      ...tripData,
      id: Date.now().toString(),
      status: 'Active',
      joinCode: generateUniqueJoinCode(existingCodes),
      image: tripData.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
    };
    setTrips(prev => [finalFallbackTrip, ...prev]);
    return finalFallbackTrip;
  }, [user, trips, setTrips]);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    // Local Update
    setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // Supabase Sync
    if (user && !user.isGuest) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
        if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
        if (updates.budgetAmount !== undefined) dbUpdates.budget_amount = updates.budgetAmount;
        if (updates.dates !== undefined) dbUpdates.dates = updates.dates;
        if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
        if (updates.image !== undefined) dbUpdates.image = updates.image;
        if (updates.groupSize !== undefined) dbUpdates.group_size = updates.groupSize;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.joinCode !== undefined) dbUpdates.join_code = updates.joinCode;

        const { error } = await supabase
          .from('trips')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.warn('Error updating trip in Supabase:', err);
      }
    }
  }, [user, setTrips]);

  const regenerateJoinCode = useCallback(async (tripId: string): Promise<string> => {
    const existingCodes = trips.map(t => t.joinCode).filter(Boolean) as string[];
    const newCode = generateUniqueJoinCode(existingCodes);

    // Update local state immediately
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, joinCode: newCode } : t));

    // Update Supabase if authenticated
    if (user && !user.isGuest) {
      try {
        const { error } = await supabase
          .from('trips')
          .update({ join_code: newCode })
          .eq('id', tripId);

        if (error) throw error;
      } catch (err) {
        console.warn('Error updating regenerated join code in Supabase:', err);
      }
    }

    return newCode;
  }, [user, trips, setTrips]);

  const deleteTrip = useCallback(async (id: string) => {
    // Local Update
    setTrips(prev => prev.filter(trip => trip.id !== id));

    // Supabase Sync
    if (user && !user.isGuest) {
      try {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.warn('Error deleting trip from Supabase:', err);
      }
    }
  }, [user, setTrips]);

  const getTripById = useCallback((id: string) => {
    return trips.find(trip => trip.id === id);
  }, [trips]);

  return (
    <TripContext.Provider value={{ trips, isLoaded, addTrip, updateTrip, deleteTrip, getTripById, refreshTrips, regenerateJoinCode }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};

