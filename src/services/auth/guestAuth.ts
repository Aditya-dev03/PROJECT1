// ── Separate key so guest sessions never interfere with real auth ──
const GUEST_STORAGE_KEY = '@travora_guest_session';

export interface GuestUser {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
}

export const GUEST_USER: GuestUser = {
  id: 'guest-user',
  name: 'Guest Traveler',
  email: 'guest@travora.app',
  isGuest: true,
};

/** Persist a guest session locally in localStorage. */
export const loginAsGuest = async (): Promise<GuestUser> => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(GUEST_USER));
  }
  return GUEST_USER;
};

/** Destroy the guest session. */
export const logoutGuest = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  }
};

/**
 * Returns the stored guest user ONLY if one exists.
 */
export const getGuestSession = async (): Promise<GuestUser | null> => {
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.isGuest === true) return parsed as GuestUser;
      }
    }
  } catch (e) {
    console.error('getGuestSession error:', e);
  }
  return null;
};
