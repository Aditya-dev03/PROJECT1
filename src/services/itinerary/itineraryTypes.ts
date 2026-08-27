import { Trip, ItineraryDay, Activity, PlaceDetails, PlaceCategory } from '../../types';

export type RegionType = 'city' | 'state' | 'island' | 'region' | 'country';

export interface ResolvedDestination {
  rawInput: string;
  cleanName: string;
  cityName: string;
  state: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  regionType: RegionType;
  formattedAddress: string;
  boundingRadiusKm: number;
  allowableLocationKeywords: string[];
}

export interface NormalizedPlace {
  id: string;
  name: string;
  normalizedName: string;
  address: string;
  latitude: number;
  longitude: number;
  categories: string[];
  primaryCategory: PlaceCategory;
  rating: number | null;
  priceLevel: string | null;
  photos: string[];
  website: string | null;
  openingHours: string | null;
  description: string;
  source: 'foursquare' | 'geoapify' | 'custom' | 'fallback';
  destinationRelevanceScore: number;
  rawPlaceDetails: PlaceDetails;
}

export type CanonicalPlace = NormalizedPlace;

export interface RankedPlace extends NormalizedPlace {
  relevanceScore: number;
  scoreBreakdown: {
    interestMatch: number;
    categoryQuality: number;
    ratingScore: number;
    geographicScore: number;
    dataQualityScore: number;
    duplicatePenalty: number;
  };
}

export interface PlaceCluster {
  clusterId: string;
  name: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  places: RankedPlace[];
  radiusKm: number;
}

export interface RawAIFlatActivity {
  time: string;
  placeId: string;
  durationMinutes?: number;
  reason?: string;
  slot?: string;
}

export interface RawAIDay {
  day: number | string;
  date?: string;
  title?: string;
  activities: RawAIFlatActivity[];
}

export interface RawAIItinerary {
  days: RawAIDay[];
}

export interface ValidationError {
  type:
    | 'INVALID_STRUCTURE'
    | 'INVALID_DAYS_COUNT'
    | 'UNKNOWN_PLACE_ID'
    | 'DUPLICATE_PLACE_USAGE'
    | 'GEOGRAPHIC_IMPOSSIBILITY'
    | 'CHRONOLOGY_MISMATCH'
    | 'MISSING_ACTIVITIES'
    | 'CATEGORY_MISMATCH'
    | 'EXCESSIVE_ACTIVITIES'
    | 'INVALID_COORDINATES'
    | 'OVERLAPPING_SCHEDULE'
    | 'ACTIVITY_COUNT_MISMATCH'
    | 'INSUFFICIENT_DAILY_ACTIVITIES';
  message: string;
  dayIndex?: number;
  activityIndex?: number;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ItineraryGenerationOptions {
  maxAiAttempts?: number;
  enableAiRepair?: boolean;
  debugMode?: boolean;
}

export interface ItineraryQualityResult {
  score: number; // 0 - 100
  structuralValidity: 'PASS' | 'FAIL';
  categoryComplianceScore: number; // 0 - 100
  geographicScore: number; // 0 - 100
  interestScore: number; // 0 - 100
  pacingScore: number; // 0 - 100
  diversityScore: number; // 0 - 100
  travelEfficiencyScore: number; // 0 - 100
  issues: string[];
}


