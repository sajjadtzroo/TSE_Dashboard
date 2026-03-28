/**
 * Stochastic volatility models: Heston and SABR.
 * Pure JavaScript — zero dependencies except normalCDF/normalPDF from blackScholes.js.
 */

import { normalCDF, normalPDF, blackScholesPrice, impliedVolatility } from './blackScholes';

/* ── Complex number helpers ────────────────────────────────────── */

function complexAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function complexSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function complexMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function complexDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function complexExp(a) {
  const er = Math.exp(a.re);
  return { re: er * Math.cos(a.im), im: er * Math.sin(a.im) };
}
function complexSqrt(a) {
  const r = Math.sqrt(a.re * a.re + a.im * a.im);
  const theta = Math.atan2(a.im, a.re);
  return { re: Math.sqrt(r) * Math.cos(theta / 2), im: Math.sqrt(r) * Math.sin(theta / 2) };
}
function complexLog(a) {
  return { re: Math.log(Math.sqrt(a.re * a.re + a.im * a.im)), im: Math.atan2(a.im, a.re) };
}
function complexScale(s, a) { return { re: s * a.re, im: s * a.im }; }
function real(x) { return { re: x, im: 0 }; }
function imag(x) { return { re: 0, im: x }; }

/* ── Gauss-Laguerre Quadrature Nodes & Weights (32-point) ──────── */

const GL_NODES_32 = [
  0.044489365833267, 0.234526109519619, 0.576884629301886, 1.072157115229541,
  1.722408776444645, 2.528336706425795, 3.490186235891159, 4.608554701029592,
  5.883693903928272, 7.316147872617677, 8.907039085554429, 10.657265148879724,
  12.568140321403614, 14.641388092482498, 16.879585040360500, 19.286288610457708,
  21.866098903926588, 24.624328897414610, 27.567680804218482, 30.703648757088288,
  34.041303815498024, 37.591522259519160, 41.367952598067807, 45.388118069422635,
  49.674576530406960, 54.256788018875174, 59.173025083325478, 64.478674577975125,
  70.254248058560279, 76.622833078878968, 83.784968058424903, 92.144689916529612,
];

const GL_WEIGHTS_32 = [
  0.109218341952385, 0.210443107938813, 0.235213229669848, 0.195903335972881,
  0.129983786286072, 0.070578457803704, 0.031760912509176, 0.011918214834839,
  0.003737510786244, 0.000980803306615, 0.000214864918801, 0.000039203419680,
  0.000005934541612, 0.000000740731542, 0.000000075828044, 0.000000006306573,
  0.000000000422191, 0.000000000022482, 0.000000000000940, 0.000000000000030,
  0.000000000000001, 2.541909709e-17, 1.300029725e-18, 5.296380924e-20,
  1.680787404e-21, 4.032600210e-23, 7.071738028e-25, 8.587321661e-27,
  6.747799753e-29, 3.049982766e-31, 6.579177108e-34, 4.578324514e-37,
];

/* ── Gauss-Laguerre Quadrature Nodes & Weights (64-point) ──────── */

const GL_NODES_64 = [
  0.022366758934653, 0.117828817927560, 0.290078679068498, 0.539260220196498,
  0.865651266498340, 1.269580660539575, 1.751430221498572, 2.311636048019828,
  2.950689799040980, 3.669140657284412, 4.467598139498998, 5.346734001139710,
  6.307284696697100, 7.350055122254450, 8.475921746044898, 9.685836614259580,
  10.980831748906400, 12.362024082998900, 13.830622568484200, 15.387934804233100,
  17.035376969698400, 18.774486403849400, 20.606931928203000, 22.534528177268200,
  24.559253263197000, 26.683263637235900, 28.908916927455600, 31.238790099459800,
  33.675701999428600, 36.222742543267900, 38.883306040282000, 41.661130783399500,
  44.560334729456500, 47.585464997218800, 50.741555139982600, 54.034196816019900,
  57.469619832729900, 61.054798001965500, 64.797571009226900, 68.706787069814200,
  72.792476996654300, 77.066068937485700, 81.540731098282400, 86.231722932040100,
  91.156816424075200, 96.336860283023200, 101.796444073560000, 107.564773095993000,
  113.676890660196000, 120.175879419684000, 127.115037029282000, 134.562039975948000,
  142.605426568200000, 151.366808097501000, 161.020855468181000, 171.815651119854000,
  184.131073688740000, 198.622398437689000, 216.645844258800000, 242.184539498144000,
  0.0, 0.0, 0.0, 0.0,
];

