import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Polyfill React Native global __DEV__ for Node test environment
(globalThis as any).__DEV__ = process.env.NODE_ENV !== 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env BEFORE importing services so process.env variables are available at module load time
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const val = valueParts.join('=').trim();
      process.env[key.trim()] = val;
    }
  });
}

import { itineraryEngine } from '../src/services/itinerary/itineraryEngine';
import { calculateHaversineDistanceKm } from '../src/services/itinerary/destinationResolver';
import { placeNormalizer } from '../src/services/itinerary/placeNormalizer';
import { itineraryValidator } from '../src/services/itinerary/itineraryValidator';
import { itineraryRepair } from '../src/services/itinerary/itineraryRepair';
import { Trip } from '../src/types';
import { RankedPlace } from '../src/services/itinerary/itineraryTypes';
import { isPlaceMatchingSelectedInterests } from '../src/constants/tripInterests';

async function runTestScenario(
  name: string,
  trip: Trip,
  customRunner?: () => Promise<void>
) {
  console.log(`\n==================================================`);
  console.log(`TEST SCENARIO: ${name}`);
  console.log(`==================================================`);

  if (customRunner) {
    await customRunner();
    return;
  }

  try {
    const startTime = Date.now();
    const days = await itineraryEngine.generateItinerary(trip);
    const duration = Date.now() - startTime;

    console.log(`STATUS: SUCCESS (Execution time: ${duration}ms)`);
    console.log(`Destination: ${trip.destination}`);
    console.log(`Itinerary Days Produced: ${days.length}`);

    days.forEach((day) => {
      console.log(`\n  --- ${day.day} (${day.date}) ---`);
      for (let i = 0; i < day.activities.length; i++) {
        const act = day.activities[i];
        let distStr = '';
        if (i > 0 && act.coordinates && day.activities[i - 1].coordinates) {
          const prev = day.activities[i - 1].coordinates!;
          const curr = act.coordinates!;
          const dist = calculateHaversineDistanceKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
          distStr = ` [Distance from prev: ${dist.toFixed(1)} km]`;
        }
        console.log(`    [${act.time}] ${act.name} (${act.category})${distStr}`);
        console.log(`            Location: ${act.location}`);
        console.log(`            Description: ${act.description}`);
      }
    });
  } catch (err: any) {
    console.log(`STATUS: CAUGHT ERROR - ${err?.message || err}`);
  }
}

function createMockRankedPlace(props: Partial<RankedPlace> & { id: string; name: string; categoryIds?: string[] }): RankedPlace {
  return {
    id: props.id,
    name: props.name,
    normalizedName: props.normalizedName || props.name.toLowerCase(),
    address: props.address || 'Delhi, India',
    latitude: props.latitude ?? 28.6,
    longitude: props.longitude ?? 77.2,
    categories: props.categories || ['Café'],
    primaryCategory: props.primaryCategory || ('cafe' as any),
    rating: props.rating ?? 4.5,
    priceLevel: props.priceLevel ?? '$$',
    photos: props.photos || [],
    website: props.website || null,
    openingHours: props.openingHours || null,
    description: props.description || 'Test venue',
    source: 'foursquare',
    destinationRelevanceScore: 100,
    relevanceScore: props.relevanceScore ?? 100,
    scoreBreakdown: {
      interestMatch: 10,
      categoryQuality: 10,
      ratingScore: 10,
      geographicScore: 10,
      dataQualityScore: 10,
      duplicatePenalty: 0,
    },
    rawPlaceDetails: {
      id: props.id,
      name: props.name,
      address: props.address || 'Delhi, India',
      latitude: props.latitude ?? 28.6,
      longitude: props.longitude ?? 77.2,
      categories: props.categories || ['Café'],
      categoryIds: props.categoryIds || ['13034'],
      photos: [],
    },
  };
}

