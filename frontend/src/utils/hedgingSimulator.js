/**
 * Delta hedging simulator — GBM price paths + hedging P&L.
 * Pure JavaScript — zero React dependencies.
 */

import { greeks, blackScholesPrice, normalCDF, inverseNormalCDF } from './blackScholes';

/**
 * Generate a Geometric Brownian Motion price path.
 * S_{t+1} = S_t * exp((r - σ²/2)Δt + σ√Δt · Z)
 *
 * @param {number} S0    - Initial price
 * @param {number} r     - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} T     - Total time in years
 * @param {number} steps - Number of time steps
 * @param {number} [seed] - Optional seed for reproducible paths (not cryptographic)
 * @returns {number[]} Array of prices length steps+1
 */
export function generateGBMPath(S0, r, sigma, T, steps, seed) {
  const dt = T / steps;
  const drift = (r - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);
  const prices = [S0];

  // Simple seeded PRNG (xorshift32) for reproducibility
  let state = seed || (Math.random() * 2147483647) | 0;
  const nextRand = () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967295;
  };

  for (let i = 0; i < steps; i++) {
    // Box-Muller transform for normal random
    const u1 = nextRand() || 0.0001;
    const u2 = nextRand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const prevS = prices[prices.length - 1];
    const nextS = prevS * Math.exp(drift + diffusion * z);
    prices.push(nextS);
  }
  return prices;
}

/**
 * Simulate delta hedging for a short call/put position.
 *
 * @param {object} params
 * @param {'call'|'put'} params.type      - Option type
 * @param {number}   params.S0            - Initial stock price
 * @param {number}   params.K             - Strike price
 * @param {number}   params.T             - Time to expiry in years
 * @param {number}   params.r             - Risk-free rate (decimal)
 * @param {number}   params.sigma         - Volatility (decimal)
 * @param {number}   params.qty           - Number of options (default 1)
 * @param {'daily'|'weekly'} params.rebalFreq - Rebalancing frequency
 * @param {number}   [params.seed]        - Optional PRNG seed
 * @returns {object} Simulation results
 */
export function simulateHedging({
  type = 'call',
  S0,
  K,
  T,
  r,
  sigma,
  qty = 1,
  rebalFreq = 'daily',
  seed,
}) {
  const stepsPerDay = 1;
  const totalDays = Math.round(T * 365);
  const steps = Math.max(1, totalDays * stepsPerDay);
  const dt = T / steps;

  // Rebalance interval (in steps)
  const rebalInterval = rebalFreq === 'weekly' ? 5 : 1;

  // Generate price path
  const prices = generateGBMPath(S0, r, sigma, T, steps, seed);

  // Initial option premium collected (short position)
  const premiumCollected = blackScholesPrice(type, S0, K, T, r, sigma) * qty;

  const hedgeLog = [];
  let sharesHeld = 0;
  let cashBalance = premiumCollected; // start with premium
  let cumulativePnL = 0;

  for (let i = 0; i <= steps; i++) {
    const S = prices[i];
    const timeLeft = T - i * dt;
    const tRemain = Math.max(timeLeft, 0.0001);

    // Compute current delta for hedging a SHORT option position
    const g = greeks(type, S, K, tRemain, r, sigma);
    const targetShares = g.delta * qty; // shares needed to hedge short option

    const shouldRebal = i === 0 || i === steps || (i % rebalInterval === 0);

    if (shouldRebal) {
      const tradeShares = targetShares - sharesHeld;
      const tradeCost = tradeShares * S;

      cashBalance -= tradeCost; // buy shares costs money, sell adds money
      sharesHeld = targetShares;

      // Option value at this point
      const optVal = blackScholesPrice(type, S, K, tRemain, r, sigma) * qty;
      // Portfolio: shares + cash - option liability
      const portfolioValue = sharesHeld * S + cashBalance - optVal;
      cumulativePnL = portfolioValue;

      hedgeLog.push({
        step: i,
        day: Math.round(i / stepsPerDay),
        price: Math.round(S * 100) / 100,
        delta: Math.round(g.delta * 10000) / 10000,
        gamma: g.gamma,
        sharesHeld: Math.round(targetShares * 10000) / 10000,
        tradeShares: Math.round(tradeShares * 10000) / 10000,
        tradeCost: Math.round(tradeCost * 100) / 100,
        optionValue: Math.round(optVal * 100) / 100,
        cashBalance: Math.round(cashBalance * 100) / 100,
        pnl: Math.round(cumulativePnL * 100) / 100,
      });
    }
  }

  // Final settlement
  const finalPrice = prices[prices.length - 1];
  const payoff = type === 'call'
    ? Math.max(finalPrice - K, 0) * qty
    : Math.max(K - finalPrice, 0) * qty;
  const finalShareValue = sharesHeld * finalPrice;
  const totalPnL = cashBalance + finalShareValue - payoff;

  return {
    prices: prices.map((p, i) => ({
      day: Math.round(i / stepsPerDay),
      price: Math.round(p * 100) / 100,
    })),
    hedgeLog,
    premiumCollected: Math.round(premiumCollected * 100) / 100,
    finalPayoff: Math.round(payoff * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    hedgingCost: Math.round((premiumCollected - totalPnL) * 100) / 100,
    totalDays,
  };
}

/**
 * Run multiple hedging simulations and return P&L distribution.
 * @param {object} params - Same as simulateHedging params
 * @param {number} numSims - Number of simulations
 * @returns {{ simulations: object[], pnlDistribution: number[], avgPnL: number, stdPnL: number }}
 */
export function runMultipleSimulations(params, numSims = 50) {
  const results = [];
  const pnls = [];

  for (let i = 0; i < numSims; i++) {
    const sim = simulateHedging({ ...params, seed: (i + 1) * 31337 });
    results.push(sim);
    pnls.push(sim.totalPnL);
  }

  const avgPnL = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const variance = pnls.reduce((s, p) => s + (p - avgPnL) ** 2, 0) / pnls.length;
  const stdPnL = Math.sqrt(variance);

  // Histogram bins
  const minPnL = Math.min(...pnls);
  const maxPnL = Math.max(...pnls);
  const binCount = 15;
  const binWidth = (maxPnL - minPnL) / binCount || 1;
  const histogram = [];
  for (let i = 0; i < binCount; i++) {
    const lo = minPnL + i * binWidth;
    const hi = lo + binWidth;
    const count = pnls.filter((p) => p >= lo && (i === binCount - 1 ? p <= hi : p < hi)).length;
    histogram.push({
      range: `${Math.round(lo)}`,
      count,
      lo: Math.round(lo),
      hi: Math.round(hi),
    });
  }

  return {
    simulations: results,
    pnlDistribution: pnls.map((p) => Math.round(p * 100) / 100),
    avgPnL: Math.round(avgPnL * 100) / 100,
    stdPnL: Math.round(stdPnL * 100) / 100,
    histogram,
  };
}