const GL_WEIGHTS_64 = [
  0.055791667474579, 0.115948746898988, 0.143506948697094, 0.142364299254489,
  0.121546702610909, 0.091265695342992, 0.060701585876498, 0.035996781699242,
  0.019103974551100, 0.009102712004810, 0.003898614750850, 0.001502942174951,
  0.000521243580399, 0.000162926697678, 0.000045849978063, 0.000011613049710,
  0.000002645773340, 0.000000541577067, 0.000000099425221, 0.000000016340411,
  0.000000002401986, 0.000000000315009, 0.000000000036744, 0.000000000003800,
  0.000000000000347, 0.000000000000028, 0.000000000000002, 1.39e-16,
  8.24e-18, 4.20e-19, 1.83e-20, 6.68e-22,
  2.03e-23, 5.05e-25, 1.02e-26, 1.64e-28,
  2.07e-30, 2.01e-32, 1.47e-34, 7.82e-37,
  2.91e-39, 7.27e-42, 1.15e-44, 1.08e-47,
  5.62e-51, 1.47e-54, 1.70e-58, 7.24e-63,
  8.46e-68, 1.72e-73, 2.67e-80, 1.11e-88,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0,
];

/* ── Heston Model ──────────────────────────────────────────────── */

/**
 * Heston characteristic function using Albrecher et al. formulation.
 * @param {number} phi - integration variable (real)
 * @param {Object} params - { S, K, T, r, v0, kappa, theta, xi, rho }
 * @param {number} j - 1 or 2 (for P1 and P2 integrands)
 * @returns {{ re: number, im: number }}
 */
export function hestonCharFunc(phi, params, j) {
  const { S, T, r, v0, kappa, theta, xi, rho } = params;

  const u = j === 1 ? 0.5 : -0.5;
  const b = j === 1 ? kappa - rho * xi : kappa;
  const xi2 = xi * xi;

  // i*phi as a complex number
  const iPhi = imag(phi);

  // rho*xi*i*phi
  const rhoXiIPhi = complexScale(rho * xi, iPhi);

  // (rho*xi*i*phi - b)
  const term1 = complexSub(rhoXiIPhi, real(b));

  // (rho*xi*i*phi - b)^2
  const term1sq = complexMul(term1, term1);

  // 2*u*i*phi - phi^2
  const innerTerm = complexSub(complexScale(2 * u, iPhi), real(phi * phi));

  // xi^2 * (2*u*i*phi - phi^2)
  const xi2Inner = complexScale(xi2, innerTerm);

  // d = sqrt((rho*xi*i*phi - b)^2 - xi^2*(2*u*i*phi - phi^2))
  const dSq = complexSub(term1sq, xi2Inner);
  const d = complexSqrt(dSq);

  // b - rho*xi*i*phi + d
  const bMinusRhoXiIPhi = complexSub(real(b), rhoXiIPhi);
  const gNum = complexAdd(bMinusRhoXiIPhi, d);

  // b - rho*xi*i*phi - d
  const gDen = complexSub(bMinusRhoXiIPhi, d);

  // g = (b - rho*xi*i*phi + d) / (b - rho*xi*i*phi - d)
  const g = complexDiv(gNum, gDen);

  // exp(d*T)
  const dT = complexScale(T, d);
  const expDT = complexExp(dT);

  // 1 - g*exp(d*T)
  const gExpDT = complexMul(g, expDT);
  const oneMinusGExpDT = complexSub(real(1), gExpDT);

  // 1 - g
  const oneMinusG = complexSub(real(1), g);

  // C = r*i*phi*T + (kappa*theta/xi^2) * ((b - rho*xi*i*phi + d)*T - 2*log((1 - g*exp(d*T))/(1-g)))
  const riPhiT = complexScale(r * T, iPhi);

  const gNumT = complexScale(T, gNum);
  const logArg = complexDiv(oneMinusGExpDT, oneMinusG);
  const logVal = complexLog(logArg);
  const twoLog = complexScale(2, logVal);
  const bracketTerm = complexSub(gNumT, twoLog);
  const C = complexAdd(riPhiT, complexScale(kappa * theta / xi2, bracketTerm));

  // D = (b - rho*xi*i*phi + d) / xi^2 * ((1 - exp(d*T)) / (1 - g*exp(d*T)))
  const oneMinusExpDT = complexSub(real(1), expDT);
  const Dfrac = complexDiv(oneMinusExpDT, oneMinusGExpDT);
  const D = complexMul(complexScale(1 / xi2, gNum), Dfrac);

  // charFunc = exp(C + D*v0 + i*phi*log(S))
  const Dv0 = complexScale(v0, D);
  const iPhiLogS = complexScale(Math.log(S), iPhi);
  const exponent = complexAdd(complexAdd(C, Dv0), iPhiLogS);

  return complexExp(exponent);
}

