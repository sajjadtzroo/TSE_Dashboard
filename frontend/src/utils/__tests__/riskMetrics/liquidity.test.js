import { describe, it, expect } from 'vitest';
import {
  amihudIlliquidity,
  turnoverRatio,
  avgTurnoverRatio,
  bidAskSpread,
  rollingAmihud,
} from '../../riskMetrics/liquidity.js';

// =============================================================================
// 1. amihudIlliquidity
// =============================================================================

describe('amihudIlliquidity', () => {
  it('KAT: 3 data points produce a positive result', () => {
    const data = [
      { close: 100, volume: 1e6 },
      { close: 102, volume: 1.1e6 },
      { close: 99, volume: 0.9e6 },
    ];
    const result = amihudIlliquidity(data);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);

    // Manual: day1->2: |ret|=0.02, dollarVol=102*1.1e6=112200000, ratio=0.02/112200000
    //         day2->3: |ret|=|(99-102)/102|=0.02941, dollarVol=99*0.9e6=89100000, ratio=0.02941/89100000
    // mean * 1e9
    const r1 = 0.02 / (102 * 1.1e6);
    const r2 = (3 / 102) / (99 * 0.9e6);
    const expected = ((r1 + r2) / 2) * 1e9;
    expect(result).toBeCloseTo(expected, 4);
  });

  it('returns null for fewer than 2 data points', () => {
    expect(amihudIlliquidity([{ close: 100, volume: 1e6 }])).toBeNull();
    expect(amihudIlliquidity([])).toBeNull();
    expect(amihudIlliquidity(null)).toBeNull();
  });
});

// =============================================================================
// 2. turnoverRatio
// =============================================================================

describe('turnoverRatio', () => {
  it('1000000 / 10000000 = 0.1', () => {
    expect(turnoverRatio(1000000, 10000000)).toBeCloseTo(0.1, 4);
  });

  it('zero shares returns null', () => {
    expect(turnoverRatio(1000000, 0)).toBeNull();
  });

  it('zero volume returns null', () => {
    expect(turnoverRatio(0, 10000000)).toBeNull();
  });
});

// =============================================================================
// 3. avgTurnoverRatio
// =============================================================================

describe('avgTurnoverRatio', () => {
  it('computes mean volume / totalShares', () => {
    const history = [{ volume: 500000 }, { volume: 700000 }, { volume: 600000 }];
    // mean = 600000, ratio = 600000/10000000 = 0.06
    expect(avgTurnoverRatio(history, 10000000)).toBeCloseTo(0.06, 4);
  });

  it('zero totalShares returns null', () => {
    expect(avgTurnoverRatio([{ volume: 1000 }], 0)).toBeNull();
  });

  it('empty history returns null', () => {
    expect(avgTurnoverRatio([], 10000000)).toBeNull();
  });
});

// =============================================================================
// 4. bidAskSpread
// =============================================================================

describe('bidAskSpread', () => {
  it('computes absolute and relative spread from order book', () => {
    const orderBook = [
      { demand_price: 498, supply_price: 502 },
      { demand_price: 496, supply_price: 504 },
      { demand_price: 495, supply_price: 506 },
    ];
    const result = bidAskSpread(orderBook);
    expect(result).not.toBeNull();
    // bestBid = 498, bestAsk = 502
    expect(result.absoluteSpread).toBeCloseTo(4, 4);
    // mid = (498+502)/2 = 500, relativeSpread = 4/500 = 0.008
    expect(result.relativeSpread).toBeCloseTo(0.008, 4);
  });

  it('returns null for empty order book', () => {
    expect(bidAskSpread([])).toBeNull();
    expect(bidAskSpread(null)).toBeNull();
  });
});

// =============================================================================
// 5. rollingAmihud
// =============================================================================

describe('rollingAmihud', () => {
  it('returns array with date and amihud entries', () => {
    // Generate 25 data points (enough for window=20, need >= window+1=21)
    const data = Array.from({ length: 25 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      close: 100 + Math.sin(i) * 5,
      volume: 1e6,
    }));
    const result = rollingAmihud(data, 20);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('amihud');
    expect(result[0].amihud).toBeGreaterThan(0);
  });

  it('insufficient data returns empty array', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      close: 100 + i,
      volume: 1e6,
    }));
    expect(rollingAmihud(data, 20)).toEqual([]);
  });
});
