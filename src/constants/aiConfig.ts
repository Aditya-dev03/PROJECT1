const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    if (import.meta.env[`EXPO_PUBLIC_${key}`]) return import.meta.env[`EXPO_PUBLIC_${key}`];
    if (import.meta.env[key]) return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`]!;
    if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
    if (process.env[key]) return process.env[key]!;
  }
  return '';
};

export const GEMINI_MODEL = getEnv('GEMINI_MODEL') || 'gemini-2.5-flash';
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Daily Capacity & Route Constraints ─────────────────────────────────────────────
export const MAX_MAJOR_ACTIVITIES_PER_DAY = 5;
export const MAX_DAILY_TRAVEL_TIME_MINUTES = 150;
export const MIN_TRAVEL_BUFFER_MINUTES = 15;
export const DEFAULT_ACTIVITY_DURATION_MINUTES = 90;
export const MAX_DISTANCE_KM_BETWEEN_ACTIVITIES = 35;

// ── Quality Evaluation & Pacing Constants ───────────────────────────────────────────
export const MIN_ITINERARY_QUALITY_SCORE = 70;

export const CATEGORY_VISIT_DURATIONS_MINUTES: Record<string, { min: number; max: number; default: number }> = {
  beach: { min: 60, max: 180, default: 90 },
  cafe: { min: 30, max: 75, default: 45 },
  restaurant: { min: 45, max: 105, default: 75 },
  attraction: { min: 45, max: 150, default: 90 },
  museum: { min: 45, max: 150, default: 90 },
  shopping: { min: 45, max: 120, default: 75 },
  nightlife: { min: 60, max: 180, default: 90 },
  nature: { min: 45, max: 150, default: 90 },
  hotel: { min: 30, max: 60, default: 45 },
};

export const PACE_LIMITS: Record<string, { minDaily: number; maxDaily: number }> = {
  Relaxed: { minDaily: 2, maxDaily: 4 },
  Balanced: { minDaily: 3, maxDaily: 5 },
  Packed: { minDaily: 4, maxDaily: 6 },
};