/**
 * Price a European option using the Heston model via Gauss-Laguerre quadrature.
 * @param {'call'|'put'} type
 * @param {Object} params - { S, K, T, r, v0, kappa, theta, xi, rho }
 * @param {number} numPoints - 32 or 64
 * @returns {number} option price
 */
export function hestonPrice(type, params, numPoints = 32) {
  const { S, K, T, r } = params;

  if (T <= 0) {
    if (type === 'call') return Math.max(S - K, 0);
    return Math.max(K - S, 0);
  }

  const nodes = numPoints >= 64 ? GL_NODES_64 : GL_NODES_32;
  const weights = numPoints >= 64 ? GL_WEIGHTS_64 : GL_WEIGHTS_32;
  const n = numPoints >= 64 ? 60 : 32; // effective points (skip zero-weight trailing entries)

  const lnK = Math.log(K);

  // Compute P1 and P2 via quadrature
  let P1 = 0;
  let P2 = 0;

  for (let i = 0; i < n; i++) {
    const phi = nodes[i];
    if (phi <= 0 || weights[i] <= 0) continue;

    // For the Gauss-Laguerre integral, we undo the e^{-x} weighting
    // The original integral is int_0^inf f(phi) dphi
    // GL approximates int_0^inf g(x) * e^{-x} dx
    // So f(phi) dphi -> g(x) * e^{-x} dx, meaning g(x) = f(x) * e^{x}
    const expX = Math.exp(phi); // undo the e^{-x} weight

    // Compute integrand for j=1 and j=2
    const iPhi = imag(phi);
    const negIPhiLnK = complexScale(-lnK, iPhi);
    const expTerm = complexExp(negIPhiLnK);

    // j=1
    const cf1 = hestonCharFunc(phi, params, 1);
    const num1 = complexMul(expTerm, cf1);
    const integrand1 = complexDiv(num1, iPhi);
    P1 += weights[i] * expX * integrand1.re;

    // j=2
    const cf2 = hestonCharFunc(phi, params, 2);
    const num2 = complexMul(expTerm, cf2);
    const integrand2 = complexDiv(num2, iPhi);
    P2 += weights[i] * expX * integrand2.re;
  }

  P1 = 0.5 + P1 / Math.PI;
  P2 = 0.5 + P2 / Math.PI;

  // Clamp probabilities
  P1 = Math.max(0, Math.min(1, P1));
  P2 = Math.max(0, Math.min(1, P2));

  const callPrice = S * P1 - K * Math.exp(-r * T) * P2;

  if (type === 'call') {
    return Math.max(0, callPrice);
  }
  // Put via put-call parity
  return Math.max(0, callPrice - S + K * Math.exp(-r * T));
}

/**
 * Finite-difference Greeks for the Heston model.
 * @param {'call'|'put'} type
 * @param {Object} params - { S, K, T, r, v0, kappa, theta, xi, rho }
 * @param {number} numPoints
 * @returns {{ delta, gamma, vega, theta, rho }}
 */
