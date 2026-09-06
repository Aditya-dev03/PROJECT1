import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Trip } from '../types';
import { usePersistedState } from '../hooks/usePersistence';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { generateUniqueJoinCode, normalizeJoinCode } from '../services/joinCodeService';
import { cloudSyncService, TripPackage } from '../services/cloudSyncService';

interface TripContextType {
  trips: Trip[];
  isLoaded: boolean;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<Trip>;
  addJoinedTrip: (trip: Trip) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  getTripById: (id: string) => Trip | undefined;
  refreshTrips: () => Promise<void>;
  regenerateJoinCode: (tripId: string) => Promise<string>;
  publishTripToCloud: (tripId: string) => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const SEED_TRIPS: Trip[] = [
  {
    id: '1',
    name: 'Summer in Santorini',
    destination: 'Santorini, Greece',
    dates: 'Oct 12 - Oct 18, 2026',
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

  // Self-healing migration: Ensure all trips have a status AND a guaranteed joinCode + publish to cloud
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

    // Seed public cloud sync for user's trips so friends can find them anytime
    updatedTrips.forEach(t => {
      if (t.joinCode) {
        const pkg: TripPackage = {
          trip: t,
          creator: {
            id: user?.id || 'creator',
            name: user?.name || 'Trip Host',
            avatar: user?.photo,
            email: user?.email,
          },
          updatedAt: new Date().toISOString(),
        };
        cloudSyncService.publishTripPackage(pkg);
      }
    });
  }, [isLoaded, trips.length]);

  // Fetch trips from Supabase if configured and user authenticated
  const fetchSupabaseTrips = useCallback(async () => {
    if (!isSupabaseConfigured || !user || user.isGuest) return;
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

        setTrips(prev => {
          // Merge avoiding duplicate IDs
          const existingMap = new Map(prev.map(p => [p.id, p]));
          mappedTrips.forEach(mt => existingMap.set(mt.id, mt));
          return Array.from(existingMap.values());
        });
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

  // Add a joined foreign trip
  const addJoinedTrip = useCallback((trip: Trip) => {
    setTrips(prev => {
      // Check if already in list
      const cleanCode = normalizeJoinCode(trip.joinCode || '');
      const exists = prev.some(
        t => t.id === trip.id || (cleanCode && normalizeJoinCode(t.joinCode || '') === cleanCode)
      );
      if (exists) {
        return prev.map(t =>
          (t.id === trip.id || (cleanCode && normalizeJoinCode(t.joinCode || '') === cleanCode))
            ? { ...t, ...trip }
            : t
        );
      }
      return [trip, ...prev];
    });
  }, [setTrips]);

  const publishTripToCloud = useCallback(async (tripId: string) => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip || !targetTrip.joinCode) return;

    const pkg: TripPackage = {
      trip: targetTrip,
      creator: {
        id: user?.id || 'creator',
        name: user?.name || 'Trip Host',
        avatar: user?.photo,
        email: user?.email,
      },
      updatedAt: new Date().toISOString(),
    };
    await cloudSyncService.publishTripPackage(pkg);
  }, [trips, user]);

  const addTrip = useCallback(async (tripData: Omit<Trip, 'id'>) => {
    const existingCodes = trips.map(t => t.joinCode).filter(Boolean) as string[];
    const joinCode = generateUniqueJoinCode(existingCodes);

    // Common trip object structure
    const newTrip: Trip = {
      ...tripData,
      id: Date.now().toString(),
      status: 'Active',
      joinCode,
      image: tripData.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
    };

    // 1. Immediately save to local state
    setTrips(prev => [newTrip, ...prev]);

    // 2. Publish to universal Cloud Relay so ANY friend can join immediately
    const tripPkg: TripPackage = {
      trip: newTrip,
      creator: {
        id: user?.id || 'creator_' + Date.now(),
        name: user?.name || 'Trip Host',
        avatar: user?.photo,
        email: user?.email,
      },
      updatedAt: new Date().toISOString(),
    };
    cloudSyncService.publishTripPackage(tripPkg);

    // 3. Supabase Sync (if configured and authenticated)
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        const { data: newTripDb, error: insertError } = await supabase
          .from('trips')
          .insert({
            name: tripData.name,
            destination: tripData.destination,
            budget: tripData.budget,
            budget_amount: tripData.budgetAmount,
            dates: tripData.dates,
            interests: tripData.interests,
            image: newTrip.image,
            group_size: tripData.groupSize,
            status: 'Active',
            join_code: joinCode,
            user_id: user.id,
          })
          .select()
          .single();

        if (!insertError && newTripDb) {
          const syncedTrip: Trip = {
            ...newTrip,
            id: newTripDb.id,
          };
          setTrips(prev => prev.map(t => t.id === newTrip.id ? syncedTrip : t));
          return syncedTrip;
        }
      } catch (err) {
        console.warn('Supabase trip insert fallback:', err);
      }
    }

    return newTrip;
  }, [user, trips, setTrips]);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    // Local Update
    let updatedTrip: Trip | undefined;
    setTrips(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          updatedTrip = { ...t, ...updates };
          return updatedTrip;
        }
        return t;
      });
      return next;
    });

    // Cloud Relay Sync & Event Broadcast
    if (updatedTrip && updatedTrip.joinCode) {
      const pkg: TripPackage = {
        trip: updatedTrip,
        creator: {
          id: user?.id || 'creator',
          name: user?.name || 'Trip Host',
          avatar: user?.photo,
          email: user?.email,
        },
        updatedAt: new Date().toISOString(),
      };
      cloudSyncService.publishTripPackage(pkg);
      cloudSyncService.broadcastTripEvent(updatedTrip.joinCode, {
        type: 'TRIP_UPDATED',
        tripId: id,
        payload: updates,
      });
    }

    // Supabase Sync
    if (isSupabaseConfigured && user && !user.isGuest) {
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

        await supabase.from('trips').update(dbUpdates).eq('id', id);
      } catch (err) {
        console.warn('Error updating trip in Supabase:', err);
      }
    }
  }, [user, setTrips]);

  const regenerateJoinCode = useCallback(async (tripId: string): Promise<string> => {
    const existingCodes = trips.map(t => t.joinCode).filter(Boolean) as string[];
    const newCode = generateUniqueJoinCode(existingCodes);

    // Update local state immediately
    let updatedTrip: Trip | undefined;
    setTrips(prev => {
      return prev.map(t => {
        if (t.id === tripId) {
          updatedTrip = { ...t, joinCode: newCode };
          return updatedTrip;
        }
        return t;
      });
    });

    // Cloud Relay Publish
    if (updatedTrip) {
      const pkg: TripPackage = {
        trip: updatedTrip,
        creator: {
          id: user?.id || 'creator',
          name: user?.name || 'Trip Host',
          avatar: user?.photo,
          email: user?.email,
        },
        updatedAt: new Date().toISOString(),
      };
      await cloudSyncService.publishTripPackage(pkg);
    }

    // Update Supabase if authenticated
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        await supabase.from('trips').update({ join_code: newCode }).eq('id', tripId);
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
    if (isSupabaseConfigured && user && !user.isGuest) {
      try {
        await supabase.from('trips').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting trip from Supabase:', err);
      }
    }
  }, [user, setTrips]);

  const getTripById = useCallback((id: string) => {
    return trips.find(trip => trip.id === id);
  }, [trips]);

  return (
    <TripContext.Provider
      value={{
        trips,
        isLoaded,
        addTrip,
        addJoinedTrip,
        updateTrip,
        deleteTrip,
        getTripById,
        refreshTrips,
        regenerateJoinCode,
        publishTripToCloud,
      }}
    >
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
