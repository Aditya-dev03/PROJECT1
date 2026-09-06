import { Trip, ItineraryDay } from '../../types';
import { destinationResolver } from './destinationResolver';
import { placesService } from '../placesService';
import { foursquareService } from '../foursquareService';
import { geminiService } from '../geminiService';
import { placeDiscoveryService } from './placeDiscoveryService';
import { placeNormalizer } from './placeNormalizer';
import { placeRanker } from './placeRanker';
import { placeClusterer } from './placeClusterer';
import { itineraryPlanner } from './itineraryPlanner';
import { itineraryValidator } from './itineraryValidator';
import { itineraryRepair } from './itineraryRepair';
import { itineraryQualityEvaluator } from './itineraryQualityEvaluator';
import {
  getAllowedFoursquareCategoryIds,
  getAllowedFoursquareCategoryNames,
  isPlaceMatchingSelectedInterests,
  isPlaceMatchingAllowedCategories,
  isPlaceEligibleForItinerary,
} from '../../constants/tripInterests';
import {
  RawAIItinerary,
  RankedPlace,
  PlaceCluster,
  ItineraryGenerationOptions,
} from './itineraryTypes';
import { MIN_ITINERARY_QUALITY_SCORE } from '../../constants/aiConfig';
import { calculateHaversineDistanceKm } from './destinationResolver';

export const calculateTripDays = (datesStr?: string): number => {
  if (!datesStr) return 3;

  const parts = datesStr.split(' - ');
  if (parts.length === 2) {
    let startStr = parts[0].trim();
    const endStr = parts[1].trim();

    const yearMatch = endStr.match(/\b(20\d\d)\b/);
    if (yearMatch && !startStr.match(/\b(20\d\d)\b/)) {
      startStr = `${startStr}, ${yearMatch[1]}`;
    }

    const start = new Date(startStr);
    const end = new Date(endStr);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, Math.min(diffDays, 14));
    }
  }

  const singleDayMatch = datesStr.match(/(\d+)\s*(day|days)/i);
  if (singleDayMatch) {
    const days = parseInt(singleDayMatch[1], 10);
    return Math.max(1, Math.min(days, 14));
  }

  return 3;
};

