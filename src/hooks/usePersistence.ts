import { useState, useEffect } from 'react';

/**
 * A custom hook to manage persisted state in localStorage for Web.
 */
export function usePersistedState<T>(key: string, initialState: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Failed to read ${key} from localStorage:`, e);
    }
    return initialState;
  });

  const [isLoaded, setIsLoaded] = useState(true);

  // Save to storage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.warn(`Failed to save ${key} to localStorage:`, e);
      }
    }
  }, [key, state]);

  return [state, setState, isLoaded] as const;
}
