import { responsiveFont, responsiveWidth } from '../utils/responsive';

export const COLORS = {
  primary: '#FF5A5F', // Airbnb Coral
  secondary: '#00A699', // Airbnb Teal
  background: '#FFFFFF',
  text: '#484848', // Dark gray for text
  textLight: '#767676', // Lighter gray for secondary text
  border: '#EBEBEB',
  white: '#FFFFFF',
  black: '#000000',
};

export const SIZES = {
  base: responsiveWidth(8),
  small: responsiveFont(12),
  font: responsiveFont(14),
  medium: responsiveFont(16),
  large: responsiveFont(18),
  extraLarge: responsiveFont(24),
  title: responsiveFont(32),
  radius: responsiveWidth(12), // Rounded buttons
};
