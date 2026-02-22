import { describe, it, expect } from 'vitest';
import { boxMullerRandom, runMonteCarloGBM } from '../../riskMetrics/monteCarlo.js';

// =============================================================================
// 1. boxMullerRandom
// =============================================================================

describe('boxMullerRandom', () => {
  it('10000 samples: mean within +/- 0.05 of 0', () => {
    const samples = Array.from({ length: 10000 }, () => boxMullerRandom());
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(mean).toBeCloseTo(0, 1);
    expect(Math.abs(mean)).toBeLessThan(0.05);
  });

  it('10000 samples: stdDev within +/- 0.1 of 1', () => {
    const samples = Array.from({ length: 10000 }, () => boxMullerRandom());
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (samples.length - 1);
    const sd = Math.sqrt(variance);
    expect(sd).toBeCloseTo(1, 0);
    expect(Math.abs(sd - 1)).toBeLessThan(0.1);
  });
});

// =============================================================================
// 2. runMonteCarloGBM
// =============================================================================

describe('runMonteCarloGBM', () => {
  it('percentiles ordered: p5 <= p25 <= p50 <= p75 <= p95 at last step', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0.1,
      sigma: 0.2,
      days: 60,
      numPaths: 500,
    });
    const last = result.percentiles;
    const p5 = last.p5[last.p5.length - 1];
    const p25 = last.p25[last.p25.length - 1];
    const p50 = last.p50[last.p50.length - 1];
    const p75 = last.p75[last.p75.length - 1];
    const p95 = last.p95[last.p95.length - 1];
    expect(p5).toBeLessThanOrEqual(p25);
    expect(p25).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p75);
    expect(p75).toBeLessThanOrEqual(p95);
  });

  it('probProfit is between 0 and 1', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0.1,
      sigma: 0.3,
      days: 100,
      numPaths: 500,
    });
    expect(result.probProfit).toBeGreaterThanOrEqual(0);
    expect(result.probProfit).toBeLessThanOrEqual(1);
  });

  it('expectedReturn is a number', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0.05,
      sigma: 0.2,
      days: 60,
      numPaths: 200,
    });
    expect(typeof result.expectedReturn).toBe('number');
    expect(isNaN(result.expectedReturn)).toBe(false);
  });

  it('medianFinal is positive', () => {
    const result = runMonteCarloGBM({
      currentPrice: 50,
      mu: 0.0,
      sigma: 0.3,
      days: 100,
      numPaths: 500,
    });
    expect(result.medianFinal).toBeGreaterThan(0);
  });

  it('days matches config', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0.1,
      sigma: 0.2,
      days: 120,
      numPaths: 100,
    });
    expect(result.days).toBe(120);
  });

  it('with positive mu, probProfit > 0.3', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0.15,
      sigma: 0.2,
      days: 252,
      numPaths: 1000,
    });
    expect(result.probProfit).toBeGreaterThan(0.3);
  });

  it('with mu=0 and very low sigma, median ~ currentPrice', () => {
    const result = runMonteCarloGBM({
      currentPrice: 100,
      mu: 0,
      sigma: 0.001,
      days: 60,
      numPaths: 1000,
    });
    // With nearly zero drift and vol, price should barely change
    expect(result.medianFinal).toBeCloseTo(100, 0);
    expect(Math.abs(result.medianFinal - 100)).toBeLessThan(1);
  });
});
