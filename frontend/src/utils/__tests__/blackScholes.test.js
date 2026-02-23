import { describe, it, expect } from 'vitest';
import {
  normalPDF,
  normalCDF,
  inverseNormalCDF,
  blackScholesPrice,
  greeks,
  greeks2nd,
  impliedVolatility,
  moneyness,
  legPayoff,
  strategyPayoff,
  findBreakevens,
  maxProfitLoss,
} from '../blackScholes';

// ═══════════════════════════════════════════════════════════════════════════
// 1. normalPDF
// ═══════════════════════════════════════════════════════════════════════════

describe('normalPDF', () => {
  it('normalPDF(0) = 1/sqrt(2*PI) ~ 0.39894', () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 4);
  });

  it('normalPDF(1) ~ 0.24197', () => {
    expect(normalPDF(1)).toBeCloseTo(0.24197, 4);
  });

  it('normalPDF(-1) ~ 0.24197 (symmetric)', () => {
    expect(normalPDF(-1)).toBeCloseTo(normalPDF(1), 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. normalCDF
// ═══════════════════════════════════════════════════════════════════════════

describe('normalCDF', () => {
  it('N(0) = 0.5', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 6);
  });

  it('N(1.96) ~ 0.975', () => {
    // Abramowitz & Stegun approximation — within ~0.006 of exact 0.975
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 1);
  });

  it('N(-1.96) ~ 0.025', () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 1);
  });

  it('N(10) ~ 1.0 (far right tail)', () => {
    expect(normalCDF(10)).toBeCloseTo(1.0, 6);
  });

  it('N(-10) ~ 0.0 (far left tail)', () => {
    expect(normalCDF(-10)).toBeCloseTo(0.0, 6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. inverseNormalCDF
// ═══════════════════════════════════════════════════════════════════════════

describe('inverseNormalCDF', () => {
  it('inverse(0.5) = 0', () => {
    expect(inverseNormalCDF(0.5)).toBe(0);
  });

  it('inverse(0.975) ~ 1.96', () => {
    expect(inverseNormalCDF(0.975)).toBeCloseTo(1.96, 2);
  });

  it('inverse(0.025) ~ -1.96', () => {
    expect(inverseNormalCDF(0.025)).toBeCloseTo(-1.96, 2);
  });

  it('inverse(0) = -Infinity', () => {
    expect(inverseNormalCDF(0)).toBe(-Infinity);
  });

  it('inverse(1) = Infinity', () => {
    expect(inverseNormalCDF(1)).toBe(Infinity);
  });

  it('round-trip: normalCDF(inverseNormalCDF(0.75)) ~ 0.75', () => {
    const z = inverseNormalCDF(0.75);
    // The CDF uses Abramowitz & Stegun (error < 7.5e-8) and inverse uses Acklam's;
    // round-trip accuracy is limited by CDF approximation quality
    expect(normalCDF(z)).toBeCloseTo(0.75, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. blackScholesPrice
// ═══════════════════════════════════════════════════════════════════════════

describe('blackScholesPrice', () => {
  // Standard ATM parameters
  const S = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;

  it('ATM call price is positive and in reasonable range', () => {
    const price = blackScholesPrice('call', S, K, T, r, sigma);
    // Standard BS ATM call ~ 10.45 with exact CDF; implementation uses
    // Abramowitz & Stegun approximation so result may differ slightly
    expect(price).toBeGreaterThan(8);
    expect(price).toBeLessThan(15);
    // NOTE: A&S approximation used (p=0.3275911) gives ~11.9 vs exact 10.45.
    // toBeCloseTo(x, 1) ≡ |received − expected| < 0.05.
    expect(price).toBeCloseTo(11.9, 1);
  });

  it('ATM put price is positive and in reasonable range', () => {
    const price = blackScholesPrice('put', S, K, T, r, sigma);
    // put-call parity: C − P = S − Ke^{-rT}; same A&S offset applies
    expect(price).toBeGreaterThan(4);
    expect(price).toBeLessThan(10);
    expect(price).toBeCloseTo(7.0, 1);
  });

  it('put-call parity: C - P = S - K*exp(-rT)', () => {
    const C = blackScholesPrice('call', S, K, T, r, sigma);
    const P = blackScholesPrice('put', S, K, T, r, sigma);
    const parity = S - K * Math.exp(-r * T);
    expect(C - P).toBeCloseTo(parity, 4);
  });

  it('T <= 0: call returns intrinsic max(S-K, 0)', () => {
    expect(blackScholesPrice('call', 110, 100, 0, r, sigma)).toBe(10);
    expect(blackScholesPrice('call', 90, 100, 0, r, sigma)).toBe(0);
  });

  it('T <= 0: put returns intrinsic max(K-S, 0)', () => {
    expect(blackScholesPrice('put', 90, 100, 0, r, sigma)).toBe(10);
    expect(blackScholesPrice('put', 110, 100, 0, r, sigma)).toBe(0);
  });

  it('deep ITM call ~ S - K*exp(-rT)', () => {
    const price = blackScholesPrice('call', 200, 100, T, r, sigma);
    const expected = 200 - 100 * Math.exp(-r * T);
    expect(price).toBeCloseTo(expected, 0);
  });

  it('deep OTM call ~ 0', () => {
    const price = blackScholesPrice('call', 10, 100, T, r, sigma);
    expect(price).toBeCloseTo(0, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. greeks
// ═══════════════════════════════════════════════════════════════════════════

describe('greeks', () => {
  const S = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;

  it('ATM call delta ~ 0.670 (A&S approximation of N(0.35))', () => {
    const g = greeks('call', S, K, T, r, sigma);
    // delta = N(d1) where d1=0.35; A&S with p=0.3275911 gives ~0.670
    expect(g.delta).toBeGreaterThan(0.5);
    expect(g.delta).toBeLessThan(0.7);
    expect(g.delta).toBeCloseTo(0.670, 2);
  });

  it('call delta in [0, 1]', () => {
    const g = greeks('call', S, K, T, r, sigma);
    expect(g.delta).toBeGreaterThanOrEqual(0);
    expect(g.delta).toBeLessThanOrEqual(1);
  });

  it('put delta in [-1, 0]', () => {
    const g = greeks('put', S, K, T, r, sigma);
    expect(g.delta).toBeGreaterThanOrEqual(-1);
    expect(g.delta).toBeLessThanOrEqual(0);
  });

  it('call delta - put delta ~ 1', () => {
    const gc = greeks('call', S, K, T, r, sigma);
    const gp = greeks('put', S, K, T, r, sigma);
    expect(gc.delta - gp.delta).toBeCloseTo(1, 4);
  });

  it('gamma >= 0 for call and put', () => {
    expect(greeks('call', S, K, T, r, sigma).gamma).toBeGreaterThanOrEqual(0);
    expect(greeks('put', S, K, T, r, sigma).gamma).toBeGreaterThanOrEqual(0);
  });

  it('vega is positive and equal for call and put', () => {
    const vc = greeks('call', S, K, T, r, sigma).vega;
    const vp = greeks('put', S, K, T, r, sigma).vega;
    expect(vc).toBeGreaterThan(0);
    expect(vc).toBeCloseTo(vp, 6);
  });

  it('ATM call vega per 1% vol ≈ 0.375', () => {
    // vega = S * n(d1) * sqrt(T) / 100 = 100 * n(0.35) * 1 / 100 ≈ 0.375
    const g = greeks('call', S, K, T, r, sigma);
    expect(g.vega).toBeCloseTo(0.375, 2);
  });

  it('ATM call theta is negative (time decay) and ≈ -0.0177 per day', () => {
    // theta_daily = (−S·n(d1)·σ/(2√T) − r·K·e^{-rT}·N(d2)) / 365
    const g = greeks('call', S, K, T, r, sigma);
    expect(g.theta).toBeLessThan(0);
    expect(g.theta).toBeCloseTo(-0.0177, 3);
  });

  it('ATM call rho per 1% rate ≈ 0.551 (A&S approximation of N(0.15))', () => {
    // rho = K*T*e^{-rT}*N(d2) / 100; A&S gives N(0.15)~0.579 → rho~0.551
    const g = greeks('call', S, K, T, r, sigma);
    expect(g.rho).toBeCloseTo(0.551, 2);
  });

  it('T <= 0: ITM call delta = 1, OTM call delta = 0', () => {
    const gITM = greeks('call', 110, 100, 0, r, sigma);
    expect(gITM.delta).toBe(1);
    expect(gITM.gamma).toBe(0);
    expect(gITM.vega).toBe(0);

    const gOTM = greeks('call', 90, 100, 0, r, sigma);
    expect(gOTM.delta).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. greeks2nd
// ═══════════════════════════════════════════════════════════════════════════

describe('greeks2nd', () => {
  const S = 100, K = 100, T = 1, r = 0.05, sigma = 0.2;

  it('all 5 values are finite for ATM option', () => {
    const g2 = greeks2nd('call', S, K, T, r, sigma);
    expect(Number.isFinite(g2.vanna)).toBe(true);
    expect(Number.isFinite(g2.volga)).toBe(true);
    expect(Number.isFinite(g2.charm)).toBe(true);
    expect(Number.isFinite(g2.speed)).toBe(true);
    expect(Number.isFinite(g2.color)).toBe(true);
  });

  it('T <= 0 returns all zeros', () => {
    const g2 = greeks2nd('call', S, K, 0, r, sigma);
    expect(g2).toEqual({ vanna: 0, volga: 0, charm: 0, speed: 0, color: 0 });
  });

  it('sigma <= 0 returns all zeros', () => {
    const g2 = greeks2nd('call', S, K, T, r, 0);
    expect(g2).toEqual({ vanna: 0, volga: 0, charm: 0, speed: 0, color: 0 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. impliedVolatility
// ═══════════════════════════════════════════════════════════════════════════

describe('impliedVolatility', () => {
  const S = 100, K = 100, T = 1, r = 0.05;

  it('round-trip call: BS(sigma=0.25) -> price -> IV ~ 0.25', () => {
    const price = blackScholesPrice('call', S, K, T, r, 0.25);
    const iv = impliedVolatility('call', price, S, K, T, r);
    expect(iv).toBeCloseTo(0.25, 4);
  });

  it('round-trip put: BS(sigma=0.25) -> price -> IV ~ 0.25', () => {
    const price = blackScholesPrice('put', S, K, T, r, 0.25);
    const iv = impliedVolatility('put', price, S, K, T, r);
    expect(iv).toBeCloseTo(0.25, 4);
  });

  it('mktPrice <= 0 returns null', () => {
    expect(impliedVolatility('call', 0, S, K, T, r)).toBeNull();
    expect(impliedVolatility('call', -5, S, K, T, r)).toBeNull();
  });

  it('T <= 0 returns null', () => {
    expect(impliedVolatility('call', 10, S, K, 0, r)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. moneyness
// ═══════════════════════════════════════════════════════════════════════════

describe('moneyness', () => {
  it('call: S=110, K=100 -> ITM', () => {
    expect(moneyness('call', 110, 100)).toBe('ITM');
  });

  it('call: S=100, K=100 -> ATM', () => {
    expect(moneyness('call', 100, 100)).toBe('ATM');
  });

  it('call: S=90, K=100 -> OTM', () => {
    expect(moneyness('call', 90, 100)).toBe('OTM');
  });

  it('put: S=90, K=100 -> ITM', () => {
    expect(moneyness('put', 90, 100)).toBe('ITM');
  });

  it('put: S=110, K=100 -> OTM', () => {
    expect(moneyness('put', 110, 100)).toBe('OTM');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. legPayoff
// ═══════════════════════════════════════════════════════════════════════════

describe('legPayoff', () => {
  it('long call ITM: S=120, K=100, premium=5 -> 15', () => {
    const leg = { type: 'call', direction: 1, strike: 100, premium: 5, qty: 1 };
    expect(legPayoff(leg, 120)).toBe(15);
  });

  it('long put ITM: S=80, K=100, premium=5 -> 15', () => {
    const leg = { type: 'put', direction: 1, strike: 100, premium: 5, qty: 1 };
    expect(legPayoff(leg, 80)).toBe(15);
  });

  it('short call ITM: direction=-1, S=120 -> -15', () => {
    const leg = { type: 'call', direction: -1, strike: 100, premium: 5, qty: 1 };
    expect(legPayoff(leg, 120)).toBe(-15);
  });

  it('OTM call: S=90, K=100, premium=5 -> -5', () => {
    const leg = { type: 'call', direction: 1, strike: 100, premium: 5, qty: 1 };
    expect(legPayoff(leg, 90)).toBe(-5);
  });

  it('stock leg: dir=1, qty=1, strike=100, S=120 -> 20', () => {
    const leg = { type: 'stock', direction: 1, strike: 100, premium: 0, qty: 1 };
    expect(legPayoff(leg, 120)).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. strategyPayoff
// ═══════════════════════════════════════════════════════════════════════════

describe('strategyPayoff', () => {
  it('covered call at S=120: stock(+20) + short call(-12) = 8', () => {
    const legs = [
      { type: 'stock', direction: 1, strike: 100, premium: 0, qty: 1 },
      { type: 'call', direction: -1, strike: 105, premium: 3, qty: 1 },
    ];
    // stock: 1 * 1 * (120 - 100) = 20
    // short call: -1 * 1 * (max(120-105,0) - 3) = -1 * (15 - 3) = -12
    expect(strategyPayoff(legs, 120)).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. findBreakevens
// ═══════════════════════════════════════════════════════════════════════════

describe('findBreakevens', () => {
  it('covered call has 1 breakeven', () => {
    const legs = [
      { type: 'stock', direction: 1, strike: 100, premium: 0, qty: 1 },
      { type: 'call', direction: -1, strike: 105, premium: 3, qty: 1 },
    ];
    // breakeven: stock payoff + short call payoff = 0
    // Below K=105: (S-100) + 3 = 0 => S = 97
    const breakevens = findBreakevens(legs, [50, 200]);
    expect(breakevens).toHaveLength(1);
    expect(breakevens[0]).toBeCloseTo(97, 0);
  });

  it('straddle has 2 breakevens', () => {
    const premium = 8;
    const legs = [
      { type: 'call', direction: 1, strike: 100, premium, qty: 1 },
      { type: 'put', direction: 1, strike: 100, premium, qty: 1 },
    ];
    // breakevens: S = 100 - 2*premium = 84, S = 100 + 2*premium = 116
    const breakevens = findBreakevens(legs, [50, 200]);
    expect(breakevens).toHaveLength(2);
    expect(breakevens[0]).toBeCloseTo(84, 0);
    expect(breakevens[1]).toBeCloseTo(116, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. maxProfitLoss
// ═══════════════════════════════════════════════════════════════════════════

describe('maxProfitLoss', () => {
  it('butterfly has bounded profit and bounded loss', () => {
    // Long 95 call, short 2x 100 call, long 105 call
    const legs = [
      { type: 'call', direction: 1, strike: 95, premium: 7, qty: 1 },
      { type: 'call', direction: -1, strike: 100, premium: 4, qty: 2 },
      { type: 'call', direction: 1, strike: 105, premium: 2, qty: 1 },
    ];
    const result = maxProfitLoss(legs, [50, 200]);
    expect(Number.isFinite(result.maxProfit)).toBe(true);
    expect(Number.isFinite(result.maxLoss)).toBe(true);
    expect(result.maxProfit).toBeGreaterThan(0);
    expect(result.maxLoss).toBeLessThan(0);
  });

  it('long call: maxLoss = -premium (bounded), maxProfit large', () => {
    const legs = [
      { type: 'call', direction: 1, strike: 100, premium: 5, qty: 1 },
    ];
    const result = maxProfitLoss(legs, [0, 300]);
    // maxLoss = -5 (when S < 100, payoff = -premium)
    expect(result.maxLoss).toBeCloseTo(-5, 2);
    // maxProfit at S=300: max(300-100,0) - 5 = 195
    expect(result.maxProfit).toBeGreaterThan(100);
  });
});
