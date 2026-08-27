import { PlaceDetails } from '../types';
import {
  getAllowedFoursquareCategoryIds,
  getAllowedFoursquareCategoryNames,
  isPlaceMatchingSelectedInterests,
  isPlaceEligibleForItinerary,
} from '../constants/tripInterests';

const getFoursquareApiKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_FOURSQUARE_API_KEY) return import.meta.env.VITE_FOURSQUARE_API_KEY;
    if (import.meta.env.EXPO_PUBLIC_FOURSQUARE_API_KEY) return import.meta.env.EXPO_PUBLIC_FOURSQUARE_API_KEY;
    if (import.meta.env.FOURSQUARE_API_KEY) return import.meta.env.FOURSQUARE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_FOURSQUARE_API_KEY || process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || process.env.FOURSQUARE_API_KEY;
  }
  return undefined;
};

const FOURSQUARE_API_URL = 'https://places-api.foursquare.com/places/search';
const FOURSQUARE_API_VERSION = '2025-06-17';

// ── In-Memory Cache with TTL (24 Hours) ─────────────────────────
const fsqCache: Record<string, { timestamp: number; places: FSQPlace[] }> = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FSQCategory {
  id: number | string;
  name: string;
  short_name?: string;
  plural_name?: string;
  icon?: { prefix: string; suffix: string };
}

export interface FSQLocation {
  address?: string;
  locality?: string;
  region?: string;
  postcode?: string;
  country?: string;
  formatted_address?: string;
}

export interface FSQGeocode {
  latitude: number;
  longitude: number;
}

export interface FSQPlace {
  fsq_id: string;
  name: string;
  categories?: FSQCategory[];
  geocodes?: {
    main?: FSQGeocode;
    roof?: FSQGeocode;
    drop_off?: FSQGeocode;
  };
  location?: FSQLocation;
  distance?: number;
  rating?: number;
  price?: number;
  description?: string;
  website?: string;
  hours?: { display?: string };
  popularity?: number;
}

export interface FoursquareSearchParams {
  latitude: number;
  longitude: number;
  radius?: number; // in meters (default 15000)
  categoryIds?: string[];
  limit?: number; // default 50
  destinationName?: string;
  destinationCountryCode?: string;
  selectedInterests?: string[];
}

