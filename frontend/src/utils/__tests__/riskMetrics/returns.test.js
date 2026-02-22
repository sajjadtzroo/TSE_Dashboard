import { describe, it, expect } from 'vitest';
import {
  extractPrices,
  computeSimpleReturns,
  computeLogReturns,
  alignReturnSeries,
} from '../../riskMetrics/returns.js';

// =============================================================================
// 1. extractPrices
// =============================================================================

describe('extractPrices', () => {
  it('prefers adj_close over close', () => {
    const history = [
      { date: '2024-01-01', close: 100, adj_close: 98 },
      { date: '2024-01-02', close: 105, adj_close: 103 },
    ];
    const result = extractPrices(history);
    expect(result[0].price).toBeCloseTo(98, 4);
    expect(result[1].price).toBeCloseTo(103, 4);
  });

  it('falls back to close when adj_close is null', () => {
    const history = [
      { date: '2024-01-01', close: 100, adj_close: null },
      { date: '2024-01-02', close: 105 },
    ];
    const result = extractPrices(history);
    expect(result[0].price).toBeCloseTo(100, 4);
    expect(result[1].price).toBeCloseTo(105, 4);
  });

  it('filters entries where both close and adj_close are null', () => {
    const history = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: null, adj_close: null },
      { date: '2024-01-03', close: 110 },
    ];
    const result = extractPrices(history);
    expect(result.length).toBe(2);
  });
});

// =============================================================================
// 2. computeSimpleReturns
// =============================================================================

describe('computeSimpleReturns', () => {
  it('KAT: [100, 110] => return = 0.1', () => {
    const history = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 110 },
    ];
    const result = computeSimpleReturns(history);
    expect(result.length).toBe(1);
    expect(result[0].ret).toBeCloseTo(0.1, 4);
  });

  it('[100, 110, 99] => [0.1, -0.1]', () => {
    const history = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 110 },
      { date: '2024-01-03', close: 99 },
    ];
    const result = computeSimpleReturns(history);
    expect(result.length).toBe(2);
    expect(result[0].ret).toBeCloseTo(0.1, 4);
    expect(result[1].ret).toBeCloseTo(-0.1, 4);
  });

  it('skips zero price in denominator', () => {
    const history = [
      { date: '2024-01-01', close: 0 },
      { date: '2024-01-02', close: 100 },
    ];
    const result = computeSimpleReturns(history);
    expect(result.length).toBe(0);
  });
});

// =============================================================================
// 3. computeLogReturns
// =============================================================================

describe('computeLogReturns', () => {
  it('KAT: ln(110/100) ~ 0.09531', () => {
    const history = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 110 },
    ];
    const result = computeLogReturns(history);
    expect(result.length).toBe(1);
    expect(result[0].ret).toBeCloseTo(0.09531, 4);
  });

  it('skips zero or negative prices', () => {
    const history = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 0 },
      { date: '2024-01-03', close: 110 },
    ];
    const result = computeLogReturns(history);
    // 100->0 skipped (0 not positive), 0->110 skipped (0 not positive)
    expect(result.length).toBe(0);
  });
});

// =============================================================================
// 4. alignReturnSeries
// =============================================================================

describe('alignReturnSeries', () => {
  it('matching dates align correctly', () => {
    const stock = [
      { date: '2024-01-01', ret: 0.01 },
      { date: '2024-01-02', ret: 0.02 },
    ];
    const bench = [
      { date: '2024-01-01', ret: 0.005 },
      { date: '2024-01-02', ret: 0.015 },
    ];
    const result = alignReturnSeries(stock, bench);
    expect(result.stockReturns).toEqual([0.01, 0.02]);
    expect(result.benchReturns).toEqual([0.005, 0.015]);
    expect(result.dates).toEqual(['2024-01-01', '2024-01-02']);
  });

  it('non-matching dates are excluded', () => {
    const stock = [
      { date: '2024-01-01', ret: 0.01 },
      { date: '2024-01-03', ret: 0.02 },
    ];
    const bench = [
      { date: '2024-01-01', ret: 0.005 },
      { date: '2024-01-02', ret: 0.015 },
    ];
    const result = alignReturnSeries(stock, bench);
    expect(result.stockReturns.length).toBe(1);
    expect(result.dates).toEqual(['2024-01-01']);
  });

  it('empty inputs return empty aligned arrays', () => {
    const result = alignReturnSeries([], []);
    expect(result.stockReturns).toEqual([]);
    expect(result.benchReturns).toEqual([]);
    expect(result.dates).toEqual([]);
  });
});
