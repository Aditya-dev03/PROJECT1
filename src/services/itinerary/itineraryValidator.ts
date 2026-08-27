import {
  RawAIItinerary,
  RankedPlace,
  ValidationResult,
  ValidationError,
} from './itineraryTypes';
import { calculateHaversineDistanceKm } from './destinationResolver';
import {
  getAllowedCategoriesFromInterests,
  isPlaceMatchingAllowedCategories,
  isPlaceMatchingSelectedInterests,
  isPlaceEligibleForItinerary,
} from '../../constants/tripInterests';

export const itineraryValidator = {
  validateItinerary(
    rawItinerary: RawAIItinerary,
    candidates: RankedPlace[],
    expectedDaysCount: number = 3,
    userInterests: string[] = [],
    maxDistanceKmBetweenActivities: number = 35,
    pace: string = 'Balanced'
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const candidateMap = new Map<string, RankedPlace>();
    candidates.forEach((c) => candidateMap.set(c.id, c));
    const allowedGeoCats = getAllowedCategoriesFromInterests(userInterests);

    // 1. Validate structure
    if (!rawItinerary || !Array.isArray(rawItinerary.days) || rawItinerary.days.length === 0) {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: 'Itinerary payload is missing valid "days" array.',
      });
      return { isValid: false, errors };
    }

    const actualDays = rawItinerary.days.length;

    // 2. Validate days count
    if (actualDays !== expectedDaysCount) {
      errors.push({
        type: 'INVALID_DAYS_COUNT',
        message: `Expected ${expectedDaysCount} days, but received ${actualDays} days.`,
      });
    }

    const expectedActivitiesPerDay = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;
    const expectedTotalActivities = expectedDaysCount * expectedActivitiesPerDay;

    const usedPlaceIds = new Set<string>();
    let totalActivities = 0;
    let validPlaceIdCount = 0;
    let invalidPlaceIdCount = 0;
    const unknownIds: string[] = [];
    const actualDailyCounts: number[] = [];

    rawItinerary.days.forEach((dayObj, dayIdx) => {
      const activities = dayObj.activities || [];
      actualDailyCounts.push(activities.length);

      // 3. Validate daily activity counts according to pace
      if (!Array.isArray(activities) || activities.length === 0) {
        errors.push({
          type: 'MISSING_ACTIVITIES',
          message: `Day ${dayIdx + 1} has no activities.`,
          dayIndex: dayIdx,
        });
        return;
      }

      if (pace === 'Balanced') {
        if (activities.length < 3 || activities.length > 5) {
          errors.push({
            type: 'ACTIVITY_COUNT_MISMATCH',
            message: `Day ${dayIdx + 1} contains ${activities.length} activities (expected 4-5 for Balanced pace).`,
            dayIndex: dayIdx,
          });
        }
      } else if (pace === 'Relaxed') {
        if (activities.length < 2 || activities.length > 4) {
          errors.push({
            type: 'ACTIVITY_COUNT_MISMATCH',
            message: `Day ${dayIdx + 1} contains ${activities.length} activities (expected 2-4 for Relaxed pace).`,
            dayIndex: dayIdx,
          });
        }
      } else if (pace === 'Packed') {
        if (activities.length < 4 || activities.length > 6) {
          errors.push({
            type: 'ACTIVITY_COUNT_MISMATCH',
            message: `Day ${dayIdx + 1} contains ${activities.length} activities (expected 5 for Packed pace).`,
            dayIndex: dayIdx,
          });
        }
      }

      if (activities.length > 6) {
        errors.push({
          type: 'EXCESSIVE_ACTIVITIES',
          message: `Day ${dayIdx + 1} contains ${activities.length} activities (exceeds limit of 6 per day).`,
          dayIndex: dayIdx,
        });
      }

      let lastPlace: RankedPlace | null = null;
      let lastMinutes = -1;

      activities.forEach((act, actIdx) => {
        totalActivities++;

        // 4. Validate placeId existence
        if (!act.placeId || !candidateMap.has(act.placeId)) {
          invalidPlaceIdCount++;
          unknownIds.push(act.placeId || 'missing_id');
          errors.push({
            type: 'UNKNOWN_PLACE_ID',
            message: `Day ${dayIdx + 1}, Activity ${actIdx + 1} uses unknown/fake placeId: "${act.placeId}".`,
            dayIndex: dayIdx,
            activityIndex: actIdx,
            details: { placeId: act.placeId },
          });
          return;
        }

        validPlaceIdCount++;
        const place = candidateMap.get(act.placeId)!;

        // 4b. Validate non-zero coordinates
        if (place.latitude === 0 && place.longitude === 0) {
          errors.push({
            type: 'INVALID_COORDINATES',
            message: `Day ${dayIdx + 1}, Activity ${actIdx + 1} ("${place.name}") has invalid (0,0) coordinates.`,
            dayIndex: dayIdx,
            activityIndex: actIdx,
          });
        }

        // 4c. Validate activity category matches user selected interests or is an iconic destination sight
        if (!isPlaceEligibleForItinerary(place.categories, place.rawPlaceDetails?.categoryIds, userInterests)) {
          errors.push({
            type: 'CATEGORY_MISMATCH',
            message: `Day ${dayIdx + 1}, Activity ${actIdx + 1} ("${place.name}") category [${place.categories.join(', ')}] is not eligible.`,
            dayIndex: dayIdx,
            activityIndex: actIdx,
            details: { placeId: act.placeId, placeName: place.name },
          });
        }

        // 5. Validate duplicate place usage across itinerary
        if (usedPlaceIds.has(act.placeId) && candidates.length >= expectedDaysCount * expectedActivitiesPerDay) {
          errors.push({
            type: 'DUPLICATE_PLACE_USAGE',
            message: `Day ${dayIdx + 1}, Activity ${actIdx + 1} reuses place "${place.name}" (${act.placeId}).`,
            dayIndex: dayIdx,
            activityIndex: actIdx,
            details: { placeId: act.placeId },
          });
        }
        usedPlaceIds.add(act.placeId);

        // 6. Validate geographic route distance between consecutive activities on the same day
        if (lastPlace) {
          const distKm = calculateHaversineDistanceKm(
            lastPlace.latitude,
            lastPlace.longitude,
            place.latitude,
            place.longitude
          );
          if (distKm > maxDistanceKmBetweenActivities) {
            errors.push({
              type: 'GEOGRAPHIC_IMPOSSIBILITY',
              message: `Day ${dayIdx + 1}: Travel distance between "${lastPlace.name}" and "${place.name}" is ${distKm.toFixed(1)} km (exceeds limit of ${maxDistanceKmBetweenActivities} km).`,
              dayIndex: dayIdx,
              activityIndex: actIdx,
              details: { distKm, fromPlace: lastPlace.name, toPlace: place.name },
            });
          }
        }
        lastPlace = place;

        // 7. Validate time ordering
        const timeMinutes = this.parseTimeToMinutes(act.time);
        if (timeMinutes !== null && lastMinutes !== -1 && timeMinutes < lastMinutes) {
          errors.push({
            type: 'CHRONOLOGY_MISMATCH',
            message: `Day ${dayIdx + 1}: Activity ${actIdx + 1} time (${act.time}) occurs before previous activity.`,
            dayIndex: dayIdx,
            activityIndex: actIdx,
          });
        }
        if (timeMinutes !== null) {
          lastMinutes = timeMinutes;
        }
      });
    });

    // 8. Total activity count check
    if (pace === 'Balanced' && totalActivities !== expectedTotalActivities) {
      errors.push({
        type: 'ACTIVITY_COUNT_MISMATCH',
        message: `Total itinerary activity count mismatch: expected ${expectedTotalActivities} (${expectedDaysCount} days × 3), but received ${totalActivities}.`,
      });
    }

    const isCountValid =
      actualDays === expectedDaysCount &&
      (pace !== 'Balanced' || (totalActivities === expectedTotalActivities && actualDailyCounts.every((c) => c === 3)));

    console.log(`\n[ACTIVITY COUNT VALIDATION]`);
    console.log(`Expected days:           ${expectedDaysCount}`);
    console.log(`Actual days:             ${actualDays}`);
    console.log(`Expected activities/day: ${expectedActivitiesPerDay}`);
    console.log(`Actual activities/day:   [ ${actualDailyCounts.join(', ')} ]`);
    console.log(`Expected total activities: ${expectedTotalActivities}`);
    console.log(`Actual total activities: ${totalActivities}`);
    console.log(`Status:                  ${isCountValid ? 'PASS' : 'FAIL'}`);

    console.log(`\n[AI OUTPUT VALIDATION]`);
    console.log(`Expected activities: ${expectedTotalActivities}`);
    console.log(`Returned activities: ${totalActivities}`);
    console.log(`Valid place IDs:     ${validPlaceIdCount}`);
    console.log(`Invalid place IDs:   ${invalidPlaceIdCount}`);
    console.log(`Unknown IDs:         ${unknownIds.length > 0 ? unknownIds.join(', ') : 'None'}`);
    console.log(`Status:              ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
    if (errors.length > 0) {
      console.log(`Reason:              ${errors.map((e) => e.type).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3] ? match[3].toUpperCase() : null;

    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  },
};
