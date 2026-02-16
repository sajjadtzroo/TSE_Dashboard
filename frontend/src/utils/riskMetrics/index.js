/**
 * Barrel re-exports and orchestrator for all risk metrics.
 */
export * from './returns.js';
export * from './descriptive.js';
export * from './capm.js';
export * from './drawdown.js';
export * from './var.js';
export * from './monteCarlo.js';
export * from './scenario.js';

import { computeSimpleReturns, extractPrices, alignReturnSeries } from './returns.js';
import { mean, stdDev, annualizedVolatility, annualizedReturn, coefficientOfVariation, skewness, kurtosis, downsideDev } from './descriptive.js';
import { beta, jensensAlpha, sharpeRatio, treynorRatio, sortinoRatio, rSquared, trackingError, informationRatio } from './capm.js';
import { computeDrawdown, calmarRatio } from './drawdown.js';
import { parametricVaR, historicalVaR, conditionalVaR } from './var.js';
import { omegaRatio } from './scenario.js';

/**
 * Orchestrator: compute all metrics from stock + benchmark history.
 * @param {Object} params
 * @param {Array} params.stockHistory - stock OHLCV history
 * @param {Array|null} params.benchHistory - benchmark index history [{date, index_value}]
 * @param {number} params.rfAnnual - risk-free rate (default 0.23)
 * @returns {Object} all computed metrics
 */
export function computeAllMetrics({ stockHistory, benchHistory = null, rfAnnual = 0.23 }) {
  const stockReturns = computeSimpleReturns(stockHistory);
  const stockRetArr = stockReturns.map((r) => r.ret);
  const prices = extractPrices(stockHistory);

  // Descriptive stats
  const vol = annualizedVolatility(stockRetArr);
  const annRet = annualizedReturn(stockRetArr);
  const cv = coefficientOfVariation(stockRetArr);
  const skew = skewness(stockRetArr);
  const kurt = kurtosis(stockRetArr);
  const rfDaily = Math.pow(1 + rfAnnual, 1 / 252) - 1;
  const dsDev = downsideDev(stockRetArr, rfDaily);
  const annDsDev = dsDev != null ? dsDev * Math.sqrt(252) : null;

  // VaR
  const var95 = parametricVaR(stockRetArr, 0.95);
  const var99 = historicalVaR(stockRetArr, 0.99);
  const cvar95 = conditionalVaR(stockRetArr, 0.95);

  // Drawdown
  const dd = computeDrawdown(prices);

  // Sharpe & Sortino (don't need benchmark)
  const sharpe = sharpeRatio(stockRetArr, rfAnnual);
  const sortino = sortinoRatio(stockRetArr, rfAnnual);
  const calmar = calmarRatio(stockRetArr, dd.maxDrawdown);
  const omega = omegaRatio(stockRetArr, rfDaily);

  // CAPM metrics (need benchmark)
  let capmMetrics = {
    beta: null,
    alpha: null,
    treynor: null,
    rSquared: null,
    trackingError: null,
    informationRatio: null,
  };

  let alignedStock = null;
  let alignedBench = null;

  if (benchHistory && benchHistory.length > 0) {
    // Convert benchmark history to return format
    const benchForReturns = benchHistory
      .filter((b) => b.index_value != null)
      .map((b) => ({ date: b.date, close: b.index_value }));

    const benchReturns = computeSimpleReturns(benchForReturns);
    const aligned = alignReturnSeries(stockReturns, benchReturns);

    if (aligned.stockReturns.length >= 10) {
      alignedStock = aligned.stockReturns;
      alignedBench = aligned.benchReturns;

      capmMetrics = {
        beta: beta(aligned.stockReturns, aligned.benchReturns),
        alpha: jensensAlpha(aligned.stockReturns, aligned.benchReturns, rfAnnual),
        treynor: treynorRatio(aligned.stockReturns, aligned.benchReturns, rfAnnual),
        rSquared: rSquared(aligned.stockReturns, aligned.benchReturns),
        trackingError: trackingError(aligned.stockReturns, aligned.benchReturns),
        informationRatio: informationRatio(aligned.stockReturns, aligned.benchReturns),
      };
    }
  }

  return {
    // Descriptive
    volatility: vol,
    annualizedReturn: annRet,
    coefficientOfVariation: cv,
    skewness: skew,
    kurtosis: kurt,
    downsideDeviation: annDsDev,

    // Risk
    var95,
    var99,
    cvar95,
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownDuration: dd.maxDrawdownDuration,
    currentDrawdown: dd.currentDrawdown,
    drawdownSeries: dd.drawdownSeries,

    // Performance
    sharpe,
    sortino,
    calmar,
    omega,

    // CAPM
    ...capmMetrics,

    // Aligned data for scatter plot
    alignedStock,
    alignedBench,

    // Raw
    stockReturns: stockRetArr,
    returnDates: stockReturns.map((r) => r.date),
    prices,
  };
}
