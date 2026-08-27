import { I18n } from 'i18n-js';
import en from '../locales/en';
import hi from '../locales/hi';
import fr from '../locales/fr';
import es from '../locales/es';

// Map the language setting strings from UserContext to locale codes
export const LANGUAGE_MAP: Record<string, string> = {
  'English (US)': 'en',
  'Hindi (IN)': 'hi',
  'French (FR)': 'fr',
  'Spanish (ES)': 'es',
};

const i18n = new I18n({
  en,
  hi,
  fr,
  es,
});

// Default to English; no fallback warning
i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export default i18n;
