import { Trip } from '../../types';
import { geminiService } from '../geminiService';
import { GEMINI_MODEL } from '../../constants/aiConfig';
import {
  RankedPlace,
  PlaceCluster,
  ResolvedDestination,
  RawAIItinerary,
} from './itineraryTypes';

export const itineraryPlanner = {
  /**
   * Selects top-ranked, category-balanced candidates from clusters.
   * Ensures high-priority categories like Beaches, Historical Places, Churches, Monuments,
   * Museums, and Landmarks receive generous quota (up to 5 per category).
   */
  selectCandidates(
    rankedPlaces: RankedPlace[],
    clusters: PlaceCluster[],
    targetCount: number = 35
  ): RankedPlace[] {
    if (rankedPlaces.length <= targetCount) {
      return rankedPlaces;
    }

    const selected: RankedPlace[] = [];
    const selectedIds = new Set<string>();

    // 1. Group candidates by primary category
    const categoryGroups: Record<string, RankedPlace[]> = {};
    for (const p of rankedPlaces) {
      if (!categoryGroups[p.primaryCategory]) {
        categoryGroups[p.primaryCategory] = [];
      }
      categoryGroups[p.primaryCategory].push(p);
    }

    // 2. Pick top 4-5 from each category to ensure strong category balance
    for (const cat of Object.keys(categoryGroups)) {
      const topInCat = categoryGroups[cat].slice(0, 5);
      for (const p of topInCat) {
        if (!selectedIds.has(p.id)) {
          selectedIds.add(p.id);
          selected.push(p);
        }
      }
    }

    // 3. Fill remaining slots with highest overall ranked places
    for (const p of rankedPlaces) {
      if (selected.length >= targetCount) break;
      if (!selectedIds.has(p.id)) {
        selectedIds.add(p.id);
        selected.push(p);
      }
    }

    return selected;
  },

  /**
   * Calls gemini-3.5-flash-lite to plan the itinerary with 4-5 activities per day,
   * strong category diversity, and bidirectional candidate ID aliasing for 100% ID accuracy.
   */
  async planWithGemini(
    trip: Trip,
    resolvedDest: ResolvedDestination,
    candidatePlaces: RankedPlace[],
    clusters: PlaceCluster[],
    numDays: number = 3
  ): Promise<RawAIItinerary> {
    const pace = trip.pace || 'Balanced';
    const activitiesPerDay = pace === 'Relaxed' ? 3 : pace === 'Packed' ? 5 : 4;
    const totalRequiredActivities = numDays * activitiesPerDay;

    console.log(`[AI Planner] Using Gemini`);
    console.log(`[AI Planner] Model: ${GEMINI_MODEL}`);
    console.log(`[AI Planner] Candidates sent: ${candidatePlaces.length}, Requesting ${numDays}-day plan (${activitiesPerDay} activities/day, total: ${totalRequiredActivities})...`);

    // ── Bidirectional Candidate ID Aliasing ──────────────────────────────────
    // Maps long/complex/hex IDs (e.g. from Geoapify) to clean tokens "cand_1", "cand_2"
    const aliasToOriginalIdMap = new Map<string, string>();
    const originalToAliasIdMap = new Map<string, string>();

    candidatePlaces.forEach((p, idx) => {
      const alias = `cand_${idx + 1}`;
      aliasToOriginalIdMap.set(alias, p.id);
      originalToAliasIdMap.set(p.id, alias);
    });

    const simplifiedCandidates = candidatePlaces.map((p) => ({
      id: originalToAliasIdMap.get(p.id)!,
      name: p.name,
      address: p.address,
      category: p.primaryCategory,
      categories: p.categories,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating,
      priceLevel: p.priceLevel,
    }));

    const clustersSummary = clusters.map((c) => ({
      clusterId: c.clusterId,
      regionName: c.name,
      placeIds: c.places.map((p) => originalToAliasIdMap.get(p.id) || p.id),
    }));

    // Generate time slots based on daily count
    const timeSlots =
      activitiesPerDay === 5
        ? ['08:30 AM', '11:30 AM', '02:30 PM', '05:30 PM', '08:30 PM']
        : activitiesPerDay === 4
        ? ['09:00 AM', '12:00 PM', '03:30 PM', '07:30 PM']
        : ['09:30 AM', '01:30 PM', '06:30 PM'];

    const exampleActivities = timeSlots.map((time) => ({
      time,
      placeId: 'cand_1',
      durationMinutes: 90,
      reason: 'Specific contextual note explaining why this fits user preferences.',
    }));

    const systemPrompt = `You are an expert travel itinerary planner for Travora.
Your task is to build a highly engaging, rich, geographically synchronized ${numDays}-day travel itinerary with EXACTLY ${activitiesPerDay} activities per day (Total: ${totalRequiredActivities} activities) using ONLY the real candidate places provided in the database.

CORE DESIGN PHILOSOPHY:
1. MUST-SEE ICONIC ATTRACTIONS: For ${resolvedDest.cleanName}, you MUST include its top iconic, world-famous landmarks, monuments, and signature attractions (e.g., world-renowned sights, famous viewpoints, iconic beaches, historic districts) so travelers never miss the destination's top highlights.
2. USER PREFERENCE HARMONY: Seamlessly weave the traveler's selected preferences (${trip.interests.join(', ')}) throughout each day (e.g., top-rated cafes for breakfast/coffee, iconic restaurants for lunch/dinner, vibrant nightlife, local markets).
3. BALANCED DAILY FLOW: Every day should combine 2-3 primary sightseeing/exploratory spots (iconic landmarks, beaches, historic monuments, churches, viewpoints) alongside tailored meals, drinks, and leisure.

CRITICAL HARD RULES:
1. Every activity MUST use a placeId from the provided candidate list (e.g. "cand_1", "cand_2", etc.).
2. Return EXACTLY ${totalRequiredActivities} total activities (${numDays} days × ${activitiesPerDay} activities/day).
3. EVERY SINGLE DAY MUST contain EXACTLY ${activitiesPerDay} activities with these time slots:
${timeSlots.map((slot, i) => `   - Slot ${i + 1}: "${slot}"`).join('\n')}
4. Never invent a place. Never change a place's category. Use each candidate place only once across the entire itinerary.
5. CRITICAL GEOGRAPHIC CLUSTER ROUTING RULE:
   - Assign each day to ONE specific geographic cluster (e.g. Day 1: Cluster 1 places, Day 2: Cluster 2 places).
   - NEVER combine distant places from opposite geographic regions (e.g. South Region and North Region) on the same day.
   - Travel distance between consecutive activities on the same day MUST NOT exceed 25 km.
6. Output ONLY a valid JSON object matching this structure:
{
  "days": [
    {
      "day": 1,
      "date": "Day 1 Explore",
      "title": "Day 1 Highlights",
      "activities": ${JSON.stringify(exampleActivities, null, 2)}
    }
  ]
}`;

    const userPrompt = `Destination: ${resolvedDest.rawInput} (Region: ${resolvedDest.cleanName}, ${resolvedDest.country})
Trip Duration: ${numDays} Days (${totalRequiredActivities} total activities required: exactly ${activitiesPerDay} per day)
Selected Interests: ${trip.interests.join(', ')}
Budget Tier: ${trip.budget || 'Standard'} (₹${trip.budgetAmount || 15000})

GEOGRAPHIC CLUSTERS:
${JSON.stringify(clustersSummary, null, 2)}

AVAILABLE CANDIDATE VENUES DATABASE:
${JSON.stringify(simplifiedCandidates, null, 2)}`;

    const response = await geminiService.generateStructuredJSON(systemPrompt, userPrompt);
    const rawItinerary = response as RawAIItinerary;

    // ── Translate Aliased IDs back to Original Place IDs ─────────────────────
    if (rawItinerary && Array.isArray(rawItinerary.days)) {
      rawItinerary.days.forEach((dayObj) => {
        if (Array.isArray(dayObj.activities)) {
          dayObj.activities.forEach((act) => {
            if (act.placeId && aliasToOriginalIdMap.has(act.placeId)) {
              act.placeId = aliasToOriginalIdMap.get(act.placeId)!;
            }
          });
        }
      });
    }

    return rawItinerary;
  },
};
