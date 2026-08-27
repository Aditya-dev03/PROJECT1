import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import i18n, { LANGUAGE_MAP } from '../i18n';
import { useUser } from './UserContext';

interface I18nContextType {
  /** Call t('some.key') to get the current locale string */
  t: (scope: string, options?: Record<string, unknown>) => string;
  /** Current locale code, e.g. 'en' | 'hi' | 'fr' | 'es' */
  locale: string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { settings } = useUser();

  // Derive the locale code from the user's language setting string
  const resolvedLocale = LANGUAGE_MAP[settings.language] ?? 'en';

  // Keep a state so that React re-renders when the locale changes
  const [locale, setLocale] = useState(resolvedLocale);

  useEffect(() => {
    const newLocale = LANGUAGE_MAP[settings.language] ?? 'en';
    if (i18n.locale !== newLocale) {
      i18n.locale = newLocale;
      setLocale(newLocale);
    }
  }, [settings.language]);

  // Memoized translate function — recreated whenever locale changes
  const t = useCallback(
    (scope: string, options?: Record<string, unknown>): string => {
      return i18n.t(scope, options);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
