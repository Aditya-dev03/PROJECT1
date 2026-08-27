import { Trip, ItineraryDay, Activity, PlaceDetails, PlaceCategory } from '../types';
import { geminiService } from './geminiService';
import { GEMINI_MODEL } from '../constants/aiConfig';

// Distance helper
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const aiPlannerService = {
  /**
   * Generates a dynamic, structured itinerary using Foursquare-retrieved places and gemini-3.5-flash-lite intelligence.
   */
  async generateAIItinerary(trip: Trip, places: PlaceDetails[]): Promise<ItineraryDay[]> {
    if (!places || places.length === 0) {
      throw new Error(`No real locations available to construct an itinerary in "${trip.destination}". Please try another city.`);
    }

    const apiKey = geminiService.getApiKey();
    if (!apiKey) {
      console.warn('[AI Planner] Gemini API key is missing. Falling back to deterministic geographic rule planner.');
      return this.generateDeterministicPlan(trip, places);
    }

    try {
      const simplifiedPlaces = places.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        categories: p.categories,
        priceLevel: p.priceLevel,
      }));

      const interestsContext = trip.interests && trip.interests.length > 0
        ? `Selected Interests: ${trip.interests.join(', ')}`
        : '';

      // Standard logging
      console.log(`[AI Planner] Using Gemini`);
      console.log(`[AI Planner] Model: ${GEMINI_MODEL}`);
      console.log(`[AI Planner] Destination: ${trip.destination} (${simplifiedPlaces.length} places provided)`);
      console.log(`[AI Planner] Generating itinerary...`);

      const systemPrompt = `You are a world-class travel curator and AI planner for Travora.
Your task is to build a highly optimized, geographically synchronized 3-day travel itinerary using ONLY the real places provided in the database below.

CRITICAL RULES:
1. Do NOT invent fake places. Use ONLY the 'id' of the places provided in the user's database.
2. PRIORITIZE the user's selected interests. If they selected Monuments, Museums, and Restaurants — focus the itinerary on those. Avoid unrelated categories unless absolutely necessary.
3. Do NOT repeat the same category in successive time slots. Distribute activity types naturally throughout the day.
4. Group nearby places together to avoid unrealistic map routes. Optimize routes day-by-day.
5. Organize each day into exactly three time slots:
   - "09:00 AM" (Morning): Prioritize cafes, parks, landmarks, temples, cultural sites, or breakfast spots matching user interests.
   - "01:00 PM" (Afternoon): Prioritize the user's primary interests (monuments, museums, shopping, beaches, etc.) and lunch spots.
   - "06:00 PM" (Evening): Prioritize restaurants, bars, nightlife, local markets, or evening activities matching user interests.
6. Output ONLY a valid JSON object matching the following structure:
{
  "days": [
    {
      "day": "Day 1",
      "date": "Day 1 Explore",
      "activities": [
        {
          "time": "09:00 AM",
          "placeId": "string (matching the exact 'id' from the provided database)",
          "note": "A highly specific, contextual note on why this place fits the user's selected interests and travel style."
        },
        {
          "time": "01:00 PM",
          "placeId": "string (matching the exact 'id' from the provided database)",
          "note": "A highly specific note matching the user's interests."
        },
        {
          "time": "06:00 PM",
          "placeId": "string (matching the exact 'id' from the provided database)",
          "note": "A highly specific note matching the user's interests."
        }
      ]
    }
  ]
}`;

      const userPrompt = `Trip Destination: ${trip.destination}
${interestsContext}
Trip Budget: ₹${trip.budgetAmount?.toLocaleString('en-IN') || trip.budget}
Available Real Venues Database: ${JSON.stringify(simplifiedPlaces)}`;

      const parsed = await geminiService.generateStructuredJSON(systemPrompt, userPrompt);
      const daysData = parsed.days || parsed.itinerary || [];

      if (!Array.isArray(daysData) || daysData.length === 0) {
        throw new Error('Gemini returned an invalid itinerary response (empty or non-array days).');
      }

      let totalActivitiesCount = 0;

      const mappedDays: ItineraryDay[] = daysData.map((dayObj: any, dayIdx: number) => {
        const rawActivities = dayObj.activities || [];
        totalActivitiesCount += rawActivities.length;

        const activities = rawActivities.map((act: any, actIdx: number) => {
          // Double check the place exists, otherwise log problem & fallback to real place in list
          let place = places.find((p) => p.id === act.placeId);
          if (!place) {
            console.warn(`[GEMINI] Unknown placeId returned by model: "${act.placeId}". Falling back to place at index ${actIdx % places.length}`);
            place = places[actIdx % places.length];
          }

          let icon = 'map-outline';
          const catStr = (place.categories || []).join(' ').toLowerCase();
          if (catStr.includes('restaurant') || catStr.includes('food') || catStr.includes('dine')) icon = 'restaurant-outline';
          else if (catStr.includes('cafe') || catStr.includes('coffee') || catStr.includes('tea')) icon = 'cafe-outline';
          else if (catStr.includes('hotel') || catStr.includes('lodging') || catStr.includes('stay')) icon = 'bed-outline';
          else if (catStr.includes('beach') || catStr.includes('coast') || catStr.includes('water')) icon = 'sunny-outline';
          else if (catStr.includes('art') || catStr.includes('museum') || catStr.includes('historic')) icon = 'camera-outline';
          else if (catStr.includes('shopping') || catStr.includes('mall') || catStr.includes('store')) icon = 'cart-outline';

          return {
            id: `act-${dayIdx}-${actIdx}-${Date.now()}`,
            time: act.time || (actIdx === 0 ? '09:00 AM' : actIdx === 1 ? '01:00 PM' : '06:00 PM'),
            name: place.name,
            icon,
            location: place.address,
            category: (place.categories[0] as PlaceCategory) || 'attraction',
            rating: place.rating ?? undefined,
            estimatedCost: place.priceLevel || '$$',
            description: place.description || 'Stunning environment with dynamic local appeal.',
            photo: place.photos[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
            coordinates: { latitude: place.latitude, longitude: place.longitude },
            note: act.note || 'Perfect local hotspot recommendation.',
            placeDetails: place,
          };
        });

        return {
          id: `day-${dayIdx}-${Date.now()}`,
          day: dayObj.day || `Day ${dayIdx + 1}`,
          date: dayObj.date || `Exploring ${trip.destination}`,
          activities,
        };
      });

      console.log(`[AI Planner] Parsed itinerary successfully. Days: ${mappedDays.length}, Activities: ${totalActivitiesCount}`);
      return mappedDays;
    } catch (error: any) {
      console.error(`[AI Planner] Gemini generation failed: ${error?.message || error}`);
      console.warn('[AI Planner] Falling back to deterministic planner due to error.');
      return this.generateDeterministicPlan(trip, places);
    }
  },

  /**
   * Deterministic smart sequencer to ensure we always produce a beautiful itinerary
   * with geographic clustering and logical category-to-time mapping.
   */
  generateDeterministicPlan(trip: Trip, places: PlaceDetails[]): ItineraryDay[] {
    const days: ItineraryDay[] = [];
    const daysCount = 3;
    const timeSlots = ['09:00 AM', '01:00 PM', '06:00 PM'];

    // Categorize places to easily map to morning/afternoon/evening
    const cafesAndLandmarks = places.filter(p => {
      const cats = p.categories.join(' ').toLowerCase();
      return cats.includes('cafe') || cats.includes('coffee') || cats.includes('park') || cats.includes('beach') || cats.includes('landmark');
    });

    const attractionsAndShopping = places.filter(p => {
      const cats = p.categories.join(' ').toLowerCase();
      return cats.includes('museum') || cats.includes('attraction') || cats.includes('art') || cats.includes('shopping') || cats.includes('mall');
    });

    const foodAndNightlife = places.filter(p => {
      const cats = p.categories.join(' ').toLowerCase();
      return cats.includes('restaurant') || cats.includes('food') || cats.includes('bar') || cats.includes('nightlife') || cats.includes('club');
    });

    const usedPlaceIds = new Set<string>();

    for (let d = 0; d < daysCount; d++) {
      const activities: Activity[] = [];
      let lastCoords: { latitude: number; longitude: number } | null = null;

      for (let s = 0; s < timeSlots.length; s++) {
        // Choose suitable candidates based on slot
        let candidatesPool = attractionsAndShopping;
        if (s === 0) candidatesPool = cafesAndLandmarks.length > 0 ? cafesAndLandmarks : places;
        else if (s === 1) candidatesPool = attractionsAndShopping.length > 0 ? attractionsAndShopping : places;
        else if (s === 2) candidatesPool = foodAndNightlife.length > 0 ? foodAndNightlife : places;

        // Filter out already used places if possible
        let unused = candidatesPool.filter(p => !usedPlaceIds.has(p.id));
        if (unused.length === 0) {
          unused = places.filter(p => !usedPlaceIds.has(p.id));
        }
        if (unused.length === 0) {
          unused = places; // Fallback to reuse
        }

        // Find the geographically closest candidate to lastCoords to avoid long routes
        let candidate = unused[0];
        if (lastCoords && unused.length > 1) {
          let minDistance = Infinity;
          for (const p of unused) {
            const dist = calculateDistance(lastCoords.latitude, lastCoords.longitude, p.latitude, p.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              candidate = p;
            }
          }
        }

        if (candidate) {
          usedPlaceIds.add(candidate.id);
          lastCoords = { latitude: candidate.latitude, longitude: candidate.longitude };

          let icon = 'map-outline';
          const catStr = (candidate.categories || []).join(' ').toLowerCase();
          if (catStr.includes('restaurant') || catStr.includes('food')) icon = 'restaurant-outline';
          else if (catStr.includes('cafe')) icon = 'cafe-outline';
          else if (catStr.includes('beach')) icon = 'sunny-outline';
          else if (catStr.includes('hotel')) icon = 'bed-outline';
          else if (catStr.includes('museum') || catStr.includes('landmark')) icon = 'camera-outline';
          else if (catStr.includes('shopping') || catStr.includes('store')) icon = 'cart-outline';

          activities.push({
            id: `act-${d}-${s}-${Date.now()}`,
            time: timeSlots[s],
            name: candidate.name,
            icon,
            location: candidate.address,
            category: (candidate.categories[0] as PlaceCategory) || 'attraction',
            rating: candidate.rating ?? undefined,
            estimatedCost: candidate.priceLevel || '$$',
            description: candidate.description || 'Highly recommended dynamic landmark.',
            photo: candidate.photos[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
            coordinates: { latitude: candidate.latitude, longitude: candidate.longitude },
            note: 'Geographically clustered real place perfectly matching local culture.',
            placeDetails: candidate,
          });
        }
      }

      days.push({
        id: `day-${d}-${Date.now()}`,
        day: `Day ${d + 1}`,
        date: `Exploring ${trip.destination}`,
        activities,
      });
    }

    return days;
  },
};
