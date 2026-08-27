import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface TravelStats {
  tripsCount: number | '--' | null;
  countriesCount: number | '--' | null;
  totalExpenses: number | '--' | null;
}

export const useUserTravelStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TravelStats>({
    tripsCount: null,
    countriesCount: null,
    totalExpenses: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    // If not authenticated or guest user, return empty/guest state immediately
    if (!user || user.isGuest) {
      setStats({
        tripsCount: 0,
        countriesCount: 0,
        totalExpenses: 0,
      });
      setIsLoading(false);
      return;
    }

    try {
      // 1. Get count of trips (exact count query for performance)
      const { count: tripsCount, error: tripsCountError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (tripsCountError) {
        throw tripsCountError;
      }

      if (tripsCount === 0 || tripsCount === null) {
        setStats({
          tripsCount: 0,
          countriesCount: 0,
          totalExpenses: 0,
        });
        setIsLoading(false);
        return;
      }

      // 2. Fetch only trip IDs and destinations for unique country count & expense sum queries
      const { data: tripsData, error: tripsDataError } = await supabase
        .from('trips')
        .select('id, destination')
        .eq('user_id', user.id);

      if (tripsDataError) {
        throw tripsDataError;
      }

      // Extract unique countries
      const uniqueCountries = new Set<string>();
      const tripIds: string[] = [];

      tripsData.forEach((trip) => {
        tripIds.push(trip.id);
        const dest = trip.destination;
        if (dest) {
          const country = extractCountry(dest);
          if (country) {
            uniqueCountries.add(country);
          }
        }
      });

      // 3. Fetch only amount from expenses for the user's trips
      let totalExp = 0;
      if (tripIds.length > 0) {
        const { data: expensesData, error: expensesDataError } = await supabase
          .from('expenses')
          .select('amount')
          .in('trip_id', tripIds);

        if (expensesDataError) {
          throw expensesDataError;
        }

        totalExp = expensesData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      }

      setStats({
        tripsCount: tripsCount,
        countriesCount: uniqueCountries.size,
        totalExpenses: totalExp,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching user travel stats from Supabase:', err);
      setError(err);
      setStats({
        tripsCount: '--',
        countriesCount: '--',
        totalExpenses: '--',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    fetchStats();

    if (!user || user.isGuest) {
      return;
    }

    // Set up Realtime subscriptions for 'trips' and 'expenses' tables to automatically refresh statistics
    const tripsChannel = supabase
      .channel('trips-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    const expensesChannel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [user, fetchStats]);

  return { ...stats, isLoading, error, refetch: fetchStats };
};

// Helper function to extract and normalize country names
const extractCountry = (destination: string): string => {
  if (!destination) return '';
  const parts = destination.split(',');
  const lastPart = parts[parts.length - 1].trim();

  // Dictionary mapping common city names to country names for duplicate resolution
  const cityToCountry: Record<string, string> = {
    'paris': 'France',
    'nice': 'France',
    'lyon': 'France',
    'marseille': 'France',
    'rome': 'Italy',
    'milan': 'Italy',
    'venice': 'Italy',
    'florence': 'Italy',
    'london': 'United Kingdom',
    'london, uk': 'United Kingdom',
    'manchester': 'United Kingdom',
    'new york': 'United States',
    'nyc': 'United States',
    'los angeles': 'United States',
    'chicago': 'United States',
    'tokyo': 'Japan',
    'kyoto': 'Japan',
    'osaka': 'Japan',
    'barcelona': 'Spain',
    'madrid': 'Spain',
    'berlin': 'Germany',
    'munich': 'Germany',
    'amsterdam': 'Netherlands',
    'delhi': 'India',
    'mumbai': 'India',
    'bangalore': 'India',
    'goa': 'India',
    'sydney': 'Australia',
    'melbourne': 'Australia',
    'toronto': 'Canada',
    'vancouver': 'Canada',
    'cairo': 'Egypt',
    'dubai': 'United Arab Emirates',
    'singapore': 'Singapore',
    'bangkok': 'Thailand',
    'phuket': 'Thailand',
    'bali': 'Indonesia',
    'santorini': 'Greece',
    'athens': 'Greece',
  };

  const key = lastPart.toLowerCase();
  if (cityToCountry[key]) {
    return cityToCountry[key];
  }
  
  const fullKey = destination.trim().toLowerCase();
  if (cityToCountry[fullKey]) {
    return cityToCountry[fullKey];
  }

  // Fallback: capitalize the first letter of the last token
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
};