export function hestonGreeks(type, params, numPoints = 32) {
  const { S, K, T, r, v0, kappa, theta, xi, rho } = params;

  const dS = 0.01 * S;
  const dv = 0.01;
  const dt = 1 / 365;
  const dr = 0.001;

  const basePrice = hestonPrice(type, params, numPoints);

  // Delta
  const priceUp = hestonPrice(type, { ...params, S: S + dS }, numPoints);
  const priceDown = hestonPrice(type, { ...params, S: S - dS }, numPoints);
  const delta = (priceUp - priceDown) / (2 * dS);

  // Gamma
  const gamma = (priceUp - 2 * basePrice + priceDown) / (dS * dS);

  // Vega (bump initial variance v0)
  const vegaUp = hestonPrice(type, { ...params, v0: v0 + dv }, numPoints);
  const vegaDown = hestonPrice(type, { ...params, v0: Math.max(0.001, v0 - dv) }, numPoints);
  const vega = (vegaUp - vegaDown) / (2 * dv) / 100; // per 1% vol

  // Theta
  const thetaVal = T > dt
    ? (hestonPrice(type, { ...params, T: T - dt }, numPoints) - basePrice) / dt
    : 0;

  // Rho
  const rhoUp = hestonPrice(type, { ...params, r: r + dr }, numPoints);
  const rhoDown = hestonPrice(type, { ...params, r: r - dr }, numPoints);
  const rhoGreek = (rhoUp - rhoDown) / (2 * dr) / 100; // per 1%

  return {
    delta,
    gamma,
    vega,
    theta: thetaVal / 365, // daily theta
    rho: rhoGreek,
  };
}

/**
 * Compute implied volatility surface from Heston model.
 * For each (strike, expiry) pair, prices with Heston then inverts BS to get IV.
 * @param {Object} baseParams - { S, r, v0, kappa, theta, xi, rho }
 * @param {number[]} strikes
 * @param {number[]} expiries - in years
 * @returns {number[][]} ivSurface[expiryIdx][strikeIdx] - IV in decimal
 */
export function hestonIVSurface(baseParams, strikes, expiries) {
  const { S, r } = baseParams;
  const surface = [];

  for (let ei = 0; ei < expiries.length; ei++) {
    const T = expiries[ei];
    const row = [];
    for (let si = 0; si < strikes.length; si++) {
      const K = strikes[si];
      const type = K >= S ? 'call' : 'put';
      const params = { ...baseParams, K, T };
      const price = hestonPrice(type, params, 32);

      // Invert BS to get IV
      const iv = impliedVolatility(type, price, S, K, T, r);
      row.push(iv != null ? iv : 0);
    }
    surface.push(row);
  }

  return surface;
}

/**
 * Calibrate Heston model to market data using Nelder-Mead simplex.
 * @param {Array<{strike:number, expiry:number, marketIV:number, type:string}>} marketData
 * @param {number} S - spot price
 * @param {number} r - risk-free rate
 * @param {Object} initialGuess - { v0, kappa, theta, xi, rho }
 * @param {number} maxIter
 * @returns {{ params, rmse, fittedIVs, residuals }}
 */
