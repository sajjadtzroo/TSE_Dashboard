import { describe, it, expect } from 'vitest';
import {
  covariance,
  correlation,
  beta,
  jensensAlpha,
  sharpeRatio,
  treynorRatio,
  sortinoRatio,
  rSquared,
  trackingError,
  informationRatio,
} from '../../riskMetrics/capm.js';
import {
  mean,
  variance,
  stdDev,
  annualizedReturn,
  annualizedVolatility,
  downsideDev,
} from '../../riskMetrics/descriptive.js';

// ── Shared test data ──────────────────────────────────────────────────────
const stockR = [0.01, -0.02, 0.015, -0.005, 0.008, -0.012, 0.003, 0.02, -0.018, 0.007];
const benchR = [0.005, -0.01, 0.008, -0.003, 0.006, -0.008, 0.002, 0.012, -0.009, 0.004];

// ═══════════════════════════════════════════════════════════════════════════
// 1. covariance
// ═══════════════════════════════════════════════════════════════════════════

describe('covariance', () => {
  it('Cov(x, x) = Var(x)', () => {
    const x = [1, 2, 3, 4, 5];
    expect(covariance(x, x)).toBeCloseTo(variance(x), 4);
  });

  it('hand-computed with small arrays', () => {
    // x=[1,2,3], y=[4,5,6], mx=2, my=5
    // cov = [(1-2)(4-5)+(2-2)(5-5)+(3-2)(6-5)] / (3-1)
    //     = [1 + 0 + 1] / 2 = 1.0
    expect(covariance([1, 2, 3], [4, 5, 6])).toBeCloseTo(1.0, 4);
  });

  it('negative covariance for inversely related arrays', () => {
    // x=[1,2,3], y=[6,5,4]
    // cov = [(1-2)(6-5)+(2-2)(5-5)+(3-2)(4-5)] / 2 = [-1+0-1]/2 = -1.0
    expect(covariance([1, 2, 3], [6, 5, 4])).toBeCloseTo(-1.0, 4);
  });

  it('returns null for mismatched lengths', () => {
    expect(covariance([1, 2, 3], [4, 5])).toBeNull();
  });

  it('returns null for fewer than 2 elements', () => {
    expect(covariance([1], [2])).toBeNull();
    expect(covariance([], [])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. correlation (Pearson)
// ═══════════════════════════════════════════════════════════════════════════

describe('correlation', () => {
  it('perfect positive: [1,2,3] vs [2,4,6] = 1.0', () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1.0, 4);
  });

  it('perfect negative: [1,2,3] vs [6,4,2] = -1.0', () => {
    expect(correlation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1.0, 4);
  });

  it('uncorrelated data has correlation near 0', () => {
    // Orthogonal-ish data
    const x = [1, -1, 1, -1, 1, -1];
    const y = [1, 1, -1, -1, 1, 1];
    const corr = correlation(x, y);
    expect(Math.abs(corr)).toBeLessThan(0.5);
  });

  it('returns null when one series has zero standard deviation', () => {
    expect(correlation([5, 5, 5], [1, 2, 3])).toBeNull();
    expect(correlation([1, 2, 3], [5, 5, 5])).toBeNull();
  });

  it('returns null for mismatched lengths', () => {
    expect(correlation([1, 2], [1, 2, 3])).toBeNull();
  });

  it('correlation is between -1 and 1', () => {
    const corr = correlation(stockR, benchR);
    expect(corr).toBeGreaterThanOrEqual(-1);
    expect(corr).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. beta
// ═══════════════════════════════════════════════════════════════════════════

describe('beta', () => {
  it('beta = 1 for identical series', () => {
    const series = [0.01, -0.02, 0.015, -0.005, 0.008];
    expect(beta(series, series)).toBeCloseTo(1.0, 4);
  });

  it('beta > 1 for leveraged (amplified) series', () => {
    // stock = 2 * bench => beta should be 2
    const bench = [0.01, -0.02, 0.015, -0.005, 0.008];
    const stock = bench.map((r) => r * 2);
    expect(beta(stock, bench)).toBeCloseTo(2.0, 4);
  });

  it('beta < 0 for inversely correlated series', () => {
    const bench = [0.01, -0.02, 0.015, -0.005, 0.008];
    const stock = bench.map((r) => -r);
    expect(beta(stock, bench)).toBeCloseTo(-1.0, 4);
  });

  it('matches Cov(stock, bench) / Var(bench)', () => {
    const cov = covariance(stockR, benchR);
    const varB = variance(benchR);
    expect(beta(stockR, benchR)).toBeCloseTo(cov / varB, 4);
  });

  it('returns null for mismatched lengths', () => {
    expect(beta([0.01], [0.01, 0.02])).toBeNull();
  });

  it('returns null when benchmark has zero variance (integer constants)', () => {
    // Use exact integers to avoid floating-point rounding in mean
    expect(beta([1, 2, 3], [5, 5, 5])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. jensensAlpha
// ═══════════════════════════════════════════════════════════════════════════

describe('jensensAlpha', () => {
  it('alpha = 0 when stock perfectly tracks CAPM prediction', () => {
    // If stock = bench, then beta=1 and Rp=Rm, so alpha = Rm - (Rf + 1*(Rm-Rf)) = 0
    const series = [0.001, 0.002, -0.001, 0.003, 0.0005];
    expect(jensensAlpha(series, series, 0.23)).toBeCloseTo(0, 4);
  });

  it('formula verification: Rp - [Rf + beta*(Rm - Rf)]', () => {
    const b = beta(stockR, benchR);
    const rp = annualizedReturn(stockR);
    const rm = annualizedReturn(benchR);
    const rf = 0.23;
    const expected = rp - (rf + b * (rm - rf));
    expect(jensensAlpha(stockR, benchR, rf)).toBeCloseTo(expected, 4);
  });

  it('returns null for insufficient data', () => {
    expect(jensensAlpha([0.01], [0.02], 0.23)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. sharpeRatio
// ═══════════════════════════════════════════════════════════════════════════

describe('sharpeRatio', () => {
  it('formula: (annualizedReturn - rf) / annualizedVolatility', () => {
    const rp = annualizedReturn(stockR);
    const vol = annualizedVolatility(stockR);
    const rf = 0.23;
    const expected = (rp - rf) / vol;
    expect(sharpeRatio(stockR, rf)).toBeCloseTo(expected, 4);
  });

  it('negative Sharpe when return < risk-free rate', () => {
    // Small daily returns that annualize below rf=23%
    const lowReturns = [0.0001, 0.0002, -0.0001, 0.0003, 0.00005];
    expect(sharpeRatio(lowReturns, 0.23)).toBeLessThan(0);
  });

  it('returns null for zero volatility', () => {
    expect(sharpeRatio([0, 0, 0, 0], 0.23)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(sharpeRatio([], 0.23)).toBeNull();
  });

  it('returns null for single element', () => {
    expect(sharpeRatio([0.01], 0.23)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. treynorRatio
// ═══════════════════════════════════════════════════════════════════════════

describe('treynorRatio', () => {
  it('formula: (annualizedReturn - rf) / beta', () => {
    const rp = annualizedReturn(stockR);
    const b = beta(stockR, benchR);
    const rf = 0.23;
    const expected = (rp - rf) / b;
    expect(treynorRatio(stockR, benchR, rf)).toBeCloseTo(expected, 4);
  });

  it('returns null when beta = 0 (constant benchmark, integer values)', () => {
    // Constant benchmark with integer values => zero variance => beta null => treynor null
    expect(treynorRatio([1, 2, -1], [5, 5, 5], 0.23)).toBeNull();
  });

  it('returns null for insufficient data', () => {
    expect(treynorRatio([0.01], [0.02], 0.23)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. sortinoRatio
// ═══════════════════════════════════════════════════════════════════════════

describe('sortinoRatio', () => {
  it('uses downside deviation, not total volatility', () => {
    // Sortino ratio = (Rp - Rf) / annualized_downside_dev
    const rf = 0.23;
    const rfDaily = Math.pow(1 + rf, 1 / 252) - 1;
    const rp = annualizedReturn(stockR);
    const dd = downsideDev(stockR, rfDaily);
    const annDD = dd * Math.sqrt(252);
    const expected = (rp - rf) / annDD;
    expect(sortinoRatio(stockR, rf)).toBeCloseTo(expected, 4);
  });

  it('Sortino differs from Sharpe when there is asymmetry', () => {
    // With asymmetric returns, Sortino and Sharpe should differ
    const asymmetric = [0.02, 0.03, 0.01, -0.05, 0.04, 0.02, -0.01, 0.03, 0.01, 0.02];
    const rf = 0.23;
    const sharpe = sharpeRatio(asymmetric, rf);
    const sortino = sortinoRatio(asymmetric, rf);
    // They should be different values (both defined)
    if (sharpe != null && sortino != null) {
      expect(sortino).not.toBeCloseTo(sharpe, 2);
    }
  });

  it('returns null when all returns are above daily risk-free (dd=0)', () => {
    // Very high daily returns => no downside below rfDaily => dd=0 => null
    const highReturns = [0.05, 0.04, 0.06, 0.03, 0.07];
    expect(sortinoRatio(highReturns, 0.23)).toBeNull();
  });

  it('returns null for insufficient data', () => {
    expect(sortinoRatio([0.01], 0.23)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. rSquared
// ═══════════════════════════════════════════════════════════════════════════

describe('rSquared', () => {
  it('r-squared is in [0, 1]', () => {
    const r2 = rSquared(stockR, benchR);
    expect(r2).toBeGreaterThanOrEqual(0);
    expect(r2).toBeLessThanOrEqual(1);
  });

  it('perfect correlation gives r-squared = 1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(rSquared(x, y)).toBeCloseTo(1.0, 4);
  });

  it('perfect negative correlation also gives r-squared = 1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    expect(rSquared(x, y)).toBeCloseTo(1.0, 4);
  });

  it('equals correlation squared', () => {
    const corr = correlation(stockR, benchR);
    expect(rSquared(stockR, benchR)).toBeCloseTo(corr * corr, 4);
  });

  it('returns null for zero-variance series', () => {
    expect(rSquared([5, 5, 5], [1, 2, 3])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. trackingError
// ═══════════════════════════════════════════════════════════════════════════

describe('trackingError', () => {
  it('identical series gives TE = 0', () => {
    const series = [0.01, -0.02, 0.015, -0.005, 0.008];
    expect(trackingError(series, series)).toBeCloseTo(0, 4);
  });

  it('computes annualized stdDev of active returns', () => {
    const activeReturns = stockR.map((r, i) => r - benchR[i]);
    const expected = stdDev(activeReturns) * Math.sqrt(252);
    expect(trackingError(stockR, benchR)).toBeCloseTo(expected, 4);
  });

  it('TE is always non-negative', () => {
    expect(trackingError(stockR, benchR)).toBeGreaterThanOrEqual(0);
  });

  it('returns null for mismatched lengths', () => {
    expect(trackingError([0.01, 0.02], [0.01])).toBeNull();
  });

  it('returns null for fewer than 2 elements', () => {
    expect(trackingError([0.01], [0.02])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. informationRatio
// ═══════════════════════════════════════════════════════════════════════════

describe('informationRatio', () => {
  it('identical series gives null (TE = 0, division by zero)', () => {
    const series = [0.01, -0.02, 0.015, -0.005, 0.008];
    expect(informationRatio(series, series)).toBeNull();
  });

  it('formula: (annualizedReturn_stock - annualizedReturn_bench) / TE', () => {
    const rp = annualizedReturn(stockR);
    const rm = annualizedReturn(benchR);
    const te = trackingError(stockR, benchR);
    const expected = (rp - rm) / te;
    expect(informationRatio(stockR, benchR)).toBeCloseTo(expected, 4);
  });

  it('positive IR when stock outperforms benchmark', () => {
    // Create stock returns that clearly beat benchmark
    const goodStock = benchR.map((r) => r + 0.005); // always 50bps above
    const ir = informationRatio(goodStock, benchR);
    expect(ir).toBeGreaterThan(0);
  });

  it('negative IR when stock underperforms benchmark', () => {
    const badStock = benchR.map((r) => r - 0.005); // always 50bps below
    const ir = informationRatio(badStock, benchR);
    expect(ir).toBeLessThan(0);
  });

  it('returns null for mismatched lengths', () => {
    expect(informationRatio([0.01], [0.01, 0.02])).toBeNull();
  });
});
