/**
 * Monte Carlo option pricing engine.
 * Pure JavaScript — zero React dependencies.
 *
 * Supports:
 * - European option pricing with GBM
 * - Antithetic variates (variance reduction)
 * - Control variate (Black-Scholes as control)
 * - Strategy-level Monte Carlo (multi-leg)
 */

import { normalCDF, normalPDF, blackScholesPrice } from './blackScholes';

/* ── Box-Muller standard normal generator ───────────────────── */

function boxMullerRandom() {
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/* ── European Option MC Pricing ─────────────────────────────── */

/**
 * Monte Carlo price for a European option using Geometric Brownian Motion.
 *
 * @param {Object} config
 * @param {'call'|'put'} config.type - Option type
 * @param {number} config.S - Spot price
 * @param {number} config.K - Strike price
 * @param {number} config.T - Time to expiry in years
 * @param {number} config.r - Risk-free rate (decimal)
 * @param {number} config.sigma - Volatility (decimal)
 * @param {number} [config.numPaths=100000] - Number of simulation paths
 * @param {number} [config.stepsPerPath=252] - Steps per path (not used for European terminal pricing)
 * @param {boolean} [config.antithetic=true] - Use antithetic variates
 * @param {boolean} [config.controlVariate=true] - Use control variate (BS price)
 * @returns {{ price, stderr, ci95: [number, number], bsPrice, convergence: Array }}
 */
export function mcPriceEuropean(config) {
  const {
    type = 'call',
    S,
    K,
    T,
    r,
    sigma,
    numPaths = 100000,
    antithetic = true,
    controlVariate = true,
  } = config;

  if (!S || !K || T <= 0 || sigma <= 0) {
    return { price: 0, stderr: 0, ci95: [0, 0], bsPrice: 0, convergence: [] };
  }

  const drift = (r - 0.5 * sigma * sigma) * T;
  const vol = sigma * Math.sqrt(T);
  const discount = Math.exp(-r * T);

  // BS price for comparison and control variate
  const bsPrice = blackScholesPrice(type, S, K, T, r, sigma);

  // Effective number of independent draws
  const effectivePaths = antithetic ? Math.ceil(numPaths / 2) : numPaths;
  const totalPaths = antithetic ? effectivePaths * 2 : effectivePaths;

  // Store raw payoffs for statistics
  const payoffs = new Float64Array(totalPaths);
  // Control variate payoffs (terminal stock price as control)
  const controlPayoffs = new Float64Array(totalPaths);

  let idx = 0;

  // Convergence tracking: record at 10 evenly spaced intervals
  const convergence = [];
  const convergenceInterval = Math.max(1, Math.floor(effectivePaths / 10));
  let runningSum = 0;
  let runningCount = 0;

  for (let i = 0; i < effectivePaths; i++) {
    const z = boxMullerRandom();

    // Primary path
    const sT1 = S * Math.exp(drift + vol * z);
    const payoff1 = type === 'call' ? Math.max(sT1 - K, 0) : Math.max(K - sT1, 0);
    payoffs[idx] = payoff1;
    controlPayoffs[idx] = sT1;
    runningSum += payoff1;
    runningCount++;
    idx++;

    // Antithetic path
    if (antithetic) {
      const sT2 = S * Math.exp(drift + vol * (-z));
      const payoff2 = type === 'call' ? Math.max(sT2 - K, 0) : Math.max(K - sT2, 0);
      payoffs[idx] = payoff2;
      controlPayoffs[idx] = sT2;
      runningSum += payoff2;
      runningCount++;
      idx++;
    }

    // Track convergence
    if ((i + 1) % convergenceInterval === 0 || i === effectivePaths - 1) {
      const avgPayoff = runningSum / runningCount;
      convergence.push({
        n: runningCount,
        price: discount * avgPayoff,
      });
    }
  }

  let finalPayoffs = payoffs.subarray(0, totalPaths);

  // Control variate adjustment
  if (controlVariate) {
    // Expected terminal stock price under risk-neutral measure
    const expectedST = S * Math.exp(r * T);

    // Compute covariance and variance
    let sumPayoff = 0;
    let sumControl = 0;
    for (let i = 0; i < totalPaths; i++) {
      sumPayoff += finalPayoffs[i];
      sumControl += controlPayoffs[i];
    }
    const meanPayoff = sumPayoff / totalPaths;
    const meanControl = sumControl / totalPaths;

    let covSum = 0;
    let varControlSum = 0;
    for (let i = 0; i < totalPaths; i++) {
      const dp = finalPayoffs[i] - meanPayoff;
      const dc = controlPayoffs[i] - meanControl;
      covSum += dp * dc;
      varControlSum += dc * dc;
    }

    if (varControlSum > 1e-12) {
      const beta = covSum / varControlSum;
      // Adjust payoffs
      const adjusted = new Float64Array(totalPaths);
      for (let i = 0; i < totalPaths; i++) {
        adjusted[i] = finalPayoffs[i] - beta * (controlPayoffs[i] - expectedST);
      }
      finalPayoffs = adjusted;
    }
  }

  // Compute final statistics
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < totalPaths; i++) {
    sum += finalPayoffs[i];
    sumSq += finalPayoffs[i] * finalPayoffs[i];
  }

  const meanPayoff = sum / totalPaths;
  const variance = sumSq / totalPaths - meanPayoff * meanPayoff;
  const stdDev = Math.sqrt(Math.max(0, variance));
  const price = discount * meanPayoff;
  const stderr = discount * stdDev / Math.sqrt(totalPaths);

  return {
    price,
    stderr,
    ci95: [price - 1.96 * stderr, price + 1.96 * stderr],
    bsPrice,
    convergence,
  };
}

