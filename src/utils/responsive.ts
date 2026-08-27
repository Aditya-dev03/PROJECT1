/**
 * Web Responsive Utilities
 * Provides pixel/ratio scaling and viewport helpers for responsive web layouts.
 */

export const isClient = typeof window !== 'undefined';

export const getWindowDimensions = () => {
  if (!isClient) return { width: 1200, height: 800 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const responsiveWidth = (percentOrPx: number): number => {
  return percentOrPx;
};

export const responsiveHeight = (percentOrPx: number): number => {
  return percentOrPx;
};

export const responsiveFont = (fontSize: number): number => {
  return fontSize;
};
