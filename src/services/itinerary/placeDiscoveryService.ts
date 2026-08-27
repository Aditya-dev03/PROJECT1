import { PlaceDetails } from '../../types';
import { foursquareService, CURATED_FSQ_DESTINATION_PLACES, FSQPlace } from '../foursquareService';
import { placesService } from '../placesService';

import { geminiService } from '../geminiService';
import { ResolvedDestination } from './itineraryTypes';
import {
  getAllowedFoursquareCategoryIds,
  getAllowedFoursquareCategoryNames,
  getGeoapifyCategories,
  isPlaceMatchingSelectedInterests,
  isPlaceMatchingAllowedCategories,
} from '../../constants/tripInterests';
import { GEMINI_MODEL } from '../../constants/aiConfig';

export interface PlaceDiscoveryParams {
  resolvedDest: ResolvedDestination;
  selectedInterests: string[];
  minimumPlacesNeeded: number;
}

export const placeDiscoveryService = {
  /**
   * Discovers real POIs for a destination across multi-tier providers:
   * Tier 1: Foursquare Places API
   * Tier 2: Geoapify Places API v2
   * Tier 3: Gemini AI Real Place Discovery (gemini-3.5-flash-lite)
   * Tier 4: Curated Global Database
   */
  async discoverPlaces(params: PlaceDiscoveryParams): Promise<PlaceDetails[]> {
    const { resolvedDest, selectedInterests, minimumPlacesNeeded } = params;
    const destinationName =
      resolvedDest.formattedAddress ||
      (resolvedDest.cleanName && resolvedDest.country
        ? `${resolvedDest.cleanName}, ${resolvedDest.country}`
        : resolvedDest.rawInput);

    const allowedFsqCategoryIds = getAllowedFoursquareCategoryIds(selectedInterests);
    const allowedFsqCategoryNames = getAllowedFoursquareCategoryNames(selectedInterests);
    const allowedGeoCategories = getGeoapifyCategories(selectedInterests);

    const collectedPlaces: PlaceDetails[] = [];
    const seenIds = new Set<string>();
    const seenNameKeys = new Set<string>();

    const addUniquePlaces = (places: PlaceDetails[], sourceTag: string) => {
      let added = 0;
      for (const p of places) {
        if (!p || !p.name) continue;
        const normName = p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const coordKey = `${(p.latitude || 0).toFixed(3)}_${(p.longitude || 0).toFixed(3)}`;
        const compositeKey = `${normName}_${coordKey}`;

        if (!seenIds.has(p.id) && !seenNameKeys.has(normName) && !seenNameKeys.has(compositeKey)) {
          seenIds.add(p.id);
          seenNameKeys.add(normName);
          seenNameKeys.add(compositeKey);
          collectedPlaces.push(p);
          added++;
        }
      }
      console.log(`[PLACE DISCOVERY] [${sourceTag}] Added ${added} places (Total accumulated: ${collectedPlaces.length})`);
    };

    console.log(`\n==================================================`);
    console.log(`[PLACE DISCOVERY ENGINE]`);
    console.log(`Destination:             ${destinationName}`);
    console.log(`Coordinates:             ${resolvedDest.latitude.toFixed(4)}, ${resolvedDest.longitude.toFixed(4)}`);
    console.log(`Selected Interests:      [ ${selectedInterests.join(', ')} ]`);
    console.log(`Target Candidates:       ${minimumPlacesNeeded}`);
    console.log(`==================================================\n`);

    // ── Tier 1: Foursquare Places API ──────────────────────────────────────────
    try {
      console.log(`[PLACE DISCOVERY] Attempting Tier 1: Foursquare API...`);
      const fsqPlaces = await foursquareService.searchPlaces({
        latitude: resolvedDest.latitude,
        longitude: resolvedDest.longitude,
        radius: resolvedDest.regionType === 'state' ? 30000 : 15000,
        categoryIds: allowedFsqCategoryIds,
        limit: 50,
        destinationName,
        destinationCountryCode: resolvedDest.countryCode,
        selectedInterests,
      });

      if (fsqPlaces.length > 0) {
        addUniquePlaces(fsqPlaces, 'Tier 1: Foursquare');
      }
    } catch (fsqErr: any) {
      console.warn(`[PLACE DISCOVERY] Tier 1 (Foursquare) failed: ${fsqErr?.message || fsqErr}`);
    }

    // ── Tier 2: Geoapify Places API v2 ─────────────────────────────────────────
    if (collectedPlaces.length < minimumPlacesNeeded && (resolvedDest.latitude !== 0 || resolvedDest.longitude !== 0)) {
      try {
        console.log(`[PLACE DISCOVERY] Attempting Tier 2: Geoapify Places API...`);

        // Separate sightseeing/beaches/heritage/monuments from dining/nightlife to guarantee rich distribution
        const sightseeingInterests = selectedInterests.filter((i) =>
          ['Beaches', 'Historical Places', 'Monuments', 'Museums', 'Nature', 'Culture', 'Temples', 'Attractions', 'Photography'].includes(i)
        );
        const diningNightlifeInterests = selectedInterests.filter((i) =>
          ['Cafes', 'Restaurants', 'Bars', 'Nightlife', 'Local Markets', 'Bakeries', 'Entertainment', 'Adventure'].includes(i)
        );

        const queriesToRun: { label: string; cats: string[] }[] = [];
        const iconicCats = ['tourism.sights', 'tourism.attraction', 'heritage', 'heritage.unesco', 'building.historic', 'entertainment.museum'];
        
        if (sightseeingInterests.length > 0 && diningNightlifeInterests.length > 0) {
          queriesToRun.push({ label: 'Sightseeing/Beaches/Heritage', cats: getGeoapifyCategories(sightseeingInterests) });
          queriesToRun.push({ label: 'Dining/Nightlife/Markets', cats: getGeoapifyCategories(diningNightlifeInterests) });
        } else {
          queriesToRun.push({ label: 'User Interests', cats: allowedGeoCategories });
          // Also fetch top iconic destination landmarks if user only selected dining/nightlife/single interest
          queriesToRun.push({ label: 'Iconic Sights & Landmarks', cats: iconicCats });
        }

        for (const queryGroup of queriesToRun) {
          if (queryGroup.cats.length === 0) continue;
          const geoPlaces = await placesService.searchGeoapifyPlaces({
            latitude: resolvedDest.latitude,
            longitude: resolvedDest.longitude,
            radius: resolvedDest.regionType === 'state' ? 30000 : 15000,
            categories: queryGroup.cats,
            limit: 35,
            destinationName,
            selectedInterests,
          });

          if (geoPlaces.length > 0) {
            addUniquePlaces(geoPlaces, `Tier 2: Geoapify (${queryGroup.label})`);
          }
        }
      } catch (geoErr: any) {
        console.warn(`[PLACE DISCOVERY] Tier 2 (Geoapify) failed: ${geoErr?.message || geoErr}`);
      }
    }

    // ── Tier 3: Curated Global Destinations Database (Offline/Direct Cache) ────
    const destLower = destinationName.toLowerCase();
    for (const [key, curatedPlaces] of Object.entries(CURATED_FSQ_DESTINATION_PLACES || {})) {
      if (destLower.includes(key) || key.includes(destLower.split(',')[0].trim())) {
        console.log(`[PLACE DISCOVERY] Found ${(curatedPlaces as FSQPlace[]).length} curated places for "${key}"`);
        const normalizedCurated = (curatedPlaces as FSQPlace[])
          .map((p) => foursquareService._normalizeFoursquarePlace(p, destinationName, selectedInterests));
        if (normalizedCurated.length > 0) {
          addUniquePlaces(normalizedCurated, 'Tier 3: Curated Database');
        }
      }
    }


    // ── Tier 4: Gemini AI Real Place Discovery ─────────────────────────────────
    if (collectedPlaces.length < minimumPlacesNeeded) {
      const apiKey = geminiService.getApiKey();
      if (apiKey) {
        try {
          console.log(`[PLACE DISCOVERY] Accumulated ${collectedPlaces.length}/${minimumPlacesNeeded} candidates.`);
          console.log(`[PLACE DISCOVERY] Invoking Tier 4: Gemini AI Place Discovery (${GEMINI_MODEL})...`);

          const neededCount = Math.max(minimumPlacesNeeded - collectedPlaces.length, 20);
          const aiDiscovered = await this._discoverPlacesWithGemini(
            resolvedDest,
            selectedInterests,
            neededCount
          );

          if (aiDiscovered.length > 0) {
            addUniquePlaces(aiDiscovered, 'Tier 4: Gemini AI');
          }
        } catch (gemErr: any) {
          console.warn(`[PLACE DISCOVERY] Tier 4 (Gemini) failed: ${gemErr?.message || gemErr}`);
        }
      }
    }

    console.log(`\n[PLACE DISCOVERY SUMMARY] Discovered ${collectedPlaces.length} total eligible places for "${destinationName}".\n`);
    return collectedPlaces;
  },

  /**
   * Gemini AI Place Discovery:
   * Prompts gemini-3.5-flash-lite to discover genuine, real-world venues, iconic landmarks, cafes, and points of interest
   * for any destination with accurate coordinates, balancing must-see highlights with traveler interests.
   */
  async _discoverPlacesWithGemini(
    resolvedDest: ResolvedDestination,
    selectedInterests: string[],
    count: number = 20
  ): Promise<PlaceDetails[]> {
    const destination = resolvedDest.formattedAddress || resolvedDest.cleanName || resolvedDest.rawInput;
    const baseLat = resolvedDest.latitude;
    const baseLon = resolvedDest.longitude;

    const systemPrompt = `You are a world-class travel geographer and real-world venue database expert.
Your task is to provide real, authentic, existing points of interest, venues, landmarks, and attractions in "${destination}".
You MUST include:
1. The most famous, iconic, must-see landmarks, monuments, historic sites, and signature attractions of "${destination}" (so travelers experience the destination's top highlights).
2. Top-rated venues reflecting the traveler's specific interests: [ ${selectedInterests.join(', ')} ].

CRITICAL RULES:
1. Provide ONLY real, currently existing, famous or highly-rated venues in ${destination}.
2. Ensure realistic coordinates (latitude/longitude) close to ${destination} (${baseLat.toFixed(4)}, ${baseLon.toFixed(4)}).
3. Output ONLY valid JSON matching this schema:
{
  "places": [
    {
      "id": "gemini_poi_unique_slug",
      "name": "Exact Official Venue Name",
      "address": "Full Street Address, City, Country",
      "latitude": 43.6532,
      "longitude": -79.3832,
      "category": "museum | cafe | restaurant | shopping | historic | monument | park | bar | beach | landmark | etc",
      "categories": ["landmark", "attraction"],
      "rating": 4.8,
      "priceLevel": "$ | $$ | $$$ | $$$$",
      "description": "Engaging 1-2 sentence description of what makes this venue renowned.",
      "whyFamous": "Key highlight or reason to visit."
    }
  ]
}`;

    const userPrompt = `Destination: ${destination}
Target Interests: ${selectedInterests.join(', ')}
Requested Quantity: ${Math.min(count, 35)} real venues (including iconic must-see sights and interest venues)`;

    const parsed = await geminiService.generateStructuredJSON(systemPrompt, userPrompt);
    const rawPlaces = parsed.places || parsed.venues || parsed.results || [];

    if (!Array.isArray(rawPlaces)) {
      return [];
    }

    const places: PlaceDetails[] = [];
    for (let i = 0; i < rawPlaces.length; i++) {
      const p = rawPlaces[i];
      if (!p || !p.name) continue;

      const categories = Array.isArray(p.categories) ? p.categories : [p.category || selectedInterests[0].toLowerCase()];
      const primaryCat = categories[0] || selectedInterests[0].toLowerCase();
      const lat = typeof p.latitude === 'number' && p.latitude !== 0 ? p.latitude : baseLat + (Math.random() - 0.5) * 0.04;
      const lon = typeof p.longitude === 'number' && p.longitude !== 0 ? p.longitude : baseLon + (Math.random() - 0.5) * 0.04;

      places.push({
        id: p.id || `gem_${i}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: p.name,
        address: p.address || `${p.name}, ${destination}`,
        latitude: lat,
        longitude: lon,
        rating: typeof p.rating === 'number' ? p.rating : 4.6,
        categories,
        categoryIds: [],
        photos: [placesService.getFallbackImage(primaryCat)],
        priceLevel: p.priceLevel || '$$',
        description: p.description || `${p.name} in ${destination}.`,
        website: `https://www.google.com/search?q=${encodeURIComponent(p.name + ' ' + destination)}`,
        hours: 'Open daily',
        whyFamous: p.whyFamous || `Popular ${primaryCat} destination in ${destination}.`,
      });
    }

    return places;
  },
};
