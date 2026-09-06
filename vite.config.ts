import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      VITE_GEMINI_API_KEY: JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      EXPO_PUBLIC_GEMINI_API_KEY: JSON.stringify(process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      VITE_FOURSQUARE_API_KEY: JSON.stringify(process.env.VITE_FOURSQUARE_API_KEY || process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || process.env.FOURSQUARE_API_KEY || ''),
      VITE_GEOAPIFY_API_KEY: JSON.stringify(process.env.VITE_GEOAPIFY_API_KEY || process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY || ''),
      VITE_GOOGLE_CLIENT_ID: JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''),
      VITE_SUPABASE_URL: JSON.stringify(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''),
      VITE_SUPABASE_ANON_KEY: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''),
    },
  },
});
