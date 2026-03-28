/**
 * Exotic option pricing library.
 * Pure JavaScript — zero React dependencies.
 *
 * Supports:
 * - Binary (digital) options: cash-or-nothing, asset-or-nothing (closed-form)
 * - Barrier options: Merton-Reiner-Rubinstein analytical formulas
 * - Asian options: Monte Carlo + geometric closed-form benchmark
 * - Lookback options: floating-strike Monte Carlo
 */

import { normalCDF, normalPDF, blackScholesPrice } from './blackScholes';

/* ══════════════════════════════════════════════════════════════
   Binary (Digital) Options — Closed Form
   ══════════════════════════════════════════════════════════════ */

/**
 * Cash-or-nothing binary option price.
 * Pays Q if option finishes ITM at expiry; 0 otherwise.
 *
 * @param {'call'|'put'} type
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} [Q=1] - Cash payout amount
 * @returns {number} Option price
 */
export function binaryPrice(type, S, K, T, r, sigma, Q = 1) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0) {
    // At expiry: intrinsic
    if (type === 'call') return S > K ? Q * Math.exp(-r * Math.max(T, 0)) : 0;
    return K > S ? Q * Math.exp(-r * Math.max(T, 0)) : 0;
  }

  const sqrtT = Math.sqrt(T);
  const d2 = (Math.log(S / K) + (r - 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const discount = Math.exp(-r * T);

  if (type === 'call') {
    return Q * discount * normalCDF(d2);
  }
  return Q * discount * normalCDF(-d2);
}

/**
 * Asset-or-nothing binary option price.
 * Pays S_T if ITM at expiry; 0 otherwise.
 *
 * @param {'call'|'put'} type
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @returns {number} Option price
 */
export function assetOrNothingPrice(type, S, K, T, r, sigma) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0) {
    if (type === 'call') return S > K ? S : 0;
    return K > S ? S : 0;
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);

  if (type === 'call') {
    return S * normalCDF(d1);
  }
  return S * normalCDF(-d1);
}

/**
 * Greeks for cash-or-nothing binary option.
 *
 * @param {'call'|'put'} type
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} [Q=1] - Cash payout
 * @returns {{ delta, gamma, theta, vega }}
 */