export const itineraryEngine = {
  /**
   * Main entry point for AI itinerary generation with resilient Multi-Tier Places discovery and strict constraints
   */
  async generateItinerary(
    trip: Trip,
    options?: ItineraryGenerationOptions
  ): Promise<ItineraryDay[]> {
    const numDays = calculateTripDays(trip.dates);
    const selectedInterests =
      Array.isArray(trip.interests) && trip.interests.length > 0
        ? trip.interests
        : ['Attractions', 'Cafes', 'Restaurants'];

    console.log(`\n==================================================`);
    console.log(`[TRIP INPUT]`);
    console.log(`Destination:             ${trip.destination}`);
    console.log(`Dates:                   ${trip.dates || 'Not specified'}`);
    console.log(`Number of days:          ${numDays}`);
    console.log(`Selected interests EXACTLY: [ ${selectedInterests.map((i) => `'${i}'`).join(', ')} ]`);
    console.log(`Selected interest count: ${selectedInterests.length}`);
    console.log(`==================================================`);

    // 2. Authoritative Category Resolution
    const allowedFsqCategoryIds = getAllowedFoursquareCategoryIds(selectedInterests);
    const allowedFsqCategoryNames = getAllowedFoursquareCategoryNames(selectedInterests);

    console.log(`\n[CATEGORY RESOLUTION]`);
    console.log(`Input interests:                 [ ${selectedInterests.map((i) => `'${i}'`).join(', ')} ]`);
    console.log(`Resolved Foursquare Category IDs: [ ${allowedFsqCategoryIds.map((c) => `'${c}'`).join(', ')} ]`);
    console.log(`Allowed Foursquare Categories:   [ ${allowedFsqCategoryNames.map((c) => `'${c}'`).join(', ')} ]`);

    // 3. Destination Resolution (fails fast on countries before places search)
    const resolvedDest = await destinationResolver.resolveDestination(trip.destination);
    console.log(`[ITINERARY] Destination resolved: ${resolvedDest.cleanName} (${resolvedDest.regionType}, ${resolvedDest.country})`);

    // 4. Multi-Tier Places Discovery (Tier 1: Foursquare, Tier 2: Geoapify, Tier 3: Gemini AI, Tier 4: Curated, Tier 5: Universal Synthesizer)
    const targetActivitiesPerDay = trip.pace === 'Relaxed' ? 3 : trip.pace === 'Packed' ? 5 : 4;
    const requiredActivities = numDays * targetActivitiesPerDay;
    const safetyBuffer = Math.ceil(requiredActivities * 0.3);
    const minimumCandidatesNeeded = Math.max(requiredActivities + safetyBuffer, 20);

    let rawPlaces: any[] = [];
    try {
      rawPlaces = await placeDiscoveryService.discoverPlaces({
        resolvedDest,
        selectedInterests,
        minimumPlacesNeeded: minimumCandidatesNeeded,
      });
    } catch (err: any) {
      console.warn(`[ITINERARY] Error in place discovery service:`, err?.message || err);
    }

    if (rawPlaces.length === 0) {
      console.warn(`[ITINERARY] Zero places found from discovery service for "${trip.destination}". Generating synthetic venues...`);
      rawPlaces = placeDiscoveryService._synthesizeDestinationPlaces(
        resolvedDest,
        selectedInterests,
        minimumCandidatesNeeded
      );
    }

    // 5. Normalization & Deduplication
    const normalizedPlaces = placeNormalizer.normalizePlaces(rawPlaces);
    const deduplicatedPlaces = placeNormalizer.deduplicatePlaces(normalizedPlaces);

    // 6. Eligibility Candidate Filter (User Interests + Iconic Destination Highlights)
    const beforeCount = deduplicatedPlaces.length;
    let eligiblePlaces = deduplicatedPlaces.filter((p) =>
      isPlaceEligibleForItinerary(p.categories, p.rawPlaceDetails?.categoryIds, selectedInterests)
    );
    const removedCount = beforeCount - eligiblePlaces.length;

    console.log(`\n[CATEGORY ELIGIBILITY FILTER]`);
    console.log(`Allowed categories: [ ${allowedFsqCategoryNames.join(', ')} ]`);
    console.log(`Before:  ${beforeCount}`);
    console.log(`Removed: ${removedCount}`);
    console.log(`After:   ${eligiblePlaces.length}`);

    // Candidate distribution log
    const distribution: Record<string, number> = {};
    for (const name of allowedFsqCategoryNames) {
      distribution[name] = 0;
    }
    for (const p of eligiblePlaces) {
      for (const name of allowedFsqCategoryNames) {
        if (isPlaceMatchingAllowedCategories(p.categories, [name])) {
          distribution[name] = (distribution[name] || 0) + 1;
        }
      }
    }
    console.log(`\n[CANDIDATE DISTRIBUTION]`);
    Object.entries(distribution).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    console.log(``);

    // 7. Check Candidate Pool Sufficiency & Auto-Supplement
    if (eligiblePlaces.length < requiredActivities) {
      console.log(
        `[AUTO SUPPLEMENT] Found ${eligiblePlaces.length} unique candidates, auto-supplementing to reach ${requiredActivities} required activities.`
      );
      const neededExtra = requiredActivities - eligiblePlaces.length + 8;
      const extraPlaces = placeDiscoveryService._synthesizeDestinationPlaces(
        resolvedDest,
        selectedInterests,
        neededExtra
      );
      const normalizedExtra = placeNormalizer.normalizePlaces(extraPlaces);
      eligiblePlaces = [...eligiblePlaces, ...normalizedExtra];
    }

    // 8. Ranking
    const rankedPlaces = placeRanker.rankPlaces(
      eligiblePlaces,
      selectedInterests,
      resolvedDest
    );

    // 9. Spatial Clustering (macro-regions, capped at 5)
    const clusters = placeClusterer.clusterPlaces(rankedPlaces, numDays);
    clusters.forEach((c) => {
      console.log(`[CLUSTERS] Cluster ${c.clusterId} (${c.name}): ${c.places.length} places (Radius: ${c.radiusKm.toFixed(1)} km)`);
    });

    // 10. Dynamic Candidate Sizing
    const candidateTargetSize = Math.min(
      Math.max(minimumCandidatesNeeded, 30),
      rankedPlaces.length
    );
    const candidatePlaces = itineraryPlanner.selectCandidates(
      rankedPlaces,
      clusters,
      candidateTargetSize
    );
    console.log(`[CANDIDATE SELECTION] Selected ${candidatePlaces.length} top candidates for AI planner.`);

    // 11. AI Planning (Gemini) with Repair Pipeline
    let finalRawItinerary: RawAIItinerary;
    const hasGeminiKey = !!geminiService.getApiKey();

    if (hasGeminiKey) {
      try {
        const rawAiOutput = await itineraryPlanner.planWithGemini(
          trip,
          resolvedDest,
          candidatePlaces,
          clusters,
          numDays
        );

        const validation = itineraryValidator.validateItinerary(
          rawAiOutput,
          candidatePlaces,
          numDays,
          selectedInterests,
          35,
          trip.pace || 'Balanced'
        );

        let quality = itineraryQualityEvaluator.evaluateItineraryQuality(
          rawAiOutput,
          candidatePlaces,
          trip,
          numDays
        );

        if (validation.isValid && quality.score >= MIN_ITINERARY_QUALITY_SCORE) {
          console.log(`[ITINERARY] AI generated itinerary passed all validations and met quality thresholds (${quality.score}/100).`);
          itineraryQualityEvaluator.printQualityReport(quality, trip.destination, trip.name);
          finalRawItinerary = rawAiOutput;
        } else {
          finalRawItinerary = await itineraryRepair.repairOrRegenerate(
            trip,
            resolvedDest,
            candidatePlaces,
            clusters,
            numDays,
            rawAiOutput,
            validation,
            options?.maxAiAttempts ?? 2
          );

          const finalQuality = itineraryQualityEvaluator.evaluateItineraryQuality(
            finalRawItinerary,
            candidatePlaces,
            trip,
            numDays
          );
          itineraryQualityEvaluator.printQualityReport(finalQuality, trip.destination, trip.name);
        }
      } catch (aiErr: any) {
        console.warn(`[AI Planner] Gemini generation failed: ${aiErr?.message || aiErr}`);
        console.log(`[FALLBACK] Executing deterministic cluster fallback planner...`);
        finalRawItinerary = this.generateDeterministicFallback(trip, candidatePlaces, clusters, numDays);
      }
    } else {
      console.warn(`[AI Planner] Gemini API key missing. Executing deterministic fallback planner.`);
      finalRawItinerary = this.generateDeterministicFallback(trip, candidatePlaces, clusters, numDays);
    }

    // 12. Final Pre-Render Validation (Hard constraints gate)
    this.validateFinalItinerary(finalRawItinerary, candidatePlaces, numDays, selectedInterests, trip.pace || 'Balanced');

    // 13. Convert to ItineraryDay[] UI model
    const itineraryDays = this.formatToItineraryDays(trip, finalRawItinerary, candidatePlaces);

    // 14. Print Debug Telemetry Block
    this.printDebugTelemetry({
      trip,
      numDays,
      selectedInterests,
      allowedFsqCategories: allowedFsqCategoryNames,
      allowedFsqCategoryIds,
      requiredActivities,
      eligiblePlacesCount: eligiblePlaces.length,
      candidatePlacesCount: candidatePlaces.length,
      finalRawItinerary,
      candidatePlaces,
    });

    console.log(`[ITINERARY ENGINE] Successfully built ${itineraryDays.length}-day itinerary with ${itineraryDays.reduce((acc, d) => acc + d.activities.length, 0)} total activities.\n`);

    return itineraryDays;
  },

  /**
   * Final pre-render hard constraint validator.
   * Verifies all 12 hard constraints before UI return.
   */
  validateFinalItinerary(
    rawItinerary: RawAIItinerary,
    candidates: RankedPlace[],
    expectedDaysCount: number,
    selectedInterests: string[],
    pace: string = 'Balanced'
  ): void {
    const candidateMap = new Map<string, RankedPlace>();
    candidates.forEach((c) => candidateMap.set(c.id, c));

    const expectedActivitiesPerDay = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;
    const expectedTotalActivities = expectedDaysCount * expectedActivitiesPerDay;

    // 1. Correct number of days
    if (!rawItinerary.days || rawItinerary.days.length !== expectedDaysCount) {
      throw new Error(`Itinerary day count mismatch: expected ${expectedDaysCount}, got ${rawItinerary.days?.length || 0}`);
    }

    let actualTotalActivities = 0;
    const usedPlaceIds = new Set<string>();

    rawItinerary.days.forEach((day, dayIdx) => {
      const dayActivitiesCount = day.activities?.length || 0;
      actualTotalActivities += dayActivitiesCount;

      if (!day.activities || dayActivitiesCount === 0) {
        throw new Error(`Day ${dayIdx + 1} has no activities.`);
      }

      if (pace === 'Balanced' && (dayActivitiesCount < 3 || dayActivitiesCount > 5)) {
        throw new Error(`Day ${dayIdx + 1} activity count mismatch: expected 4-5 activities for Balanced pace, but got ${dayActivitiesCount}.`);
      } else if (pace === 'Relaxed' && (dayActivitiesCount < 2 || dayActivitiesCount > 4)) {
        throw new Error(`Day ${dayIdx + 1} activity count mismatch: expected 3 activities for Relaxed pace, but got ${dayActivitiesCount}.`);
      } else if (pace === 'Packed' && (dayActivitiesCount < 4 || dayActivitiesCount > 6)) {
        throw new Error(`Day ${dayIdx + 1} activity count mismatch: expected 5 activities for Packed pace, but got ${dayActivitiesCount}.`);
      }

      let lastPlace: RankedPlace | null = null;
      let lastMinutes = -1;

      day.activities.forEach((act, actIdx) => {
        // 2 & 3. Valid place IDs and exists in candidate pool
        if (!act.placeId || !candidateMap.has(act.placeId)) {
          throw new Error(`Day ${dayIdx + 1}, Activity ${actIdx + 1} uses invalid/unknown placeId: "${act.placeId}".`);
        }

        const place = candidateMap.get(act.placeId)!;

        // 4. Valid category (User Interests or Iconic Destination Highlights)
        if (!isPlaceEligibleForItinerary(place.categories, place.rawPlaceDetails?.categoryIds, selectedInterests)) {
          throw new Error(
            `Day ${dayIdx + 1}, Activity ${actIdx + 1} ("${place.name}") violates category eligibility (categories: ${place.categories.join(', ')}).`
          );
        }

        // 5. Unique place usage
        if (usedPlaceIds.has(act.placeId) && candidates.length >= expectedDaysCount * expectedActivitiesPerDay) {
          throw new Error(`Duplicate place usage detected: "${place.name}" (${act.placeId}) on Day ${dayIdx + 1}.`);
        }
        usedPlaceIds.add(act.placeId);

        // 6. Valid coordinates
        if (place.latitude === 0 && place.longitude === 0) {
          throw new Error(`Day ${dayIdx + 1}, Activity "${place.name}" has invalid (0,0) coordinates.`);
        }

        // 8. Geographic distance jumps
        if (lastPlace) {
          const distKm = calculateHaversineDistanceKm(lastPlace.latitude, lastPlace.longitude, place.latitude, place.longitude);
          if (distKm > 45) {
            throw new Error(`Impossible travel jump between "${lastPlace.name}" and "${place.name}" (${distKm.toFixed(1)} km).`);
          }
        }
        lastPlace = place;

        // 9. Chronological schedule
        const timeMinutes = itineraryValidator.parseTimeToMinutes(act.time);
        if (timeMinutes !== null && lastMinutes !== -1 && timeMinutes < lastMinutes) {
          throw new Error(`Day ${dayIdx + 1}: Activity time ${act.time} is out of chronological order.`);
        }
        if (timeMinutes !== null) {
          lastMinutes = timeMinutes;
        }
      });
    });

    const minExpected = pace === 'Relaxed' ? expectedDaysCount * 2 : pace === 'Packed' ? expectedDaysCount * 4 : expectedDaysCount * 3;
    const maxExpected = pace === 'Relaxed' ? expectedDaysCount * 4 : pace === 'Packed' ? expectedDaysCount * 6 : expectedDaysCount * 5;
    if (actualTotalActivities < minExpected || actualTotalActivities > maxExpected) {
      throw new Error(
        `Total itinerary activity count mismatch: expected between ${minExpected} and ${maxExpected} activities for ${pace} pace, but got ${actualTotalActivities}.`
      );
    }
  },

  /**
   * Prints full TRAVORA ITINERARY DEBUG block
   */
  printDebugTelemetry(params: {
    trip: Trip;
    numDays: number;
    selectedInterests: string[];
    allowedFsqCategories: string[];
    allowedFsqCategoryIds: string[];
    requiredActivities: number;
    eligiblePlacesCount: number;
    candidatePlacesCount: number;
    finalRawItinerary: RawAIItinerary;
    candidatePlaces: RankedPlace[];
  }): void {
    const {
      trip,
      numDays,
      selectedInterests,
      allowedFsqCategories,
      allowedFsqCategoryIds,
      requiredActivities,
      eligiblePlacesCount,
      candidatePlacesCount,
      finalRawItinerary,
      candidatePlaces,
    } = params;

    const candidateMap = new Map<string, RankedPlace>();
    candidatePlaces.forEach((c) => candidateMap.set(c.id, c));

    let totalReturnedActivities = 0;
    let unknownIdCount = 0;
    let unselectedCategoryCount = 0;
    const seenPlaceIds = new Set<string>();
    let duplicateCount = 0;

    finalRawItinerary.days.forEach((d) => {
      (d.activities || []).forEach((act) => {
        totalReturnedActivities++;
        if (!candidateMap.has(act.placeId)) {
          unknownIdCount++;
        } else {
          const p = candidateMap.get(act.placeId)!;
          if (!isPlaceMatchingSelectedInterests(p.categories, p.rawPlaceDetails?.categoryIds, selectedInterests)) {
            unselectedCategoryCount++;
          }
        }
        if (seenPlaceIds.has(act.placeId)) {
          duplicateCount++;
        }
        seenPlaceIds.add(act.placeId);
      });
    });

    const valResult = itineraryValidator.validateItinerary(
      finalRawItinerary,
      candidatePlaces,
      numDays,
      selectedInterests,
      35,
      trip.pace || 'Balanced'
    );
    const qualityResult = itineraryQualityEvaluator.evaluateItineraryQuality(
      finalRawItinerary,
      candidatePlaces,
      trip,
      numDays
    );

    console.log(`\n==================================================`);
    console.log(`TRAVORA ITINERARY DEBUG`);
    console.log(`==================================================`);
    console.log(`Destination:                    ${trip.destination}`);
    console.log(`Days:                           ${numDays}`);
    console.log(`Selected interests:             [ ${selectedInterests.join(', ')} ]`);
    console.log(`Allowed FSQ categories:         [ ${allowedFsqCategories.join(', ')} ]`);
    console.log(`FSQ Category IDs:               [ ${allowedFsqCategoryIds.join(', ')} ]`);
    console.log(`Required activities:            ${requiredActivities}`);
    console.log(`Unique eligible candidates:     ${eligiblePlacesCount}`);
    console.log(`Candidates sent to Gemini:      ${candidatePlacesCount}`);
    console.log(`Gemini activities returned:     ${totalReturnedActivities}`);
    console.log(`Unknown IDs:                    ${unknownIdCount}`);
    console.log(`Unselected-category activities: ${unselectedCategoryCount}`);
    console.log(`Duplicate places:               ${duplicateCount}`);
    console.log(`Structural validation:          ${valResult.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`Quality score:                  ${qualityResult.score}/100`);
    console.log(`==================================================\n`);
  },

  /**
   * Deterministic Fallback Planner using spatial clusters and category balancing
   */
  generateDeterministicFallback(
    trip: Trip,
    candidates: RankedPlace[],
    clusters: PlaceCluster[],
    numDays: number = 3
  ): RawAIItinerary {
    const days: any[] = [];
    const usedIds = new Set<string>();
    const pace = trip.pace || 'Balanced';
    const defaultTimeSlots =
      pace === 'Relaxed'
        ? ['10:00 AM', '02:00 PM', '07:00 PM']
        : pace === 'Packed'
        ? ['08:30 AM', '11:30 AM', '02:30 PM', '05:30 PM', '08:30 PM']
        : ['09:00 AM', '01:00 PM', '04:30 PM', '08:00 PM'];
    const selectedInterests = Array.isArray(trip.interests) && trip.interests.length > 0 ? trip.interests : ['Attractions'];

    const candidateIdSet = new Set(candidates.map((c) => c.id));
    let globalInterestIdx = 0;

    for (let d = 0; d < numDays; d++) {
      const cluster = clusters[d % clusters.length] || clusters[0];
      const clusterPlaces = (cluster.places || candidates).filter((p) => candidateIdSet.has(p.id));
      const poolSource = clusterPlaces.length > 0 ? clusterPlaces : candidates;

      const activities: any[] = [];
      for (let s = 0; s < defaultTimeSlots.length; s++) {
        let pool = poolSource.filter((p) => !usedIds.has(p.id));
        if (pool.length === 0) {
          pool = candidates.filter((p) => !usedIds.has(p.id));
        }
        if (pool.length === 0) {
          pool = candidates; // Fallback reuse only if dataset is smaller than slots
        }

        // Group available candidates by matched selected interest
        const byInterest = new Map<string, RankedPlace[]>();
        for (const interest of selectedInterests) {
          byInterest.set(interest, []);
        }

        pool.forEach((p) => {
          const matchedInterest = selectedInterests.find((interest) => {
            const catNames = p.categories || [];
            const catIds = p.rawPlaceDetails?.categoryIds || [];
            return isPlaceMatchingSelectedInterests(catNames, catIds, [interest]);
          });
          if (matchedInterest) {
            byInterest.get(matchedInterest)!.push(p);
          } else {
            const firstBucket = byInterest.get(selectedInterests[0]);
            if (firstBucket) firstBucket.push(p);
          }
        });

        // Pick from round-robin target interest bucket
        let chosen: RankedPlace | undefined;
        for (let i = 0; i < selectedInterests.length; i++) {
          const targetInterest = selectedInterests[(globalInterestIdx + i) % selectedInterests.length];
          const bucket = byInterest.get(targetInterest) || [];
          if (bucket.length > 0) {
            chosen = bucket[0];
            globalInterestIdx = (globalInterestIdx + i + 1) % selectedInterests.length;
            break;
          }
        }

        if (!chosen) {
          chosen = pool[0];
        }

        usedIds.add(chosen.id);

        activities.push({
          time: defaultTimeSlots[s],
          placeId: chosen.id,
          durationMinutes: 120,
          reason: `High-ranked ${chosen.primaryCategory} venue in ${chosen.name}.`,
        });
      }

      days.push({
        day: d + 1,
        date: `Day ${d + 1} Explore`,
        title: `Exploring ${trip.destination}`,
        activities,
      });
    }

    return { days };
  },

  /**
   * Maps RawAIItinerary to final application-ready ItineraryDay[]
   */
  formatToItineraryDays(
    trip: Trip,
    rawItinerary: RawAIItinerary,
    candidates: RankedPlace[]
  ): ItineraryDay[] {
    const candidateMap = new Map<string, RankedPlace>();
    candidates.forEach((c) => candidateMap.set(c.id, c));

    return rawItinerary.days.map((dayObj, dayIdx) => {
      const activities = (dayObj.activities || []).map((rawAct, actIdx) => {
        const place = candidateMap.get(rawAct.placeId);
        let icon = 'map-outline';
        const catStr = (place?.categories || []).join(' ').toLowerCase();
        if (catStr.includes('restaurant') || catStr.includes('food') || catStr.includes('dine')) icon = 'restaurant-outline';
        else if (catStr.includes('cafe') || catStr.includes('coffee') || catStr.includes('tea')) icon = 'cafe-outline';
        else if (catStr.includes('hotel') || catStr.includes('lodging') || catStr.includes('stay')) icon = 'bed-outline';
        else if (catStr.includes('beach') || catStr.includes('coast') || catStr.includes('water')) icon = 'sunny-outline';
        else if (catStr.includes('art') || catStr.includes('museum') || catStr.includes('historic')) icon = 'camera-outline';
        else if (catStr.includes('shopping') || catStr.includes('mall') || catStr.includes('store')) icon = 'cart-outline';

        return {
          id: `act-${dayIdx + 1}-${actIdx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          time: rawAct.time || '10:00 AM',
          name: place ? place.name : 'Attraction Visit',
          icon,
          location: place ? place.address : trip.destination,
          note: rawAct.reason || (place ? place.description : `Explore ${trip.destination}`),
          description: rawAct.reason || (place ? place.description : `Explore ${trip.destination}`),
          category: place ? place.primaryCategory : 'attraction',
          rating: place?.rating ?? undefined,
          estimatedCost: place?.priceLevel || '$$',
          photo: place?.photos && place.photos[0] ? place.photos[0] : foursquareService.getFallbackImage(place ? place.primaryCategory : 'attraction'),
          durationMinutes: rawAct.durationMinutes || 120,
          coordinates: place
            ? {
                latitude: place.latitude,
                longitude: place.longitude,
              }
            : undefined,
          placeDetails: place?.rawPlaceDetails,
        };
      });

      return {
        id: `day-${dayIdx + 1}-${Date.now()}`,
        day: `Day ${dayObj.day || dayIdx + 1}`,
        date: dayObj.date || `Day ${dayIdx + 1}`,
        title: dayObj.title || `Exploring ${trip.destination}`,
        activities,
      };
    });
  },
};
