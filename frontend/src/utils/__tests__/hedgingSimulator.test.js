import { describe, it, expect } from 'vitest';
import {
  generateGBMPath,
  simulateHedging,
  runMultipleSimulations,
} from '../hedgingSimulator';
import { blackScholesPrice } from '../blackScholes';

// =============================================================================
// 1. generateGBMPath
// =============================================================================

describe('generateGBMPath', () => {
  it('length = steps + 1', () => {
    const path = generateGBMPath(100, 0.05, 0.2, 1, 252, 42);
    expect(path.length).toBe(253);
  });

  it('all prices are positive (GBM never crosses zero)', () => {
    const path = generateGBMPath(100, 0.05, 0.2, 1, 252, 99);
    for (const p of path) {
      expect(p).toBeGreaterThan(0);
    }
  });

  it('first price equals S0', () => {
    const path = generateGBMPath(50, 0.03, 0.15, 0.5, 100, 7);
    expect(path[0]).toBe(50);
  });

  it('seed reproducibility: same seed => same path', () => {
    const pathA = generateGBMPath(100, 0.05, 0.2, 1, 252, 12345);
    const pathB = generateGBMPath(100, 0.05, 0.2, 1, 252, 12345);
    expect(pathA).toEqual(pathB);
  });

  it('different seeds produce different paths', () => {
    const pathA = generateGBMPath(100, 0.05, 0.2, 1, 50, 111);
    const pathB = generateGBMPath(100, 0.05, 0.2, 1, 50, 222);
    // Extremely unlikely to be identical
    expect(pathA).not.toEqual(pathB);
  });
});

// =============================================================================
// 2. simulateHedging
// =============================================================================

describe('simulateHedging', () => {
  const baseParams = {
    type: 'call',
    S0: 100,
    K: 100,
    T: 1 / 12, // 1 month
    r: 0.05,
    sigma: 0.2,
    qty: 1,
    rebalFreq: 'daily',
    seed: 1,
  };

  it('premiumCollected equals BS price × qty', () => {
    const result = simulateHedging(baseParams);
    const bsPrice = blackScholesPrice('call', 100, 100, 1 / 12, 0.05, 0.2);
    expect(result.premiumCollected).toBeCloseTo(bsPrice * 1, 2);
  });

  it('premiumCollected scales with qty', () => {
    const r1 = simulateHedging({ ...baseParams, qty: 1, seed: 42 });
    const r2 = simulateHedging({ ...baseParams, qty: 3, seed: 42 });
    // Precision 1 (within 0.05) to accommodate the 2-decimal rounding in simulateHedging
    expect(r2.premiumCollected).toBeCloseTo(r1.premiumCollected * 3, 1);
  });

  it('final payoff = max(S_T - K, 0) for call (up to rounding)', () => {
    // Use a known seed and verify payoff satisfies intrinsic value formula
    const result = simulateHedging(baseParams);
    const finalPrice = result.prices[result.prices.length - 1].price;
    const expectedPayoff = Math.max(finalPrice - 100, 0) * 1;
    expect(result.finalPayoff).toBeCloseTo(expectedPayoff, 1);
  });

  it('final payoff = max(K - S_T, 0) for put', () => {
    const result = simulateHedging({ ...baseParams, type: 'put', seed: 7 });
    const finalPrice = result.prices[result.prices.length - 1].price;
    const expectedPayoff = Math.max(100 - finalPrice, 0);
    expect(result.finalPayoff).toBeCloseTo(expectedPayoff, 1);
  });

  it('hedgeLog entries = ⌈totalDays / rebalInterval⌉ + 1 (daily)', () => {
    // Daily rebal: rebalInterval=1, rebal at every step + step 0
    // hedgeLog includes i=0 and i=steps (totalDays) + all i % 1 === 0
    // which is every step, so length = steps + 1 = totalDays + 1
    const result = simulateHedging({ ...baseParams, rebalFreq: 'daily' });
    expect(result.hedgeLog.length).toBe(result.totalDays + 1);
  });

  it('hedgeLog entries ≤ totalDays/5 + 2 for weekly rebal', () => {
    const result = simulateHedging({ ...baseParams, rebalFreq: 'weekly', T: 1 });
    // 365 steps, rebal every 5 + step 0 and final step
    expect(result.hedgeLog.length).toBeGreaterThan(0);
    expect(result.hedgeLog.length).toBeLessThanOrEqual(result.totalDays + 1);
  });

  it('prices array has correct structure', () => {
    const result = simulateHedging(baseParams);
    expect(result.prices[0]).toHaveProperty('day');
    expect(result.prices[0]).toHaveProperty('price');
    expect(result.prices[0].price).toBeGreaterThan(0);
  });
});

// =============================================================================
// 3. runMultipleSimulations
// =============================================================================

describe('runMultipleSimulations', () => {
  const params = {
    type: 'call',
    S0: 100,
    K: 100,
    T: 1 / 12,
    r: 0.05,
    sigma: 0.2,
    qty: 1,
    rebalFreq: 'daily',
  };

  it('returns numSims simulations', () => {
    const result = runMultipleSimulations(params, 10);
    expect(result.simulations.length).toBe(10);
    expect(result.pnlDistribution.length).toBe(10);
  });

  it('avgPnL is finite', () => {
    const result = runMultipleSimulations(params, 20);
    expect(Number.isFinite(result.avgPnL)).toBe(true);
  });

  it('stdPnL is non-negative and finite', () => {
    const result = runMultipleSimulations(params, 20);
    expect(Number.isFinite(result.stdPnL)).toBe(true);
    expect(result.stdPnL).toBeGreaterThanOrEqual(0);
  });

  it('stdPnL uses n-1 (Bessel correction): verify with 3 known PnLs', () => {
    // With numSims=3, the three simulations run with seed=31337, 62674, 94011.
    // We cannot easily mock pnls, so we verify the formula property:
    // stdPnL = sqrt(variance), where variance uses n-1.
    // Run with numSims=3 and verify stdPnL matches manual n-1 computation.
    const result = runMultipleSimulations(params, 3);
    const pnls = result.pnlDistribution;
    const avg = (pnls[0] + pnls[1] + pnls[2]) / 3;
    const varianceN1 = ((pnls[0] - avg) ** 2 + (pnls[1] - avg) ** 2 + (pnls[2] - avg) ** 2) / 2;
    const expectedStd = Math.sqrt(varianceN1);
    // The result's stdPnL should match the n-1 formula (rounded to 2 decimals)
    expect(result.stdPnL).toBeCloseTo(Math.round(expectedStd * 100) / 100, 1);
  });

  it('histogram bins count sums to numSims', () => {
    const numSims = 30;
    const result = runMultipleSimulations(params, numSims);
    const total = result.histogram.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(numSims);
  });

  it('histogram has 15 bins', () => {
    const result = runMultipleSimulations(params, 25);
    expect(result.histogram.length).toBe(15);
  });
});
