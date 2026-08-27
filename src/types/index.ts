export interface Trip {
  id: string;
  name: string;
  destination: string;
  budget: string; // Category like 'Economy', 'Standard', 'Luxury'
  budgetAmount: number; // Numeric max budget
  dates: string;
  interests: string[];
  image: string;
  groupSize: string;
  pace?: 'Relaxed' | 'Balanced' | 'Packed';
  status?: 'Active' | 'Completed';
  joinCode?: string;
  userId?: string;
  user_id?: string;
}


export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string; // Member ID
  category: string;
  createdAt: string;
  splitType: 'Equal' | 'Custom';
  splitParticipants: string[]; // Member IDs
  customSplits?: Record<string, number>; // memberID -> amount
  status?: 'Pending' | 'Settled';
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
  avatar: string;
  email: string;
  role: 'Admin' | 'Member';
}

// ── New: Place & Coordinates ──────────────────────────────────────────
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type PlaceCategory =
  | 'restaurant'
  | 'attraction'
  | 'hotel'
  | 'beach'
  | 'cafe'
  | 'nightlife'
  | 'shopping'
  | 'nature'
  | 'transport'
  | 'museum'
  | 'heritage';

export interface PlaceDetails {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number | null;
  categories: string[];
  categoryIds?: string[];
  photos: string[];
  priceLevel?: string | null;
  description?: string;
  website?: string;
  hours?: string;
  whyFamous?: string;
}

// ── Extended Activity ──────────────────────────────────────────────────
export interface Activity {
  id: string;
  time: string;
  name: string;
  icon: string;
  location?: string;
  note?: string;
  // AI-enriched fields
  category?: PlaceCategory;
  rating?: number;
  estimatedCost?: string;
  description?: string;
  photo?: string;
  coordinates?: Coordinates;
  placeDetails?: PlaceDetails;
}

export interface ItineraryDay {
  id: string;
  day: string;
  date?: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  tripId: string;
  days: ItineraryDay[];
}

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
}

export interface MemberLocation {
  memberId: string;
  name: string;
  avatar: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  status: 'online' | 'offline';
  area: string;
}
