/**
 * Rolling statistics for portfolio analytics (CFA L2).
 * Pure JavaScript — zero React dependencies.
 */
import { stdDev, mean } from './descriptive.js';

/**
 * Compute rolling metrics over a sliding window.
 * @param {number[]} returns - daily portfolio returns
 * @param {number[]} benchReturns - daily benchmark returns (aligned)
 * @param {string[]} dates - corresponding dates
 * @param {number} window - rolling window size (default 30)
 * @param {number} rfAnnual - annual risk-free rate (default 0.23)
 * @returns {Array<{ date, rollingSharpe, rollingBeta, rollingVol }>}
 */
export function computeRollingMetrics(returns, benchReturns, dates, window = 30, rfAnnual = 0.23) {
  if (returns.length < window) return [];

  const rfDaily = Math.pow(1 + rfAnnual, 1 / 252) - 1;
  const results = [];

  for (let i = window - 1; i < returns.length; i++) {
    const windowReturns = returns.slice(i - window + 1, i + 1);
    const windowBench = benchReturns.slice(i - window + 1, i + 1);

    // Rolling volatility (annualized)
    const sd = stdDev(windowReturns);
    const rollingVol = sd != null ? sd * Math.sqrt(252) : null;

    // Rolling Sharpe
    const m = mean(windowReturns);
    const annRet = m != null ? Math.pow(1 + m, 252) - 1 : null;
    const rollingSharpe =
      annRet != null && rollingVol != null && rollingVol > 0
        ? (annRet - rfAnnual) / rollingVol
        : null;

    // Rolling Beta
    let rollingBeta = null;
    const my = mean(windowBench);
    if (windowBench.length === window && m != null && my != null) {
      let cov = 0;
      let varB = 0;
      for (let j = 0; j < window; j++) {
        cov += (windowReturns[j] - m) * (windowBench[j] - my);
        varB += (windowBench[j] - my) ** 2;
      }
      if (varB > 0) {
        rollingBeta = cov / varB;
      }
    }

    // Rolling Correlation with benchmark
    let rollingCorrelation = null;
    if (windowBench.length === window && m != null && my != null) {
      let cov = 0;
      let varS = 0;
      let varB = 0;
      for (let j = 0; j < window; j++) {
        const ds = windowReturns[j] - m;
        const db = windowBench[j] - my;
        cov += ds * db;
        varS += ds * ds;
        varB += db * db;
      }
      if (varS > 0 && varB > 0) {
        rollingCorrelation = cov / (Math.sqrt(varS) * Math.sqrt(varB));
      }
    }

    results.push({
      date: dates[i],
      rollingSharpe,
      rollingBeta,
      rollingVol,
      rollingCorrelation,
    });
  }

  return results;
}

/**
 * EWMA (Exponentially Weighted Moving Average) Volatility — RiskMetrics methodology.
 * σ²_t = λ × σ²_{t-1} + (1 - λ) × r²_{t-1}
 * @param {number[]} returns - daily return array
 * @param {string[]} dates - corresponding dates
 * @param {number} lambda - decay factor (default 0.94 per RiskMetrics)
 * @returns {Array<{ date: string, ewmaVol: number }>}
 */
export function computeEWMAVolatility(returns, dates, lambda = 0.94) {
  if (returns.length < 2) return [];

  const results = [];
  // Initialize with sample variance of first few returns (avoids first-iteration no-op)
  const initWindow = Math.min(75, returns.length);
  const initSlice = returns.slice(0, initWindow);
  const initMean = initSlice.reduce((s, v) => s + v, 0) / initSlice.length;
  let ewmaVar = initSlice.reduce((s, v) => s + (v - initMean) ** 2, 0) / initSlice.length;
  if (ewmaVar === 0) ewmaVar = returns[0] * returns[0];

  for (let i = 1; i < returns.length; i++) {
    ewmaVar = lambda * ewmaVar + (1 - lambda) * returns[i - 1] * returns[i - 1];
    results.push({
      date: dates[i],
      ewmaVol: Math.sqrt(ewmaVar) * Math.sqrt(252), // annualized
    });
  }

  return results;
}
