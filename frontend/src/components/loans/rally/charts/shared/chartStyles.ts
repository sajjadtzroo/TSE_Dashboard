import rallyColors from '../../../../../theme/rallyColors';

export const GRID_STROKE = 'rgba(156, 163, 175, 0.04)';
export const CURSOR_STROKE = { stroke: rallyColors.textDimmed, strokeDasharray: '3 3' };
export const CURSOR_FILL = { fill: 'rgba(156, 163, 175, 0.06)' };

export const axisTick = (fontSize = 11) => ({
  fontSize,
  fill: rallyColors.textSecondary,
});
