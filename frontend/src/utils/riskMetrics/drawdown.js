/**
 * Drawdown analysis utilities.
 * Pure JavaScript — zero React dependencies.
 */
import { annualizedReturn } from './descriptive.js';

/**
 * Compute drawdown series and statistics from price array.
 * @param {{ date: string, price: number }[]} prices
 * @returns {{ drawdownSeries, maxDrawdown, maxDrawdownDuration, currentDrawdown }}
 */
export function computeDrawdown(prices) {
  if (!prices.length) return { drawdownSeries: [], maxDrawdown: 0, maxDrawdownDuration: 0, currentDrawdown: 0 };

  let peak = prices[0].price;
  let maxDD = 0;
  let maxDDDuration = 0;
  let currentDDDuration = 0;

  const drawdownSeries = prices.map((p) => {
    if (p.price > peak) {
      peak = p.price;
      currentDDDuration = 0;
    }

    const dd = peak > 0 ? (p.price - peak) / peak : 0;

    if (dd < 0) {
      currentDDDuration++;
    }

    if (dd < maxDD) {
      maxDD = dd;
    }
    if (currentDDDuration > maxDDDuration) {
      maxDDDuration = currentDDDuration;
    }

    return { date: p.date, drawdown: dd };
  });

  const currentDrawdown = drawdownSeries.length
    ? drawdownSeries[drawdownSeries.length - 1].drawdown
    : 0;

  return {
    drawdownSeries,
    maxDrawdown: maxDD,
    maxDrawdownDuration: maxDDDuration,
    currentDrawdown,
  };
}

/**
 * Calmar Ratio: Annualized Return / |Max Drawdown|
 */
export function calmarRatio(dailyReturns, maxDrawdown) {
  const annRet = annualizedReturn(dailyReturns);
  if (annRet == null || maxDrawdown === 0 || maxDrawdown == null) return null;
  return annRet / Math.abs(maxDrawdown);
}
