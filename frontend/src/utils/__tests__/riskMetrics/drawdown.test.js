import { describe, it, expect } from 'vitest';
import { computeDrawdown, calmarRatio } from '../../riskMetrics/drawdown.js';

// =============================================================================
// 1. computeDrawdown
// =============================================================================

describe('computeDrawdown', () => {
  it('KAT: prices [100,110,90,95] => maxDD = (90-110)/110 = -0.18182', () => {
    const prices = [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 110 },
      { date: '2024-01-03', price: 90 },
      { date: '2024-01-04', price: 95 },
    ];
    const result = computeDrawdown(prices);
    expect(result.maxDrawdown).toBeCloseTo(-0.18182, 4);
  });

  it('peak updates on new highs', () => {
    const prices = [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 110 },
      { date: '2024-01-03', price: 120 },
      { date: '2024-01-04', price: 115 },
    ];
    const result = computeDrawdown(prices);
    // After hitting 120, drawdown at 115 = (115-120)/120 = -0.04167
    expect(result.maxDrawdown).toBeCloseTo(-0.04167, 4);
    // First three points should have 0 drawdown (each is new peak)
    expect(result.drawdownSeries[0].drawdown).toBeCloseTo(0, 4);
    expect(result.drawdownSeries[1].drawdown).toBeCloseTo(0, 4);
    expect(result.drawdownSeries[2].drawdown).toBeCloseTo(0, 4);
  });

  it('empty array returns defaults (0 drawdown)', () => {
    const result = computeDrawdown([]);
    expect(result.drawdownSeries).toEqual([]);
    expect(result.maxDrawdown).toBe(0);
    expect(result.maxDrawdownDuration).toBe(0);
    expect(result.currentDrawdown).toBe(0);
  });

  it('duration counts consecutive drawdown periods', () => {
    const prices = [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 90 },
      { date: '2024-01-03', price: 85 },
      { date: '2024-01-04', price: 95 },
      { date: '2024-01-05', price: 80 },
    ];
    const result = computeDrawdown(prices);
    // Days below peak: day2 (1), day3 (2), day4 (3), day5 (4) — never recovers to 100
    expect(result.maxDrawdownDuration).toBe(4);
  });

  it('currentDrawdown is last element of drawdownSeries', () => {
    const prices = [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 110 },
      { date: '2024-01-03', price: 105 },
    ];
    const result = computeDrawdown(prices);
    const lastDD = result.drawdownSeries[result.drawdownSeries.length - 1].drawdown;
    expect(result.currentDrawdown).toBeCloseTo(lastDD, 4);
    // (105-110)/110 = -0.04545
    expect(result.currentDrawdown).toBeCloseTo(-0.04545, 4);
  });

  it('monotonically increasing prices have zero drawdown', () => {
    const prices = [
      { date: '2024-01-01', price: 100 },
      { date: '2024-01-02', price: 105 },
      { date: '2024-01-03', price: 110 },
    ];
    const result = computeDrawdown(prices);
    expect(result.maxDrawdown).toBe(0);
    expect(result.maxDrawdownDuration).toBe(0);
    expect(result.currentDrawdown).toBe(0);
  });
});

// =============================================================================
// 2. calmarRatio
// =============================================================================

describe('calmarRatio', () => {
  it('basic computation: annualized return / |maxDD|', () => {
    // dailyReturns with positive mean => positive annualized return
    const dailyReturns = [0.001, 0.002, 0.001, 0.003, 0.001];
    const maxDD = -0.1;
    const result = calmarRatio(dailyReturns, maxDD);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('maxDD = 0 returns null', () => {
    expect(calmarRatio([0.01, 0.02], 0)).toBeNull();
  });
});
