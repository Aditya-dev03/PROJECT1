/**
 * Real Google OAuth 2.0 & Google Identity Services (GIS) Service
 * Connects directly to accounts.google.com for authentic Google Account Sign-In.
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
  }
}

const STORAGE_CLIENT_ID_KEY = '@travora_google_client_id';
export const DEFAULT_GOOGLE_CLIENT_ID = '618102475371-co6ac6chp51mp12jqcn56qj411mivqju.apps.googleusercontent.com';

/**
 * Retrieves the configured Google Client ID from environment, localStorage, or default.
 */
export const getGoogleClientId = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) {
    const envId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID).trim();
    if (envId && envId !== '""') return envId;
  }
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_CLIENT_ID_KEY);
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
};

/**
 * Saves a Google Client ID in browser storage.
 */
export const saveGoogleClientId = (clientId: string): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_CLIENT_ID_KEY, clientId.trim());
  }
};

/**
 * Fetches user profile directly from Google's official userinfo endpoint.
 */
export const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserProfile> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google userinfo failed: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.sub || ('google_' + Date.now()),
    name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim() || 'Google User',
    email: data.email,
    photo: data.picture,
    givenName: data.given_name,
    familyName: data.family_name,
    provider: 'google',
  };
};

/**
 * Decodes standard Google ID token / JWT.
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
 * Checks window.location.hash for Google OAuth redirect callback (#access_token=...).
 */
export const checkGoogleOAuthHashCallback = async (): Promise<GoogleUserProfile | null> => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return null;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      const userProfile = await fetchGoogleUserInfo(accessToken);
      // Clean up hash from URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return userProfile;
    }
  } catch (err) {
    console.error('[GOOGLE AUTH] Error in OAuth hash callback:', err);
  }
  return null;
};

/**
 * Launches real Google OAuth 2.0 Web Popup.
 * Connects directly to https://accounts.google.com for authentic Google Account selection.
 */
export const launchGoogleOAuthPopup = async (clientId: string): Promise<GoogleUserProfile> => {
  if (!clientId || !clientId.trim()) {
    throw new Error('Google Client ID is required to launch real Google Login.');
  }

  const cleanClientId = clientId.trim();
  const redirectUri = window.location.origin;
  const scope = encodeURIComponent('openid email profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cleanClientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${scope}&prompt=select_account`;

  // Calculate centered popup dimensions
  const width = 500;
  const height = 620;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    authUrl,
    'Google_Sign_In',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,location=no,toolbar=no`
  );

  if (!popup) {
    // Popup blocked: Fallback to full page redirect
    window.location.href = authUrl;
    return new Promise(() => {}); // never resolves because page redirects
  }

  return new Promise((resolve, reject) => {
    let resolved = false;

    // Check popup URL every 300ms for OAuth redirect
    const interval = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          if (!resolved) {
            reject(new Error('Google sign-in popup was closed before completing.'));
          }
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.startsWith(redirectUri) && popupUrl.includes('access_token=')) {
          clearInterval(interval);
          resolved = true;
          const hash = popup.location.hash.substring(1);
          popup.close();

          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          if (!accessToken) {
            reject(new Error('Google OAuth callback did not contain access_token.'));
            return;
          }

          const userProfile = await fetchGoogleUserInfo(accessToken);
          resolve(userProfile);
        } else if (popupUrl && popupUrl.startsWith(redirectUri) && popupUrl.includes('error=')) {
          clearInterval(interval);
          resolved = true;
          popup.close();
          const params = new URLSearchParams(popup.location.search || popup.location.hash.substring(1));
          reject(new Error(params.get('error_description') || params.get('error') || 'Google sign-in was denied.'));
        }
      } catch {
        // Cross-origin security exception while popup is on accounts.google.com - expected until redirect
      }
    }, 300);

    // Timeout after 2 minutes
    setTimeout(() => {
      if (!resolved) {
        clearInterval(interval);
        if (popup && !popup.closed) popup.close();
        reject(new Error('Google sign-in timed out.'));
      }
    }, 120000);
  });
};

/**
 * Loads the official Google Identity Services library.
 */
let isGsiScriptLoading = false;

export const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) {
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
