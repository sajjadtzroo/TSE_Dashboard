import { describe, it, expect } from 'vitest';
import {
  mean,
  variance,
  stdDev,
  annualizedVolatility,
  annualizedReturn,
  coefficientOfVariation,
  skewness,
  kurtosis,
  downsideDev,
} from '../../riskMetrics/descriptive.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. mean
// ═══════════════════════════════════════════════════════════════════════════

describe('mean', () => {
  it('KAT: mean([1,2,3,4,5]) = 3.0', () => {
    expect(mean([1, 2, 3, 4, 5])).toBeCloseTo(3.0, 4);
  });

  it('returns null for empty array', () => {
    expect(mean([])).toBeNull();
  });

  it('single element returns that element', () => {
    expect(mean([42])).toBeCloseTo(42, 4);
  });

  it('handles negative values', () => {
    expect(mean([-3, -1, 0, 1, 3])).toBeCloseTo(0, 4);
  });

  it('handles decimal values', () => {
    expect(mean([0.01, 0.02, 0.03])).toBeCloseTo(0.02, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. variance (Bessel n-1)
// ═══════════════════════════════════════════════════════════════════════════

describe('variance', () => {
  it('KAT: variance([2,4,4,4,5,5,7,9]) = 4.571429 (Bessel n-1)', () => {
    // Population variance = 4.0, sample variance (n-1) = 32/7 = 4.571428...
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571429, 4);
  });

  it('returns null for single element (n < 2)', () => {
    expect(variance([5])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(variance([])).toBeNull();
  });

  it('variance of constant array is 0', () => {
    expect(variance([3, 3, 3, 3])).toBeCloseTo(0, 4);
  });

  it('two-element array uses n-1 denominator', () => {
    // [1, 3]: mean=2, sum_sq=2+2=4, variance=4/(2-1)=4
    expect(variance([1, 3])).toBeCloseTo(2.0, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. stdDev
// ═══════════════════════════════════════════════════════════════════════════

describe('stdDev', () => {
  it('KAT: stdDev([2,4,4,4,5,5,7,9]) = sqrt(4.571429) ~ 2.13809', () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });

  it('returns null for single element', () => {
    expect(stdDev([5])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(stdDev([])).toBeNull();
  });

  it('stdDev of constant array is 0', () => {
    expect(stdDev([7, 7, 7])).toBeCloseTo(0, 4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. annualizedVolatility
// ═══════════════════════════════════════════════════════════════════════════

describe('annualizedVolatility', () => {
  it('equals stdDev * sqrt(252)', () => {
    const dailyReturns = [0.01, -0.005, 0.008, -0.003, 0.012, -0.002, 0.006];
    const expected = stdDev(dailyReturns) * Math.sqrt(252);
    expect(annualizedVolatility(dailyReturns)).toBeCloseTo(expected, 4);
  });

  it('returns null for insufficient data', () => {
    expect(annualizedVolatility([0.01])).toBeNull();
    expect(annualizedVolatility([])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. annualizedReturn
// ═══════════════════════════════════════════════════════════════════════════

describe('annualizedReturn', () => {
  it('matches (1 + mean_daily)^252 - 1 formula', () => {
    const dailyReturns = [0.001, 0.002, -0.001, 0.003, 0.0005];
    const m = mean(dailyReturns);
    const expected = Math.pow(1 + m, 252) - 1;
    expect(annualizedReturn(dailyReturns)).toBeCloseTo(expected, 4);
  });

  it('zero daily return yields zero annualized return', () => {
    expect(annualizedReturn([0, 0, 0, 0])).toBeCloseTo(0, 4);
  });

  it('returns null for empty array', () => {
    expect(annualizedReturn([])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. coefficientOfVariation
// ═══════════════════════════════════════════════════════════════════════════

describe('coefficientOfVariation', () => {
  it('computes sigma / |mu|', () => {
    const dailyReturns = [0.01, 0.02, 0.03, 0.04, 0.05];
    const m = mean(dailyReturns);
    const sd = stdDev(dailyReturns);
    expect(coefficientOfVariation(dailyReturns)).toBeCloseTo(sd / Math.abs(m), 4);
  });

  it('returns null when mean is zero', () => {
    // Symmetric around zero: mean = 0
    expect(coefficientOfVariation([-1, 1])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(coefficientOfVariation([])).toBeNull();
  });

  it('returns null for single element (stdDev is null)', () => {
    expect(coefficientOfVariation([0.05])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. skewness (Fisher-corrected)
// ═══════════════════════════════════════════════════════════════════════════

describe('skewness', () => {
  it('symmetric data [1,2,3,4,5] has skewness ~ 0', () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 4);
  });

  it('right-skewed data has positive skewness', () => {
    // Heavy right tail
    const rightSkewed = [1, 1, 1, 2, 2, 3, 10, 20, 50];
    expect(skewness(rightSkewed)).toBeGreaterThan(0);
  });

  it('left-skewed data has negative skewness', () => {
    // Heavy left tail (mirror of right-skewed)
    const leftSkewed = [-50, -20, -10, -3, -2, -1, -1, -1, -1];
    expect(skewness(leftSkewed)).toBeLessThan(0);
  });

  it('returns null for n < 3', () => {
    expect(skewness([1, 2])).toBeNull();
    expect(skewness([1])).toBeNull();
    expect(skewness([])).toBeNull();
  });

  it('returns null for zero standard deviation', () => {
    expect(skewness([5, 5, 5])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. kurtosis (excess, Fisher-corrected)
// ═══════════════════════════════════════════════════════════════════════════

describe('kurtosis', () => {
  it('normal-like data has excess kurtosis near 0', () => {
    // Large sample from a near-uniform symmetric distribution
    // For a uniform distribution, excess kurtosis = -1.2 (platykurtic)
    // For practical testing, we use a data set with known properties
    const uniform = [];
    for (let i = 1; i <= 100; i++) uniform.push(i);
    const k = kurtosis(uniform);
    // Uniform distribution: excess kurtosis ~ -1.2
    expect(k).toBeCloseTo(-1.2, 1);
  });

  it('heavy-tailed data has positive excess kurtosis', () => {
    // Data with extreme outliers => leptokurtic
    const heavyTailed = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, -100];
    expect(kurtosis(heavyTailed)).toBeGreaterThan(0);
  });

  it('returns null for n < 4', () => {
    expect(kurtosis([1, 2, 3])).toBeNull();
    expect(kurtosis([1, 2])).toBeNull();
    expect(kurtosis([])).toBeNull();
  });

  it('returns null for zero standard deviation', () => {
    expect(kurtosis([5, 5, 5, 5])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. downsideDev
// ═══════════════════════════════════════════════════════════════════════════

describe('downsideDev', () => {
  it('returns 0 when no returns are below MAR', () => {
    expect(downsideDev([0.01, 0.02, 0.03], 0)).toBe(0);
  });

  it('computes semi-deviation for returns with downside', () => {
    // returns = [0.01, -0.02, 0.03, -0.04, 0.005]
    // mar=0, downside diffs: min(0.01-0,0)=0, min(-0.02-0,0)=-0.02,
    //   min(0.03,0)=0, min(-0.04,0)=-0.04, min(0.005,0)=0
    // sumSq = 0 + 0.0004 + 0 + 0.0016 + 0 = 0.002
    // downsideDev = sqrt(0.002 / (5-1)) = sqrt(0.0005)
    const returns = [0.01, -0.02, 0.03, -0.04, 0.005];
    const expected = Math.sqrt(0.002 / 4);
    expect(downsideDev(returns, 0)).toBeCloseTo(expected, 4);
  });

  it('with non-zero MAR shifts the threshold', () => {
    // returns = [0.01, 0.005, -0.01], mar = 0.01
    // diffs: min(0.01-0.01,0)=0, min(0.005-0.01,0)=-0.005, min(-0.01-0.01,0)=-0.02
    // sumSq = 0 + 0.000025 + 0.0004 = 0.000425
    // sqrt(0.000425 / 2)
    const returns = [0.01, 0.005, -0.01];
    const expected = Math.sqrt(0.000425 / 2);
    expect(downsideDev(returns, 0.01)).toBeCloseTo(expected, 4);
  });

  it('returns null for single element (n < 2)', () => {
    expect(downsideDev([0.01])).toBeNull();
    expect(downsideDev([])).toBeNull();
  });

  it('all returns below MAR computes full semi-deviation', () => {
    // returns = [-0.01, -0.02], mar=0
    // sumSq = 0.0001 + 0.0004 = 0.0005
    // sqrt(0.0005 / 1)
    const returns = [-0.01, -0.02];
    const expected = Math.sqrt(0.0005 / 1);
    expect(downsideDev(returns, 0)).toBeCloseTo(expected, 4);
  });
});
