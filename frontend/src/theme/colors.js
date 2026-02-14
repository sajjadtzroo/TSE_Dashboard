/**
 * Centralized color constants for TSETMC Dashboard
 * Based on professional financial dashboard color scheme
 */

// Primary color palette
export const COLORS = {
  // Primary brand colors
  primary: '#BB86FC',      // Purple - main brand color
  secondary: '#03DAC5',    // Teal - secondary accent
  tertiary: '#CF6679',     // Pink/Red - negative values, losses
  quaternary: '#FFB74D',   // Orange/Amber - highlights
  quinary: '#64B5F6',      // Light Blue - info
  senary: '#81C784',       // Green - positive values, gains

  // Status colors
  success: '#4CAF50',
  warning: '#FFB74D',
  error: '#CF6679',
  info: '#64B5F6',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Background colors
  background: {
    dark: '#0A0A0A',
    darkSecondary: '#1A1A1A',
    darkTertiary: '#1a1a2e',
    light: '#FFFFFF',
    lightSecondary: '#F5F5F5',
  },

  // Text colors
  text: {
    dark: {
      primary: '#FFFFFF',
      secondary: '#888888',
      disabled: '#666666',
    },
    light: {
      primary: '#333333',
      secondary: '#666666',
      disabled: '#999999',
    },
  },

  // Border colors
  border: {
    dark: 'rgba(255, 255, 255, 0.1)',
    light: '#E0E0E0',
  },
};

// Color with alpha channel helper
export const withAlpha = (color, alpha) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Chart color palette
export const CHART_PALETTE = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.quaternary,
  COLORS.quinary,
  COLORS.senary,
];

// Trend indicator colors
export const TREND_COLORS = {
  positive: COLORS.success,
  negative: COLORS.tertiary,
  neutral: COLORS.text.dark.secondary,
};
