import { PlaceDetails } from '../types';
import { foursquareService } from './foursquareService';
import { getAllowedFoursquareCategoryIds, getGeoapifyCategories } from '../constants/tripInterests';

const getGeoapifyApiKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_GEOAPIFY_API_KEY) return import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (import.meta.env.EXPO_PUBLIC_GEOAPIFY_API_KEY) return import.meta.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
    if (import.meta.env.GEOAPIFY_API_KEY) return import.meta.env.GEOAPIFY_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_GEOAPIFY_API_KEY || process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY;
  }
  return undefined;
};

// ─── Geocode cache ─────────────────────────────────────────────────────────
const geocodeCache: Record<
  string,
  {
    latitude: number;
    longitude: number;
    cityName: string;
    country: string;
    countryCode: string;
    state: string;
    formattedAddress: string;
    resultType?: string;
  }
> = {};

const norm = (s: string | undefined | null): string =>
  (s || '').toLowerCase().trim();

export const placesService = {
  /**
   * Convert destination city name into coordinates for spatial centering.
   * Caches country, state, and formatted address for downstream filtering.
   * Uses Geoapify with OpenStreetMap / Nominatim fallback.
   */
  async geocodeDestination(destination: string): Promise<{
    latitude: number;
    longitude: number;
    cityName: string;
    country: string;
    countryCode: string;
    state: string;
    formattedAddress: string;
    resultType?: string;
  } | null> {
    const cleanDest = destination.trim();

    if (geocodeCache[cleanDest]) {
      return geocodeCache[cleanDest];
    }

    const apiKey = getGeoapifyApiKey();

    // 1. Try Geoapify Geocoding
    if (apiKey && !apiKey.startsWith('YOUR_') && apiKey !== 'your_key_here') {
      try {
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          cleanDest
        )}&type=city&apiKey=${apiKey}&limit=1`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          let features = data.features || [];

          if (features.length === 0) {
            const fallbackUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
              cleanDest
            )}&apiKey=${apiKey}&limit=1`;
            const fallbackResp = await fetch(fallbackUrl);
            if (fallbackResp.ok) {
              const fallbackData = await fallbackResp.json();
              features = fallbackData.features || [];
            }
          }

          if (features.length > 0) {
            features.sort((a: any, b: any) => {
              const rankA = a.properties?.rank?.importance || 0;
              const rankB = b.properties?.rank?.importance || 0;
              return rankB - rankA;
            });

            const p = features[0].properties;

            const result = {
              latitude: p.lat,
              longitude: p.lon,
              cityName: p.city || (p.result_type !== 'country' ? p.name || p.county : '') || cleanDest.split(',')[0].trim(),
              country: p.country || '',
              countryCode: (p.country_code || '').toUpperCase(),
              state: p.state || p.county || '',
              formattedAddress: p.formatted || cleanDest,
              resultType: p.result_type || (p.city ? 'city' : ''),
            };

            console.log('====================================');
            console.log(`Destination Requested: ${cleanDest}`);
            console.log(`Resolved City:         ${result.cityName}`);
            console.log(`State/Region:          ${result.state}`);
            console.log(`Country:               ${result.country} (${result.countryCode})`);
            console.log(`Coordinates:           ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
            console.log(`Formatted Address:     ${result.formattedAddress}`);
            console.log('====================================');

            geocodeCache[cleanDest] = result;
            return result;
          }
        }
      } catch (error) {
        console.warn('[placesService] Geoapify geocoding error:', error);
      }
    }

    // 2. Fallback to OpenStreetMap / Nominatim (Public, Keyless)
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cleanDest
      )}&format=json&addressdetails=1&limit=1`;

      const osmResp = await fetch(osmUrl, {
        headers: { 'User-Agent': 'TravoraApp/1.0' },
      });

      if (osmResp.ok) {
        const osmData = await osmResp.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          const item = osmData[0];
          const addr = item.address || {};
          const cityName = addr.city || addr.town || addr.municipality || addr.village || item.name || cleanDest.split(',')[0].trim();
          const country = addr.country || '';
          const countryCode = (addr.country_code || '').toUpperCase();
          const state = addr.state || addr.region || addr.province || '';

          const result = {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            cityName,
            country,
            countryCode,
            state,
            formattedAddress: item.display_name || cleanDest,
            resultType: item.type === 'country' ? 'country' : 'city',
          };

          console.log('====================================');
          console.log(`[OSM GEOCODE] Destination Requested: ${cleanDest}`);
          console.log(`Resolved City:         ${result.cityName}`);
          console.log(`State/Region:          ${result.state}`);
          console.log(`Country:               ${result.country} (${result.countryCode})`);
          console.log(`Coordinates:           ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`);
          console.log(`Formatted Address:     ${result.formattedAddress}`);
          console.log('====================================');

          geocodeCache[cleanDest] = result;
          return result;
        }
      }
    } catch (osmErr) {
      console.warn('[placesService] Nominatim fallback geocoding error:', osmErr);
    }

    console.warn(`[placesService] geocodeDestination: no results for "${cleanDest}"`);
    return null;
  },

  /**
   * Search places using Geoapify Places API v2
   */
  async searchGeoapifyPlaces(params: {
    latitude: number;
    longitude: number;
    radius?: number; // meters
    categories?: string[];
    limit?: number;
    destinationName: string;
    selectedInterests: string[];
  }): Promise<PlaceDetails[]> {
    const apiKey = getGeoapifyApiKey();
    if (!apiKey || apiKey.startsWith('YOUR_') || apiKey === 'your_key_here') {
      return [];
    }

    const radius = params.radius || 15000;
    const limit = Math.min(params.limit || 50, 50);
    const selectedInterests = params.selectedInterests || [];

    const geoCategories =
      params.categories && params.categories.length > 0
        ? params.categories
        : getGeoapifyCategories(selectedInterests);

    const categoriesParam = geoCategories.length > 0 ? geoCategories.join(',') : 'tourism.attraction,tourism.sights';

    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(
      categoriesParam
    )}&filter=circle:${params.longitude},${params.latitude},${radius}&limit=${limit}&apiKey=${apiKey}`;

    console.log(`\n[GEOAPIFY PLACES API REQUEST]`);
    console.log(`Endpoint: https://api.geoapify.com/v2/places`);
    console.log(`Coordinates: ${params.latitude}, ${params.longitude} (Radius: ${radius}m)`);
    console.log(`Categories: ${categoriesParam}`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[GEOAPIFY] API returned status ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      const features = data.features || [];
      console.log(`[GEOAPIFY] Received ${features.length} places for "${params.destinationName}"`);

      const places: PlaceDetails[] = [];
      for (const f of features) {
        const p = f.properties;
        if (!p || !p.name) continue;

        const categories = p.categories || [];
        const primaryCat = categories[0] || (selectedInterests[0] ? selectedInterests[0].toLowerCase() : 'attraction');

        places.push({
          id: p.place_id || `geo_${p.lat}_${p.lon}`,
          name: p.name,
          address: p.formatted || p.address_line2 || `${p.name}, ${params.destinationName}`,
          latitude: p.lat,
          longitude: p.lon,
          rating: 4.5,
          categories: categories.length > 0 ? categories : [primaryCat],
          categoryIds: [],
          photos: [this.getFallbackImage(primaryCat)],
          priceLevel: '$$',
          description: `Popular ${primaryCat.replace('.', ' ')} in ${params.destinationName}.`,
          website: p.website || `https://www.google.com/search?q=${encodeURIComponent(p.name + ' ' + params.destinationName)}`,
          hours: 'Open daily',
          whyFamous: `Renowned ${primaryCat.replace('.', ' ')} spot in ${params.destinationName}.`,
        });
      }

      return places;
    } catch (err: any) {
      console.warn(`[GEOAPIFY] Places search error:`, err?.message || err);
      return [];
    }
  },

  /**
   * Search places nearby the geocoded city using Foursquare Places API.
   */
  async searchPlaces(
    destination: string,
    category: string,
    interests: string[] = []
  ): Promise<PlaceDetails[]> {
    if (!destination?.trim()) {
      console.warn('Destination is required');
      return [];
    }

    const coords = await this.geocodeDestination(destination);
    if (!coords) {
      return [];
    }

    const cleanLower = destination.trim().toLowerCase();
    if (
      coords.resultType === 'country' ||
      (coords.country && norm(coords.country) === cleanLower && (!coords.cityName || norm(coords.cityName) === norm(coords.country)))
    ) {
      console.warn(`[placesService] searchPlaces aborted: Destination "${destination}" is a country.`);
      throw new Error(`Please enter a city or specific destination, e.g. Toronto, Canada.`);
    }

    const selectedInterests = interests.length > 0 ? interests : [category];
    const categoryIds = getAllowedFoursquareCategoryIds(selectedInterests);

    return await foursquareService.searchPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius: 15000,
      categoryIds,
      limit: 50,
      destinationName: destination,
      destinationCountryCode: coords.countryCode,
      selectedInterests,
    });
  },

  getFallbackImage(category: string): string {
    return foursquareService.getFallbackImage(category);
  },
};