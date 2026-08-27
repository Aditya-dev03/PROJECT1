import { NormalizedPlace, RankedPlace, ResolvedDestination } from './itineraryTypes';
import { calculateHaversineDistanceKm } from './destinationResolver';

export const placeRanker = {
  rankPlaces(
    places: NormalizedPlace[],
    userInterests: string[] = [],
    resolvedDest?: ResolvedDestination
  ): RankedPlace[] {
    const normInterests = userInterests.map((i) => i.toLowerCase().trim());
    const categoryCounts: Record<string, number> = {};

    // Track category counts to apply duplicate / over-representation penalties
    places.forEach((p) => {
      categoryCounts[p.primaryCategory] = (categoryCounts[p.primaryCategory] || 0) + 1;
    });

    const ranked: RankedPlace[] = places.map((place) => {
      let interestMatch = 0;
      let categoryQuality = 0;
      let ratingScore = 0;
      let geographicScore = 0;
      let dataQualityScore = 0;
      let duplicatePenalty = 0;

      // 1. Interest Match (+35 max)
      const placeCatsStr = place.categories.join(' ').toLowerCase();
      for (const interest of normInterests) {
        if (
          placeCatsStr.includes(interest) ||
          place.primaryCategory.includes(interest) ||
          (interest.includes('cafe') && place.primaryCategory === 'cafe') ||
          (interest.includes('beach') && place.primaryCategory === 'beach') ||
          (interest.includes('restaurant') && place.primaryCategory === 'restaurant') ||
          (interest.includes('shopping') && place.primaryCategory === 'shopping') ||
          (interest.includes('nightlife') && place.primaryCategory === 'nightlife')
        ) {
          interestMatch += 35;
          break;
        }
      }

      // 2. Category Quality (+15 max)
      const topCategories = ['attraction', 'beach', 'museum', 'cafe', 'restaurant', 'nature'];
      if (topCategories.includes(place.primaryCategory)) {
        categoryQuality = 15;
      } else if (place.primaryCategory === 'shopping' || place.primaryCategory === 'nightlife') {
        categoryQuality = 10;
      } else {
        categoryQuality = 5;
      }

      // 3. Rating Score (+20 max proportional to 0–5 rating, 0 if null)
      if (place.rating != null && place.rating > 0) {
        ratingScore = Math.min(20, Math.round((place.rating / 5) * 20));
      }

      // 4. Geographic Score (+25 max proportional to proximity)
      if (resolvedDest && (resolvedDest.latitude !== 0 || resolvedDest.longitude !== 0)) {
        const distKm = calculateHaversineDistanceKm(
          resolvedDest.latitude,
          resolvedDest.longitude,
          place.latitude,
          place.longitude
        );
        const maxRadius = Math.max(10, resolvedDest.boundingRadiusKm);
        const closenessRatio = Math.max(0, 1 - distKm / maxRadius);
        geographicScore = Math.round(closenessRatio * 25);
      } else {
        geographicScore = 15; // default neutral score
      }

      // 5. Data Quality Score (+10 max)
      if (place.photos && place.photos.length > 0) dataQualityScore += 4;
      if (place.website) dataQualityScore += 3;
      if (place.openingHours) dataQualityScore += 3;

      // 6. Over-representation penalty
      const catCount = categoryCounts[place.primaryCategory] || 0;
      if (catCount > 15) {
        duplicatePenalty = 10;
      }

      const totalScore =
        interestMatch +
        categoryQuality +
        ratingScore +
        geographicScore +
        dataQualityScore -
        duplicatePenalty;

      return {
        ...place,
        relevanceScore: Math.max(0, totalScore),
        scoreBreakdown: {
          interestMatch,
          categoryQuality,
          ratingScore,
          geographicScore,
          dataQualityScore,
          duplicatePenalty,
        },
      };
    });

    // Sort in descending order of relevance score
    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  },
};
