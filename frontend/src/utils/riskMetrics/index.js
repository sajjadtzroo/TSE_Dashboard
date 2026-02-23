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
export * from './rolling.js';
export * from './tailRisk.js';
export * from './liquidity.js';
export * from './varBacktest.js';
export * from './volCone.js';

import { computeSimpleReturns, extractPrices, alignReturnSeries } from './returns.js';
import { mean, stdDev, annualizedVolatility, annualizedReturn, coefficientOfVariation, skewness, kurtosis, downsideDev } from './descriptive.js';
import { beta, jensensAlpha, sharpeRatio, treynorRatio, sortinoRatio, rSquared, trackingError, informationRatio, mSquared } from './capm.js';
import { computeDrawdown, calmarRatio } from './drawdown.js';
import { parametricVaR, historicalVaR, conditionalVaR, cornishFisherVaR } from './var.js';
import { omegaRatio } from './scenario.js';
import { tailRatio, gainToLossRatio, hitRate, captureRatios } from './tailRisk.js';

/**
 * Orchestrator: compute all metrics from stock + benchmark history.
 * @param {Object} params
 * @param {Array} params.stockHistory - stock OHLCV history
 * @param {Array|null} params.benchHistory - benchmark index history [{date, close}]
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

  // VaR — both parametric for consistency (CFA L2); Cornish-Fisher adjusts for skew/kurtosis
  const var95 = parametricVaR(stockRetArr, 0.95);
  const var99 = parametricVaR(stockRetArr, 0.99);
  const cvar95 = conditionalVaR(stockRetArr, 0.95);
  const cfVaR95 = cornishFisherVaR(stockRetArr, 0.95);
  const cfVaR99 = cornishFisherVaR(stockRetArr, 0.99);

  // Tail risk
  const tail = tailRatio(stockRetArr);
  const glRatio = gainToLossRatio(stockRetArr);
  const hit = hitRate(stockRetArr);

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
    mSquared: null,
  };

  let alignedStock = null;
  let alignedBench = null;
  let benchmarkVol = null;
  let capture = { upsideCapture: null, downsideCapture: null, captureRatio: null };

  if (benchHistory && benchHistory.length > 0) {
    // Convert benchmark history to return format
    const benchForReturns = benchHistory
      .filter((b) => b.close != null)
      .map((b) => ({ date: b.date, close: b.close }));

    const benchReturns = computeSimpleReturns(benchForReturns);
    const aligned = alignReturnSeries(stockReturns, benchReturns);

    if (aligned.stockReturns.length >= 10) {
      alignedStock = aligned.stockReturns;
      alignedBench = aligned.benchReturns;

      // Benchmark volatility from aligned returns (for scenario analysis)
      benchmarkVol = annualizedVolatility(aligned.benchReturns);

      capmMetrics = {
        beta: beta(aligned.stockReturns, aligned.benchReturns),
        alpha: jensensAlpha(aligned.stockReturns, aligned.benchReturns, rfAnnual),
        treynor: treynorRatio(aligned.stockReturns, aligned.benchReturns, rfAnnual),
        rSquared: rSquared(aligned.stockReturns, aligned.benchReturns),
        trackingError: trackingError(aligned.stockReturns, aligned.benchReturns),
        informationRatio: informationRatio(aligned.stockReturns, aligned.benchReturns),
        mSquared: mSquared(aligned.stockReturns, aligned.benchReturns, rfAnnual),
      };

      capture = captureRatios(aligned.stockReturns, aligned.benchReturns);
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
    cfVaR95,
    cfVaR99,
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownDuration: dd.maxDrawdownDuration,
    currentDrawdown: dd.currentDrawdown,
    drawdownSeries: dd.drawdownSeries,

    // Tail risk
    tailRatio: tail,
    gainToLossRatio: glRatio,
    hitRate: hit,
    ...capture,

    // Performance
    sharpe,
    sortino,
    calmar,
    omega,

    // CAPM
    ...capmMetrics,
    benchmarkVolatility: benchmarkVol,

    // Aligned data for scatter plot
    alignedStock,
    alignedBench,

    // Raw
    stockReturns: stockRetArr,
    returnDates: stockReturns.map((r) => r.date),
    prices,
  };
}
