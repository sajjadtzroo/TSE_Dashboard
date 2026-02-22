/**
 * Value at Risk (VaR) and Conditional VaR utilities.
 * Pure JavaScript — zero React dependencies.
 */
import { mean, stdDev, skewness, kurtosis } from './descriptive.js';
import { inverseNormalCDF } from '../blackScholes.js';

/**
 * Parametric VaR (assumes normal distribution)
 * VaR = -(μ + z_α × σ)
 * @param {number[]} returns - daily return array
 * @param {number} confidence - e.g. 0.95 or 0.99
 */
export function parametricVaR(returns, confidence = 0.95) {
  const m = mean(returns);
  const sd = stdDev(returns);
  if (m == null || sd == null) return null;
  const z = inverseNormalCDF(1 - confidence);
  return -(m + z * sd);
}

/**
 * Historical VaR — percentile of sorted returns
 * @param {number[]} returns - daily return array
 * @param {number} confidence - e.g. 0.95 or 0.99
 */
export function historicalVaR(returns, confidence = 0.95) {
  if (returns.length < 5) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return -sorted[Math.max(idx, 0)];
}

/**
 * Conditional VaR (Expected Shortfall): mean of returns below VaR threshold
 * @param {number[]} returns - daily return array
 * @param {number} confidence - e.g. 0.95
 */
export function conditionalVaR(returns, confidence = 0.95) {
  if (returns.length < 5) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - confidence) * sorted.length);
  if (cutoff === 0) return -sorted[0];
  const tail = sorted.slice(0, cutoff);
  const avg = tail.reduce((s, v) => s + v, 0) / tail.length;
  return -avg;
}

/**
 * Cornish-Fisher VaR — adjusts for skewness and kurtosis (non-normal distribution).
 * z_cf = z + (z²-1)S/6 + (z³-3z)K/24 - (2z³-5z)S²/36
 * @param {number[]} returns - daily return array
 * @param {number} confidence - e.g. 0.95 or 0.99
 */
export function cornishFisherVaR(returns, confidence = 0.95) {
  if (returns.length < 5) return null;
  const m = mean(returns);
  const sd = stdDev(returns);
  const S = skewness(returns);
  const K = kurtosis(returns); // excess kurtosis
  if (m == null || sd == null || S == null || K == null) return null;

  const z = inverseNormalCDF(1 - confidence);
  const z2 = z * z;
  const z3 = z2 * z;
  const zCF = z + (z2 - 1) * S / 6 + (z3 - 3 * z) * K / 24 - (2 * z3 - 5 * z) * S * S / 36;

  return -(m + zCF * sd);
}
