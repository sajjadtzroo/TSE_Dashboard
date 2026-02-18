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
    if (windowBench.length === window) {
      const mx = mean(windowReturns);
      const my = mean(windowBench);
      if (mx != null && my != null) {
        let cov = 0;
        let varB = 0;
        for (let j = 0; j < window; j++) {
          cov += (windowReturns[j] - mx) * (windowBench[j] - my);
          varB += (windowBench[j] - my) ** 2;
        }
        if (varB > 0) {
          rollingBeta = cov / varB;
        }
      }
    }

    results.push({
      date: dates[i],
      rollingSharpe,
      rollingBeta,
      rollingVol,
    });
  }

  return results;
}
