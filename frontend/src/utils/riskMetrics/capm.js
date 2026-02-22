/**
 * CAPM and performance metrics (CFA L1/L2).
 * Pure JavaScript — zero React dependencies.
 */
import { mean, stdDev, annualizedReturn, annualizedVolatility, downsideDev } from './descriptive.js';

/** Covariance between two arrays (sample) */
export function covariance(x, y) {
  if (x.length !== y.length || x.length < 2) return null;
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (x.length - 1);
}

/** Pearson correlation */
export function correlation(x, y) {
  const cov = covariance(x, y);
  const sx = stdDev(x);
  const sy = stdDev(y);
  if (cov == null || sx === 0 || sy === 0 || sx == null || sy == null) return null;
  return cov / (sx * sy);
}

/** Beta = Cov(Ri, Rm) / Var(Rm) */
export function beta(stockReturns, benchReturns) {
  const cov = covariance(stockReturns, benchReturns);
  const varBench = stdDev(benchReturns);
  if (cov == null || varBench == null || varBench === 0) return null;
  return cov / (varBench * varBench);
}

/**
 * Jensen's Alpha (annualized): Rp - [Rf + β(Rm - Rf)]
 * @param {number} rfAnnual - annual risk-free rate (e.g., 0.23 for 23%)
 */
export function jensensAlpha(stockReturns, benchReturns, rfAnnual = 0.23) {
  const b = beta(stockReturns, benchReturns);
  const rp = annualizedReturn(stockReturns);
  const rm = annualizedReturn(benchReturns);
  if (b == null || rp == null || rm == null) return null;
  return rp - (rfAnnual + b * (rm - rfAnnual));
}

/**
 * Sharpe Ratio (annualized): (Rp - Rf) / σp
 */
export function sharpeRatio(dailyReturns, rfAnnual = 0.23) {
  const rp = annualizedReturn(dailyReturns);
  const sigma = annualizedVolatility(dailyReturns);
  if (rp == null || sigma == null || sigma === 0) return null;
  return (rp - rfAnnual) / sigma;
}

/**
 * Treynor Ratio: (Rp - Rf) / β
 */
export function treynorRatio(stockReturns, benchReturns, rfAnnual = 0.23) {
  const rp = annualizedReturn(stockReturns);
  const b = beta(stockReturns, benchReturns);
  if (rp == null || b == null || b === 0) return null;
  return (rp - rfAnnual) / b;
}

/**
 * Sortino Ratio (annualized): (Rp - Rf) / σ_downside
 */
export function sortinoRatio(dailyReturns, rfAnnual = 0.23) {
  const rfDaily = Math.pow(1 + rfAnnual, 1 / 252) - 1;
  const rp = annualizedReturn(dailyReturns);
  const dd = downsideDev(dailyReturns, rfDaily);
  if (rp == null || dd == null || dd === 0) return null;
  const annDD = dd * Math.sqrt(252);
  return (rp - rfAnnual) / annDD;
}

/** R-Squared: corr(Ri, Rm)² */
export function rSquared(stockReturns, benchReturns) {
  const corr = correlation(stockReturns, benchReturns);
  if (corr == null) return null;
  return corr * corr;
}

/** Tracking Error: annualized σ of (Ri - Rm) */
export function trackingError(stockReturns, benchReturns) {
  if (stockReturns.length !== benchReturns.length || stockReturns.length < 2) return null;
  const activeReturns = stockReturns.map((r, i) => r - benchReturns[i]);
  const sd = stdDev(activeReturns);
  return sd != null ? sd * Math.sqrt(252) : null;
}

/** M-Squared (Modigliani-Modigliani, CFA L2): M² = Rf + (Rp - Rf) × σ_m / σ_p */
export function mSquared(stockReturns, benchReturns, rfAnnual = 0.23) {
  const rp = annualizedReturn(stockReturns);
  const sigmaP = annualizedVolatility(stockReturns);
  const sigmaM = annualizedVolatility(benchReturns);
  if (rp == null || sigmaP == null || sigmaM == null || sigmaP === 0) return null;
  return rfAnnual + (rp - rfAnnual) * (sigmaM / sigmaP);
}

/** Information Ratio: (Rp - Rm) / TE */
export function informationRatio(stockReturns, benchReturns) {
  const rp = annualizedReturn(stockReturns);
  const rm = annualizedReturn(benchReturns);
  const te = trackingError(stockReturns, benchReturns);
  if (rp == null || rm == null || te == null || te === 0) return null;
  return (rp - rm) / te;
}
