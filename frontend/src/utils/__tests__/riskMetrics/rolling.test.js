import { describe, it, expect } from 'vitest';
import { computeRollingMetrics, computeEWMAVolatility } from '../../riskMetrics/rolling.js';

// =============================================================================
// 1. computeRollingMetrics
// =============================================================================

describe('computeRollingMetrics', () => {
  it('returns [] if returns.length < window', () => {
    const returns = [0.01, 0.02, 0.03];
    const bench = [0.01, 0.015, 0.02];
    const dates = ['d1', 'd2', 'd3'];
    expect(computeRollingMetrics(returns, bench, dates, 30)).toEqual([]);
  });

  it('with 30+ returns, output length = returns.length - window + 1', () => {
    const n = 50;
    const returns = Array.from({ length: n }, (_, i) => Math.sin(i * 0.3) * 0.02);
    const bench = Array.from({ length: n }, (_, i) => Math.sin(i * 0.25) * 0.015);
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);
    const window = 30;
    const result = computeRollingMetrics(returns, bench, dates, window);
    expect(result.length).toBe(n - window + 1);
  });

  it('each entry has all 4 metrics defined', () => {
    const n = 40;
    const returns = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 0.01 : -0.005));
    const bench = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 0.008 : -0.003));
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);
    const result = computeRollingMetrics(returns, bench, dates, 30);
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('rollingSharpe');
      expect(entry).toHaveProperty('rollingBeta');
      expect(entry).toHaveProperty('rollingVol');
      expect(entry).toHaveProperty('rollingCorrelation');
    }
  });

  it('rollingVol is non-negative', () => {
    const n = 40;
    const returns = Array.from({ length: n }, (_, i) => Math.cos(i) * 0.03);
    const bench = Array.from({ length: n }, (_, i) => Math.cos(i * 0.8) * 0.02);
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);
    const result = computeRollingMetrics(returns, bench, dates, 30);
    for (const entry of result) {
      if (entry.rollingVol != null) {
        expect(entry.rollingVol).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// =============================================================================
// 2. computeEWMAVolatility
// =============================================================================

describe('computeEWMAVolatility', () => {
  it('returns [] for fewer than 2 returns', () => {
    expect(computeEWMAVolatility([0.01], ['d1'])).toEqual([]);
    expect(computeEWMAVolatility([], [])).toEqual([]);
  });

  it('output length = returns.length - 1', () => {
    const n = 50;
    const returns = Array.from({ length: n }, (_, i) => Math.sin(i) * 0.02);
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);
    const result = computeEWMAVolatility(returns, dates, 0.94);
    expect(result.length).toBe(n - 1);
  });

  it('all ewmaVol values are positive', () => {
    const n = 30;
    const returns = Array.from({ length: n }, (_, i) => (i % 3 === 0 ? -0.02 : 0.01));
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);
    const result = computeEWMAVolatility(returns, dates, 0.94);
    for (const entry of result) {
      expect(entry.ewmaVol).toBeGreaterThan(0);
    }
  });

  it('lambda closer to 1 produces smoother series', () => {
    const n = 100;
    const returns = Array.from({ length: n }, (_, i) => Math.sin(i * 0.5) * 0.05);
    const dates = Array.from({ length: n }, (_, i) => `day-${i}`);

    const smooth = computeEWMAVolatility(returns, dates, 0.99);
    const reactive = computeEWMAVolatility(returns, dates, 0.80);

    // Smoother series has lower variance of changes
    const changes = (series) => {
      const diffs = [];
      for (let i = 1; i < series.length; i++) {
        diffs.push(Math.abs(series[i].ewmaVol - series[i - 1].ewmaVol));
      }
      return diffs.reduce((s, v) => s + v, 0) / diffs.length;
    };

    expect(changes(smooth)).toBeLessThan(changes(reactive));
  });
});
