/**
 * Register all custom indicators with KLineChart.
 * Import this module once (side-effect) before chart initialization.
 */
import { registerIndicator } from 'klinecharts';
import momentumIndicators from './momentum';
import trendIndicators from './trend';
import volatilityIndicators from './volatility';
import volumeIndicators from './volume';
import maIndicators from './movingAverages';

const allIndicators = [
  ...momentumIndicators,
  ...trendIndicators,
  ...volatilityIndicators,
  ...volumeIndicators,
  ...maIndicators,
];

allIndicators.forEach((ind) => {
  registerIndicator(ind);
});

export default allIndicators;
