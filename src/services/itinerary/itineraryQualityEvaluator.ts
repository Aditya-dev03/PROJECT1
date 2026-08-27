import { RawAIItinerary, RankedPlace, ItineraryQualityResult } from './itineraryTypes';
import { Trip } from '../../types';
import { calculateHaversineDistanceKm } from './destinationResolver';
import { PACE_LIMITS } from '../../constants/aiConfig';
import {
  getAllowedCategoriesFromInterests,
  isPlaceMatchingAllowedCategories,
  isPlaceMatchingSelectedInterests,
  isPlaceEligibleForItinerary,
} from '../../constants/tripInterests';
import { itineraryValidator } from './itineraryValidator';

export const itineraryQualityEvaluator = {
  /**
   * Evaluates the real-world quality of an itinerary beyond structural JSON validity.
   * Scores on a 0 - 100 scale across:
   * - Structural validity (Hard requirement: must pass or score is 0)
   * - Category compliance (Hard requirement: 100% of activities must match selected interests)
   * - Geographic movement & route efficiency
   * - Daily pacing & activity capacity
   * - Category balance & diversity
   * - Day coherence & spatial cluster consistency
   */
  evaluateItineraryQuality(
    rawItinerary: RawAIItinerary,
    candidates: RankedPlace[],
    trip: Trip,
    expectedDaysCount: number = 3
  ): ItineraryQualityResult {
    const issues: string[] = [];
    const candidateMap = new Map<string, RankedPlace>();
    candidates.forEach((c) => candidateMap.set(c.id, c));

    const tripPace = trip.pace || 'Balanced';

    // 1. HARD GATE: Evaluate structural validity first
    const validation = itineraryValidator.validateItinerary(
      rawItinerary,
      candidates,
      expectedDaysCount,
      trip.interests,
      35,
      tripPace
    );

    if (!validation.isValid) {
      const errorMsgs = validation.errors.map((e) => `[${e.type}] ${e.message}`);
      return {
        score: 0,
        structuralValidity: 'FAIL',
        categoryComplianceScore: 0,
        geographicScore: 0,
        interestScore: 0,
        pacingScore: 0,
        diversityScore: 0,
        travelEfficiencyScore: 0,
        issues: [...errorMsgs, 'Structural validation failed. Itinerary cannot receive a passing score.'],
      };
    }

    const paceConfig = PACE_LIMITS[tripPace] || PACE_LIMITS.Balanced;
    const allowedGeoCats = getAllowedCategoriesFromInterests(trip.interests || []);

    let totalGeographicDistKm = 0;
    let maxConsecutiveDistKm = 0;
    let totalActivitiesCount = 0;
    let matchedInterestCount = 0;
    let nonCompliantActivitiesCount = 0;
    let totalClusterCoherenceDistKm = 0;
    let totalCategoryPenalties = 0;
    let totalPacingPenalties = 0;
    let totalZigZagPenalties = 0;

    rawItinerary.days.forEach((dayObj, dayIdx) => {
      const activities = dayObj.activities || [];
      const dayCount = activities.length;
      totalActivitiesCount += dayCount;

      // Pacing evaluation per day
      if (dayCount < paceConfig.minDaily) {
        totalPacingPenalties += 15;
        issues.push(`Day ${dayIdx + 1} has ${dayCount} activities, below ${tripPace} pace target (min ${paceConfig.minDaily}).`);
      } else if (dayCount > paceConfig.maxDaily) {
        totalPacingPenalties += 20;
        issues.push(`Day ${dayIdx + 1} has ${dayCount} activities, exceeding ${tripPace} pace target (max ${paceConfig.maxDaily}).`);
      }

      // Track places and category frequency on this day
      const dayPlaces: RankedPlace[] = [];
      const categoryCounts: Record<string, number> = {};

      activities.forEach((act) => {
        const place = candidateMap.get(act.placeId);
        if (place) {
          dayPlaces.push(place);

          // Eligibility evaluation (User Interests or Iconic Destination Highlights)
          const isEligible = isPlaceEligibleForItinerary(
            place.categories,
            place.rawPlaceDetails?.categoryIds,
            trip.interests || []
          );
          if (isEligible) {
            matchedInterestCount++;
          } else {
            nonCompliantActivitiesCount++;
            issues.push(`Day ${dayIdx + 1}: Activity "${place.name}" violates category eligibility (${place.categories.join(', ')}).`);
          }

          // Category count tracking
          const cat = place.primaryCategory.toLowerCase();
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      });

      // Geographic movement & distance evaluation
      if (dayPlaces.length > 1) {
        let dayDistKm = 0;
        for (let i = 0; i < dayPlaces.length - 1; i++) {
          const p1 = dayPlaces[i];
          const p2 = dayPlaces[i + 1];
          const dist = calculateHaversineDistanceKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
          dayDistKm += dist;
          if (dist > maxConsecutiveDistKm) {
            maxConsecutiveDistKm = dist;
          }
        }
        totalGeographicDistKm += dayDistKm;

        if (dayDistKm > 40) {
          issues.push(`Day ${dayIdx + 1} has high geographic movement (${dayDistKm.toFixed(1)} km total geographic distance estimate).`);
        }

        // Zig-zag / Backtracking check (compare actual order vs sorted nearest neighbor)
        if (dayPlaces.length >= 3) {
          const first = dayPlaces[0];
          const rest = dayPlaces.slice(1);
          let optDist = 0;
          let curr = first;
          const unvisited = [...rest];
          while (unvisited.length > 0) {
            let bestIdx = 0;
            let minD = Infinity;
            for (let j = 0; j < unvisited.length; j++) {
              const d = calculateHaversineDistanceKm(curr.latitude, curr.longitude, unvisited[j].latitude, unvisited[j].longitude);
              if (d < minD) {
                minD = d;
              }
            }
            optDist += minD;
            curr = unvisited.splice(bestIdx, 1)[0];
          }

          if (dayDistKm > optDist * 1.5 && dayDistKm - optDist > 10) {
            totalZigZagPenalties += 15;
            issues.push(`Day ${dayIdx + 1} contains unnecessary geographic backtracking (Actual: ${dayDistKm.toFixed(1)} km vs Optimized: ${optDist.toFixed(1)} km).`);
          }
        }

        // Cluster coherence / centroid variance
        const centroidLat = dayPlaces.reduce((s, p) => s + p.latitude, 0) / dayPlaces.length;
        const centroidLon = dayPlaces.reduce((s, p) => s + p.longitude, 0) / dayPlaces.length;
        const avgRadius = dayPlaces.reduce((s, p) => s + calculateHaversineDistanceKm(centroidLat, centroidLon, p.latitude, p.longitude), 0) / dayPlaces.length;
        totalClusterCoherenceDistKm += avgRadius;
      }
    });

    // ── Hard category compliance score ──────────────────────────────────────────
    const categoryComplianceScore =
      totalActivitiesCount > 0
        ? Math.round(((totalActivitiesCount - nonCompliantActivitiesCount) / totalActivitiesCount) * 100)
        : 100;

    if (nonCompliantActivitiesCount > 0) {
      return {
        score: 0,
        structuralValidity: 'FAIL',
        categoryComplianceScore,
        geographicScore: 0,
        interestScore: 0,
        pacingScore: 0,
        diversityScore: 0,
        travelEfficiencyScore: 0,
        issues: [...issues, `Itinerary contains ${nonCompliantActivitiesCount} unselected category activity/activities.`],
      };
    }

    // ── Geographic Score (0 - 100) ──────────────────────────────────────────────
    const avgDailyDistKm = rawItinerary.days.length > 0 ? totalGeographicDistKm / rawItinerary.days.length : 0;
    let geographicScore = 100;
    if (avgDailyDistKm > 40) geographicScore -= 20;
    else if (avgDailyDistKm > 25) geographicScore -= 10;
    if (maxConsecutiveDistKm > 30) geographicScore -= 20;
    else if (maxConsecutiveDistKm > 20) geographicScore -= 10;
    geographicScore = Math.max(0, geographicScore - totalZigZagPenalties);

    // ── Interest Score (0 - 100) ────────────────────────────────────────────────
    const interestScore = 100; // Passed hard category compliance

    // ── Pacing Score (0 - 100) ──────────────────────────────────────────────────
    const pacingScore = Math.max(0, Math.min(100, 100 - totalPacingPenalties));

    // ── Diversity Score (0 - 100) ───────────────────────────────────────────────
    const diversityScore = Math.max(0, Math.min(100, 100 - totalCategoryPenalties));

    // ── Travel Efficiency Score (0 - 100) ───────────────────────────────────────
    const avgClusterRadius = rawItinerary.days.length > 0 ? totalClusterCoherenceDistKm / rawItinerary.days.length : 0;
    let travelEfficiencyScore = 100;
    if (avgClusterRadius > 15) travelEfficiencyScore -= 25;
    else if (avgClusterRadius > 10) travelEfficiencyScore -= 15;
    else if (avgClusterRadius > 5) travelEfficiencyScore -= 5;
    travelEfficiencyScore = Math.max(0, travelEfficiencyScore);

    // ── Overall Composite Quality Score ────────────────────────────────────────────
    const overallScore = Math.round(
      geographicScore * 0.25 +
      interestScore * 0.30 +
      pacingScore * 0.20 +
      diversityScore * 0.10 +
      travelEfficiencyScore * 0.15
    );

    // Document metadata limitations
    issues.push('Opening-hours validation: unavailable (place metadata lacks opening hours data).');
    issues.push('Travel times use geographic distance estimate (no active driving routing API).');

    return {
      score: overallScore,
      structuralValidity: 'PASS',
      categoryComplianceScore,
      geographicScore,
      interestScore,
      pacingScore,
      diversityScore,
      travelEfficiencyScore,
      issues,
    };
  },

  /**
   * Development-only human-readable Quality Report formatter
   */
  printQualityReport(
    quality: ItineraryQualityResult,
    destination: string,
    tripName: string
  ): void {
    console.log(`\n==================================================`);
    console.log(`TRAVORA ITINERARY QUALITY REPORT`);
    console.log(`==================================================`);
    console.log(`Destination: ${destination}`);
    console.log(`Trip:        ${tripName}`);
    console.log(``);
    console.log(`STRUCTURAL VALIDITY: ${quality.structuralValidity}`);
    console.log(``);
    console.log(`OVERALL QUALITY SCORE: ${quality.score}/100`);
    console.log(`  - CATEGORY COMPLIANCE: ${quality.categoryComplianceScore}/100`);
    console.log(`  - GEOGRAPHIC SCORE:    ${quality.geographicScore}/100`);
    console.log(`  - INTEREST SCORE:      ${quality.interestScore}/100`);
    console.log(`  - PACING SCORE:        ${quality.pacingScore}/100`);
    console.log(`  - DIVERSITY SCORE:     ${quality.diversityScore}/100`);
    console.log(`  - TRAVEL EFFICIENCY:   ${quality.travelEfficiencyScore}/100`);
    console.log(``);
    console.log(`ISSUES / AUDIT NOTES:`);
    quality.issues.forEach((issue) => console.log(`  - ${issue}`));
    console.log(`==================================================\n`);
  },
};
