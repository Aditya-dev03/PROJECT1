/**
 * Google Authentication Service
 * Supports Google Identity Services (GIS), Supabase Google OAuth,
 * and direct Google profile authentication.
 */

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  photo?: string;
  givenName?: string;
  familyName?: string;
  provider: 'google';
}

declare global {
  interface Window {
    google?: any;
    onGoogleLibraryLoaded?: () => void;
  }
}

/**
 * Decodes standard Google ID token / JWT without external libraries.
 */
export const decodeGoogleJwt = (jwt: string): any => {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('[GOOGLE AUTH] Failed to decode Google JWT token:', err);
    return null;
  }
};

/**
 * Default preset Google accounts for fast, authentic one-click login.
 */
export const PRESET_GOOGLE_ACCOUNTS: GoogleUserProfile[] = [
  {
    id: 'google_aditya_10928374',
    name: 'Aditya Pratap Singh',
    email: 'adityapratapsingh@gmail.com',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    givenName: 'Aditya',
    familyName: 'Singh',
    provider: 'google',
  },
  {
    id: 'google_traveler_84920183',
    name: 'Traveler Explorer',
    email: 'traveler.explorer@gmail.com',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    givenName: 'Traveler',
    familyName: 'Explorer',
    provider: 'google',
  }
];

let isGsiScriptLoading = false;
let isGsiScriptLoaded = false;

/**
 * Loads the official Google Identity Services library.
 */
export const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) {
    isGsiScriptLoaded = true;
    return Promise.resolve(true);
  }
  if (isGsiScriptLoading) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(Boolean(window.google?.accounts?.id));
      }, 4000);
    });
  }

  isGsiScriptLoading = true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGsiScriptLoaded = true;
      isGsiScriptLoading = false;
      resolve(true);
    };
    script.onerror = () => {
      isGsiScriptLoading = false;
      resolve(false);
    };
    document.head.appendChild(script);
  });
};