export function calibrateHeston(marketData, S, r, initialGuess, maxIter = 200) {
  if (!marketData || marketData.length === 0) {
    return { params: initialGuess, rmse: Infinity, fittedIVs: [], residuals: [] };
  }

  const paramNames = ['v0', 'kappa', 'theta', 'xi', 'rho'];

  // Convert param object to array
  function toArray(p) {
    return [p.v0, p.kappa, p.theta, p.xi, p.rho];
  }

  // Convert array to bounded param object
  function toParams(arr) {
    return {
      v0: Math.max(0.001, arr[0]),
      kappa: Math.max(0.01, arr[1]),
      theta: Math.max(0.001, arr[2]),
      xi: Math.max(0.01, arr[3]),
      rho: Math.max(-0.999, Math.min(0.999, arr[4])),
    };
  }

  // Objective function: sum of squared IV differences
  function objective(arr) {
    const p = toParams(arr);
    let sse = 0;

    for (const md of marketData) {
      const params = { S, K: md.strike, T: md.expiry, r, ...p };
      const price = hestonPrice(md.type || 'call', params, 32);
      const modelIV = impliedVolatility(md.type || 'call', price, S, md.strike, md.expiry, r);
      const diff = (modelIV != null ? modelIV : 0) - md.marketIV;
      sse += diff * diff;
    }

    return sse;
  }

  // Nelder-Mead simplex optimization
  const n = 5; // number of parameters
  const alpha = 1.0;  // reflection
  const gammaC = 2.0; // expansion
  const rhoC = 0.5;   // contraction
  const sigmaC = 0.5; // shrink

  // Create initial simplex (n+1 vertices)
  const x0 = toArray(initialGuess);
  const simplex = [{ x: [...x0], f: objective(x0) }];

  for (let i = 0; i < n; i++) {
    const xi = [...x0];
    xi[i] *= 1.1;
    if (Math.abs(xi[i]) < 0.01) xi[i] = 0.01;
    simplex.push({ x: xi, f: objective(xi) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    // Sort by objective value
    simplex.sort((a, b) => a.f - b.f);

    // Check convergence: simplex diameter
    let maxDist = 0;
    for (let i = 1; i <= n; i++) {
      let dist = 0;
      for (let j = 0; j < n; j++) {
        const d = simplex[i].x[j] - simplex[0].x[j];
        dist += d * d;
      }
      maxDist = Math.max(maxDist, Math.sqrt(dist));
    }
    if (maxDist < 1e-8) break;

    // Centroid of all but worst
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i].x[j];
      }
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    const worst = simplex[n];
    const best = simplex[0];
    const secondWorst = simplex[n - 1];

    // Reflect
    const xr = centroid.map((c, j) => c + alpha * (c - worst.x[j]));
    const fr = objective(xr);

    if (fr < secondWorst.f && fr >= best.f) {
      simplex[n] = { x: xr, f: fr };
      continue;
    }

    // Expand
    if (fr < best.f) {
      const xe = centroid.map((c, j) => c + gammaC * (xr[j] - c));
      const fe = objective(xe);
      simplex[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
      continue;
    }

    // Contract
    if (fr < worst.f) {
      // Outside contraction
      const xc = centroid.map((c, j) => c + rhoC * (xr[j] - c));
      const fc = objective(xc);
      if (fc <= fr) {
        simplex[n] = { x: xc, f: fc };
        continue;
      }
    } else {
      // Inside contraction
      const xc = centroid.map((c, j) => c + rhoC * (worst.x[j] - c));
      const fc = objective(xc);
      if (fc < worst.f) {
        simplex[n] = { x: xc, f: fc };
        continue;
      }
    }

    // Shrink toward best
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        simplex[i].x[j] = best.x[j] + sigmaC * (simplex[i].x[j] - best.x[j]);
      }
      simplex[i].f = objective(simplex[i].x);
    }
  }

  // Return best
  simplex.sort((a, b) => a.f - b.f);
  const bestParams = toParams(simplex[0].x);

  // Compute fitted IVs and residuals
  const fittedIVs = [];
  const residuals = [];

  for (const md of marketData) {
    const params = { S, K: md.strike, T: md.expiry, r, ...bestParams };
    const price = hestonPrice(md.type || 'call', params, 32);
    const modelIV = impliedVolatility(md.type || 'call', price, S, md.strike, md.expiry, r);
    const fitted = modelIV != null ? modelIV : 0;
    fittedIVs.push(fitted);
    residuals.push(fitted - md.marketIV);
  }

  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  return { params: bestParams, rmse, fittedIVs, residuals };
}

/* ── SABR Model ────────────────────────────────────────────────── */

/**
 * SABR implied volatility using Hagan et al. 2002 approximation.
 * @param {number} F - forward price
 * @param {number} K - strike
 * @param {number} T - time to expiry
 * @param {number} alpha - initial vol level
 * @param {number} beta - elasticity (0 to 1)
 * @param {number} rho - correlation (-1 to 1)
 * @param {number} nu - vol of vol
 * @returns {number} implied volatility (decimal)
 */
