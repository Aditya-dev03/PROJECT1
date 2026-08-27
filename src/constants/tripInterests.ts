// Trip interests with their Foursquare and Geoapify category mappings
export interface TripInterest {
  label: string;
  foursquareCategoryIds: string[];
  foursquareCategoryNames: string[];
  geoapifyCategories: string[];
  icon: string;
}

export const TRIP_INTERESTS: TripInterest[] = [
  {
    label: 'Cafes',
    foursquareCategoryIds: ['13032', '13034', '13035', '13036', '13033'],
    foursquareCategoryNames: ['cafe', 'café', 'coffee shop', 'tea room', 'tea house', 'bubble tea shop', 'bakery and cafe'],
    geoapifyCategories: ['catering.cafe'],
    icon: '☕',
  },
  {
    label: 'Museums',
    foursquareCategoryIds: ['10027', '10028', '10029', '10030', '10031', '10032'],
    foursquareCategoryNames: ['museum', 'art museum', 'history museum', 'science museum', 'planetarium', 'art gallery', 'children\'s museum'],
    geoapifyCategories: ['entertainment.museum', 'entertainment.culture'],
    icon: '🖼️',
  },
  {
    label: 'Restaurants',
    foursquareCategoryIds: ['13065', '13000'],
    foursquareCategoryNames: ['restaurant', 'diner', 'bistro', 'brasserie', 'steakhouse', 'eatery', 'pizzeria'],
    geoapifyCategories: ['catering.restaurant'],
    icon: '🍽️',
  },
  {
    label: 'Shopping',
    foursquareCategoryIds: ['17000', '17114', '17065', '17069', '17071', '17027', '17043'],
    foursquareCategoryNames: ['shopping', 'mall', 'shopping mall', 'market', 'department store', 'flea market', 'clothing store', 'boutique', 'retail'],
    geoapifyCategories: ['commercial.shopping_mall', 'commercial.clothing', 'commercial.department_store', 'commercial'],
    icon: '🛍️',
  },
  {
    label: 'Historical Places',
    foursquareCategoryIds: ['16020', '16021', '16007', '16026', '16024', '16017'],
    foursquareCategoryNames: ['historic and protected site', 'historic', 'heritage', 'castle', 'monument', 'memorial', 'palace', 'fort', 'historic building', 'ancient site'],
    geoapifyCategories: ['heritage', 'heritage.unesco', 'building.historic', 'tourism.sights'],
    icon: '🏰',
  },
  {
    label: 'Monuments',
    foursquareCategoryIds: ['16026', '16020', '16024'],
    foursquareCategoryNames: ['monument', 'memorial', 'landmark', 'statue'],
    geoapifyCategories: ['tourism.sights', 'tourism.sights.memorial', 'tourism.attraction'],
    icon: '🏛️',
  },
  {
    label: 'Beaches',
    foursquareCategoryIds: ['16003', '16004', '16047'],
    foursquareCategoryNames: ['beach', 'surf spot', 'bathing area', 'cove'],
    geoapifyCategories: ['beach', 'natural.sand', 'natural.water'],
    icon: '🏖️',
  },
  {
    label: 'Nature',
    foursquareCategoryIds: ['16032', '16037', '16041', '16042', '16005', '16052', '16016'],
    foursquareCategoryNames: ['park', 'forest', 'nature reserve', 'national park', 'botanical garden', 'garden', 'waterfall', 'nature'],
    geoapifyCategories: ['leisure.park', 'leisure.park.nature_reserve', 'leisure.park.garden', 'natural'],
    icon: '🌿',
  },
  {
    label: 'Nightlife',
    foursquareCategoryIds: ['10039', '10020', '13003', '10032'],
    foursquareCategoryNames: ['night club', 'nightclub', 'lounge', 'bar', 'nightlife', 'dance club', 'speakeasy'],
    geoapifyCategories: ['adult.nightclub', 'catering.pub', 'catering.bar', 'entertainment'],
    icon: '🎉',
  },
  {
    label: 'Bars',
    foursquareCategoryIds: ['13003', '13006', '13018', '13025', '13004', '13027'],
    foursquareCategoryNames: ['bar', 'cocktail bar', 'pub', 'wine bar', 'beer garden', 'sports bar', 'brewery'],
    geoapifyCategories: ['catering.bar', 'catering.pub'],
    icon: '🍸',
  },
  {
    label: 'Entertainment',
    foursquareCategoryIds: ['10000', '10001', '10024', '10027', '10051', '10003'],
    foursquareCategoryNames: ['entertainment', 'amusement park', 'movie theater', 'cinema', 'theater', 'performing arts venue', 'arcade', 'theme park'],
    geoapifyCategories: ['entertainment', 'entertainment.theme_park', 'entertainment.cinema'],
    icon: '🎢',
  },
  {
    label: 'Local Markets',
    foursquareCategoryIds: ['17069', '17070', '17071', '17072', '17074'],
    foursquareCategoryNames: ['market', 'farmers market', 'flea market', 'street market', 'public market', 'night market', 'bazaar'],
    geoapifyCategories: ['commercial.marketplace', 'commercial.food_and_drink'],
    icon: '🏪',
  },
  {
    label: 'Bakeries',
    foursquareCategoryIds: ['13002', '13040', '13054'],
    foursquareCategoryNames: ['bakery', 'pastry shop', 'dessert shop', 'patisserie'],
    geoapifyCategories: ['commercial.food_and_drink.bakery', 'catering.cafe'],
    icon: '🥐',
  },
  {
    label: 'Adventure',
    foursquareCategoryIds: ['18000', '18057', '18008', '18005'],
    foursquareCategoryNames: ['hiking trail', 'climbing gym', 'sports and recreation', 'outdoor recreation', 'campground'],
    geoapifyCategories: ['sport', 'tourism.attraction'],
    icon: '🧗',
  },
  {
    label: 'Photography',
    foursquareCategoryIds: ['16043', '16026', '16032', '16003'],
    foursquareCategoryNames: ['scenic lookout', 'monument', 'landmark', 'park', 'beach', 'viewpoint'],
    geoapifyCategories: ['tourism.sights', 'tourism.attraction', 'leisure.park'],
    icon: '📷',
  },
  {
    label: 'Culture',
    foursquareCategoryIds: ['10027', '10020', '16020', '10027'],
    foursquareCategoryNames: ['museum', 'cultural center', 'historic site', 'theater', 'culture'],
    geoapifyCategories: ['entertainment.culture', 'entertainment.museum', 'heritage'],
    icon: '🎭',
  },
  {
    label: 'Temples',
    foursquareCategoryIds: ['12099', '12100', '12101', '12102', '12103', '12104'],
    foursquareCategoryNames: ['temple', 'hindu temple', 'buddhist temple', 'shrine', 'place of worship', 'church', 'mosque'],
    geoapifyCategories: ['religion.place_of_worship', 'religion'],
    icon: '🛕',
  },
  {
    label: 'Attractions',
    foursquareCategoryIds: ['16000', '10000', '16026', '10027'],
    foursquareCategoryNames: ['attraction', 'tourist attraction', 'landmark', 'monument', 'sights'],
    geoapifyCategories: ['tourism.attraction', 'tourism.sights'],
    icon: '📍',
  },
];