export function binaryGreeks(type, S, K, T, r, sigma, Q = 1) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d2 = (Math.log(S / K) + (r - 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const discount = Math.exp(-r * T);
  const nd2 = normalPDF(d2);
  const sign = type === 'call' ? 1 : -1;

  // Delta = sign * Q * exp(-rT) * n(d2) / (S * sigma * sqrt(T))
  const delta = sign * Q * discount * nd2 / (S * sigma * sqrtT);

  // Gamma (second derivative): finite difference approach
  const dS = S * 0.01;
  const priceUp = binaryPrice(type, S + dS, K, T, r, sigma, Q);
  const priceDown = binaryPrice(type, S - dS, K, T, r, sigma, Q);
  const priceMid = binaryPrice(type, S, K, T, r, sigma, Q);
  const gamma = (priceUp - 2 * priceMid + priceDown) / (dS * dS);

  // Vega: bump sigma by 0.001
  const dSigma = 0.001;
  const priceVegaUp = binaryPrice(type, S, K, T, r, sigma + dSigma, Q);
  const priceVegaDown = binaryPrice(type, S, K, T, r, sigma - dSigma, Q);
  const vega = (priceVegaUp - priceVegaDown) / (2 * dSigma) / 100; // per 1%

  // Theta: bump T by -1/365
  const dT = 1 / 365;
  const priceThetaDown = T > dT ? binaryPrice(type, S, K, T - dT, r, sigma, Q) : binaryPrice(type, S, K, 0.0001, r, sigma, Q);
  const theta = (priceThetaDown - priceMid) / 1; // per day (already 1/365 shift)

  return { delta, gamma, theta, vega };
}


/* ══════════════════════════════════════════════════════════════
   Barrier Options — Merton-Reiner-Rubinstein
   ══════════════════════════════════════════════════════════════ */

/**
 * Barrier option price using standard analytical formulas.
 *
 * @param {'call'|'put'} type
 * @param {'up-and-in'|'up-and-out'|'down-and-in'|'down-and-out'} barrierType
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} H - Barrier level
 * @param {number} [rebate=0] - Rebate paid if barrier event does/doesn't occur
 * @returns {number} Option price
 */
export function barrierPrice(type, barrierType, S, K, T, r, sigma, H, rebate = 0) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0 || H <= 0) {
    return 0;
  }

  const vanilla = blackScholesPrice(type, S, K, T, r, sigma);

  // Handle edge cases: barrier already breached
  const isDown = barrierType.startsWith('down');
  const isIn = barrierType.endsWith('in');

  if (isDown && S <= H) {
    // Down barrier already hit
    return isIn ? vanilla : rebate;
  }
  if (!isDown && S >= H) {
    // Up barrier already hit
    return isIn ? vanilla : rebate;
  }

  const sqrtT = Math.sqrt(T);
  const sig2 = sigma * sigma;

  // lambda parameter
  const lambda = (r + sig2 / 2) / sig2;

  // eta: +1 for call, -1 for put
  const eta = type === 'call' ? 1 : -1;
  // phi: +1 for down barriers, -1 for up barriers
  const phi = isDown ? 1 : -1;

  const discount = Math.exp(-r * T);

  // Helper: x1, x2, y1, y2
  const x1 = Math.log(S / K) / (sigma * sqrtT) + lambda * sigma * sqrtT;
  const x2 = Math.log(S / H) / (sigma * sqrtT) + lambda * sigma * sqrtT;
  const y1 = Math.log(H * H / (S * K)) / (sigma * sqrtT) + lambda * sigma * sqrtT;
  const y2 = Math.log(H / S) / (sigma * sqrtT) + lambda * sigma * sqrtT;

  // Components A through F (Haug notation)
  const A = eta * S * normalCDF(eta * x1)
    - eta * K * discount * normalCDF(eta * (x1 - sigma * sqrtT));

  const B = eta * S * normalCDF(eta * x2)
    - eta * K * discount * normalCDF(eta * (x2 - sigma * sqrtT));

  const C = eta * S * Math.pow(H / S, 2 * lambda) * normalCDF(phi * y1)
    - eta * K * discount * Math.pow(H / S, 2 * lambda - 2) * normalCDF(phi * (y1 - sigma * sqrtT));

  const D = eta * S * Math.pow(H / S, 2 * lambda) * normalCDF(phi * y2)
    - eta * K * discount * Math.pow(H / S, 2 * lambda - 2) * normalCDF(phi * (y2 - sigma * sqrtT));

  // Rebate terms (simplified: paid at expiry if barrier not hit / hit)
  const E_rebate = rebate * discount * (
    normalCDF(phi * (x2 - sigma * sqrtT))
    - Math.pow(H / S, 2 * lambda - 2) * normalCDF(phi * (y2 - sigma * sqrtT))
  );

  const F_rebate = rebate * (
    Math.pow(H / S, lambda - 1 + Math.sqrt(lambda * lambda - 2 * r / sig2 + 1e-12))
    * normalCDF(phi * (y2 - sigma * sqrtT * Math.sqrt(lambda * lambda - 2 * r / sig2 + 1e-12) / lambda))
    + Math.pow(H / S, lambda - 1 - Math.sqrt(lambda * lambda - 2 * r / sig2 + 1e-12))
    * normalCDF(phi * (y2 + sigma * sqrtT * Math.sqrt(lambda * lambda - 2 * r / sig2 + 1e-12) / lambda))
  );

  let price;

  // Select the right combination based on type and barrier type
  if (type === 'call') {
    if (barrierType === 'down-and-in') {
      if (K > H) {
        price = C + E_rebate;
      } else {
        price = A - B + D + E_rebate;
      }
    } else if (barrierType === 'down-and-out') {
      if (K > H) {
        price = A - C + E_rebate;
      } else {
        price = B - D + E_rebate;
      }
    } else if (barrierType === 'up-and-in') {
      if (K > H) {
        price = A + E_rebate;
      } else {
        price = B - C + D + E_rebate;
      }
    } else {
      // up-and-out
      if (K > H) {
        price = E_rebate;
      } else {
        price = A - B + C - D + E_rebate;
      }
    }
  } else {
    // put
    if (barrierType === 'down-and-in') {
      if (K > H) {
        price = B - C + D + E_rebate;
      } else {
        price = A + E_rebate;
      }
    } else if (barrierType === 'down-and-out') {
      if (K > H) {
        price = A - B + C - D + E_rebate;
      } else {
        price = E_rebate;
      }
    } else if (barrierType === 'up-and-in') {
      if (K > H) {
        price = A - B + D + E_rebate;
      } else {
        price = C + E_rebate;
      }
    } else {
      // up-and-out
      if (K > H) {
        price = B - D + E_rebate;
      } else {
        price = A - C + E_rebate;
      }
    }
  }

  // Clamp to non-negative
  return Math.max(0, price);
}

/**
 * Greeks for barrier options via finite differences.
 *
 * @param {'call'|'put'} type
 * @param {'up-and-in'|'up-and-out'|'down-and-in'|'down-and-out'} barrierType
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} H - Barrier level
 * @param {number} [rebate=0]
 * @returns {{ delta, gamma, theta, vega }}
 */
export function barrierGreeks(type, barrierType, S, K, T, r, sigma, H, rebate = 0) {
  const p = (s, k, t, rv, sv) => barrierPrice(type, barrierType, s, k, t, rv, sv, H, rebate);
  const price0 = p(S, K, T, r, sigma);

  // Delta & Gamma: bump S by 1%
  const dS = S * 0.01;
  const priceUp = p(S + dS, K, T, r, sigma);
  const priceDown = p(S - dS, K, T, r, sigma);
  const delta = (priceUp - priceDown) / (2 * dS);
  const gamma = (priceUp - 2 * price0 + priceDown) / (dS * dS);

  // Vega: bump sigma by 0.001
  const dSigma = 0.001;
  const priceVup = p(S, K, T, r, sigma + dSigma);
  const priceVdown = p(S, K, T, r, sigma - dSigma);
  const vega = (priceVup - priceVdown) / (2 * dSigma) / 100; // per 1%

  // Theta: bump T by -1/365
  const dT = 1 / 365;
  const priceTdown = T > dT ? p(S, K, T - dT, r, sigma) : p(S, K, 0.0001, r, sigma);
  const theta = (priceTdown - price0); // per day

  return { delta, gamma, theta, vega };
}


