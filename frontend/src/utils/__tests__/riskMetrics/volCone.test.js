import { describe, it, expect } from 'vitest';
import { computeVolatilityCone } from '../../riskMetrics/volCone.js';

describe('computeVolatilityCone', () => {
  it('returns [] for fewer than 20 returns', () => {
    const returns = Array.from({ length: 19 }, () => 0.01);
    expect(computeVolatilityCone(returns)).toEqual([]);
  });

  it('with sufficient data: current <= max, min <= p25 <= p50 <= p75 <= max', () => {
    // Generate 300 daily returns with some variance
    const returns = Array.from({ length: 300 }, (_, i) => Math.sin(i * 0.2) * 0.03);
    const result = computeVolatilityCone(returns);
    expect(result.length).toBeGreaterThan(0);

    for (const cone of result) {
      expect(cone.current).toBeLessThanOrEqual(cone.max + 1e-8);
      expect(cone.min).toBeLessThanOrEqual(cone.p25 + 1e-8);
      expect(cone.p25).toBeLessThanOrEqual(cone.p50 + 1e-8);
      expect(cone.p50).toBeLessThanOrEqual(cone.p75 + 1e-8);
      expect(cone.p75).toBeLessThanOrEqual(cone.max + 1e-8);
    }
  });

  it('windows larger than data are filtered out', () => {
    // 50 returns: only window=20 should appear (60, 90, 120, 250 all too large)
    const returns = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? 0.01 : -0.01));
    const result = computeVolatilityCone(returns);
    const windowSizes = result.map((c) => c.window);
    expect(windowSizes).toContain(20);
    expect(windowSizes).not.toContain(60);
    expect(windowSizes).not.toContain(250);
  });

  it('current is the most recent window vol (not necessarily max)', () => {
    // Generate returns where recent volatility differs from historical
    const returns = Array.from({ length: 100 }, (_, i) => {
      // First 80: high vol, last 20: low vol
      return i < 80 ? Math.sin(i) * 0.1 : 0.001;
    });
    const result = computeVolatilityCone(returns, [20]);
    expect(result.length).toBe(1);
    // current should reflect the low-vol recent period
    expect(result[0].current).toBeLessThan(result[0].max);
  });

  it('all values are positive percentages', () => {
    const returns = Array.from({ length: 100 }, (_, i) => Math.cos(i) * 0.02);
    const result = computeVolatilityCone(returns);
    for (const cone of result) {
      expect(cone.current).toBeGreaterThan(0);
      expect(cone.min).toBeGreaterThan(0);
      expect(cone.max).toBeGreaterThan(0);
      expect(cone.p25).toBeGreaterThan(0);
      expect(cone.p50).toBeGreaterThan(0);
      expect(cone.p75).toBeGreaterThan(0);
    }
  });
});
