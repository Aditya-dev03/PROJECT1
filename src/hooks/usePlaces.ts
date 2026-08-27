import { useState, useCallback } from 'react';
import { PlaceDetails } from '../types';
import { placesService } from '../services/placesService';

export const usePlaces = () => {
  const [places, setPlaces] = useState<PlaceDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async (destination: string, category: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await placesService.searchPlaces(destination, category);
      setPlaces(results);
      return results;
    } catch (err: any) {
      setError(err?.message || 'Failed to search places');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    places,
    loading,
    error,
    fetchPlaces,
  };
};
