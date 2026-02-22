/**
 * Black-Scholes option pricing, Greeks, and strategy payoff utilities.
 * Pure JavaScript — zero React dependencies.
 */

/* ── Normal distribution helpers ─────────────────────────────── */

/** Standard normal PDF */
export function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF – Abramowitz & Stegun approximation (error < 7.5e-8)
 */
export function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse normal CDF (quantile function) — Peter Acklam's rational approximation.
 * Max error: 1.15e-9. Used by parametric VaR.
 * @param {number} p - probability (0 < p < 1)
 * @returns {number} z-score
 */
export function inverseNormalCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/* ── Black-Scholes pricing ───────────────────────────────────── */

/**
 * @param {'call'|'put'} type
 * @param {number} S  – spot price
 * @param {number} K  – strike price
 * @param {number} T  – time to expiry in years
 * @param {number} r  – risk-free rate (decimal, e.g. 0.05)
 * @param {number} sigma – volatility (decimal, e.g. 0.25)
 * @returns {number} theoretical option price
 */
export function blackScholesPrice(type, S, K, T, r, sigma) {
  if (T <= 0) {
    // At or past expiry → intrinsic value
    if (type === 'call') return Math.max(S - K, 0);
    return Math.max(K - S, 0);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

/* ── Greeks ───────────────────────────────────────────────────── */

/**
 * @returns {{ delta, gamma, theta, vega, rho }}
 * theta  → daily (divided by 365)
 * vega   → per 1% move in vol
 * rho    → per 1% move in rate
 */
export function greeks(type, S, K, T, r, sigma) {
  if (T <= 0 || S <= 0 || K <= 0 || sigma <= 0) {
    const itm = type === 'call' ? S > K : K > S;
    return {
      delta: type === 'call' ? (itm ? 1 : 0) : (itm ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const nd1 = normalPDF(d1);
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const expRT = Math.exp(-r * T);

  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = (S * nd1 * sqrtT) / 100; // per 1%

  if (type === 'call') {
    return {
      delta: Nd1,
      gamma,
      theta: (-(S * nd1 * sigma) / (2 * sqrtT) - r * K * expRT * Nd2) / 365,
      vega,
      rho: (K * T * expRT * Nd2) / 100,
    };
  }
  return {
    delta: Nd1 - 1,
    gamma,
    theta: (-(S * nd1 * sigma) / (2 * sqrtT) + r * K * expRT * normalCDF(-d2)) / 365,
    vega,
    rho: (-K * T * expRT * normalCDF(-d2)) / 100,
  };
}

/* ── Second-Order Greeks ─────────────────────────────────────── */

/**
 * Second-order Greeks (CFA L2).
 * @returns {{ vanna, volga, charm, speed, color }}
 * vanna  → delta sensitivity to vol  (∂²V/∂σ∂S)
 * volga  → vega convexity            (∂²V/∂σ²)
 * charm  → delta time decay           (∂Δ/∂T)
 * speed  → gamma's gamma             (∂Γ/∂S)
 * color  → gamma time decay           (∂Γ/∂T)
 */
export function greeks2nd(type, S, K, T, r, sigma) {
  if (T <= 0 || S <= 0 || sigma <= 0) {
    return { vanna: 0, volga: 0, charm: 0, speed: 0, color: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const nd1 = normalPDF(d1);
  const expRT = Math.exp(-r * T);

  // vanna = -e^(-δT) * n(d1) * d2 / σ  (δ=0 for non-dividend)
  const vanna = -nd1 * d2 / sigma;

  // volga = vega * d1*d2 / σ  (vega_raw = S * nd1 * sqrtT)
  const vegaRaw = S * nd1 * sqrtT;
  const volga = vegaRaw * d1 * d2 / sigma;

  // charm = -n(d1) * (2*r*T - d2*σ*√T) / (2*T*σ*√T)
  const charm_call = -nd1 * (2 * r * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT);
  const charm = type === 'call' ? charm_call : charm_call + r * expRT;

  // gamma for speed/color
  const gamma = nd1 / (S * sigma * sqrtT);

  // speed = -γ/S * (1 + d1/(σ√T))
  const speed = -gamma / S * (1 + d1 / (sigma * sqrtT));

  // color = -n(d1)/(2*S*T*σ*√T) * (2*r*T + 1 + d1*(2*r*T - d2*σ*√T)/(σ*√T))
  const color = -nd1 / (2 * S * T * sigma * sqrtT) *
    (2 * r * T + 1 + d1 * (2 * r * T - d2 * sigma * sqrtT) / (sigma * sqrtT));

  return { vanna, volga, charm, speed, color };
}

/* ── Implied Volatility (Newton-Raphson) ─────────────────────── */

/**
 * d1 helper for IV solver — extracts the d1 calculation.
 */
function _d1(S, K, T, r, sigma) {
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

/**
 * Implied volatility via Newton-Raphson with Brenner-Subrahmanyam initial guess.
 * @param {'call'|'put'} type
 * @param {number} marketPrice – observed market price
 * @param {number} S  – underlying spot price
 * @param {number} K  – strike price
 * @param {number} T  – time to expiry in years
 * @param {number} r  – risk-free rate (decimal)
 * @param {number} maxIter – max iterations (default 100)
 * @param {number} tol – convergence tolerance (default 1e-6)
 * @returns {number|null} implied vol (decimal) or null if no convergence
 */
export function impliedVolatility(type, marketPrice, S, K, T, r, maxIter = 100, tol = 1e-6) {
  if (!marketPrice || marketPrice <= 0 || T <= 0 || S <= 0 || K <= 0) return null;

  // Brenner-Subrahmanyam initial guess
  let sigma = Math.sqrt(2 * Math.PI / T) * (marketPrice / S);
  sigma = Math.max(0.01, Math.min(sigma, 5.0));

  for (let i = 0; i < maxIter; i++) {
    const price = blackScholesPrice(type, S, K, T, r, sigma);
    const d1Val = _d1(S, K, T, r, sigma);
    const vegaRaw = S * normalPDF(d1Val) * Math.sqrt(T);
    if (Math.abs(vegaRaw) < 1e-12) return null;

    const diff = price - marketPrice;
    if (Math.abs(diff) < tol) return sigma;

    sigma -= diff / vegaRaw;
    if (sigma <= 0.001) sigma = 0.001;
    if (sigma > 10) return null;
  }
  return sigma; // best estimate after max iterations
}

/**
 * Moneyness classification.
 * @param {'call'|'put'} type
 * @param {number} S – spot price
 * @param {number} K – strike price
 * @returns {'ITM'|'ATM'|'OTM'}
 */
export function moneyness(type, S, K) {
  if (!S || !K) return null;
  const ratio = S / K;
  // ATM band: within 2% of parity
  if (Math.abs(ratio - 1) < 0.02) return 'ATM';
  if (type === 'call') return S > K ? 'ITM' : 'OTM';
  return K > S ? 'ITM' : 'OTM';
}

/* ── Payoff helpers ───────────────────────────────────────────── */

/**
 * Single leg payoff at expiration.
 * leg: { type: 'call'|'put'|'stock', direction: 1|-1, strike, premium, qty }
 */
export function legPayoff(leg, S) {
  const { type, direction, strike, premium, qty } = leg;
  if (type === 'stock') {
    return direction * qty * (S - strike);
  }
  const intrinsic =
    type === 'call' ? Math.max(S - strike, 0) : Math.max(strike - S, 0);
  return direction * qty * (intrinsic - premium);
}

/** Sum of all leg payoffs at price S */
export function strategyPayoff(legs, S) {
  return legs.reduce((sum, leg) => sum + legPayoff(leg, S), 0);
}

/**
 * Aggregate Greeks across all legs.
 * Stock legs contribute delta = direction * qty only.
 */
export function strategyGreeks(legs, S, T, r, sigma) {
  const totals = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  for (const leg of legs) {
    if (leg.type === 'stock') {
      totals.delta += leg.direction * leg.qty;
      continue;
    }
    const g = greeks(leg.type, S, leg.strike, T, r, sigma);
    const mult = leg.direction * leg.qty;
    totals.delta += g.delta * mult;
    totals.gamma += g.gamma * mult;
    totals.theta += g.theta * mult;
    totals.vega += g.vega * mult;
    totals.rho += g.rho * mult;
  }
  return totals;
}

/* ── Analytics ────────────────────────────────────────────────── */

/**
 * Scan the payoff curve for zero-crossings (breakevens) using linear interpolation.
 */
export function findBreakevens(legs, priceRange, steps = 1000) {
  const [lo, hi] = priceRange;
  const step = (hi - lo) / steps;
  const breakevens = [];
  let prevY = strategyPayoff(legs, lo);

  for (let i = 1; i <= steps; i++) {
    const x = lo + i * step;
    const y = strategyPayoff(legs, x);
    if ((prevY < 0 && y >= 0) || (prevY >= 0 && y < 0)) {
      // Linear interpolation
      const crossX = (lo + (i - 1) * step) + step * Math.abs(prevY) / (Math.abs(prevY) + Math.abs(y));
      breakevens.push(Math.round(crossX * 100) / 100);
    }
    prevY = y;
  }
  return breakevens;
}

/**
 * Scan for max/min payoff; compute risk-reward ratio.
 */
export function maxProfitLoss(legs, priceRange, steps = 1000) {
  const [lo, hi] = priceRange;
  const step = (hi - lo) / steps;
  let maxProfit = -Infinity;
  let maxLoss = Infinity;

  for (let i = 0; i <= steps; i++) {
    const x = lo + i * step;
    const y = strategyPayoff(legs, x);
    if (y > maxProfit) maxProfit = y;
    if (y < maxLoss) maxLoss = y;
  }

  // Cap extremes — if practically unbounded mark as Infinity
  const profit = maxProfit > 1e10 ? Infinity : Math.round(maxProfit * 100) / 100;
  const loss = maxLoss < -1e10 ? -Infinity : Math.round(maxLoss * 100) / 100;
  const rrRatio =
    loss === 0 || !isFinite(profit) || !isFinite(loss)
      ? null
      : Math.round(Math.abs(profit / loss) * 100) / 100;

  return { maxProfit: profit, maxLoss: loss, riskRewardRatio: rrRatio };
}

/* ── Strategy presets ─────────────────────────────────────────── */

/**
 * Each preset is a function(S) → leg[] template.
 * Premiums are set to 0 — the page auto-calculates them via blackScholesPrice.
 */
export const STRATEGY_PRESETS = {
  'covered-call': (S) => [
    { type: 'stock', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'protective-put': (S) => [
    { type: 'stock', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'put', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
  ],
  'straddle': (S) => [
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'put', direction: 1, strike: S, premium: 0, qty: 1 },
  ],
  'strangle': (S) => [
    { type: 'call', direction: 1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
    { type: 'put', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
  ],
  'bull-call-spread': (S) => [
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'bear-put-spread': (S) => [
    { type: 'put', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'put', direction: -1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
  ],
  'iron-condor': (S) => [
    { type: 'put', direction: 1, strike: Math.round(S * 0.90), premium: 0, qty: 1 },
    { type: 'put', direction: -1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
    { type: 'call', direction: 1, strike: Math.round(S * 1.10), premium: 0, qty: 1 },
  ],
  'butterfly': (S) => [
    { type: 'call', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: S, premium: 0, qty: 2 },
    { type: 'call', direction: 1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'collar': (S) => [
    { type: 'stock', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'put', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'iron-butterfly': (S) => [
    { type: 'put', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'put', direction: -1, strike: S, premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: S, premium: 0, qty: 1 },
    { type: 'call', direction: 1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'calendar-spread': (S) => [
    { type: 'call', direction: -1, strike: S, premium: 0, qty: 1, legExpiry: 30 },
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1, legExpiry: 90 },
  ],
  'diagonal-spread': (S) => [
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1, legExpiry: 90 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1, legExpiry: 30 },
  ],
  'ratio-call-spread': (S) => [
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 2 },
  ],
  'risk-reversal': (S) => [
    { type: 'put', direction: -1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'call', direction: 1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'synthetic-long': (S) => [
    { type: 'call', direction: 1, strike: S, premium: 0, qty: 1 },
    { type: 'put', direction: -1, strike: S, premium: 0, qty: 1 },
  ],
  'box-spread': (S) => [
    { type: 'call', direction: 1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'call', direction: -1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
    { type: 'put', direction: -1, strike: Math.round(S * 0.95), premium: 0, qty: 1 },
    { type: 'put', direction: 1, strike: Math.round(S * 1.05), premium: 0, qty: 1 },
  ],
  'custom': () => [
    { type: 'call', direction: 1, strike: 10000, premium: 0, qty: 1 },
  ],
};

export const STRATEGY_LABELS = {
  'covered-call': 'Covered Call',
  'protective-put': 'Protective Put',
  'straddle': 'Straddle',
  'strangle': 'Strangle',
  'bull-call-spread': 'Bull Call Spread',
  'bear-put-spread': 'Bear Put Spread',
  'iron-condor': 'Iron Condor',
  'butterfly': 'Butterfly',
  'collar': 'Collar',
  'iron-butterfly': 'Iron Butterfly',
  'calendar-spread': 'Calendar Spread',
  'diagonal-spread': 'Diagonal Spread',
  'ratio-call-spread': 'Ratio Call Spread',
  'risk-reversal': 'Risk Reversal',
  'synthetic-long': 'Synthetic Long',
  'box-spread': 'Box Spread',
  'custom': 'Custom',
};