/**
 * Single authoritative function to resolve user-selected interest labels into Foursquare category IDs.
 * Returns empty array if no interests are provided. NO DEFAULTS.
 */
export const getAllowedFoursquareCategoryIds = (interestLabels: string[] = []): string[] => {
  if (!interestLabels || interestLabels.length === 0) {
    return [];
  }
  const uniqueIds = new Set<string>();
  interestLabels.forEach((label) => {
    if (!label) return;
    const interest = TRIP_INTERESTS.find((i) => i.label.toLowerCase() === label.trim().toLowerCase());
    if (interest) {
      interest.foursquareCategoryIds.forEach((id) => uniqueIds.add(id));
    }
  });
  return Array.from(uniqueIds);
};

/**
 * Single authoritative function to resolve user-selected interest labels into Foursquare category name patterns.
 */
export const getAllowedFoursquareCategoryNames = (interestLabels: string[] = []): string[] => {
  if (!interestLabels || interestLabels.length === 0) {
    return [];
  }
  const uniqueNames = new Set<string>();
  interestLabels.forEach((label) => {
    if (!label) return;
    const interest = TRIP_INTERESTS.find((i) => i.label.toLowerCase() === label.trim().toLowerCase());
    if (interest) {
      interest.foursquareCategoryNames.forEach((name) => uniqueNames.add(name));
    } else {
      uniqueNames.add(label.trim().toLowerCase());
    }
  });
  return Array.from(uniqueNames);
};