/* ── Strategy-Level MC Pricing ──────────────────────────────── */

/**
 * Monte Carlo simulation for a multi-leg option strategy.
 *
 * @param {Object} config
 * @param {Array} config.legs - [{type, direction, strike, premium, qty}]
 * @param {number} config.S - Spot price
 * @param {number} config.T - Time to expiry in years
 * @param {number} config.r - Risk-free rate (decimal)
 * @param {number} config.sigma - Volatility (decimal)
 * @param {number} [config.numPaths=50000] - Number of simulation paths
 * @returns {{ price, stderr, popEstimate, payoffDistribution, expectedPayoff, payoff5th, payoff95th }}
 */
export function mcPriceStrategy(config) {
  const {
    legs,
    S,
    T,
    r,
    sigma,
    numPaths = 50000,
  } = config;

  if (!legs?.length || !S || T <= 0 || sigma <= 0) {
    return {
      price: 0,
      stderr: 0,
      popEstimate: 0,
      payoffDistribution: { bins: [] },
      expectedPayoff: 0,
      payoff5th: 0,
      payoff95th: 0,
    };
  }

  const drift = (r - 0.5 * sigma * sigma) * T;
  const vol = sigma * Math.sqrt(T);
  const discount = Math.exp(-r * T);

  // Net premium paid (sum of direction * qty * premium)
  let netPremium = 0;
  for (const leg of legs) {
    if (leg.type !== 'stock') {
      netPremium += leg.direction * leg.qty * (leg.premium || 0);
    }
  }

  const payoffs = new Float64Array(numPaths);
  let profitable = 0;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < numPaths; i++) {
    const z = boxMullerRandom();
    const sT = S * Math.exp(drift + vol * z);

    // Compute strategy payoff at terminal price
    let payoff = 0;
    for (const leg of legs) {
      if (leg.type === 'stock') {
        payoff += leg.direction * leg.qty * (sT - leg.strike);
      } else {
        const intrinsic = leg.type === 'call'
          ? Math.max(sT - leg.strike, 0)
          : Math.max(leg.strike - sT, 0);
        payoff += leg.direction * leg.qty * (intrinsic - (leg.premium || 0));
      }
    }

    payoffs[i] = payoff;
    sum += payoff;
    sumSq += payoff * payoff;
    if (payoff > 0) profitable++;
  }

  const meanPayoff = sum / numPaths;
  const variance = sumSq / numPaths - meanPayoff * meanPayoff;
  const stdDev = Math.sqrt(Math.max(0, variance));
  const price = discount * meanPayoff;
  const stderr = discount * stdDev / Math.sqrt(numPaths);
  const popEstimate = profitable / numPaths;

  // Sort for percentiles
  const sorted = Float64Array.from(payoffs).sort();
  const idx5 = Math.floor(numPaths * 0.05);
  const idx95 = Math.floor(numPaths * 0.95);

  // Build histogram (20 bins)
  const minPayoff = sorted[0];
  const maxPayoff = sorted[numPaths - 1];
  const bins = [];
  const numBins = 20;

  if (maxPayoff - minPayoff > 1e-6) {
    const binWidth = (maxPayoff - minPayoff) / numBins;
    for (let b = 0; b < numBins; b++) {
      bins.push({
        lo: Math.round((minPayoff + b * binWidth) * 100) / 100,
        hi: Math.round((minPayoff + (b + 1) * binWidth) * 100) / 100,
        count: 0,
      });
    }
    for (let i = 0; i < numPaths; i++) {
      let binIdx = Math.floor((payoffs[i] - minPayoff) / binWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      bins[binIdx].count++;
    }
  }

  return {
    price,
    stderr,
    popEstimate,
    payoffDistribution: { bins },
    expectedPayoff: meanPayoff,
    payoff5th: sorted[idx5],
    payoff95th: sorted[idx95],
  };
}