export function sabrImpliedVol(F, K, T, alpha, beta, rho, nu) {
  if (F <= 0 || K <= 0 || T <= 0 || alpha <= 0) return 0;

  const eps = 1e-7;

  // ATM case: F approximately equals K
  if (Math.abs(F - K) < eps * F) {
    const Fbeta = Math.pow(F, 1 - beta);
    const Fb2 = Math.pow(F, 2 - 2 * beta);
    const omBeta = 1 - beta;
    const omBeta2 = omBeta * omBeta;

    const term1 = omBeta2 / 24 * alpha * alpha / Fb2;
    const term2 = rho * beta * nu * alpha / (4 * Fbeta);
    const term3 = (2 - 3 * rho * rho) / 24 * nu * nu;

    return (alpha / Fbeta) * (1 + (term1 + term2 + term3) * T);
  }

  // General case: F != K
  const FK = F * K;
  const omBeta = 1 - beta;
  const FKhalf = Math.pow(FK, omBeta / 2);
  const FKfull = Math.pow(FK, omBeta);
  const logFK = Math.log(F / K);
  const logFK2 = logFK * logFK;
  const logFK4 = logFK2 * logFK2;
  const omBeta2 = omBeta * omBeta;
  const omBeta4 = omBeta2 * omBeta2;

  // z = (nu / alpha) * FK^((1-beta)/2) * ln(F/K)
  const z = (nu / alpha) * FKhalf * logFK;

  // x = ln((sqrt(1 - 2*rho*z + z^2) + z - rho) / (1 - rho))
  let B;
  if (Math.abs(z) < eps) {
    B = 1;
  } else {
    const disc = Math.sqrt(1 - 2 * rho * z + z * z);
    const x = Math.log((disc + z - rho) / (1 - rho));
    B = Math.abs(x) < eps ? 1 : z / x;
  }

  // A = alpha / (FK^((1-beta)/2) * (1 + (1-beta)^2/24 * ln(F/K)^2 + (1-beta)^4/1920 * ln(F/K)^4))
  const denom = FKhalf * (1 + omBeta2 / 24 * logFK2 + omBeta4 / 1920 * logFK4);
  const A = alpha / denom;

  // C = 1 + ((1-beta)^2/24 * alpha^2/FK^(1-beta) + rho*beta*nu*alpha/(4*FK^((1-beta)/2)) + (2-3*rho^2)/24 * nu^2) * T
  const cTerm1 = omBeta2 / 24 * alpha * alpha / FKfull;
  const cTerm2 = rho * beta * nu * alpha / (4 * FKhalf);
  const cTerm3 = (2 - 3 * rho * rho) / 24 * nu * nu;
  const C = 1 + (cTerm1 + cTerm2 + cTerm3) * T;

  return A * B * C;
}

/**
 * Price using SABR IV + Black76 formula.
 * @param {'call'|'put'} type
 * @param {number} F - forward price
 * @param {number} K - strike
 * @param {number} T - time to expiry
 * @param {number} r - risk-free rate
 * @param {number} alpha
 * @param {number} beta
 * @param {number} rho
 * @param {number} nu
 * @returns {number} option price
 */
export function sabrPrice(type, F, K, T, r, alpha, beta, rho, nu) {
  if (T <= 0) {
    if (type === 'call') return Math.max(F - K, 0) * Math.exp(-r * 0);
    return Math.max(K - F, 0);
  }

  const sigma = sabrImpliedVol(F, K, T, alpha, beta, rho, nu);
  if (sigma <= 0) return 0;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const df = Math.exp(-r * T);

  if (type === 'call') {
    return df * (F * normalCDF(d1) - K * normalCDF(d2));
  }
  return df * (K * normalCDF(-d2) - F * normalCDF(-d1));
}

/**
 * Compute SABR implied volatility smile for an array of strikes.
 * @param {number} F - forward
 * @param {number} T - expiry
 * @param {number} alpha
 * @param {number} beta
 * @param {number} rho
 * @param {number} nu
 * @param {number[]} strikes
 * @returns {number[]} array of IVs
 */
export function sabrSmile(F, T, alpha, beta, rho, nu, strikes) {
  return strikes.map((K) => sabrImpliedVol(F, K, T, alpha, beta, rho, nu));
}