/**
 * Single authoritative function to resolve user-selected interest labels into Geoapify category IDs/strings.
 */
export const getGeoapifyCategories = (interestLabels: string[] = []): string[] => {
  if (!interestLabels || interestLabels.length === 0) {
    return [];
  }
  const uniqueCategories = new Set<string>();
  interestLabels.forEach((label) => {
    if (!label) return;
    const interest = TRIP_INTERESTS.find((i) => i.label.toLowerCase() === label.trim().toLowerCase());
    if (interest && interest.geoapifyCategories) {
      interest.geoapifyCategories.forEach((cat) => uniqueCategories.add(cat));
    }
  });
  return Array.from(uniqueCategories);
};

/**
 * Backwards-compatibility aliases
 */
export const getAllowedCategoriesFromInterests = getAllowedFoursquareCategoryNames;

/**
 * CRITICAL CATEGORY VALIDATOR:
 * Strictly verifies whether a place genuinely belongs to one of the user's selected interests.
 * Evaluates Foursquare category IDs, Foursquare category name labels, Geoapify taxonomy strings, and interest labels.
 */
export const isPlaceMatchingSelectedInterests = (
  placeCategories: string[] = [],
  placeCategoryIds: string[] = [],
  selectedInterests: string[] = []
): boolean => {
  if (!selectedInterests || selectedInterests.length === 0) return false;
  if ((!placeCategories || placeCategories.length === 0) && (!placeCategoryIds || placeCategoryIds.length === 0)) {
    return false;
  }

  const allowedFsqIds = new Set(getAllowedFoursquareCategoryIds(selectedInterests));
  const allowedNames = getAllowedFoursquareCategoryNames(selectedInterests);
  const allowedGeoapifyCats = getGeoapifyCategories(selectedInterests);

  // 1. Direct Foursquare category ID match
  if (placeCategoryIds && placeCategoryIds.length > 0) {
    const hasMatchingId = placeCategoryIds.some((id) => {
      const idStr = String(id);
      return (
        allowedFsqIds.has(idStr) ||
        Array.from(allowedFsqIds).some((allowedId) => idStr.startsWith(allowedId) || allowedId.startsWith(idStr))
      );
    });
    if (hasMatchingId) return true;
  }

  // 2. Normalize place categories
  const lowerCategories = (placeCategories || []).map((c) => c.toLowerCase().trim());
  const combinedCategoryStr = lowerCategories.join(' ');

  // 3. Match Geoapify dotted category paths (e.g. "catering.pub", "entertainment.museum", "tourism.sights")
  for (const geoCat of allowedGeoapifyCats) {
    const geoLower = geoCat.toLowerCase();
    for (const pc of lowerCategories) {
      if (pc === geoLower || pc.startsWith(geoLower + '.') || geoLower.startsWith(pc + '.')) {
        return true;
      }
    }
  }

  // 4. Strict category name/label match
  const matchesName = allowedNames.some((allowedName) => {
    const normAllowed = allowedName.toLowerCase().trim();
    return lowerCategories.some((pc) => {
      if (pc === normAllowed) return true;
      if (pc.includes(normAllowed) || normAllowed.includes(pc)) return true;
      return false;
    });
  });
  if (matchesName) return true;

  // 5. Match against selected interest labels themselves (e.g. "Cafes", "Museums", "Nightlife", "Shopping", "Historical Places")
  for (const interest of selectedInterests) {
    const interestNorm = interest.toLowerCase().trim();
    const singular = interestNorm.endsWith('s') ? interestNorm.slice(0, -1) : interestNorm;
    if (
      combinedCategoryStr.includes(interestNorm) ||
      combinedCategoryStr.includes(singular) ||
      lowerCategories.some((c) => c.includes(interestNorm) || c.includes(singular))
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Helper alias for itinerary engine/validator
 */
export const isPlaceMatchingAllowedCategories = (
  placeCategories: string[] = [],
  allowedCategories: string[] = []
): boolean => {
  if (!allowedCategories || allowedCategories.length === 0) return false;
  if (!placeCategories || placeCategories.length === 0) return false;

  const lowerCats = placeCategories.map((c) => c.toLowerCase());

  return allowedCategories.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    return lowerCats.some((c) => c === normAllowed || c.includes(normAllowed) || normAllowed.includes(c));
  });
};

/**
 * Universal categories for iconic destination landmarks and must-see attractions.
 * These are always eligible to be discovered and included in any itinerary to ensure
 * travelers never miss world-famous sights (e.g. Eiffel Tower, Taj Mahal, CN Tower, Aguada Fort).
 */
export const UNIVERSAL_ICONIC_CATEGORIES = [
  'landmark',
  'monument',
  'historic and protected site',
  'historic',
  'heritage',
  'castle',
  'palace',
  'fort',
  'memorial',
  'ancient site',
  'statue',
  'museum',
  'art museum',
  'history museum',
  'science museum',
  'art gallery',
  'tourism.sights',
  'tourism.attraction',
  'tourism.sights.memorial',
  'building.historic',
  'heritage.unesco',
  'beach',
  'natural.sand',
  'natural.water',
  'viewpoint',
  'leisure.park',
  'religion.place_of_worship',
  'church',
  'cathedral',
  'temple',
  'attraction',
  'sightseeing',
  'market',
  'cafe',
  'café',
  'restaurant',
];

/**
 * Universal Place Eligibility:
 * Validates whether a place is eligible for the itinerary.
 * Places are eligible if:
 * 1. They match the traveler's selected interests (high priority), OR
 * 2. They are top iconic landmarks, historic sites, beaches, or must-see sights of the destination.
 */
export const isPlaceEligibleForItinerary = (
  placeCategories: string[] = [],
  placeCategoryIds: string[] = [],
  selectedInterests: string[] = []
): boolean => {
  // If user selected interests, check if it matches
  if (selectedInterests && selectedInterests.length > 0) {
    if (isPlaceMatchingSelectedInterests(placeCategories, placeCategoryIds, selectedInterests)) {
      return true;
    }
  }

  // Always allow iconic destination landmarks and sights
  const lowerCategories = (placeCategories || []).map((c) => c.toLowerCase().trim());
  const hasIconicCategory = lowerCategories.some((cat) =>
    UNIVERSAL_ICONIC_CATEGORIES.some((iconic) => cat === iconic || cat.includes(iconic) || iconic.includes(cat))
  );

  return hasIconicCategory;
};

/**
 * Helper: Check if a place's category list matches any of the user's selected interests
 */
export const isPlaceMatchingInterests = (
  placeCategories: string[],
  selectedInterests: string[]
): boolean => {
  return isPlaceMatchingSelectedInterests(placeCategories, [], selectedInterests);
};
