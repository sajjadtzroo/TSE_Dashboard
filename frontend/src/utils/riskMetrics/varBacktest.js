/**
 * VaR Backtesting utilities (FRM).
 * Pure JavaScript — zero React dependencies.
 */
import { mean, stdDev } from './descriptive.js';
import { inverseNormalCDF } from '../blackScholes.js';

/**
 * Backtest VaR — rolling parametric VaR estimation with violation detection.
 * @param {number[]} returns - daily return array
 * @param {string[]} dates - corresponding dates
 * @param {number} window - lookback window for VaR estimation (default 250)
 * @param {number} confidence - VaR confidence level (default 0.95)
 * @returns {{ series: Array, violations: number, violationRate: number, totalDays: number }}
 */
export function backtestVaR(returns, dates, window = 250, confidence = 0.95) {
  if (returns.length < window + 1) return null;

  const z = inverseNormalCDF(1 - confidence);
  const series = [];
  let violations = 0;

  for (let i = window; i < returns.length; i++) {
    const lookback = returns.slice(i - window, i);
    const m = mean(lookback);
    const sd = stdDev(lookback);
    if (m == null || sd == null) continue;

    const varThreshold = -(m + z * sd); // positive number = loss threshold
    const actualReturn = returns[i];
    const isViolation = actualReturn < -varThreshold; // actual loss exceeds VaR

    if (isViolation) violations++;

    series.push({
      date: dates[i],
      actualReturn: actualReturn * 100,
      varThreshold: -varThreshold * 100, // negative line on chart
      isViolation,
    });
  }

  const totalDays = series.length;
  const violationRate = totalDays > 0 ? violations / totalDays : 0;

  return { series, violations, violationRate, totalDays };
}

/**
 * Kupiec POF (Proportion of Failures) test.
 * LR = -2 × ln[ (1-p)^(T-x) × p^x ] + 2 × ln[ (1-x/T)^(T-x) × (x/T)^x ]
 * Under H0: LR ~ χ²(1), critical value = 3.841 at 5% significance.
 * @param {number} T - total observation days
 * @param {number} x - number of violations
 * @param {number} p - expected violation rate (1 - confidence)
 * @returns {{ lr: number, critical: number, reject: boolean }}
 */
export function kupiecPOF(T, x, p) {
  if (T <= 0 || x < 0 || x > T) return null;
  if (x === 0 || x === T) {
    // Edge cases — use limit form
    const lr = x === 0
      ? -2 * (T * Math.log(1 - p) - T * Math.log(1))
      : -2 * (x * Math.log(p) - x * Math.log(1));
    return { lr: Math.abs(lr), critical: 3.841, reject: Math.abs(lr) > 3.841 };
  }

  const pHat = x / T;
  const lnL0 = (T - x) * Math.log(1 - p) + x * Math.log(p);
  const lnL1 = (T - x) * Math.log(1 - pHat) + x * Math.log(pHat);
  const lr = -2 * (lnL0 - lnL1);

  return { lr, critical: 3.841, reject: lr > 3.841 };
}

/**
 * Basel traffic light — classifies VaR model quality based on violation count.
 * Thresholds scaled from Basel 99% standard (green ≤4, yellow ≤9 per 250 days).
 * @param {number} violations - number of VaR violations
 * @param {number} totalDays - total observation days
 * @param {number} confidence - VaR confidence level (default 0.95)
 * @returns {'green'|'yellow'|'red'}
 */
export function baselTrafficLight(violations, totalDays = 250, confidence = 0.95) {
  const expectedRate = 1 - confidence;
  const expected = expectedRate * totalDays;

  // Basel thresholds scaled from 99% standard (green ≤4, yellow ≤9 per 250d)
  if (violations <= expected * 1.6) return 'green';
  if (violations <= expected * 3.6) return 'yellow';
  return 'red';
}