/**
 * Calibrate SABR model to market data using Nelder-Mead.
 * Fixes beta, optimizes alpha, rho, nu.
 * @param {Array<{strike:number, marketIV:number}>} marketData
 * @param {number} F - forward price
 * @param {number} T - time to expiry
 * @param {number} beta - fixed (default 0.5)
 * @returns {{ alpha, rho, nu, rmse }}
 */
export function calibrateSABR(marketData, F, T, beta = 0.5) {
  if (!marketData || marketData.length === 0) {
    return { alpha: 0.2, rho: -0.3, nu: 0.4, rmse: Infinity };
  }

  // Objective: sum of squared IV differences
  function objective(arr) {
    const a = Math.max(0.001, arr[0]);
    const rho = Math.max(-0.999, Math.min(0.999, arr[1]));
    const nu = Math.max(0.001, arr[2]);

    let sse = 0;
    for (const md of marketData) {
      const modelIV = sabrImpliedVol(F, md.strike, T, a, beta, rho, nu);
      const diff = modelIV - md.marketIV;
      sse += diff * diff;
    }
    return sse;
  }

  // Nelder-Mead for 3 parameters (4 vertices)
  const n = 3;
  const x0 = [0.2, -0.3, 0.4]; // initial guess: alpha, rho, nu

  const alphaR = 1.0;
  const gammaC = 2.0;
  const rhoC = 0.5;
  const sigmaC = 0.5;
  const maxIter = 300;

  const simplex = [{ x: [...x0], f: objective(x0) }];
  for (let i = 0; i < n; i++) {
    const xi = [...x0];
    xi[i] *= 1.15;
    if (Math.abs(xi[i]) < 0.01) xi[i] = 0.05;
    simplex.push({ x: xi, f: objective(xi) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.f - b.f);

    // Convergence check
    let maxDist = 0;
    for (let i = 1; i <= n; i++) {
      let dist = 0;
      for (let j = 0; j < n; j++) {
        const d = simplex[i].x[j] - simplex[0].x[j];
        dist += d * d;
      }
      maxDist = Math.max(maxDist, Math.sqrt(dist));
    }
    if (maxDist < 1e-8) break;

    // Centroid of all but worst
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i].x[j];
      }
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    const worst = simplex[n];
    const best = simplex[0];
    const secondWorst = simplex[n - 1];

    // Reflect
    const xr = centroid.map((c, j) => c + alphaR * (c - worst.x[j]));
    const fr = objective(xr);

    if (fr < secondWorst.f && fr >= best.f) {
      simplex[n] = { x: xr, f: fr };
      continue;
    }

    if (fr < best.f) {
      const xe = centroid.map((c, j) => c + gammaC * (xr[j] - c));
      const fe = objective(xe);
      simplex[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
      continue;
    }

    if (fr < worst.f) {
      const xc = centroid.map((c, j) => c + rhoC * (xr[j] - c));
      const fc = objective(xc);
      if (fc <= fr) {
        simplex[n] = { x: xc, f: fc };
        continue;
      }
    } else {
      const xc = centroid.map((c, j) => c + rhoC * (worst.x[j] - c));
      const fc = objective(xc);
      if (fc < worst.f) {
        simplex[n] = { x: xc, f: fc };
        continue;
      }
    }

    // Shrink
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        simplex[i].x[j] = best.x[j] + sigmaC * (simplex[i].x[j] - best.x[j]);
      }
      simplex[i].f = objective(simplex[i].x);
    }
  }

  simplex.sort((a, b) => a.f - b.f);
  const bestX = simplex[0].x;
  const alpha = Math.max(0.001, bestX[0]);
  const rhoVal = Math.max(-0.999, Math.min(0.999, bestX[1]));
  const nu = Math.max(0.001, bestX[2]);

  // Compute RMSE
  let sse = 0;
  for (const md of marketData) {
    const modelIV = sabrImpliedVol(F, md.strike, T, alpha, beta, rhoVal, nu);
    const diff = modelIV - md.marketIV;
    sse += diff * diff;
  }
  const rmse = Math.sqrt(sse / marketData.length);

  return { alpha, rho: rhoVal, nu, rmse };
}