/* ══════════════════════════════════════════════════════════════
   Asian Options
   ══════════════════════════════════════════════════════════════ */

/**
 * Box-Muller standard normal generator (local copy for workers).
 */
function _boxMuller() {
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

/**
 * Asian option price via Monte Carlo.
 *
 * @param {'call'|'put'} type
 * @param {'average-price'|'average-strike'} avgType
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} [numPaths=50000]
 * @param {number} [steps=252] - Monitoring points
 * @returns {{ price, stderr }}
 */
export function asianPriceMC(type, avgType, S, K, T, r, sigma, numPaths = 50000, steps = 252) {
  if (T <= 0 || S <= 0 || sigma <= 0) {
    return { price: 0, stderr: 0 };
  }

  const dt = T / steps;
  const drift = (r - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);
  const discount = Math.exp(-r * T);

  let sumPayoff = 0;
  let sumPayoffSq = 0;

  for (let p = 0; p < numPaths; p++) {
    let s = S;
    let pathSum = 0;

    for (let t = 0; t < steps; t++) {
      const z = _boxMuller();
      s = s * Math.exp(drift + vol * z);
      pathSum += s;
    }

    const avg = pathSum / steps;
    let payoff;

    if (avgType === 'average-price') {
      // Fixed strike: payoff based on average vs strike
      payoff = type === 'call' ? Math.max(avg - K, 0) : Math.max(K - avg, 0);
    } else {
      // Average strike: payoff based on terminal vs average
      payoff = type === 'call' ? Math.max(s - avg, 0) : Math.max(avg - s, 0);
    }

    sumPayoff += payoff;
    sumPayoffSq += payoff * payoff;
  }

  const mean = sumPayoff / numPaths;
  const variance = sumPayoffSq / numPaths - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));
  const price = discount * mean;
  const stderr = discount * stdDev / Math.sqrt(numPaths);

  return { price, stderr };
}

/**
 * Geometric average Asian option — closed-form approximation.
 * Used as a benchmark for Monte Carlo accuracy.
 *
 * @param {'call'|'put'} type
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} n - Number of monitoring points
 * @returns {number} Option price
 */
export function asianGeometricPrice(type, S, K, T, r, sigma, n) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0 || n <= 0) {
    return 0;
  }

  // Adjusted volatility for geometric average
  const sigmaA = sigma * Math.sqrt((2 * n + 1) / (6 * (n + 1)));

  // Adjusted drift
  const rA = 0.5 * (r - 0.5 * sigma * sigma + sigmaA * sigmaA);

  // Use BS formula with adjusted parameters
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (rA + 0.5 * sigmaA * sigmaA) * T) / (sigmaA * sqrtT);
  const d2 = d1 - sigmaA * sqrtT;
  const discount = Math.exp(-r * T);

  if (type === 'call') {
    return S * Math.exp((rA - r) * T) * normalCDF(d1) - K * discount * normalCDF(d2);
  }
  return K * discount * normalCDF(-d2) - S * Math.exp((rA - r) * T) * normalCDF(-d1);
}


/* ══════════════════════════════════════════════════════════════
   Lookback Options — Monte Carlo
   ══════════════════════════════════════════════════════════════ */

/**
 * Floating-strike lookback option price via Monte Carlo.
 *
 * @param {'call'|'put'} type
 * @param {number} S - Spot price
 * @param {number} T - Time to expiry (years)
 * @param {number} r - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} [numPaths=50000]
 * @param {number} [steps=252]
 * @returns {{ price, stderr }}
 */
export function lookbackPriceMC(type, S, T, r, sigma, numPaths = 50000, steps = 252) {
  if (T <= 0 || S <= 0 || sigma <= 0) {
    return { price: 0, stderr: 0 };
  }

  const dt = T / steps;
  const drift = (r - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);
  const discount = Math.exp(-r * T);

  let sumPayoff = 0;
  let sumPayoffSq = 0;

  for (let p = 0; p < numPaths; p++) {
    let s = S;
    let sMin = S;
    let sMax = S;

    for (let t = 0; t < steps; t++) {
      const z = _boxMuller();
      s = s * Math.exp(drift + vol * z);
      if (s < sMin) sMin = s;
      if (s > sMax) sMax = s;
    }

    // Floating-strike lookback:
    // Call: S_T - S_min (buy at the lowest point)
    // Put: S_max - S_T (sell at the highest point)
    const payoff = type === 'call' ? (s - sMin) : (sMax - s);

    sumPayoff += payoff;
    sumPayoffSq += payoff * payoff;
  }

  const mean = sumPayoff / numPaths;
  const variance = sumPayoffSq / numPaths - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));
  const price = discount * mean;
  const stderr = discount * stdDev / Math.sqrt(numPaths);

  return { price, stderr };
}
