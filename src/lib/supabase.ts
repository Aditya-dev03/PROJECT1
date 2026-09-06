import { createClient } from '@supabase/supabase-js';

const cleanUrl = (url: string | undefined): string => {
  if (!url) return '';
  const trimmed = url.replace(/^["']|["']$/g, '').trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '';
};

const getEnv = (key: string): string => {
  let val = '';
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    val = (import.meta.env as any)[`VITE_${key}`] || (import.meta.env as any)[`EXPO_PUBLIC_${key}`] || (import.meta.env as any)[key] || '';
  }
  if (!val && typeof process !== 'undefined' && process.env) {
    val = (process.env as any)[`VITE_${key}`] || (process.env as any)[`EXPO_PUBLIC_${key}`] || (process.env as any)[key] || '';
  }
  if (typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '').trim();
  }
  return '';
};

const configuredUrl = cleanUrl(getEnv('SUPABASE_URL'));
const configuredAnonKey = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  configuredUrl && configuredAnonKey && !configuredUrl.includes('demo-travora')
);

const fallbackUrl = 'https://demo-travora.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key';

const finalUrl = configuredUrl || fallbackUrl;
const finalKey = configuredAnonKey || fallbackKey;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
