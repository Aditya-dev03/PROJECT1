import { placesService } from '../placesService';
import { ResolvedDestination, RegionType } from './itineraryTypes';

const KNOWN_STATES_AND_REGIONS: Record<string, string[]> = {
  goa: [
    'goa', 'panaji', 'panjim', 'margao', 'colva', 'calangute', 'candolim',
    'baga', 'vagator', 'arpora', 'anjuna', 'morjim', 'siolim', 'vasco',
    'mapusa', 'pernem', 'ponda', 'curtorim', 'canacona', 'palolem', 'nerul'
  ],
  bali: ['bali', 'denpasar', 'ubud', 'kuta', 'seminyak', 'canggu', 'nusa dua', 'sanur', 'uluwatu'],
  phuket: ['phuket', 'patong', 'kata', 'karon', 'rawai', 'kamala', 'bang tao'],
  kerala: ['kerala', 'kochi', 'cochin', 'muni', 'munnar', 'alleppey', 'alappuzha', 'varkala', 'wayanad', 'trivandrum'],
  hawaii: ['hawaii', 'honolulu', 'maui', 'oahu', 'kauai', 'kailua', 'waikiki'],
};

const norm = (s: string | undefined | null): string => (s || '').toLowerCase().trim();

// Distance calculation helper (Haversine formula in km)
export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
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

const KNOWN_COUNTRIES = new Set([
  'canada', 'united states', 'united states of america', 'usa', 'us',
  'france', 'india', 'italy', 'japan', 'germany', 'united kingdom', 'uk',
  'australia', 'spain', 'brazil', 'china', 'russia', 'mexico', 'thailand',
  'indonesia', 'vietnam', 'philippines', 'egypt', 'south africa', 'argentina',
  'greece', 'turkey', 'portugal', 'switzerland', 'netherlands', 'belgium',
  'austria', 'singapore', 'new zealand', 'ireland', 'norway', 'sweden',
  'denmark', 'finland', 'poland', 'uae', 'united arab emirates', 'saudi arabia'
]);

export const destinationResolver = {
  async resolveDestination(destinationInput: string): Promise<ResolvedDestination> {
    const rawInput = destinationInput.trim();
    const cleanLower = rawInput.toLowerCase();

    if (KNOWN_COUNTRIES.has(cleanLower)) {
      console.warn(`[destinationResolver] Destination "${rawInput}" is a known country.`);
      throw new Error(`Please enter a city or specific destination, e.g. Toronto, Canada.`);
    }

    const queryInput = cleanLower === 'goa' ? 'Goa, India' : rawInput;
    const geocodeResult = await placesService.geocodeDestination(queryInput);

    if (geocodeResult) {
      const isCountryResultType = geocodeResult.resultType === 'country';
      const isCountryNameMatch =
        geocodeResult.country &&
        norm(geocodeResult.country) === cleanLower &&
        (!geocodeResult.cityName || norm(geocodeResult.cityName) === norm(geocodeResult.country));
      const isCountryCodeMatch =
        geocodeResult.countryCode &&
        norm(geocodeResult.countryCode) === cleanLower &&
        (!geocodeResult.cityName || norm(geocodeResult.cityName) === norm(geocodeResult.country));
      const isFormattedCountry =
        norm(geocodeResult.formattedAddress) === cleanLower &&
        (!geocodeResult.cityName || norm(geocodeResult.cityName) === norm(geocodeResult.country));

      if (isCountryResultType || isCountryNameMatch || isCountryCodeMatch || isFormattedCountry) {
        console.warn(`[destinationResolver] Destination "${rawInput}" is a country, not a city or specific region.`);
        throw new Error(`Please enter a city or specific destination, e.g. Toronto, Canada.`);
      }
    }

    if (!geocodeResult) {
      // Fallback for offline or un-geocoded destination
      return {
        rawInput,
        cleanName: rawInput,
        cityName: rawInput,
        state: '',
        country: '',
        countryCode: '',
        latitude: 0,
        longitude: 0,
        regionType: 'city',
        formattedAddress: rawInput,
        boundingRadiusKm: 25,
        allowableLocationKeywords: [cleanLower],
      };
    }

    const stateLower = geocodeResult.state.toLowerCase();
    const cityLower = geocodeResult.cityName.toLowerCase();

    // Determine region type
    let regionType: RegionType = 'city';
    let boundingRadiusKm = 25;

    if (
      KNOWN_STATES_AND_REGIONS[cleanLower] ||
      KNOWN_STATES_AND_REGIONS[stateLower] ||
      (stateLower && stateLower === cityLower) ||
      cleanLower.includes('state') ||
      cleanLower.includes('region')
    ) {
      regionType = 'state';
      boundingRadiusKm = 50; // Expand search & validation radius for states/regions like Goa
    }

    // Build allowable keywords
    const keywordSet = new Set<string>();
    keywordSet.add(cleanLower);
    if (geocodeResult.cityName) keywordSet.add(cityLower);
    if (geocodeResult.state) keywordSet.add(stateLower);
    if (geocodeResult.country) keywordSet.add(geocodeResult.country.toLowerCase());

    // Add known sub-locations if available
    for (const [key, subLocs] of Object.entries(KNOWN_STATES_AND_REGIONS)) {
      if (cleanLower.includes(key) || stateLower.includes(key)) {
        subLocs.forEach((loc) => keywordSet.add(loc));
      }
    }

    const preferredCleanName =
      geocodeResult.cityName && /^[a-zA-Z\s,.-]+$/.test(geocodeResult.cityName)
        ? geocodeResult.cityName
        : rawInput.split(',')[0].trim() || geocodeResult.cityName || rawInput;

    return {
      rawInput,
      cleanName: preferredCleanName,
      cityName: geocodeResult.cityName,
      state: geocodeResult.state,
      country: geocodeResult.country,
      countryCode: geocodeResult.countryCode,
      latitude: geocodeResult.latitude,
      longitude: geocodeResult.longitude,
      regionType,
      formattedAddress: geocodeResult.formattedAddress,
      boundingRadiusKm,
      allowableLocationKeywords: Array.from(keywordSet),
    };
  },

  /**
   * Geographically validates if a place belongs to the destination region
   */
  isPlaceInDestination(
    placeLat: number,
    placeLon: number,
    placeAddress: string,
    placeCountryCode: string,
    resolvedDest: ResolvedDestination
  ): boolean {
    // 1. Country code validation
    if (resolvedDest.countryCode && placeCountryCode) {
      if (placeCountryCode.toUpperCase() !== resolvedDest.countryCode.toUpperCase()) {
        return false;
      }
    }

    // 2. Geographic distance check from centroid
    if (resolvedDest.latitude !== 0 || resolvedDest.longitude !== 0) {
      const distance = calculateHaversineDistanceKm(
        resolvedDest.latitude,
        resolvedDest.longitude,
        placeLat,
        placeLon
      );
      if (distance <= resolvedDest.boundingRadiusKm) {
        return true;
      }
    }

    // 3. Keyword matching in address for regional places
    const addressLower = (placeAddress || '').toLowerCase();
    for (const kw of resolvedDest.allowableLocationKeywords) {
      if (kw && addressLower.includes(kw)) {
        return true;
      }
    }

    return false;
  },
};