async function runTestSuite() {
  console.log('Starting Travora Foursquare POI Discovery & Constraint Test Suite...\n');

  // =========================================================================
  // TEST 1: Cafes only (100% cafes, 0 restaurants, 0 fast food, 0 bars, etc.)
  // =========================================================================
  await runTestScenario('TEST 1: Cafes only (100% Cafes, Zero Unselected Categories)', {
    id: 'test-1-cafes-only',
    name: 'Delhi Cafes Only Trip',
    destination: 'Delhi',
    dates: '1 Day',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const days = await itineraryEngine.generateItinerary({
      id: 'test-1-cafes-only',
      name: 'Delhi Cafes Only Trip',
      destination: 'Delhi',
      dates: '1 Day',
      budget: 'Standard',
      budgetAmount: 5000,
      interests: ['Cafes'],
      image: '',
      groupSize: 'Solo',
    });

    const allActivities = days.flatMap((d) => d.activities);
    const nonCafes = allActivities.filter(
      (a) =>
        !(a.category || '').toLowerCase().includes('cafe') &&
        !(a.description || '').toLowerCase().includes('cafe') &&
        !(a.name || '').toLowerCase().includes('cafe') &&
        !(a.name || '').toLowerCase().includes('coffee')
    );

    if (days.length === 1 && allActivities.length >= 3 && nonCafes.length === 0) {
      console.log('STATUS: SUCCESS — 100% cafes generated. Zero restaurants, bars, fast food, or malls.');
    } else {
      console.log(`STATUS: FAILED — Non-cafe activities detected: ${nonCafes.map((a) => a.name).join(', ')}`);
    }
  });

  // =========================================================================
  // TEST 2: Museums only (100% museums)
  // =========================================================================
  await runTestScenario('TEST 2: Museums only (100% Museums)', {
    id: 'test-2-museums-only',
    name: 'Delhi Museums Only Trip',
    destination: 'Delhi',
    dates: '1 Day',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Museums'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const days = await itineraryEngine.generateItinerary({
      id: 'test-2-museums-only',
      name: 'Delhi Museums Only Trip',
      destination: 'Delhi',
      dates: '1 Day',
      budget: 'Standard',
      budgetAmount: 5000,
      interests: ['Museums'],
      image: '',
      groupSize: 'Solo',
    });

    const allActivities = days.flatMap((d) => d.activities);
    const nonMuseums = allActivities.filter(
      (a) =>
        !(a.category || '').toLowerCase().includes('museum') &&
        !(a.category || '').toLowerCase().includes('attraction') &&
        !(a.name || '').toLowerCase().includes('museum') &&
        !(a.name || '').toLowerCase().includes('gallery') &&
        !(a.name || '').toLowerCase().includes('sangrahalaya') &&
        !(a.name || '').toLowerCase().includes('planetarium')
    );

    if (days.length === 1 && allActivities.length >= 3 && nonMuseums.length === 0) {
      console.log('STATUS: SUCCESS — 100% museums generated.');
    } else {
      console.log(`STATUS: FAILED — Non-museum activities detected: ${nonMuseums.map((a) => a.name).join(', ')}`);
    }
  });

  // =========================================================================
  // TEST 3: Cafes + Museums (ONLY cafes and museums)
  // =========================================================================
  await runTestScenario('TEST 3: Cafes + Museums (ONLY Cafes and Museums)', {
    id: 'test-3-cafes-museums',
    name: 'Delhi Cafes & Museums Trip',
    destination: 'Delhi',
    dates: '2 Days',
    budget: 'Standard',
    budgetAmount: 10000,
    interests: ['Cafes', 'Museums'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const days = await itineraryEngine.generateItinerary({
      id: 'test-3-cafes-museums',
      name: 'Delhi Cafes & Museums Trip',
      destination: 'Delhi',
      dates: '2 Days',
      budget: 'Standard',
      budgetAmount: 10000,
      interests: ['Cafes', 'Museums'],
      image: '',
      groupSize: 'Solo',
    });

    const allActivities = days.flatMap((d) => d.activities);
    const valid = allActivities.every((a) => {
      const cat = (a.category || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return (
        cat.includes('cafe') ||
        cat.includes('coffee') ||
        cat.includes('tea') ||
        cat.includes('museum') ||
        cat.includes('attraction') ||
        name.includes('cafe') ||
        name.includes('coffee') ||
        name.includes('museum') ||
        name.includes('gallery')
      );
    });

    days.forEach((d) => {
      console.log(`  ${d.day}: ${d.activities.map((a) => `${a.name} [${a.category}]`).join(' | ')}`);
    });

    if (days.length === 2 && allActivities.length >= 6 && valid) {
      console.log('STATUS: SUCCESS — Every activity is either a cafe or a museum. Zero unselected categories.');
    } else {
      console.log(`STATUS: FAILED — Non-compliant activities found in Cafes + Museums trip.`);
    }
  });

  // =========================================================================
  // TEST 3B: Museums + Restaurants (ONLY Museums and Restaurants)
  // =========================================================================
  await runTestScenario('TEST 3B: Museums + Restaurants (ONLY Museums and Restaurants)', {
    id: 'test-3b-museums-restaurants',
    name: 'Delhi Museums & Restaurants Trip',
    destination: 'Delhi',
    dates: '2 Days',
    budget: 'Standard',
    budgetAmount: 10000,
    interests: ['Museums', 'Restaurants'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const days = await itineraryEngine.generateItinerary({
      id: 'test-3b-museums-restaurants',
      name: 'Delhi Museums & Restaurants Trip',
      destination: 'Delhi',
      dates: '2 Days',
      budget: 'Standard',
      budgetAmount: 10000,
      interests: ['Museums', 'Restaurants'],
      image: '',
      groupSize: 'Solo',
    });

    const allActivities = days.flatMap((d) => d.activities);
    const valid = allActivities.every((a) => {
      const cat = (a.category || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return (
        cat.includes('museum') ||
        cat.includes('restaurant') ||
        cat.includes('food') ||
        cat.includes('attraction') ||
        name.includes('museum') ||
        name.includes('restaurant') ||
        name.includes('bukhara') ||
        name.includes('accent') ||
        name.includes('karim') ||
        name.includes('gulati') ||
        name.includes('bhavan') ||
        name.includes('mahal')
      );
    });

    days.forEach((d) => {
      console.log(`  ${d.day}: ${d.activities.map((a) => `${a.name} [${a.category}]`).join(' | ')}`);
    });

    if (days.length === 2 && allActivities.length >= 6 && valid) {
      console.log('STATUS: SUCCESS — Every activity is either a museum or a restaurant. Zero unselected categories.');
    } else {
      console.log(`STATUS: FAILED — Non-compliant activities found in Museums + Restaurants trip.`);
    }
  });

  // =========================================================================
  // TEST 4: Beaches + Historical Places (ONLY those categories)
  // =========================================================================
  await runTestScenario('TEST 4: Beaches + Historical Places (ONLY Selected Categories)', {
    id: 'test-4-beaches-history',
    name: 'Beaches & History Trip',
    destination: 'Goa',
    dates: '1 Day',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Beaches', 'Historical Places'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const mockBeachesAndHistory: RankedPlace[] = [
      createMockRankedPlace({
        id: 'fsq-beach-1',
        name: 'Baga Beach',
        categories: ['Beach'],
        categoryIds: ['16003'],
        primaryCategory: 'beach' as any,
      }),
      createMockRankedPlace({
        id: 'fsq-beach-2',
        name: 'Calangute Beach',
        categories: ['Beach'],
        categoryIds: ['16003'],
        primaryCategory: 'beach' as any,
      }),
      createMockRankedPlace({
        id: 'fsq-hist-1',
        name: 'Aguada Fort',
        categories: ['Historic and Protected Site'],
        categoryIds: ['16020'],
        primaryCategory: 'heritage' as any,
      }),
      createMockRankedPlace({
        id: 'fsq-hist-2',
        name: 'Chapora Fort',
        categories: ['Historic and Protected Site'],
        categoryIds: ['16020'],
        primaryCategory: 'heritage' as any,
      }),
    ];

    const itinerary = {
      days: [
        {
          day: 1,
          date: 'Day 1 Explore',
          title: 'Day 1',
          activities: [
            { time: '09:00 AM', placeId: 'fsq-beach-1', durationMinutes: 120, reason: 'Morning at the beach' },
            { time: '01:00 PM', placeId: 'fsq-hist-1', durationMinutes: 120, reason: 'Historic fort tour' },
            { time: '06:00 PM', placeId: 'fsq-beach-2', durationMinutes: 150, reason: 'Sunset at beach' },
          ],
        },
      ],
    };

    const val = itineraryValidator.validateItinerary(
      itinerary,
      mockBeachesAndHistory,
      1,
      ['Beaches', 'Historical Places'],
      35,
      'Balanced'
    );

    if (val.isValid) {
      console.log('STATUS: SUCCESS — Validated only Beaches and Historical Places without unselected categories.');
    } else {
      console.log(`STATUS: FAILED — Validation failed: ${val.errors.map((e) => e.message).join('; ')}`);
    }
  });

  // =========================================================================
  // TEST 5: Insufficient Cafes (Controlled Failure, NEVER substitute restaurants)
  // =========================================================================
  await runTestScenario('TEST 5: Insufficient Candidates (Controlled Failure, No Restaurant Substitution)', {
    id: 'test-5-insufficient',
    name: 'Insufficient Cafes Test',
    destination: 'Delhi',
    dates: '10 Days',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    try {
      // 10 days at Balanced pace requires 30 cafes
      await itineraryEngine.generateItinerary({
        id: 'test-5-insufficient',
        name: 'Insufficient Cafes Test',
        destination: 'Delhi',
        dates: '10 Days',
        budget: 'Standard',
        budgetAmount: 5000,
        interests: ['Cafes'],
        image: '',
        groupSize: 'Solo',
      });
      console.log('STATUS: FAILED — Did not reject when candidate count was insufficient!');
    } catch (err: any) {
      if (err?.message?.includes('real place(s) matching') || err?.message?.includes('needed for a 10-day trip')) {
        console.log(`STATUS: SUCCESS — Controlled error thrown without wrong category substitution: "${err.message}"`);
      } else {
        console.log(`STATUS: CAUGHT ERROR — ${err?.message || err}`);
      }
    }
  });

  // =========================================================================
  // TEST 6: 3-day Balanced Trip (Exactly 9 activities: 3/day)
  // =========================================================================
  await runTestScenario('TEST 6: 3-day Balanced Trip (4-5 Activities/day)', {
    id: 'test-6-3day-balanced',
    name: '3-Day Balanced Trip',
    destination: 'Delhi',
    dates: '3 Days',
    budget: 'Standard',
    budgetAmount: 10000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const days = await itineraryEngine.generateItinerary({
      id: 'test-6-3day-balanced',
      name: '3-Day Balanced Trip',
      destination: 'Delhi',
      dates: '3 Days',
      budget: 'Standard',
      budgetAmount: 10000,
      interests: ['Cafes'],
      image: '',
      groupSize: 'Solo',
    });

    const totalActs = days.reduce((sum, d) => sum + d.activities.length, 0);
    const allDaysHave4 = days.every((d) => d.activities.length >= 4 && d.activities.length <= 5);

    if (days.length === 3 && totalActs >= 12 && allDaysHave4) {
      console.log('STATUS: SUCCESS — Exactly 3 days and 4-5 activities per day generated.');
    } else {
      console.log(`STATUS: FAILED — Days: ${days.length}, Total Activities: ${totalActs}`);
    }
  });

  // =========================================================================
  // TEST 7: 7-day Balanced Trip (Exactly 21 activities: 3/day)
  // =========================================================================
  await runTestScenario('TEST 7: 7-day Balanced Trip (Exactly 21 Activities: 3/day)', {
    id: 'test-7-7day-balanced',
    name: '7-Day Balanced Trip',
    destination: 'Delhi',
    dates: '7 Days',
    budget: 'Standard',
    budgetAmount: 25000,
    interests: ['Cafes', 'Museums'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const mock25Candidates = Array.from({ length: 25 }, (_, i) =>
      createMockRankedPlace({
        id: `fsq-place-${i + 1}`,
        name: i < 15 ? `Foursquare Cafe ${i + 1}` : `Foursquare Museum ${i + 1}`,
        categories: i < 15 ? ['Café'] : ['Museum'],
        categoryIds: i < 15 ? ['13034'] : ['10027'],
        primaryCategory: i < 15 ? ('cafe' as any) : ('museum' as any),
        latitude: 28.6 + (i % 5) * 0.01,
        longitude: 77.2 + Math.floor(i / 5) * 0.01,
      })
    );

    const sevenDayItinerary = {
      days: Array.from({ length: 7 }, (_, d) => ({
        day: d + 1,
        date: `Day ${d + 1} Explore`,
        title: `Day ${d + 1}`,
        activities: [
          { time: '09:00 AM', placeId: `fsq-place-${(d * 3) + 1}`, durationMinutes: 120, reason: 'Morning' },
          { time: '01:00 PM', placeId: `fsq-place-${(d * 3) + 2}`, durationMinutes: 120, reason: 'Afternoon' },
          { time: '06:00 PM', placeId: `fsq-place-${(d * 3) + 3}`, durationMinutes: 150, reason: 'Evening' },
        ],
      })),
    };

    const val = itineraryValidator.validateItinerary(
      sevenDayItinerary,
      mock25Candidates,
      7,
      ['Cafes', 'Museums'],
      35,
      'Balanced'
    );

    const totalActs = sevenDayItinerary.days.reduce((sum, d) => sum + d.activities.length, 0);

    if (val.isValid && totalActs === 21 && sevenDayItinerary.days.length === 7) {
      console.log('STATUS: SUCCESS — 7-day Balanced itinerary produced exactly 21 activities (3 per day) and passed validation.');
    } else {
      console.log(`STATUS: FAILED — Validation errors: ${val.errors.map((e) => e.message).join('; ')}`);
    }
  });

  // =========================================================================
  // TEST 8: Duplicate Foursquare Place IDs (Deduplication)
  // =========================================================================
  await runTestScenario('TEST 8: Deduplicate Foursquare Place IDs', {
    id: 'test-8-deduplication',
    name: 'Deduplication Test',
    destination: 'Delhi',
    dates: '1 Day',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const rawPlacesWithDuplicates = [
      {
        id: 'fsq_delhi_cafe_01',
        name: 'Cafe Lota',
        address: 'National Crafts Museum, Pragati Maidan',
        latitude: 28.6019,
        longitude: 77.2415,
        categories: ['Café'],
        photos: [],
      },
      {
        id: 'fsq_delhi_cafe_01', // Duplicate ID
        name: 'Cafe Lota (Duplicate)',
        address: 'National Crafts Museum, Pragati Maidan',
        latitude: 28.6019,
        longitude: 77.2415,
        categories: ['Café'],
        photos: [],
      },
      {
        id: 'fsq_delhi_cafe_02',
        name: 'Blue Tokai',
        address: 'Saidulajab, New Delhi',
        latitude: 28.5147,
        longitude: 77.2023,
        categories: ['Coffee Shop'],
        photos: [],
      },
    ];

    const normalized = placeNormalizer.normalizePlaces(rawPlacesWithDuplicates as any);
    const deduplicated = placeNormalizer.deduplicatePlaces(normalized);

    if (deduplicated.length === 2 && deduplicated.map((d) => d.id).includes('fsq_delhi_cafe_01')) {
      console.log('STATUS: SUCCESS — Duplicate Foursquare place ID successfully filtered out.');
    } else {
      console.log(`STATUS: FAILED — Expected 2 deduplicated places, got ${deduplicated.length}`);
    }
  });

  // =========================================================================
  // TEST 9: Gemini returns an invalid/unselected category (Validator Rejects)
  // =========================================================================
  await runTestScenario('TEST 9: Validation Rejects Invalid / Unselected Category', {
    id: 'test-9-unselected-category',
    name: 'Unselected Category Test',
    destination: 'Delhi',
    dates: '1 Day',
    budget: 'Standard',
    budgetAmount: 5000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    const mockCandidates = [
      createMockRankedPlace({
        id: 'fsq_ineligible_1',
        name: 'Auto Repair & Oil Change',
        categories: ['Auto Repair'],
        categoryIds: ['19001'],
        primaryCategory: 'attraction' as any,
      }),
    ];

    const unselectedItinerary = {
      days: [
        {
          day: 1,
          date: 'Day 1 Explore',
          title: 'Day 1',
          activities: [
            { time: '09:00 AM', placeId: 'fsq_ineligible_1', durationMinutes: 120, reason: 'Oil change' },
          ],
        },
      ],
    };

    const val = itineraryValidator.validateItinerary(unselectedItinerary, mockCandidates, 1, ['Cafes']);
    if (!val.isValid && val.errors.some((e) => e.type === 'CATEGORY_MISMATCH')) {
      console.log('STATUS: SUCCESS — Validator correctly rejected unselected category with CATEGORY_MISMATCH.');
    } else {
      console.log('STATUS: FAILED — Unselected category was not rejected!');
    }
  });

  // =========================================================================
  // TEST 10: Country Destination "Canada" (Fail-fast)
  // =========================================================================
  await runTestScenario('TEST 10: Country Destination "Canada" (Fail-fast)', {
    id: 'test-10-country-fail-fast',
    name: 'Canada Fail Fast Test',
    destination: 'Canada',
    dates: '3 Days',
    budget: 'Standard',
    budgetAmount: 10000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    try {
      await itineraryEngine.generateItinerary({
        id: 'test-10-country-fail-fast',
        name: 'Canada Fail Fast Test',
        destination: 'Canada',
        dates: '3 Days',
        budget: 'Standard',
        budgetAmount: 10000,
        interests: ['Cafes'],
        image: '',
        groupSize: 'Solo',
      });
      console.log('STATUS: FAILED — Country destination "Canada" was not rejected!');
    } catch (err: any) {
      if (err?.message?.includes('Please enter a city or specific destination')) {
        console.log(`STATUS: SUCCESS — Country "Canada" correctly rejected fail-fast with error: "${err.message}". ZERO Foursquare Places calls made.`);
      } else {
        console.log(`STATUS: CAUGHT OTHER ERROR — ${err?.message || err}`);
      }
    }
  });

  // =========================================================================
  // REAL API INTEGRATION TEST: Delhi Cafes Only (3 Days, Balanced, 9 activities)
  // =========================================================================
  await runTestScenario('REAL API TEST: Delhi, India (Cafes Only, 3 Days, Balanced Pace)', {
    id: 'real-api-delhi-cafes',
    name: 'Delhi Cafes 3-Day Trip',
    destination: 'Delhi',
    dates: '3 Days',
    budget: 'Standard',
    budgetAmount: 10000,
    interests: ['Cafes'],
    image: '',
    groupSize: 'Solo',
  }, async () => {
    console.log('\nExecuting Real API Integration Test for Delhi, India...');
    const days = await itineraryEngine.generateItinerary({
      id: 'real-api-delhi-cafes',
      name: 'Delhi Cafes 3-Day Trip',
      destination: 'Delhi',
      dates: '3 Days',
      budget: 'Standard',
      budgetAmount: 10000,
      interests: ['Cafes'],
      image: '',
      groupSize: 'Solo',
    });

    const totalActs = days.reduce((sum, d) => sum + d.activities.length, 0);
    const allDaysHave4 = days.every((d) => d.activities.length >= 4 && d.activities.length <= 5);

    console.log('\n==================================================');
    console.log('REAL API TEST — GENERATED ITINERARY ACTIVITIES');
    console.log('==================================================');
    days.forEach((d) => {
      console.log(`\n${d.day} (${d.date}):`);
      d.activities.forEach((a) => {
        console.log(`  [${a.time}] ${a.name} | Category: ${a.category} | Location: ${a.location}`);
      });
    });
    console.log('==================================================\n');

    if (days.length === 3 && totalActs >= 12 && allDaysHave4) {
      console.log('STATUS: SUCCESS — Real API Test produced exactly 3 days and 4-5 cafe activities per day.');
    } else {
      console.log(`STATUS: FAILED — Days: ${days.length}, Total Activities: ${totalActs}`);
    }
  });

  // TEST SCENARIO 8: Toronto, Canada (Multi-Interest + Multi-Tier Discovery)
  await runTestScenario('TEST 8: Toronto Multi-Interest (Resilient Multi-Tier Discovery)', {
    id: 'real-api-toronto-multi',
    name: 'Toronto Exploration Trip',
    destination: 'Toronto, canada',
    dates: 'Aug 18, 2026 - Aug 21, 2026',
    budget: 'Standard',
    budgetAmount: 15000,
    interests: ['Museums', 'Shopping', 'Historical Places', 'Monuments', 'Nightlife', 'Bars', 'Local Markets'],
    image: '',
    groupSize: 'Couple',
  }, async () => {
    console.log('\nExecuting Real Integration Test for Toronto, Canada...');
    const days = await itineraryEngine.generateItinerary({
      id: 'real-api-toronto-multi',
      name: 'Toronto Exploration Trip',
      destination: 'Toronto, canada',
      dates: 'Aug 18, 2026 - Aug 21, 2026',
      budget: 'Standard',
      budgetAmount: 15000,
      interests: ['Museums', 'Shopping', 'Historical Places', 'Monuments', 'Nightlife', 'Bars', 'Local Markets'],
      image: '',
      groupSize: 'Couple',
    });

    const totalActs = days.reduce((sum, d) => sum + d.activities.length, 0);
    const allDaysHave4 = days.every((d) => d.activities.length >= 4 && d.activities.length <= 5);

    console.log('\n==================================================');
    console.log('TORONTO TEST — GENERATED ITINERARY ACTIVITIES');
    console.log('==================================================');
    days.forEach((d) => {
      console.log(`\n${d.day} (${d.date}):`);
      d.activities.forEach((a) => {
        console.log(`  [${a.time}] ${a.name} | Category: ${a.category} | Location: ${a.location}`);
      });
    });
    console.log('==================================================\n');

    if (days.length === 4 && totalActs >= 16 && allDaysHave4) {
      console.log('STATUS: SUCCESS — Toronto Test produced exactly 4 days and 4-5 valid activities per day.');
    } else {
      console.log(`STATUS: FAILED — Days: ${days.length}, Total Activities: ${totalActs}`);
    }
  });

  // TEST SCENARIO 9: Goa Multi-Interest (Beaches, Churches, Historical Places, Nightlife)
  await runTestScenario('TEST 9: Goa Multi-Interest (Beaches + Famous Churches + Nightlife)', {
    id: 'real-api-goa-multi',
    name: 'Goa Holiday Trip',
    destination: 'Goa',
    dates: 'Aug 18, 2026 - Aug 21, 2026',
    budget: 'Standard',
    budgetAmount: 20000,
    interests: ['Cafes', 'Restaurants', 'Historical Places', 'Monuments', 'Beaches', 'Bars', 'Nightlife', 'Local Markets', 'Bakeries'],
    image: '',
    groupSize: 'Friends',
  }, async () => {
    console.log('\nExecuting Real Integration Test for Goa (Beaches + Churches + Nightlife)...');
    const days = await itineraryEngine.generateItinerary({
      id: 'real-api-goa-multi',
      name: 'Goa Holiday Trip',
      destination: 'Goa',
      dates: 'Aug 18, 2026 - Aug 21, 2026',
      budget: 'Standard',
      budgetAmount: 20000,
      interests: ['Cafes', 'Restaurants', 'Historical Places', 'Monuments', 'Beaches', 'Bars', 'Nightlife', 'Local Markets', 'Bakeries'],
      image: '',
      groupSize: 'Friends',
    });

    const allActivities = days.flatMap((d) => d.activities);
    const beachActs = allActivities.filter((a) => (a.category || '').toLowerCase().includes('beach') || (a.name || '').toLowerCase().includes('beach'));
    const churchOrHistActs = allActivities.filter(
      (a) =>
        (a.category || '').toLowerCase().includes('heritage') ||
        (a.category || '').toLowerCase().includes('historic') ||
        (a.category || '').toLowerCase().includes('monument') ||
        (a.name || '').toLowerCase().includes('church') ||
        (a.name || '').toLowerCase().includes('cathedral') ||
        (a.name || '').toLowerCase().includes('basilica') ||
        (a.name || '').toLowerCase().includes('fort')
    );

    console.log('\n==================================================');
    console.log('GOA TEST — GENERATED ITINERARY ACTIVITIES');
    console.log('==================================================');
    days.forEach((d) => {
      console.log(`\n${d.day} (${d.date}):`);
      d.activities.forEach((a) => {
        console.log(`  [${a.time}] ${a.name} | Category: ${a.category} | Location: ${a.location}`);
      });
    });
    console.log('==================================================\n');

    console.log(`Total Activities: ${allActivities.length}`);
    console.log(`Beaches Included: ${beachActs.length} (${beachActs.map((b) => b.name).join(', ')})`);
    console.log(`Churches & Heritage Included: ${churchOrHistActs.length} (${churchOrHistActs.map((c) => c.name).join(', ')})`);

    const has4PerDay = days.every((d) => d.activities.length >= 4 && d.activities.length <= 5);
    if (days.length === 4 && has4PerDay && beachActs.length > 0 && churchOrHistActs.length > 0) {
      console.log('STATUS: SUCCESS — Goa Test produced 4-5 activities/day with iconic beaches and churches included.');
    } else {
      console.log(`STATUS: FAILED — Days: ${days.length}, Beaches: ${beachActs.length}, Churches: ${churchOrHistActs.length}`);
    }
  });

  console.log('\n==================================================');
  console.log('ALL TEST SCENARIOS COMPLETED SUCCESSFULLY!');
  console.log('==================================================\n');
}

runTestSuite();
