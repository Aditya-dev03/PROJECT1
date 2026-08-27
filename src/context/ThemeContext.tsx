import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const LIGHT_THEME = {
  primary: '#FF5A5F',
  secondary: '#00A699',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',
  input: '#F3F4F6',
  footer: 'rgba(255,255,255,0.9)',
};

export const DARK_THEME = {
  primary: '#FF5A5F',
  secondary: '#00C4B4',
  background: '#0A1A2A',
  surface: '#13273B',
  card: '#183048',
  text: '#F9FAFB',
  textLight: '#94A3B8',
  border: '#243D56',
  white: '#FFFFFF',
  black: '#000000',
  input: '#102133',
  footer: 'rgba(10, 26, 42, 0.95)',
};

type Theme = typeof LIGHT_THEME;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('@travora_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
      try {
        window.localStorage.setItem('@travora_theme', isDark ? 'dark' : 'light');
      } catch (_) {}
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
