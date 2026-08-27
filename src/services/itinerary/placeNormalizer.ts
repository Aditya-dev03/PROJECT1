import { PlaceDetails, PlaceCategory } from '../../types';
import { NormalizedPlace } from './itineraryTypes';
import { calculateHaversineDistanceKm } from './destinationResolver';

export const mapCategoriesToPrimary = (categories: string[]): PlaceCategory => {
  const catStr = (categories || []).join(' ').toLowerCase();

  if (catStr.includes('museum')) {
    return 'museum';
  }
  if (catStr.includes('heritage') || catStr.includes('historic')) {
    return 'heritage';
  }
  if (catStr.includes('restaurant') || catStr.includes('food') || catStr.includes('dine') || catStr.includes('fast_food')) {
    return 'restaurant';
  }
  if (catStr.includes('cafe') || catStr.includes('coffee') || catStr.includes('bakery') || catStr.includes('tea')) {
    return 'cafe';
  }
  if (catStr.includes('beach') || catStr.includes('coast') || catStr.includes('sand')) {
    return 'beach';
  }
  if (catStr.includes('hotel') || catStr.includes('lodging') || catStr.includes('resort')) {
    return 'hotel';
  }
  if (catStr.includes('bar') || catStr.includes('pub') || catStr.includes('club') || catStr.includes('nightlife')) {
    return 'nightlife';
  }
  if (catStr.includes('shopping') || catStr.includes('mall') || catStr.includes('market') || catStr.includes('store')) {
    return 'shopping';
  }
  if (catStr.includes('park') || catStr.includes('garden') || catStr.includes('nature') || catStr.includes('forest')) {
    return 'nature';
  }
  if (catStr.includes('bus') || catStr.includes('train') || catStr.includes('airport') || catStr.includes('station')) {
    return 'transport';
  }
  return 'attraction';
};

const normalizeNameString = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const placeNormalizer = {
  normalizePlace(place: PlaceDetails): NormalizedPlace {
    const normName = normalizeNameString(place.name);
    const primaryCategory = mapCategoriesToPrimary(place.categories);

    return {
      id: place.id,
      name: place.name,
      normalizedName: normName,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      categories: place.categories || [],
      primaryCategory,
      rating: place.rating ?? null,
      priceLevel: place.priceLevel ?? null,
      photos: place.photos && place.photos.length > 0 ? place.photos : [],
      website: place.website ?? null,
      openingHours: place.hours ?? null,
      description: place.description || `${place.name} located at ${place.address}`,
      source: place.id.startsWith('geo_') ? 'geoapify' : place.id.startsWith('gem_') ? 'custom' : 'foursquare',
      destinationRelevanceScore: 1.0,
      rawPlaceDetails: place,
    };
  },

  normalizePlaces(places: PlaceDetails[]): NormalizedPlace[] {
    return places.map((p) => this.normalizePlace(p));
  },

  /**
   * Multi-signal deduplication:
   * 1. Same Place ID
   * 2. Same Normalized Name
   * 3. Same/similar name + spatial proximity (< 0.2 km / 200m)
   * Preserves genuinely different branches with distinct coordinates (> 200m).
   */
  deduplicatePlaces(places: NormalizedPlace[]): NormalizedPlace[] {
    const unique: NormalizedPlace[] = [];
    const seenIds = new Set<string>();

    for (const place of places) {
      if (seenIds.has(place.id)) {
        continue; // 1. Duplicate ID check
      }

      // Check against already accepted unique places for name + proximity collision
      let isDuplicate = false;
      for (const existing of unique) {
        if (existing.normalizedName === place.normalizedName) {
          const distKm = calculateHaversineDistanceKm(
            existing.latitude,
            existing.longitude,
            place.latitude,
            place.longitude
          );
          // If name is identical AND coordinates are very close (< 200m), drop duplicate
          if (distKm < 0.2) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        seenIds.add(place.id);
        unique.push(place);
      }
    }

    return unique;
  },
};
