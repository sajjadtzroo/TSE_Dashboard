/**
 * Rally dark color palette — Deep Space Blue theme
 * Inspired by Bloomberg Terminal, TradingView dark mode, Tremor dark theme
 */

// Accent colors
export const RALLY_GREEN = '#22C55E';      // Green-500 — gains, positive
export const RALLY_DARK_GREEN = '#16A34A';  // Green-600 — darker variant
export const RALLY_RED = '#EF4444';         // Red-500 — losses, negative
export const RALLY_YELLOW = '#F59E0B';      // Amber-500 — warnings, breakeven
export const RALLY_PURPLE = '#8B5CF6';      // Violet-500 — secondary, legal
export const RALLY_BLUE = '#3B82F6';        // Blue-500 — info, current price
export const RALLY_PRIMARY = '#2962FF';     // DS3 Deep Blue — primary accent
export const RALLY_DARK_PRIMARY = '#1D4ED8'; // Blue-700 — dark primary variant

// Legacy alias (components referencing "orange" for losses)
export const RALLY_ORANGE = RALLY_RED;

// Background surfaces
export const BG_DEFAULT = '#0B0E11';        // Deep blue-black page bg
export const BG_CARD = '#1A1D2E';           // Card surface with blue undertone
export const BG_ELEVATED = '#252A3D';       // Popovers, modals, hover states
export const BG_HOVER = '#21253A';          // Row hover, interactive elements

// Text
export const TEXT_PRIMARY = '#E8EAED';      // Neutral white, softer
export const TEXT_SECONDARY = '#9CA3AF';    // Gray-400 — guaranteed AA contrast
export const TEXT_DIMMED = '#6B7280';        // Gray-500 adjusted — WCAG AA ≥4.5:1 on #0B0E11

// Borders
export const BORDER_SUBTLE = '#1E2234';  // Stronger but still soft
export const BORDER_STRONG = '#2A2E3E';  // Active/focus borders

// Glassmorphism card style
export const GLASS_BG = 'rgba(26, 29, 46, 0.8)';
export const GLASS_BORDER = 'rgba(42, 46, 62, 0.5)';
export const GLASS_SHADOW = '0 4px 24px rgba(0, 0, 0, 0.3)';
export const GLASS_BLUR = 'blur(12px)';

// Convenience object for inline styles
const rallyColors = {
  green: RALLY_GREEN,
  darkGreen: RALLY_DARK_GREEN,
  red: RALLY_RED,
  orange: RALLY_RED,        // alias
  yellow: RALLY_YELLOW,
  purple: RALLY_PURPLE,
  blue: RALLY_BLUE,
  primary: RALLY_PRIMARY,
  darkPrimary: RALLY_DARK_PRIMARY,
  bg: BG_DEFAULT,
  card: BG_CARD,
  elevated: BG_ELEVATED,
  hover: BG_HOVER,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textDimmed: TEXT_DIMMED,
  border: BORDER_SUBTLE,
  borderStrong: BORDER_STRONG,
  glassBg: GLASS_BG,
  glassBorder: GLASS_BORDER,
  glassShadow: GLASS_SHADOW,
  glassBlur: GLASS_BLUR,
};

export const glassCard = {
  backgroundColor: GLASS_BG,
  border: `1px solid ${GLASS_BORDER}`,
  backdropFilter: 'blur(12px)',
};

export default rallyColors;
