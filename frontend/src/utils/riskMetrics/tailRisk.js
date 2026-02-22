/**
 * Tail risk and capture ratio utilities (CFA L2 / FRM).
 * Pure JavaScript — zero React dependencies.
 */
import { mean } from './descriptive.js';

/**
 * Tail Ratio — |P95 / P5| of return distribution.
 * Measures symmetry of tails; >1 = positive skew, <1 = negative skew.
 * @param {number[]} returns
 */
export function tailRatio(returns) {
  if (returns.length < 20) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const p5Idx = Math.floor(0.05 * (sorted.length - 1));
  const p95Idx = Math.floor(0.95 * (sorted.length - 1));
  const p5 = sorted[p5Idx];
  const p95 = sorted[Math.min(p95Idx, sorted.length - 1)];
  if (p5 === 0) return null;
  return Math.abs(p95 / p5);
}

/**
 * Gain-to-Loss Ratio — average gain / |average loss|.
 * @param {number[]} returns
 */
export function gainToLossRatio(returns) {
  const gains = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  if (!gains.length || !losses.length) return null;
  const avgGain = mean(gains);
  const avgLoss = mean(losses);
  if (avgLoss === 0) return null;
  return avgGain / Math.abs(avgLoss);
}

/**
 * Hit Rate — percentage of positive return days.
 * @param {number[]} returns
 */
export function hitRate(returns) {
  if (!returns.length) return null;
  const positive = returns.filter((r) => r > 0).length;
  return positive / returns.length;
}

/**
 * Geometric (compounded) return from an array of simple returns.
 * CFA L2: capture ratios use compounded returns, not arithmetic mean.
 */
function geoReturn(returns) {
  if (!returns.length) return null;
  const product = returns.reduce((p, r) => p * (1 + r), 1);
  return Math.pow(product, 1 / returns.length) - 1;
}

/**
 * Capture Ratios — upside, downside, and total capture vs benchmark.
 * Uses geometric (compounded) returns per CFA L2/L3 convention.
 * @param {number[]} stockReturns - aligned stock returns
 * @param {number[]} benchReturns - aligned benchmark returns
 * @returns {{ upsideCapture: number, downsideCapture: number, captureRatio: number }}
 */
export function captureRatios(stockReturns, benchReturns) {
  if (!stockReturns || !benchReturns || stockReturns.length !== benchReturns.length) {
    return { upsideCapture: null, downsideCapture: null, captureRatio: null };
  }

  const upStock = [];
  const upBench = [];
  const downStock = [];
  const downBench = [];

  for (let i = 0; i < benchReturns.length; i++) {
    if (benchReturns[i] > 0) {
      upStock.push(stockReturns[i]);
      upBench.push(benchReturns[i]);
    } else if (benchReturns[i] < 0) {
      downStock.push(stockReturns[i]);
      downBench.push(benchReturns[i]);
    }
  }

  const geoUpStock = geoReturn(upStock);
  const geoUpBench = geoReturn(upBench);
  const geoDownStock = geoReturn(downStock);
  const geoDownBench = geoReturn(downBench);

  const upsideCapture = geoUpBench != null && geoUpBench !== 0 ? (geoUpStock / geoUpBench) * 100 : null;
  const downsideCapture = geoDownBench != null && geoDownBench !== 0 ? (geoDownStock / geoDownBench) * 100 : null;
  const captureRatio = downsideCapture != null && downsideCapture !== 0 ? upsideCapture / downsideCapture : null;

  return { upsideCapture, downsideCapture, captureRatio };
}
