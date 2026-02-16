/**
 * Monte Carlo simulation using Geometric Brownian Motion.
 * Pure JavaScript — zero React dependencies.
 * Designed to run in a Web Worker for non-blocking execution.
 */

/**
 * Box-Muller transform to generate standard normal random variates.
 */
export function boxMullerRandom() {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Run Monte Carlo GBM simulation.
 * S(t+1) = S(t) × exp((μ - σ²/2)Δt + σ√Δt × Z)
 *
 * @param {Object} config
 * @param {number} config.currentPrice - current stock price
 * @param {number} config.mu - annualized expected return (drift)
 * @param {number} config.sigma - annualized volatility
 * @param {number} config.days - simulation horizon (default 252)
 * @param {number} config.numPaths - number of paths (default 1000)
 * @returns {{ percentiles: Object, probProfit: number, expectedReturn: number }}
 */
export function runMonteCarloGBM({
  currentPrice,
  mu,
  sigma,
  days = 252,
  numPaths = 1000,
}) {
  const dt = 1 / 252;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  // Store final prices and percentile paths
  const finalPrices = [];
  const percentileLevels = [5, 25, 50, 75, 95];
  // paths[step] = array of prices at that step across all simulations
  const pathsByStep = Array.from({ length: days + 1 }, () => []);

  for (let p = 0; p < numPaths; p++) {
    let price = currentPrice;
    pathsByStep[0].push(price);

    for (let t = 1; t <= days; t++) {
      const z = boxMullerRandom();
      price = price * Math.exp(drift + diffusion * z);
      pathsByStep[t].push(price);
    }
    finalPrices.push(price);
  }

  // Compute percentiles at each time step
  const percentiles = {};
  for (const pct of percentileLevels) {
    percentiles[`p${pct}`] = [];
  }

  for (let t = 0; t <= days; t++) {
    const sorted = pathsByStep[t].sort((a, b) => a - b);
    for (const pct of percentileLevels) {
      const idx = Math.min(Math.floor((pct / 100) * sorted.length), sorted.length - 1);
      percentiles[`p${pct}`].push(sorted[idx]);
    }
  }

  // Statistics
  const sortedFinal = [...finalPrices].sort((a, b) => a - b);
  const profitCount = finalPrices.filter((p) => p > currentPrice).length;

  return {
    percentiles,
    probProfit: profitCount / numPaths,
    expectedReturn: (mean(finalPrices) - currentPrice) / currentPrice,
    medianFinal: sortedFinal[Math.floor(sortedFinal.length / 2)],
    days,
  };
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
