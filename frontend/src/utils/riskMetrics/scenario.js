/**
 * Scenario analysis and Omega ratio.
 * Pure JavaScript — zero React dependencies.
 */
import { mean } from './descriptive.js';

/**
 * Generate scenario projections based on beta and sigma.
 * @param {number} price - current stock price
 * @param {number} b - stock beta
 * @param {number} sigma - annualized stock volatility
 * @param {number} alpha - Jensen's alpha (annualized, optional)
 * @returns {Array<{ name, marketMove, stockMove, targetPrice, returnPct }>}
 */
export function scenarioAnalysis(price, b, sigma, alpha = 0) {
  if (price == null || b == null || sigma == null) return [];

  const scenarios = [
    { name: 'صعودی (Bull)', marketMove: 2 * sigma },
    { name: 'پایه (Base)', marketMove: 0 },
    { name: 'نزولی (Bear)', marketMove: -2 * sigma },
    { name: 'بحرانی (Stress)', marketMove: -3 * sigma },
  ];

  return scenarios.map((s) => {
    const stockMove = b * s.marketMove + alpha;
    const targetPrice = price * (1 + stockMove);
    return {
      name: s.name,
      marketMove: s.marketMove,
      stockMove,
      targetPrice,
      returnPct: stockMove,
    };
  });
}

/**
 * Omega Ratio: Σ(gains above threshold) / Σ(losses below threshold)
 * @param {number[]} returns - array of returns
 * @param {number} threshold - target return threshold (default 0)
 */
export function omegaRatio(returns, threshold = 0) {
  if (!returns.length) return null;

  let sumGains = 0;
  let sumLosses = 0;

  for (const r of returns) {
    if (r > threshold) {
      sumGains += r - threshold;
    } else {
      sumLosses += threshold - r;
    }
  }

  if (sumLosses === 0) return sumGains > 0 ? Infinity : null;
  return sumGains / sumLosses;
}
