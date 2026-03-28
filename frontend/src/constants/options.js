export const POPULAR_STRATEGIES = ['covered-call', 'straddle', 'iron-condor', 'bull-call-spread'];

// OptionsAnalytics thresholds and ranges
export const VALUATION_THRESHOLD = 0.02;
export const PARITY_VIOLATION_THRESHOLD = 0.02;
export const SENSITIVITY_SPOT_RANGE = 0.20;
export const SENSITIVITY_VOL_RANGE = 0.50;
export const GREEKS_DECAY_DAYS = 30;

export const DEFAULT_STRESS_SCENARIOS = [
  { name: 'Bull +10%',    spotShock: 0.10,  volShock: -0.10, daysDecay: 0 },
  { name: 'Bear -10%',    spotShock: -0.10, volShock: 0.20,  daysDecay: 0 },
  { name: 'Vol Crush',    spotShock: 0,     volShock: -0.30, daysDecay: 0 },
  { name: 'Vol Spike',    spotShock: -0.05, volShock: 0.50,  daysDecay: 0 },
  { name: '7-Day Decay',  spotShock: 0,     volShock: 0,     daysDecay: 7 },
  { name: 'Black Swan',   spotShock: -0.25, volShock: 1.0,   daysDecay: 0 },
  { name: 'Melt-Up',      spotShock: 0.25,  volShock: -0.20, daysDecay: 0 },
  { name: '30-Day Decay', spotShock: 0,     volShock: 0,     daysDecay: 30 },
];
