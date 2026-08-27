import { useState, useCallback } from 'react';
import { Trip, ItineraryDay } from '../types';
import { itineraryEngine, calculateTripDays } from '../services/itinerary/itineraryEngine';
import { itineraryService } from '../services/itineraryService';

export const useItineraryGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generateItinerary = useCallback(async (trip: Trip): Promise<ItineraryDay[]> => {
    setLoading(true);
    setError(null);
    setLoadingMessage('Finding top-rated places...');

    try {
      const numDays = calculateTripDays(trip.dates);
      const selectedInterests = trip.interests || [];

      console.log(`\n==================================================`);
      console.log(`[TRIP INPUT]`);
      console.log(`Destination:             ${trip.destination}`);
      console.log(`Dates:                   ${trip.dates || 'Not specified'}`);
      console.log(`Number of days:          ${numDays}`);
      console.log(`Selected interests:      [ ${selectedInterests.join(', ')} ]`);
      console.log(`==================================================\n`);

      if (selectedInterests.length === 0) {
        throw new Error("Please select at least one type of place you'd like to visit.");
      }

      const days = await itineraryEngine.generateItinerary(trip);

      setLoadingMessage('Saving your travel plan...');
      await itineraryService.saveItinerary(trip.id, days);

      setLoading(false);
      return days;
    } catch (err: any) {
      console.error('Failed to generate full travel plan:', err);
      setLoading(false);
      const userMessage = err?.message || 'Error occurred while generating itinerary. Please try again.';
      setError(userMessage);
      return [];
    }
  }, []);

  return {
    generateItinerary,
    loading,
    loadingMessage,
    error,
  };
};
