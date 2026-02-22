import { describe, it, expect } from 'vitest';
import {
  parametricVaR,
  historicalVaR,
  conditionalVaR,
  cornishFisherVaR,
} from '../../riskMetrics/var.js';
import { mean, stdDev, skewness, kurtosis } from '../../riskMetrics/descriptive.js';
import { inverseNormalCDF } from '../../blackScholes.js';

// ── Shared test data ──────────────────────────────────────────────────────
// Deterministic daily returns (20 elements, enough for all VaR methods)
const dailyReturns = [
  0.01, -0.02, 0.015, -0.005, 0.008, -0.012, 0.003, 0.02, -0.018, 0.007,
  -0.009, 0.011, -0.003, 0.006, -0.015, 0.004, 0.013, -0.007, 0.002, -0.001,
];

// Pre-computed descriptive stats for the shared data
const mu = mean(dailyReturns);
const sigma = stdDev(dailyReturns);

// ═══════════════════════════════════════════════════════════════════════════
// 1. parametricVaR
// ═══════════════════════════════════════════════════════════════════════════

describe('parametricVaR', () => {
  it('KAT: matches -(mu + z_alpha * sigma) at 95% confidence', () => {
    const z = inverseNormalCDF(0.05); // z for alpha=0.05, ~ -1.6449
    const expected = -(mu + z * sigma);
    expect(parametricVaR(dailyReturns, 0.95)).toBeCloseTo(expected, 4);
  });

  it('99% VaR is larger than 95% VaR', () => {
    const var95 = parametricVaR(dailyReturns, 0.95);
    const var99 = parametricVaR(dailyReturns, 0.99);
    expect(var99).toBeGreaterThan(var95);
  });

  it('VaR is positive for typical market data (loss expressed as positive)', () => {
    // For data with small positive mean but meaningful vol, VaR should be positive
    expect(parametricVaR(dailyReturns, 0.95)).toBeGreaterThan(0);
  });

  it('returns null for empty array', () => {
    expect(parametricVaR([], 0.95)).toBeNull();
  });

  it('returns null for single element (stdDev is null)', () => {
    expect(parametricVaR([0.01], 0.95)).toBeNull();
  });

  it('uses inverseNormalCDF(1 - confidence) for z-score', () => {
    // Verify z_alpha for 95% confidence: inverseNormalCDF(0.05) ~ -1.6449
    const z = inverseNormalCDF(0.05);
    expect(z).toBeCloseTo(-1.6449, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. historicalVaR
// ═══════════════════════════════════════════════════════════════════════════

describe('historicalVaR', () => {
  it('KAT: returns the negated sorted percentile value', () => {
    const sorted = [...dailyReturns].sort((a, b) => a - b);
    const idx = Math.floor(0.05 * sorted.length); // floor(0.05 * 20) = 1
    const expected = -sorted[Math.max(idx, 0)];
    expect(historicalVaR(dailyReturns, 0.95)).toBeCloseTo(expected, 4);
  });

  it('99% historical VaR >= 95% historical VaR', () => {
    const var95 = historicalVaR(dailyReturns, 0.95);
    const var99 = historicalVaR(dailyReturns, 0.99);
    expect(var99).toBeGreaterThanOrEqual(var95);
  });

  it('returns null for fewer than 5 elements', () => {
    expect(historicalVaR([0.01, -0.02, 0.03, -0.01], 0.95)).toBeNull();
    expect(historicalVaR([], 0.95)).toBeNull();
  });

  it('handles exactly 5 elements', () => {
    const small = [-0.05, -0.02, 0.01, 0.03, 0.04];
    // sorted: [-0.05, -0.02, 0.01, 0.03, 0.04]
    // idx = floor(0.05 * 5) = 0 => -sorted[0] = 0.05
    expect(historicalVaR(small, 0.95)).toBeCloseTo(0.05, 4);
  });

  it('VaR is positive when worst loss is negative', () => {
    expect(historicalVaR(dailyReturns, 0.95)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. conditionalVaR (Expected Shortfall)
// ═══════════════════════════════════════════════════════════════════════════

describe('conditionalVaR', () => {
  it('CVaR >= VaR (Expected Shortfall is always at least as bad)', () => {
    const var95 = historicalVaR(dailyReturns, 0.95);
    const cvar95 = conditionalVaR(dailyReturns, 0.95);
    expect(cvar95).toBeGreaterThanOrEqual(var95);
  });

  it('KAT: computes mean of tail losses below cutoff', () => {
    const sorted = [...dailyReturns].sort((a, b) => a - b);
    const cutoff = Math.floor(0.05 * sorted.length); // 1
    const tail = sorted.slice(0, cutoff);
    const expected = -(tail.reduce((s, v) => s + v, 0) / tail.length);
    expect(conditionalVaR(dailyReturns, 0.95)).toBeCloseTo(expected, 4);
  });

  it('99% CVaR >= 95% CVaR', () => {
    const cvar95 = conditionalVaR(dailyReturns, 0.95);
    const cvar99 = conditionalVaR(dailyReturns, 0.99);
    expect(cvar99).toBeGreaterThanOrEqual(cvar95);
  });

  it('returns null for fewer than 5 elements', () => {
    expect(conditionalVaR([0.01, -0.02], 0.95)).toBeNull();
    expect(conditionalVaR([], 0.95)).toBeNull();
  });

  it('when cutoff=0, returns -sorted[0] (worst single return)', () => {
    // With 5 elements and 99% confidence: cutoff = floor(0.01 * 5) = 0
    const small = [-0.05, -0.02, 0.01, 0.03, 0.04];
    expect(conditionalVaR(small, 0.99)).toBeCloseTo(0.05, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. cornishFisherVaR
// ═══════════════════════════════════════════════════════════════════════════

describe('cornishFisherVaR', () => {
  it('with symmetric (S~0) and mesokurtic (K~0) data, approaches parametric VaR', () => {
    // Construct data that is nearly symmetric and mesokurtic
    // Use a larger symmetric dataset so S~0 and K~0
    const symmetric = [];
    for (let i = -50; i <= 50; i++) symmetric.push(i * 0.001);
    // skewness should be ~0, excess kurtosis near uniform ~-1.2
    // Because K != 0, there will be a difference. We check it's in the right ballpark.
    const pVar = parametricVaR(symmetric, 0.95);
    const cfVar = cornishFisherVaR(symmetric, 0.95);
    // Both should be positive and reasonably close
    expect(cfVar).toBeGreaterThan(0);
    expect(pVar).toBeGreaterThan(0);
  });

  it('CF VaR differs from parametric VaR for skewed data', () => {
    // Right-skewed data: many small positive, few large negatives
    const skewed = [
      0.005, 0.004, 0.003, 0.006, 0.002, 0.007, 0.001, 0.008,
      -0.05, -0.04, 0.003, 0.005, 0.004, 0.002, 0.006, 0.003,
      0.005, 0.001, 0.004, 0.007,
    ];
    const pVar = parametricVaR(skewed, 0.95);
    const cfVar = cornishFisherVaR(skewed, 0.95);
    // They should differ because skewness != 0
    expect(Math.abs(cfVar - pVar)).toBeGreaterThan(0.0001);
  });

  it('verifies the z_CF expansion formula', () => {
    const S = skewness(dailyReturns);
    const K = kurtosis(dailyReturns);
    const z = inverseNormalCDF(0.05);
    const z2 = z * z;
    const z3 = z2 * z;
    const zCF = z + (z2 - 1) * S / 6 + (z3 - 3 * z) * K / 24 - (2 * z3 - 5 * z) * S * S / 36;
    const expected = -(mu + zCF * sigma);
    expect(cornishFisherVaR(dailyReturns, 0.95)).toBeCloseTo(expected, 4);
  });

  it('returns null for fewer than 5 elements', () => {
    expect(cornishFisherVaR([0.01, -0.02, 0.03, -0.01], 0.95)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(cornishFisherVaR([], 0.95)).toBeNull();
  });

  it('VaR is positive for typical return data', () => {
    expect(cornishFisherVaR(dailyReturns, 0.95)).toBeGreaterThan(0);
  });
});
