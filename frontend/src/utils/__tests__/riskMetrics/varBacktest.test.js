import { describe, it, expect } from 'vitest';
import { backtestVaR, kupiecPOF, baselTrafficLight } from '../../riskMetrics/varBacktest.js';

// =============================================================================
// 1. backtestVaR
// =============================================================================

describe('backtestVaR', () => {
  it('returns null for insufficient data (< window+1)', () => {
    const returns = Array.from({ length: 250 }, () => 0.001);
    const dates = returns.map((_, i) => `2024-${String(i)}`);
    // Exactly 250 returns, need >= 251 (window=250)
    expect(backtestVaR(returns, dates, 250)).toBeNull();
  });

  it('basic run returns series, violations, violationRate, totalDays', () => {
    // 300 returns — enough for window=250
    const returns = Array.from({ length: 300 }, (_, i) =>
      i % 7 === 0 ? -0.05 : 0.002
    );
    const dates = returns.map((_, i) => `day-${i}`);
    const result = backtestVaR(returns, dates, 250, 0.95);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('series');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('violationRate');
    expect(result).toHaveProperty('totalDays');
    expect(result.totalDays).toBe(result.series.length);
  });

  it('violationRate is between 0 and 1', () => {
    const returns = Array.from({ length: 300 }, (_, i) =>
      Math.sin(i * 0.1) * 0.02
    );
    const dates = returns.map((_, i) => `day-${i}`);
    const result = backtestVaR(returns, dates, 250, 0.95);
    expect(result).not.toBeNull();
    expect(result.violationRate).toBeGreaterThanOrEqual(0);
    expect(result.violationRate).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// 2. kupiecPOF
// =============================================================================

describe('kupiecPOF', () => {
  it('exact violation rate (x/T = p) => LR ~ 0 => reject = false', () => {
    // T=200, p=0.05, expected x = 10
    const result = kupiecPOF(200, 10, 0.05);
    expect(result).not.toBeNull();
    expect(result.lr).toBeCloseTo(0, 4);
    expect(result.reject).toBe(false);
  });

  it('high violations => reject = true', () => {
    // T=250, x=50, p=0.05 — way more violations than expected
    const result = kupiecPOF(250, 50, 0.05);
    expect(result).not.toBeNull();
    expect(result.reject).toBe(true);
    expect(result.lr).toBeGreaterThan(3.841);
  });

  it('x = 0 edge case', () => {
    // T=100, x=0, p=0.05
    const result = kupiecPOF(100, 0, 0.05);
    expect(result).not.toBeNull();
    expect(typeof result.lr).toBe('number');
    // lr = |-2 * T * ln(1-p)| = |-2 * 100 * ln(0.95)| = 10.258...
    expect(result.lr).toBeCloseTo(10.2587, 3);
    expect(result.reject).toBe(true);
  });

  it('T <= 0 returns null', () => {
    expect(kupiecPOF(0, 0, 0.05)).toBeNull();
    expect(kupiecPOF(-1, 0, 0.05)).toBeNull();
  });
});

// =============================================================================
// 3. baselTrafficLight
// =============================================================================

describe('baselTrafficLight', () => {
  it('at 95% conf, 250 days: expected = 12.5', () => {
    // green threshold: 12.5 * 1.6 = 20
    expect(baselTrafficLight(10, 250, 0.95)).toBe('green');
    expect(baselTrafficLight(20, 250, 0.95)).toBe('green');
  });

  it('yellow if violations between 20 and 45', () => {
    // yellow threshold: 12.5 * 3.6 = 45
    expect(baselTrafficLight(21, 250, 0.95)).toBe('yellow');
    expect(baselTrafficLight(45, 250, 0.95)).toBe('yellow');
  });

  it('red if violations exceed 45', () => {
    expect(baselTrafficLight(46, 250, 0.95)).toBe('red');
    expect(baselTrafficLight(100, 250, 0.95)).toBe('red');
  });
});
