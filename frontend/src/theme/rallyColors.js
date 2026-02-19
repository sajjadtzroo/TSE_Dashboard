/**
 * Rally dark color palette — Deep Space Blue theme
 * Inspired by Bloomberg Terminal, TradingView dark mode, Tremor dark theme
 */

// Accent colors
export const RALLY_GREEN = '#10B981';      // Emerald-500 — gains, positive
export const RALLY_DARK_GREEN = '#059669';  // Emerald-600 — darker variant
export const RALLY_RED = '#EF4444';         // Red-500 — losses, negative
export const RALLY_YELLOW = '#F59E0B';      // Amber-500 — warnings, breakeven
export const RALLY_PURPLE = '#8B5CF6';      // Violet-500 — secondary, legal
export const RALLY_BLUE = '#3B82F6';        // Blue-500 — info, current price

// Legacy alias (components referencing "orange" for losses)
export const RALLY_ORANGE = RALLY_RED;

// Background surfaces
export const BG_DEFAULT = '#0B0E14';        // Deep blue-black page bg
export const BG_CARD = '#131720';           // Card surface with blue undertone
export const BG_ELEVATED = '#1C2030';       // Popovers, modals, hover states
export const BG_HOVER = '#252A3A';          // Row hover, interactive elements

// Text
export const TEXT_PRIMARY = '#F1F5F9';      // Slightly blue-white, softer
export const TEXT_SECONDARY = '#94A3B8';    // Slate-400 — guaranteed AA contrast
export const TEXT_DIMMED = '#64748B';        // Slate-500 — still readable

// Borders
export const BORDER_SUBTLE = 'rgba(148, 163, 184, 0.12)';  // Stronger but still soft
export const BORDER_STRONG = 'rgba(148, 163, 184, 0.25)';  // Active/focus borders

// Glassmorphism card style
export const GLASS_BG = 'rgba(19, 23, 32, 0.8)';
export const GLASS_BORDER = 'rgba(148, 163, 184, 0.1)';
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
