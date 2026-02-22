import React from 'react';
import rallyColors from '../../../theme/rallyColors';

export const GRID_STROKE = 'rgba(148, 163, 184, 0.06)';
export const CURSOR_STROKE = { stroke: rallyColors.textDimmed, strokeDasharray: '3 3' };
export const CURSOR_FILL = { fill: 'rgba(148, 163, 184, 0.06)' };

export const axisTick = (fontSize = 11) => ({
  fontSize,
  fill: rallyColors.textSecondary,
});

/** Responsive chart margins by breakpoint */
export const CHART_MARGIN = {
  xs: { top: 6, right: 6, bottom: 20, left: 24 },
  sm: { top: 8, right: 8, bottom: 28, left: 32 },
  md: { top: 12, right: 12, bottom: 40, left: 40 },
  lg: { top: 16, right: 16, bottom: 48, left: 48 },
};

/** Glassmorphism tooltip style object for recharts contentStyle */
export const TOOLTIP_STYLE = {
  background: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  boxShadow: rallyColors.glassShadow,
  backdropFilter: rallyColors.glassBlur,
  WebkitBackdropFilter: rallyColors.glassBlur,
  borderRadius: 8,
  color: rallyColors.textPrimary,
  fontSize: 12,
  padding: '8px 12px',
};

/** Active dot config with glow */
export const ACTIVE_DOT = {
  r: 5,
  strokeWidth: 2,
  stroke: rallyColors.elevated,
  style: { filter: 'drop-shadow(0 0 6px rgba(148, 163, 184, 0.4))' },
};

/** Returns an active dot config tinted by a specific color */
export const activeDotFor = (color) => ({
  ...ACTIVE_DOT,
  fill: color,
  style: { filter: `drop-shadow(0 0 6px ${color}60)` },
});

/** SVG <linearGradient> for bar fills (top-to-bottom opacity fade) */
export function barGradientDef(id, color) {
  return React.createElement(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1' },
    React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.9 }),
    React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0.55 }),
  );
}

/** SVG <filter> for hover glow effect */
export function glowFilterDef(id, color) {
  return React.createElement(
    'filter',
    { id, x: '-50%', y: '-50%', width: '200%', height: '200%' },
    React.createElement('feDropShadow', {
      dx: 0,
      dy: 0,
      stdDeviation: 4,
      floodColor: color,
      floodOpacity: 0.5,
    }),
  );
}