// Curated Foursquare places repository for offline / dev test fallback
export const CURATED_FSQ_DESTINATION_PLACES: Record<string, FSQPlace[]> = {
  delhi: [
    {
      fsq_id: 'fsq_delhi_cafe_01',
      name: 'Cafe Lota',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.6019, longitude: 77.2415 } },
      location: { formatted_address: 'National Crafts Museum, Bhairon Marg, Pragati Maidan, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 8.9,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_02',
      name: 'Blue Tokai Coffee Roasters (Saidulajab)',
      categories: [{ id: 13035, name: 'Coffee Shop' }],
      geocodes: { main: { latitude: 28.5147, longitude: 77.2023 } },
      location: { formatted_address: 'Khasra 258, Lane 3, Westend Marg, Saidulajab, New Delhi 110030', country: 'IN', locality: 'New Delhi' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_03',
      name: 'The Grammar Room',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.5244, longitude: 77.1855 } },
      location: { formatted_address: 'One Style Mile, Kalka Das Marg, Mehrauli, New Delhi 110030', country: 'IN', locality: 'New Delhi' },
      rating: 8.8,
      price: 3,
    },
    {
      fsq_id: 'fsq_delhi_cafe_04',
      name: 'Rose Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.5161, longitude: 77.2008 } },
      location: { formatted_address: '2, Westend Marg, Saidulajab, Saket, New Delhi 110030', country: 'IN', locality: 'New Delhi' },
      rating: 8.6,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_05',
      name: 'United Coffee House',
      categories: [{ id: 13032, name: 'Cafe, Coffee, and Tea House' }],
      geocodes: { main: { latitude: 28.6329, longitude: 77.2195 } },
      location: { formatted_address: 'E-15, Inner Circle, Connaught Place, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 8.7,
      price: 3,
    },
    {
      fsq_id: 'fsq_delhi_cafe_06',
      name: 'AMA Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.7011, longitude: 77.2272 } },
      location: { formatted_address: 'House 6, New Aruna Nagar, Majnu-ka-tilla, New Delhi 110054', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_cafe_07',
      name: 'Diggin Cafe (Chanakyapuri)',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.5912, longitude: 77.1893 } },
      location: { formatted_address: '11 Santushti Shopping Complex, Chanakyapuri, New Delhi 110021', country: 'IN', locality: 'New Delhi' },
      rating: 8.8,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_08',
      name: 'Quick Brown Fox Coffee Roasters',
      categories: [{ id: 13035, name: 'Coffee Shop' }],
      geocodes: { main: { latitude: 28.4975, longitude: 77.1994 } },
      location: { formatted_address: '23A, 5A, Dhan Mill Compound, 100 Feet Rd, Chhatarpur, New Delhi 110074', country: 'IN', locality: 'New Delhi' },
      rating: 8.9,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_09',
      name: 'Perch Wine & Coffee Bar (Khan Market)',
      categories: [{ id: 13035, name: 'Coffee Shop' }],
      geocodes: { main: { latitude: 28.6001, longitude: 77.2274 } },
      location: { formatted_address: '71, Khan Market, Rabindra Nagar, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 3,
    },
    {
      fsq_id: 'fsq_delhi_cafe_10',
      name: 'Colocal Chocolates & Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.4988, longitude: 77.1982 } },
      location: { formatted_address: 'The Dhan Mill, 100 Feet Rd, Chhatarpur, New Delhi 110074', country: 'IN', locality: 'New Delhi' },
      rating: 8.7,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_11',
      name: 'Sly Granny Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.6004, longitude: 77.2268 } },
      location: { formatted_address: 'Khan Market, Rabindra Nagar, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 8.5,
      price: 3,
    },
    {
      fsq_id: 'fsq_delhi_cafe_12',
      name: 'Cha Bar (Oxford Bookstore)',
      categories: [{ id: 13036, name: 'Tea Room' }],
      geocodes: { main: { latitude: 28.6305, longitude: 77.2188 } },
      location: { formatted_address: 'N-81, Barakhamba Rd, Connaught Place, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 8.6,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_cafe_13',
      name: 'Fabcafe by the Lake',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 28.5889, longitude: 77.2456 } },
      location: { formatted_address: 'Sunder Nursery, Nizamuddin West, New Delhi 110013', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_14',
      name: 'Coffee Bond',
      categories: [{ id: 13035, name: 'Coffee Shop' }],
      geocodes: { main: { latitude: 28.5528, longitude: 77.2037 } },
      location: { formatted_address: 'M 29, Greater Kailash-1, M Block, New Delhi 110048', country: 'IN', locality: 'New Delhi' },
      rating: 8.6,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_cafe_15',
      name: 'Devan’s South Indian Coffee & Tea',
      categories: [{ id: 13035, name: 'Coffee Shop' }],
      geocodes: { main: { latitude: 28.5866, longitude: 77.2215 } },
      location: { formatted_address: '131, Khanna Market, Lodhi Colony, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.2,
      price: 1,
    },
    // Delhi Museums
    {
      fsq_id: 'fsq_delhi_mus_01',
      name: 'National Museum Delhi',
      categories: [{ id: 10027, name: 'Museum' }],
      geocodes: { main: { latitude: 28.6119, longitude: 77.2193 } },
      location: { formatted_address: 'Janpath, Connaught Place, New Delhi 110011', country: 'IN', locality: 'New Delhi' },
      rating: 9.2,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_02',
      name: 'National Gallery of Modern Art (NGMA)',
      categories: [{ id: 10028, name: 'Art Museum' }],
      geocodes: { main: { latitude: 28.6095, longitude: 77.2346 } },
      location: { formatted_address: 'Jaipur House, Shershah Rd, Near India Gate, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.3,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_03',
      name: 'National Crafts Museum & Hastkala Academy',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.6016, longitude: 77.2422 } },
      location: { formatted_address: 'Bhairon Marg, Pragati Maidan, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_04',
      name: 'National Science Centre Delhi',
      categories: [{ id: 10032, name: 'Science Museum' }],
      geocodes: { main: { latitude: 28.6133, longitude: 77.2458 } },
      location: { formatted_address: 'Near Gate-1, Bhairon Road, Pragati Maidan, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 8.8,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_05',
      name: 'National Rail Museum',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.5855, longitude: 77.1802 } },
      location: { formatted_address: 'Chanakyapuri, New Delhi 110021', country: 'IN', locality: 'New Delhi' },
      rating: 8.9,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_06',
      name: 'Kiran Nadar Museum of Art',
      categories: [{ id: 10028, name: 'Art Museum' }],
      geocodes: { main: { latitude: 28.5284, longitude: 77.2185 } },
      location: { formatted_address: '145, DLF South Court Mall, Saket, New Delhi 110017', country: 'IN', locality: 'New Delhi' },
      rating: 8.9,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_07',
      name: 'Gandhi Smriti Museum',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.6017, longitude: 77.2144 } },
      location: { formatted_address: '5, Tees January Marg, New Delhi 110011', country: 'IN', locality: 'New Delhi' },
      rating: 9.1,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_08',
      name: 'Indira Gandhi Memorial Museum',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.5997, longitude: 77.2008 } },
      location: { formatted_address: '1 Safdarjung Rd, New Delhi 110011', country: 'IN', locality: 'New Delhi' },
      rating: 8.8,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_09',
      name: 'Pradhanmantri Sangrahalaya',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.6006, longitude: 77.1991 } },
      location: { formatted_address: 'Teen Murti Bhavan, New Delhi 110011', country: 'IN', locality: 'New Delhi' },
      rating: 9.4,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_mus_10',
      name: 'Nehru Planetarium',
      categories: [{ id: 10031, name: 'Planetarium' }],
      geocodes: { main: { latitude: 28.6025, longitude: 77.1983 } },
      location: { formatted_address: 'Teen Murti House, New Delhi 110011', country: 'IN', locality: 'New Delhi' },
      rating: 8.7,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_11',
      name: 'Shankar’s International Dolls Museum',
      categories: [{ id: 10029, name: "Children's Museum" }],
      geocodes: { main: { latitude: 28.6293, longitude: 77.2411 } },
      location: { formatted_address: 'Nehru House, 4 Bahadur Shah Zafar Marg, New Delhi 110002', country: 'IN', locality: 'New Delhi' },
      rating: 8.5,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_mus_12',
      name: 'Air Force Museum Delhi',
      categories: [{ id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 28.5772, longitude: 77.1264 } },
      location: { formatted_address: 'Palam, New Delhi 110010', country: 'IN', locality: 'New Delhi' },
      rating: 8.9,
      price: 1,
    },
    // Delhi Restaurants
    {
      fsq_id: 'fsq_delhi_rest_01',
      name: 'Bukhara',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.5975, longitude: 77.1736 } },
      location: { formatted_address: 'ITC Maurya, Diplomatic Enclave, Sardar Patel Marg, New Delhi 110021', country: 'IN', locality: 'New Delhi' },
      rating: 9.5,
      price: 4,
    },
    {
      fsq_id: 'fsq_delhi_rest_02',
      name: 'Indian Accent',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.5922, longitude: 77.2381 } },
      location: { formatted_address: 'The Lodhi, Lodhi Rd, CGO Complex, Pragati Vihar, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.6,
      price: 4,
    },
    {
      fsq_id: 'fsq_delhi_rest_03',
      name: 'Karim’s Historic Mughlai',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6508, longitude: 77.2334 } },
      location: { formatted_address: '16, Gali Kababian, Jama Masjid, Old Delhi 110006', country: 'IN', locality: 'New Delhi' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_rest_04',
      name: 'Gulati Restaurant',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6053, longitude: 77.2308 } },
      location: { formatted_address: '6, Pandara Rd Market, India Gate, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_rest_05',
      name: 'Saravana Bhavan',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6308, longitude: 77.2183 } },
      location: { formatted_address: '46, Janpath, Connaught Place, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_rest_06',
      name: 'Olive Bar & Kitchen',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.5255, longitude: 77.1853 } },
      location: { formatted_address: 'One Style Mile, Haveli 6, Kalka Das Marg, Mehrauli, New Delhi 110030', country: 'IN', locality: 'New Delhi' },
      rating: 9.3,
      price: 3,
    },
    {
      fsq_id: 'fsq_delhi_rest_07',
      name: 'Havemore Restaurant',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6051, longitude: 77.2311 } },
      location: { formatted_address: '11-12, Pandara Rd Market, New Delhi 110003', country: 'IN', locality: 'New Delhi' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_delhi_rest_08',
      name: 'Dum Pukht',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.5977, longitude: 77.1738 } },
      location: { formatted_address: 'ITC Maurya, Sardar Patel Marg, Diplomatic Enclave, New Delhi 110021', country: 'IN', locality: 'New Delhi' },
      rating: 9.4,
      price: 4,
    },
    {
      fsq_id: 'fsq_delhi_rest_09',
      name: 'Andhra Bhavan Canteen',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6186, longitude: 77.2289 } },
      location: { formatted_address: '1, Ashoka Rd, Feroze Shah Road, New Delhi 110001', country: 'IN', locality: 'New Delhi' },
      rating: 9.2,
      price: 1,
    },
    {
      fsq_id: 'fsq_delhi_rest_10',
      name: 'Moti Mahal Delux',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 28.6472, longitude: 77.2405 } },
      location: { formatted_address: '3704, Netaji Subhash Marg, Daryaganj, New Delhi 110002', country: 'IN', locality: 'New Delhi' },
      rating: 9.0,
      price: 2,
    },
  ],
  goa: [
    // Famous Beaches (North & South Goa)
    {
      fsq_id: 'fsq_goa_beach_01',
      name: 'Baga Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.5553, longitude: 73.7517 } },
      location: { formatted_address: 'Baga Beach, Calangute, Goa 403516', country: 'IN', locality: 'Goa' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_02',
      name: 'Calangute Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.5439, longitude: 73.7553 } },
      location: { formatted_address: 'Calangute Beach, Bardez, Goa 403516', country: 'IN', locality: 'Goa' },
      rating: 9.0,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_03',
      name: 'Anjuna Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.5833, longitude: 73.7431 } },
      location: { formatted_address: 'Anjuna Beach, Bardez, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_04',
      name: 'Vagator Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.6028, longitude: 73.7336 } },
      location: { formatted_address: 'Vagator Beach, Bardez, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_05',
      name: 'Palolem Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.0100, longitude: 74.0232 } },
      location: { formatted_address: 'Palolem Beach, Canacona, South Goa 403702', country: 'IN', locality: 'Goa' },
      rating: 9.6,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_06',
      name: 'Morjim Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.6175, longitude: 73.7350 } },
      location: { formatted_address: 'Morjim Beach, Pernem, Goa 403512', country: 'IN', locality: 'Goa' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_beach_07',
      name: 'Colva Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.2785, longitude: 73.9125 } },
      location: { formatted_address: 'Colva Beach, Salcete, South Goa 403708', country: 'IN', locality: 'Goa' },
      rating: 8.9,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_beach_08',
      name: 'Candolim Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.5178, longitude: 73.7628 } },
      location: { formatted_address: 'Candolim Beach Road, Candolim, Goa 403515', country: 'IN', locality: 'Goa' },
      rating: 9.0,
      price: 2,
    },
    // Famous Churches & Historical Places (UNESCO Heritage & Landmarks)
    {
      fsq_id: 'fsq_goa_hist_01',
      name: 'Basilica of Bom Jesus',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 12101, name: 'Church' }],
      geocodes: { main: { latitude: 15.5009, longitude: 73.9116 } },
      location: { formatted_address: 'Old Goa Rd, Bainguinim, Old Goa 403402', country: 'IN', locality: 'Goa' },
      rating: 9.7,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_02',
      name: 'Se Cathedral',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 12101, name: 'Church' }],
      geocodes: { main: { latitude: 15.5033, longitude: 73.9128 } },
      location: { formatted_address: 'Velha Goa, Old Goa 403402', country: 'IN', locality: 'Goa' },
      rating: 9.5,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_03',
      name: 'Church of Our Lady of the Immaculate Conception',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 12101, name: 'Church' }, { id: 16026, name: 'Monument' }],
      geocodes: { main: { latitude: 15.4989, longitude: 73.8278 } },
      location: { formatted_address: 'R. Emidio Garcia, Altinho, Panaji, Goa 403001', country: 'IN', locality: 'Goa' },
      rating: 9.6,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_04',
      name: 'Aguada Fort & Lighthouse',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 16026, name: 'Monument' }],
      geocodes: { main: { latitude: 15.4925, longitude: 73.7736 } },
      location: { formatted_address: 'Aguada Fort Area, Candolim, Goa 403515', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_05',
      name: 'Chapora Fort (Dil Chahta Hai Fort)',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 16026, name: 'Monument' }],
      geocodes: { main: { latitude: 15.6062, longitude: 73.7380 } },
      location: { formatted_address: 'Chapora Fort Trail, Vagator, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_06',
      name: 'Fontainhas Latin Quarter',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 16021, name: 'Heritage' }],
      geocodes: { main: { latitude: 15.4965, longitude: 73.8322 } },
      location: { formatted_address: 'Fontainhas, Altinho, Panaji, Goa 403001', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_07',
      name: 'Reis Magos Fort',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 16024, name: 'Fort' }],
      geocodes: { main: { latitude: 15.4988, longitude: 73.8095 } },
      location: { formatted_address: 'Verem, Bardez, Goa 403114', country: 'IN', locality: 'Goa' },
      rating: 9.2,
      price: 1,
    },
    // Famous Cafes & Bakeries
    {
      fsq_id: 'fsq_goa_cafe_01',
      name: 'Artjuna Garden Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 15.5861, longitude: 73.7472 } },
      location: { formatted_address: '972, Monteiro Vaddo, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_cafe_02',
      name: 'Eva Cafe',
      categories: [{ id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 15.5898, longitude: 73.7411 } },
      location: { formatted_address: 'Praia de Anjuna, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_cafe_03',
      name: 'Babka Goa (Artisanal Bakery & Cafe)',
      categories: [{ id: 13002, name: 'Bakery' }, { id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 15.5841, longitude: 73.7548 } },
      location: { formatted_address: '1282, Gauvaddi, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 2,
    },
    // Famous Restaurants & Shacks
    {
      fsq_id: 'fsq_goa_rest_01',
      name: 'Gunpowder Restaurant',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 15.5975, longitude: 73.7661 } },
      location: { formatted_address: 'No. 6, Saunto Vaddo, Assagao, Goa 403507', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_rest_02',
      name: 'Thalassa Greek Restaurant & Bar',
      categories: [{ id: 13065, name: 'Restaurant' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 15.6322, longitude: 73.7381 } },
      location: { formatted_address: 'Vaddy, Siolim, Goa 403517', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_rest_03',
      name: 'Fisherman’s Wharf',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 15.1747, longitude: 73.9482 } },
      location: { formatted_address: 'Mobor Beach, Cavelossim, South Goa 403731', country: 'IN', locality: 'Goa' },
      rating: 9.2,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_beach_09',
      name: 'Agonda Beach',
      categories: [{ id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.0445, longitude: 73.9875 } },
      location: { formatted_address: 'Agonda Beach Road, Canacona, South Goa 403702', country: 'IN', locality: 'Goa' },
      rating: 9.5,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_hist_08',
      name: 'Cabo de Rama Fort',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 16024, name: 'Fort' }],
      geocodes: { main: { latitude: 15.0886, longitude: 73.9216 } },
      location: { formatted_address: 'Cabo de Rama, Canacona, South Goa 403702', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_cafe_04',
      name: 'The Space Goa Cafe',
      categories: [{ id: 13034, name: 'Café' }, { id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 15.0180, longitude: 74.0310 } },
      location: { formatted_address: '261, Devabhag, Palolem, Canacona, South Goa 403702', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_rest_04',
      name: 'Martin\'s Corner',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 15.3050, longitude: 73.9180 } },
      location: { formatted_address: '69, Binwaddo, Betalbatim, Salcete, South Goa 403713', country: 'IN', locality: 'Goa' },
      rating: 9.5,
      price: 3,
    },
    // Famous Bars, Nightlife & Beach Clubs
    {
      fsq_id: 'fsq_goa_bar_01',
      name: 'Curlies Beach Shack & Bar',
      categories: [{ id: 13003, name: 'Bar' }, { id: 10039, name: 'Night Club' }, { id: 16003, name: 'Beach' }],
      geocodes: { main: { latitude: 15.5786, longitude: 73.7438 } },
      location: { formatted_address: 'Near Flea Market, St Michael Vaddo, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_goa_bar_02',
      name: 'Purple Martini at Sunset Point',
      categories: [{ id: 13006, name: 'Cocktail Bar' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 15.5901, longitude: 73.7410 } },
      location: { formatted_address: 'St. Anthony Praise, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.4,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_bar_03',
      name: 'Club Cubana',
      categories: [{ id: 10039, name: 'Night Club' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 15.5794, longitude: 73.7663 } },
      location: { formatted_address: 'Arpora Hill, Arpora, Goa 403518', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_bar_04',
      name: 'Tito’s Nightclub & Bar',
      categories: [{ id: 10039, name: 'Night Club' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 15.5562, longitude: 73.7533 } },
      location: { formatted_address: 'Tito\'s Lane, Baga, Goa 403516', country: 'IN', locality: 'Goa' },
      rating: 9.0,
      price: 3,
    },
    {
      fsq_id: 'fsq_goa_bar_05',
      name: 'Leopard Valley Nightclub',
      categories: [{ id: 10039, name: 'Night Club' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 15.0350, longitude: 74.0280 } },
      location: { formatted_address: 'Agonda-Palolem Road, Canacona, South Goa 403702', country: 'IN', locality: 'Goa' },
      rating: 9.1,
      price: 3,
    },

    // Famous Markets
    {
      fsq_id: 'fsq_goa_mkt_01',
      name: 'Anjuna Flea Market',
      categories: [{ id: 17069, name: 'Market' }, { id: 17071, name: 'Flea Market' }],
      geocodes: { main: { latitude: 15.5804, longitude: 73.7428 } },
      location: { formatted_address: '10, St. Michael\'s Vaddo, Anjuna, Goa 403509', country: 'IN', locality: 'Goa' },
      rating: 9.1,
      price: 1,
    },
    {
      fsq_id: 'fsq_goa_mkt_02',
      name: 'Saturday Night Market (Arpora)',
      categories: [{ id: 17069, name: 'Market' }, { id: 17074, name: 'Night Market' }],
      geocodes: { main: { latitude: 15.5714, longitude: 73.7699 } },
      location: { formatted_address: 'Aguada - Siolim Rd, Arpora, Goa 403516', country: 'IN', locality: 'Goa' },
      rating: 9.3,
      price: 2,
    },
  ],
  paris: [
    {
      fsq_id: 'fsq_paris_mus_01',
      name: 'Musée du Louvre',
      categories: [{ id: 10027, name: 'Museum' }],
      geocodes: { main: { latitude: 48.8606, longitude: 2.3376 } },
      location: { formatted_address: 'Rue de Rivoli, 75001 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.6,
      price: 2,
    },
    {
      fsq_id: 'fsq_paris_mus_02',
      name: 'Musée d\'Orsay',
      categories: [{ id: 10028, name: 'Art Museum' }],
      geocodes: { main: { latitude: 48.8599, longitude: 2.3265 } },
      location: { formatted_address: '1 Rue de la Légion d\'Honneur, 75007 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.5,
      price: 2,
    },
    {
      fsq_id: 'fsq_paris_mus_03',
      name: 'Centre Pompidou',
      categories: [{ id: 10028, name: 'Art Museum' }],
      geocodes: { main: { latitude: 48.8606, longitude: 2.3522 } },
      location: { formatted_address: 'Place Georges-Pompidou, 75004 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_paris_rest_01',
      name: 'Le Bouillon Chartier',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 48.8719, longitude: 2.3431 } },
      location: { formatted_address: '7 Rue du Faubourg Montmartre, 75009 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 8.9,
      price: 2,
    },
    {
      fsq_id: 'fsq_paris_rest_02',
      name: 'Bistrot Paul Bert',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 48.8524, longitude: 2.3846 } },
      location: { formatted_address: '18 Rue Paul Bert, 75011 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.1,
      price: 3,
    },
    {
      fsq_id: 'fsq_paris_shop_01',
      name: 'Galeries Lafayette Haussmann',
      categories: [{ id: 17114, name: 'Shopping Mall' }],
      geocodes: { main: { latitude: 48.8738, longitude: 2.3322 } },
      location: { formatted_address: '40 Boulevard Haussmann, 75009 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.3,
      price: 3,
    },
    {
      fsq_id: 'fsq_paris_shop_02',
      name: 'Le Bon Marché Rive Gauche',
      categories: [{ id: 17065, name: 'Department Store' }],
      geocodes: { main: { latitude: 48.8512, longitude: 2.3255 } },
      location: { formatted_address: '24 Rue de Sèvres, 75007 Paris, France', country: 'FR', locality: 'Paris' },
      rating: 9.2,
      price: 3,
    },
  ],
  dubai: [
    {
      fsq_id: 'fsq_dubai_shop_01',
      name: 'The Dubai Mall',
      categories: [{ id: 17114, name: 'Shopping Mall' }],
      geocodes: { main: { latitude: 25.1972, longitude: 55.2744 } },
      location: { formatted_address: 'Downtown Dubai, Dubai, UAE', country: 'AE', locality: 'Dubai' },
      rating: 9.5,
      price: 3,
    },
    {
      fsq_id: 'fsq_dubai_shop_02',
      name: 'Mall of the Emirates',
      categories: [{ id: 17114, name: 'Shopping Mall' }],
      geocodes: { main: { latitude: 25.1181, longitude: 55.2006 } },
      location: { formatted_address: 'Al Barsha 1, Dubai, UAE', country: 'AE', locality: 'Dubai' },
      rating: 9.2,
      price: 3,
    },
    {
      fsq_id: 'fsq_dubai_attr_01',
      name: 'Burj Khalifa Observation Deck',
      categories: [{ id: 16000, name: 'Landmark' }],
      geocodes: { main: { latitude: 25.1972, longitude: 55.2744 } },
      location: { formatted_address: '1 Sheikh Mohammed bin Rashid Blvd, Dubai, UAE', country: 'AE', locality: 'Dubai' },
      rating: 9.6,
      price: 3,
    },
    {
      fsq_id: 'fsq_dubai_rest_01',
      name: 'Al Mahara at Burj Al Arab',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 25.1412, longitude: 55.1852 } },
      location: { formatted_address: 'Jumeirah St, Umm Suqeim 3, Dubai, UAE', country: 'AE', locality: 'Dubai' },
      rating: 9.4,
      price: 4,
    },
  ],
  mumbai: [
    {
      fsq_id: 'fsq_mumbai_rest_01',
      name: 'Britannia & Co. Restaurant',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 18.9353, longitude: 72.8398 } },
      location: { formatted_address: 'Wakefield House, 11 Sprott Rd, Ballard Estate, Mumbai 400001', country: 'IN', locality: 'Mumbai' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_mumbai_shop_01',
      name: 'Colaba Causeway Market',
      categories: [{ id: 17069, name: 'Market' }],
      geocodes: { main: { latitude: 18.9220, longitude: 72.8317 } },
      location: { formatted_address: 'Shahid Bhagat Singh Rd, Colaba, Mumbai 400005', country: 'IN', locality: 'Mumbai' },
      rating: 8.8,
      price: 1,
    },
    {
      fsq_id: 'fsq_mumbai_mus_01',
      name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
      categories: [{ id: 10027, name: 'Museum' }],
      geocodes: { main: { latitude: 18.9269, longitude: 72.8327 } },
      location: { formatted_address: '159-161, Mahatma Gandhi Road, Kala Ghoda, Fort, Mumbai 400023', country: 'IN', locality: 'Mumbai' },
      rating: 9.4,
      price: 1,
    },
  ],
  jaipur: [
    {
      fsq_id: 'fsq_jaipur_mon_01',
      name: 'Hawa Mahal',
      categories: [{ id: 16026, name: 'Monument' }],
      geocodes: { main: { latitude: 26.9239, longitude: 75.8267 } },
      location: { formatted_address: 'Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Jaipur 302002', country: 'IN', locality: 'Jaipur' },
      rating: 9.4,
      price: 1,
    },
    {
      fsq_id: 'fsq_jaipur_mon_02',
      name: 'Amer Fort',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }],
      geocodes: { main: { latitude: 26.9855, longitude: 75.8513 } },
      location: { formatted_address: 'Devisinghpura, Amer, Jaipur 302001', country: 'IN', locality: 'Jaipur' },
      rating: 9.6,
      price: 1,
    },
  ],
  rome: [
    {
      fsq_id: 'fsq_rome_mus_01',
      name: 'Colosseum & Roman Forum',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }],
      geocodes: { main: { latitude: 41.8902, longitude: 12.4922 } },
      location: { formatted_address: 'Piazza del Colosseo, 1, 00184 Roma RM, Italy', country: 'IT', locality: 'Rome' },
      rating: 9.7,
      price: 2,
    },
    {
      fsq_id: 'fsq_rome_mus_02',
      name: 'Vatican Museums',
      categories: [{ id: 10027, name: 'Museum' }],
      geocodes: { main: { latitude: 41.9067, longitude: 12.4536 } },
      location: { formatted_address: 'Viale Vaticano, 00165 Roma RM, Italy', country: 'IT', locality: 'Rome' },
      rating: 9.6,
      price: 2,
    },
  ],
  toronto: [
    {
      fsq_id: 'fsq_tor_att_01',
      name: 'CN Tower',
      categories: [{ id: 16026, name: 'Monument' }, { id: 16000, name: 'Landmark' }],
      geocodes: { main: { latitude: 43.6426, longitude: -79.3871 } },
      location: { formatted_address: '290 Bremner Blvd, Toronto, ON M5V 3L9, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.5,
      price: 3,
    },
    {
      fsq_id: 'fsq_tor_mus_01',
      name: 'Royal Ontario Museum (ROM)',
      categories: [{ id: 10027, name: 'Museum' }, { id: 10030, name: 'History Museum' }],
      geocodes: { main: { latitude: 43.6677, longitude: -79.3948 } },
      location: { formatted_address: '100 Queens Park, Toronto, ON M5S 2C6, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.4,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_mus_02',
      name: 'Art Gallery of Ontario (AGO)',
      categories: [{ id: 10028, name: 'Art Museum' }, { id: 10027, name: 'Museum' }],
      geocodes: { main: { latitude: 43.6536, longitude: -79.3925 } },
      location: { formatted_address: '317 Dundas St W, Toronto, ON M5T 1G4, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.3,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_hist_01',
      name: 'Distillery Historic District',
      categories: [{ id: 16020, name: 'Historic and Protected Site' }, { id: 17000, name: 'Shopping' }],
      geocodes: { main: { latitude: 43.6503, longitude: -79.3596 } },
      location: { formatted_address: '55 Mill St, Toronto, ON M5A 3C4, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.4,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_hist_02',
      name: 'Casa Loma',
      categories: [{ id: 16007, name: 'Castle' }, { id: 16020, name: 'Historic and Protected Site' }],
      geocodes: { main: { latitude: 43.6780, longitude: -79.4094 } },
      location: { formatted_address: '1 Austin Terrace, Toronto, ON M5R 1X8, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.2,
      price: 3,
    },
    {
      fsq_id: 'fsq_tor_mkt_01',
      name: 'St. Lawrence Market',
      categories: [{ id: 17069, name: 'Market' }, { id: 17070, name: 'Farmers Market' }],
      geocodes: { main: { latitude: 43.6487, longitude: -79.3715 } },
      location: { formatted_address: '93 Front St E, Toronto, ON M5E 1C3, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.5,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_mkt_02',
      name: 'Kensington Market',
      categories: [{ id: 17069, name: 'Market' }, { id: 17000, name: 'Shopping' }],
      geocodes: { main: { latitude: 43.6548, longitude: -79.4005 } },
      location: { formatted_address: 'Kensington Ave & Augusta Ave, Toronto, ON M5T 2K2, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.3,
      price: 1,
    },
    {
      fsq_id: 'fsq_tor_shop_01',
      name: 'CF Toronto Eaton Centre',
      categories: [{ id: 17114, name: 'Shopping Mall' }, { id: 17000, name: 'Shopping' }],
      geocodes: { main: { latitude: 43.6544, longitude: -79.3807 } },
      location: { formatted_address: '220 Yonge St, Toronto, ON M5B 2H1, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_cafe_01',
      name: 'Dineen Coffee Co.',
      categories: [{ id: 13035, name: 'Coffee Shop' }, { id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 43.6508, longitude: -79.3789 } },
      location: { formatted_address: '140 Yonge St, Toronto, ON M5C 1X6, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_cafe_02',
      name: 'Balzac’s Coffee Roasters (Distillery)',
      categories: [{ id: 13035, name: 'Coffee Shop' }, { id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 43.6506, longitude: -79.3592 } },
      location: { formatted_address: '1 Trinity St, Toronto, ON M5A 3C4, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_cafe_03',
      name: 'Pilot Coffee Roasters',
      categories: [{ id: 13035, name: 'Coffee Shop' }, { id: 13034, name: 'Café' }],
      geocodes: { main: { latitude: 43.6662, longitude: -79.3315 } },
      location: { formatted_address: '50 Wagstaff Dr, Toronto, ON M4L 3W9, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.0,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_bar_01',
      name: 'The Horseshoe Tavern',
      categories: [{ id: 13003, name: 'Bar' }, { id: 10039, name: 'Night Club' }],
      geocodes: { main: { latitude: 43.6477, longitude: -79.4003 } },
      location: { formatted_address: '370 Queen St W, Toronto, ON M5V 2A2, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.1,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_bar_02',
      name: 'Steam Whistle Brewing',
      categories: [{ id: 13027, name: 'Brewery' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 43.6413, longitude: -79.3857 } },
      location: { formatted_address: '255 Bremner Blvd, Toronto, ON M5V 3M9, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.2,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_bar_03',
      name: 'Bar Raval',
      categories: [{ id: 13006, name: 'Cocktail Bar' }, { id: 13003, name: 'Bar' }],
      geocodes: { main: { latitude: 43.6559, longitude: -79.4093 } },
      location: { formatted_address: '505 College St, Toronto, ON M6G 1A5, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.3,
      price: 3,
    },
    {
      fsq_id: 'fsq_tor_bar_04',
      name: 'Mahjong Bar',
      categories: [{ id: 13006, name: 'Cocktail Bar' }, { id: 10039, name: 'Night Club' }],
      geocodes: { main: { latitude: 43.6496, longitude: -79.4208 } },
      location: { formatted_address: '1276 Dundas St W, Toronto, ON M6J 1X7, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.0,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_rest_01',
      name: 'Pai Northern Thai Kitchen',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 43.6479, longitude: -79.3887 } },
      location: { formatted_address: '18 Duncan St, Toronto, ON M5H 3G8, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.5,
      price: 2,
    },
    {
      fsq_id: 'fsq_tor_rest_02',
      name: 'Richmond Station',
      categories: [{ id: 13065, name: 'Restaurant' }],
      geocodes: { main: { latitude: 43.6514, longitude: -79.3798 } },
      location: { formatted_address: '1 Richmond St W, Toronto, ON M5H 3W4, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.4,
      price: 3,
    },
    {
      fsq_id: 'fsq_tor_park_01',
      name: 'High Park',
      categories: [{ id: 16032, name: 'Park' }, { id: 16005, name: 'Botanical Garden' }],
      geocodes: { main: { latitude: 43.6465, longitude: -79.4637 } },
      location: { formatted_address: '1873 Bloor St W, Toronto, ON M6R 2Z3, Canada', country: 'CA', locality: 'Toronto' },
      rating: 9.4,
      price: 1,
    },
  ],
};

export const foursquareService = {
  /**
   * Performs Place Search using the official Foursquare Places API.
   * Authenticates with Bearer token and required header X-Places-Api-Version: 2025-06-17.
   */
  async searchPlaces(params: FoursquareSearchParams): Promise<PlaceDetails[]> {
    const destination = params.destinationName || 'Destination';
    const selectedInterests = params.selectedInterests || [];

    if (params.latitude === 0 && params.longitude === 0) {
      console.warn('[FOURSQUARE] Cannot search places with invalid (0,0) coordinates.');
      return [];
    }

    // Resolve category IDs if not explicitly passed
    const categoryIds =
      params.categoryIds && params.categoryIds.length > 0
        ? params.categoryIds
        : getAllowedFoursquareCategoryIds(selectedInterests);

    const radius = Math.min(params.radius || 15000, 100000);
    const limit = Math.min(params.limit || 50, 50);

    try {
      // ── First Attempt ──────────────────────────────────────────────
      let rawPlaces = await this._fetchFoursquareRaw({
        latitude: params.latitude,
        longitude: params.longitude,
        radius,
        categoryIds,
        limit,
        destinationName: destination,
      });

      let filtered = this._filterFoursquarePlaces(
        rawPlaces,
        params,
        selectedInterests
      );

      // ── Retry with 30km radius if candidates are sparse ────────────
      if (filtered.length < 3 && radius < 30000) {
        console.warn(`[FOURSQUARE] Only ${filtered.length} place(s) found within ${radius}m — expanding search radius to 30000m.`);
        rawPlaces = await this._fetchFoursquareRaw({
          latitude: params.latitude,
          longitude: params.longitude,
          radius: 30000,
          categoryIds,
          limit,
          destinationName: destination,
        });
        filtered = this._filterFoursquarePlaces(
          rawPlaces,
          params,
          selectedInterests
        );
      }

      // ── Deduplicate by fsq_id and normalized name ──────────────────
      const seenFsqIds = new Set<string>();
      const seenNameCoordKeys = new Set<string>();
      const deduplicated: FSQPlace[] = [];

      for (const p of filtered) {
        const idKey = p.fsq_id;
        const lat = p.geocodes?.main?.latitude ?? p.geocodes?.roof?.latitude ?? 0;
        const lon = p.geocodes?.main?.longitude ?? p.geocodes?.roof?.longitude ?? 0;
        const nameCoordKey = `${(p.name || '').toLowerCase().trim()}_${lat.toFixed(3)},${lon.toFixed(3)}`;

        if (!seenFsqIds.has(idKey) && !seenNameCoordKeys.has(nameCoordKey)) {
          seenFsqIds.add(idKey);
          seenNameCoordKeys.add(nameCoordKey);
          deduplicated.push(p);
        }
      }

      // Normalize into Travora PlaceDetails interface
      return deduplicated.map((p) => this._normalizeFoursquarePlace(p, destination, selectedInterests));
    } catch (error: any) {
      console.error('[FOURSQUARE] Places discovery request failed:', error?.message || error);
      return [];
    }
  },

  /**
   * Internal fetch method with in-memory caching and 429 exponential backoff
   */
  async _fetchFoursquareRaw(params: {
    latitude: number;
    longitude: number;
    radius: number;
    categoryIds: string[];
    limit: number;
    destinationName: string;
  }): Promise<FSQPlace[]> {
    const apiKey = getFoursquareApiKey();

    // ── 1. Check in-memory cache first ──────────────────────────────
    const sortedCats = [...(params.categoryIds || [])].sort().join(',');
    const cacheKey = `${params.latitude.toFixed(3)}_${params.longitude.toFixed(3)}_${params.radius}_${sortedCats}_${params.limit}`;

    if (fsqCache[cacheKey] && Date.now() - fsqCache[cacheKey].timestamp < CACHE_TTL_MS) {
      console.log(`[FOURSQUARE CACHE] Cache hit for "${params.destinationName}" (${fsqCache[cacheKey].places.length} places)`);
      return fsqCache[cacheKey].places;
    }

    if (apiKey && !apiKey.startsWith('YOUR_') && apiKey !== 'your_key_here') {
      const url = new URL(FOURSQUARE_API_URL);
      url.searchParams.set('ll', `${params.latitude},${params.longitude}`);
      url.searchParams.set('radius', String(params.radius));
      url.searchParams.set('limit', String(params.limit));

      if (params.categoryIds && params.categoryIds.length > 0) {
        url.searchParams.set('fsq_category_ids', params.categoryIds.join(','));
      }

      url.searchParams.set(
        'fields',
        'fsq_id,name,location,categories,geocodes,rating,price,distance,description,website,hours,popularity'
      );

      console.log(`\n[FOURSQUARE API REQUEST]`);
      console.log(`Endpoint: ${FOURSQUARE_API_URL}`);
      console.log(`Coordinates: ${params.latitude}, ${params.longitude} (Radius: ${params.radius}m)`);
      console.log(`Category IDs: [ ${params.categoryIds.join(', ')} ]`);

      try {
        let response: Response | null = null;
        let attempt = 0;
        const maxRetries = 2;

        while (attempt <= maxRetries) {
          response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-Places-Api-Version': FOURSQUARE_API_VERSION,
              Accept: 'application/json',
            },
          });

          // Handle 429 specifically with backoff retry
          if (response.status === 429 && attempt < maxRetries) {
            attempt++;
            const retryAfterHeader = response.headers?.get('Retry-After');
            const delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : attempt * 1500;
            console.warn(`[FOURSQUARE] Rate limit (429) hit. Backing off for ${delayMs}ms before retry ${attempt}/${maxRetries}...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          break;
        }

        if (response && response.ok) {
          const data = await response.json();
          const results = (data.results || []) as FSQPlace[];
          if (results.length > 0) {
            // Save successful result to cache
            fsqCache[cacheKey] = { timestamp: Date.now(), places: results };
            return results;
          }
        } else if (response) {
          console.warn(`[FOURSQUARE] Live API responded with status ${response.status}: ${response.statusText}. Using curated destination data if available.`);
        }
      } catch (netErr: any) {
        console.warn(`[FOURSQUARE] Live API network request failed: ${netErr?.message}. Using curated destination data if available.`);
      }
    }

    // Fallback to destination-matched curated Foursquare places
    const destLower = params.destinationName.toLowerCase();
    for (const [destKey, places] of Object.entries(CURATED_FSQ_DESTINATION_PLACES)) {
      if (destLower.includes(destKey)) {
        return places;
      }
    }

    // If destination is not in the curated list and live API returned no results, return empty array
    return [];
  },

  /**
   * Filters Foursquare places for geographic accuracy and category compliance
   */
  _filterFoursquarePlaces(
    places: FSQPlace[],
    params: FoursquareSearchParams,
    selectedInterests: string[]
  ): FSQPlace[] {
    const destination = params.destinationName || 'Destination';
    const accepted: FSQPlace[] = [];
    const acceptedCategoryStats: Record<string, number> = {};
    const rejectedCategoryStats: Record<string, number> = {};
    let rejectedCount = 0;

    for (const p of places) {
      if (!p || !p.fsq_id || !p.name) {
        rejectedCount++;
        continue;
      }

      const placeCategories = (p.categories || []).map((c) => c.name);
      const placeCategoryIds = (p.categories || []).map((c) => String(c.id));
      const primaryCat = placeCategories[0] || 'Unknown';

      // 1. Country code check if available
      if (params.destinationCountryCode && p.location?.country) {
        if (p.location.country.toUpperCase() !== params.destinationCountryCode.toUpperCase()) {
          rejectedCount++;
          rejectedCategoryStats[primaryCat] = (rejectedCategoryStats[primaryCat] || 0) + 1;
          continue;
        }
      }

      // 2. Category Validation (Matches Preferences or Iconic Destination Sights)
      const isEligible = isPlaceEligibleForItinerary(
        placeCategories,
        placeCategoryIds,
        selectedInterests
      );

      if (!isEligible) {
        rejectedCount++;
        rejectedCategoryStats[primaryCat] = (rejectedCategoryStats[primaryCat] || 0) + 1;
        continue;
      }

      accepted.push(p);
      acceptedCategoryStats[primaryCat] = (acceptedCategoryStats[primaryCat] || 0) + 1;
    }

    // Output Telemetry Block
    console.log(`\n==================================================`);
    console.log(`[FOURSQUARE DISCOVERY]`);
    console.log(`Destination:        ${destination}`);
    console.log(`Coordinates:        ${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`);
    console.log(`Selected interests: [ ${selectedInterests.map((i) => `'${i}'`).join(', ')} ]`);
    console.log(`\nFoursquare categories requested:`);
    console.log(`IDs:   [ ${(params.categoryIds || []).join(', ')} ]`);
    console.log(`\nRaw places received:   ${places.length}`);
    console.log(`Category-valid places: ${accepted.length}`);
    console.log(`Rejected places:       ${rejectedCount}`);
    console.log(`\nAccepted categories breakdown:`);
    if (Object.keys(acceptedCategoryStats).length === 0) {
      console.log(`  (None)`);
    } else {
      Object.entries(acceptedCategoryStats).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count}`);
      });
    }
    console.log(`\nRejected categories breakdown:`);
    if (Object.keys(rejectedCategoryStats).length === 0) {
      console.log(`  (None)`);
    } else {
      Object.entries(rejectedCategoryStats).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count}`);
      });
    }
    console.log(`==================================================\n`);

    return accepted;
  },

  /**
   * Normalizes a Foursquare Place into Travora's PlaceDetails format
   */
  _normalizeFoursquarePlace(
    p: FSQPlace,
    destination: string,
    selectedInterests: string[]
  ): PlaceDetails {
    const lat = p.geocodes?.main?.latitude ?? p.geocodes?.roof?.latitude ?? 0;
    const lon = p.geocodes?.main?.longitude ?? p.geocodes?.roof?.longitude ?? 0;

    const categories = (p.categories || []).map((c) => c.name);
    const categoryIds = (p.categories || []).map((c) => String(c.id));
    const primaryCategory = categories[0] || (selectedInterests[0] ? selectedInterests[0].toLowerCase() : 'attraction');

    const address =
      p.location?.formatted_address ||
      [p.location?.address, p.location?.locality, p.location?.region, p.location?.country]
        .filter(Boolean)
        .join(', ') ||
      destination;

    // Foursquare ratings are 0 - 10; convert to 0 - 5 scale for Travora UI
    const rating = p.rating ? Math.round((p.rating / 2) * 10) / 10 : 4.5;
    const priceLevel = p.price ? '$'.repeat(Math.min(p.price, 4)) : '$$';

    return {
      id: p.fsq_id,
      name: p.name,
      address,
      latitude: lat,
      longitude: lon,
      rating,
      categories: categories.length > 0 ? categories : [primaryCategory],
      categoryIds,
      photos: [this.getFallbackImage(primaryCategory)],
      priceLevel,
      description: p.description || `Popular ${primaryCategory} in ${destination}.`,
      website: p.website || `https://www.google.com/search?q=${encodeURIComponent(p.name + ' ' + destination)}`,
      hours: p.hours?.display || 'Open daily',
      whyFamous: `Top-rated ${primaryCategory} venue in ${destination}.`,
    };
  },

  /**
   * Fallback Unsplash images matching category types
   */
  getFallbackImage(category: string): string {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('cafe') || catLower.includes('coffee') || catLower.includes('tea')) {
      return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80';
    }
    if (catLower.includes('museum') || catLower.includes('gallery')) {
      return 'https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c?w=800&q=80';
    }
    if (catLower.includes('restaurant') || catLower.includes('food') || catLower.includes('bistro')) {
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80';
    }
    if (catLower.includes('beach') || catLower.includes('surf')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80';
    }
    if (catLower.includes('shopping') || catLower.includes('mall') || catLower.includes('market')) {
      return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80';
    }
    if (catLower.includes('park') || catLower.includes('nature') || catLower.includes('forest')) {
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80';
    }
    if (catLower.includes('monument') || catLower.includes('historic') || catLower.includes('castle')) {
      return 'https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800&q=80';
    }
    if (catLower.includes('night') || catLower.includes('bar') || catLower.includes('pub') || catLower.includes('club')) {
      return 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80';
  },
};
