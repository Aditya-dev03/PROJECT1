import { Trip } from '../../types';
import {
  RawAIItinerary,
  RawAIDay,
  RawAIFlatActivity,
  RankedPlace,
  PlaceCluster,
  ResolvedDestination,
  ValidationResult,
} from './itineraryTypes';
import { itineraryValidator } from './itineraryValidator';
import { itineraryPlanner } from './itineraryPlanner';
import { calculateHaversineDistanceKm } from './destinationResolver';
import {
  isPlaceMatchingSelectedInterests,
  isPlaceEligibleForItinerary,
} from '../../constants/tripInterests';

export const itineraryRepair = {
  /**
   * Deterministically repairs invalid AI itinerary output without extra AI API calls
   */
  repairDeterministically(
    rawItinerary: RawAIItinerary,
    candidates: RankedPlace[],
    clusters: PlaceCluster[],
    numDays: number = 3,
    userInterests: string[] = [],
    pace: string = 'Balanced'
  ): { repairedItinerary: RawAIItinerary; isFullyRepaired: boolean } {
    console.log('[ITINERARY REPAIR] Attempting deterministic repair...');

    const candidateMap = new Map<string, RankedPlace>();
    candidates.forEach((c) => candidateMap.set(c.id, c));

    const usedIds = new Set<string>();
    const defaultTimeSlots = ['09:00 AM', '12:00 PM', '03:30 PM', '07:30 PM', '09:30 PM'];
    const activitiesPerDay = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;

    const repairedDays: RawAIDay[] = [];

    // Ensure we have exactly numDays
    for (let d = 0; d < numDays; d++) {
      const rawDay = rawItinerary.days && rawItinerary.days[d] ? rawItinerary.days[d] : null;
      const dayNum = d + 1;
      const rawActivities = rawDay && Array.isArray(rawDay.activities) ? rawDay.activities : [];

      const cluster = clusters[d % clusters.length] || clusters[0];
      const clusterPlaceIds = new Set((cluster?.places || []).map((p) => p.id));

      const repairedActivities: RawAIFlatActivity[] = [];
      let lastPlace: RankedPlace | null = null;

      for (let s = 0; s < activitiesPerDay; s++) {
        const rawAct: RawAIFlatActivity | undefined = rawActivities[s];
        let chosenPlace: RankedPlace | null = null;

        // Check if raw activity has a valid placeId AND matches selected user interests or is iconic landmark
        if (rawAct && rawAct.placeId && candidateMap.has(rawAct.placeId)) {
          const p = candidateMap.get(rawAct.placeId)!;
          const isCategoryValid =
            userInterests.length === 0 ||
            isPlaceEligibleForItinerary(p.categories, p.rawPlaceDetails?.categoryIds, userInterests);

          let isGeographicallyCoherent = true;
          if (lastPlace) {
            const dist = calculateHaversineDistanceKm(lastPlace.latitude, lastPlace.longitude, p.latitude, p.longitude);
            if (dist > 35) {
              isGeographicallyCoherent = false;
            }
          } else if (cluster) {
            const distFromCentroid = calculateHaversineDistanceKm(
              cluster.centroid.latitude,
              cluster.centroid.longitude,
              p.latitude,
              p.longitude
            );
            if (distFromCentroid > Math.max(cluster.radiusKm + 10, 25)) {
              isGeographicallyCoherent = false;
            }
          }

          if (!usedIds.has(p.id) && isCategoryValid && isGeographicallyCoherent) {
            chosenPlace = p;
          }
        }

        // If no valid place chosen, find best replacement candidate matching selected user interests or iconic sights
        if (!chosenPlace) {
          const matchingCandidates =
            userInterests.length > 0
              ? candidates.filter((c) =>
                  isPlaceEligibleForItinerary(c.categories, c.rawPlaceDetails?.categoryIds, userInterests)
                )
              : candidates;

          const unusedMatching = matchingCandidates.filter((c) => !usedIds.has(c.id));

          // First priority: unused matching candidates in the same geographic cluster
          const clusterUnused = unusedMatching.filter((c) => clusterPlaceIds.has(c.id));
          let pool = clusterUnused.length > 0 ? clusterUnused : unusedMatching.length > 0 ? unusedMatching : matchingCandidates;

          if (pool.length > 0) {
            if (lastPlace) {
              // Strictly filter for places within 35km of previous activity
              const nearbyInPool = pool.filter((c) => {
                const d = calculateHaversineDistanceKm(lastPlace!.latitude, lastPlace!.longitude, c.latitude, c.longitude);
                return d <= 35;
              });

              if (nearbyInPool.length > 0) {
                let minDistance = Infinity;
                for (const candidate of nearbyInPool) {
                  const dist = calculateHaversineDistanceKm(
                    lastPlace.latitude,
                    lastPlace.longitude,
                    candidate.latitude,
                    candidate.longitude
                  );
                  if (dist < minDistance) {
                    minDistance = dist;
                    chosenPlace = candidate;
                  }
                }
              } else {
                // If pool has none nearby, search entire unusedMatching list for <= 35km
                const nearbyUnused = unusedMatching.filter((c) => {
                  const d = calculateHaversineDistanceKm(lastPlace!.latitude, lastPlace!.longitude, c.latitude, c.longitude);
                  return d <= 35;
                });
                if (nearbyUnused.length > 0) {
                  chosenPlace = nearbyUnused[0];
                }
              }
            }

            if (!chosenPlace) {
              chosenPlace = pool[0];
            }
          }

        }

        if (chosenPlace) {
          usedIds.add(chosenPlace.id);
          lastPlace = chosenPlace;

          repairedActivities.push({
            time: rawAct?.time || defaultTimeSlots[s] || '06:00 PM',
            placeId: chosenPlace.id,
            durationMinutes: rawAct?.durationMinutes || (s === 0 ? 120 : s === 1 ? 120 : 150),
            reason: rawAct?.reason || `High-rated venue matching ${chosenPlace.primaryCategory} in destination.`,
          });
        }
      }

      // Route ordering optimization pass: sort activities to eliminate unnecessary geographic backtracking
      if (repairedActivities.length >= 2) {
        const sortedActs: RawAIFlatActivity[] = [];
        const unvisited = [...repairedActivities];
        let currAct = unvisited.shift()!;
        sortedActs.push(currAct);

        while (unvisited.length > 0) {
          const currPlace = candidateMap.get(currAct.placeId);
          let bestIdx = 0;
          let minDistance = Infinity;

          if (currPlace) {
            for (let i = 0; i < unvisited.length; i++) {
              const targetPlace = candidateMap.get(unvisited[i].placeId);
              if (targetPlace) {
                const dist = calculateHaversineDistanceKm(
                  currPlace.latitude,
                  currPlace.longitude,
                  targetPlace.latitude,
                  targetPlace.longitude
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  bestIdx = i;
                }
              }
            }
          }

          currAct = unvisited.splice(bestIdx, 1)[0];
          sortedActs.push(currAct);
        }

        // Reassign ordered times
        sortedActs.forEach((act, idx) => {
          act.time = defaultTimeSlots[idx] || act.time;
        });

        repairedDays.push({
          day: dayNum,
          date: rawDay?.date || `Day ${dayNum} Explore`,
          title: rawDay?.title || `Day ${dayNum}`,
          activities: sortedActs,
        });
      } else {
        repairedDays.push({
          day: dayNum,
          date: rawDay?.date || `Day ${dayNum} Explore`,
          title: rawDay?.title || `Day ${dayNum}`,
          activities: repairedActivities,
        });
      }
    }

    const repairedItinerary: RawAIItinerary = { days: repairedDays };
    const validation = itineraryValidator.validateItinerary(
      repairedItinerary,
      candidates,
      numDays,
      userInterests,
      35,
      pace
    );

    console.log(
      `[ITINERARY REPAIR] Deterministic repair result: ${
        validation.isValid ? 'SUCCESS' : 'PARTIAL (Errors remaining: ' + validation.errors.length + ')'
      }`
    );

    return {
      repairedItinerary,
      isFullyRepaired: validation.isValid,
    };
  },

  /**
   * Complete repair pipeline:
   * 1. Deterministic repair
   * 2. AI Regeneration (max 2 attempts)
   * 3. Deterministic Fallback if all AI attempts fail
   */
  async repairOrRegenerate(
    trip: Trip,
    resolvedDest: ResolvedDestination,
    candidates: RankedPlace[],
    clusters: PlaceCluster[],
    numDays: number = 3,
    initialItinerary: RawAIItinerary,
    initialValidation: ValidationResult,
    maxAiAttempts: number = 2
  ): Promise<RawAIItinerary> {
    console.warn(`[ITINERARY REPAIR] Initial AI output failed validation with ${initialValidation.errors.length} error(s).`);
    initialValidation.errors.forEach((err) => console.warn(`  - [${err.type}] ${err.message}`));

    // Step 1: Try deterministic repair
    const detResult = this.repairDeterministically(
      initialItinerary,
      candidates,
      clusters,
      numDays,
      trip.interests,
      trip.pace || 'Balanced'
    );

    if (detResult.isFullyRepaired) {
      console.log('[ITINERARY REPAIR] Deterministic repair fixed all errors successfully.');
      return detResult.repairedItinerary;
    }

    // Step 2: AI Regeneration attempts (up to maxAiAttempts)
    let attempt = 0;
    let currentItinerary = detResult.repairedItinerary;

    while (attempt < maxAiAttempts) {
      attempt++;
      console.log(`[ITINERARY REPAIR] AI Regeneration Attempt ${attempt} of ${maxAiAttempts}...`);
      try {
        const regenerated = await itineraryPlanner.planWithGemini(
          trip,
          resolvedDest,
          candidates,
          clusters,
          numDays
        );
        const valResult = itineraryValidator.validateItinerary(
          regenerated,
          candidates,
          numDays,
          trip.interests,
          35,
          trip.pace || 'Balanced'
        );

        if (valResult.isValid) {
          console.log(`[ITINERARY REPAIR] AI Regeneration Attempt ${attempt} succeeded!`);
          return regenerated;
        } else {
          // Attempt deterministic repair on regenerated payload
          const subRepair = this.repairDeterministically(
            regenerated,
            candidates,
            clusters,
            numDays,
            trip.interests,
            trip.pace || 'Balanced'
          );
          if (subRepair.isFullyRepaired) {
            console.log(`[ITINERARY REPAIR] Deterministic repair on AI Attempt ${attempt} succeeded!`);
            return subRepair.repairedItinerary;
          }
          currentItinerary = subRepair.repairedItinerary;
        }
      } catch (err: any) {
        console.error(`[ITINERARY REPAIR] AI Regeneration Attempt ${attempt} thrown error:`, err?.message || err);
      }
    }

    console.warn('[ITINERARY REPAIR] All AI regeneration attempts exhausted. Returning best repaired deterministic itinerary.');
    return currentItinerary;
  },
};
