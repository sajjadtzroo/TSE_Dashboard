/**
 * Markowitz Mean-Variance Portfolio Optimization
 * Pure JavaScript — zero React/external dependencies.
 * Self-contained for Web Worker compatibility.
 */

/* ── Inline helpers (duplicated from descriptive.js for Worker isolation) ── */

function _mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function _variance(arr) {
  if (arr.length < 2) return 0;
  const m = _mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

function _stdDev(arr) {
  return Math.sqrt(_variance(arr));
}

/* ── Matrix / vector helpers ─────────────────────────────────── */

function matVec(M, v) {
  const n = v.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += M[i][j] * v[j];
    result[i] = s;
  }
  return result;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function vecSum(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i];
  return s;
}

/* ── Covariance & Correlation ────────────────────────────────── */

/**
 * Compute annualized covariance matrix from daily return series.
 * @param {number[][]} returnSeries - Array of N arrays, each containing daily returns for one asset
 * @returns {number[][]} N x N covariance matrix (annualized)
 */
export function covarianceMatrix(returnSeries) {
  const n = returnSeries.length;
  if (n === 0) return [];

  const means = returnSeries.map((rs) => _mean(rs));
  // Use the minimum overlapping length
  const len = Math.min(...returnSeries.map((rs) => rs.length));
  if (len < 2) return Array.from({ length: n }, () => new Array(n).fill(0));

  const cov = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < len; k++) {
        sum += (returnSeries[i][k] - means[i]) * (returnSeries[j][k] - means[j]);
      }
      const val = (sum / (len - 1)) * 252; // annualize
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }
  return cov;
}

/**
 * Compute correlation matrix from daily return series.
 * @param {number[][]} returnSeries - Array of N arrays of daily returns
 * @returns {number[][]} N x N correlation matrix
 */
export function correlationMatrix(returnSeries) {
  const n = returnSeries.length;
  if (n === 0) return [];

  const covMat = covarianceMatrix(returnSeries);
  const corr = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const denom = Math.sqrt(covMat[i][i] * covMat[j][j]);
      const val = denom > 0 ? covMat[i][j] / denom : 0;
      corr[i][j] = val;
      corr[j][i] = val;
    }
  }
  return corr;
}

/* ── Portfolio Statistics ─────────────────────────────────────── */

/**
 * Compute portfolio return, risk, and Sharpe ratio.
 * @param {number[]} weights - Portfolio weights (sum to 1)
 * @param {number[]} expectedReturns - Annualized expected returns per asset
 * @param {number[][]} covMatrix - Annualized covariance matrix
 * @param {number} rfRate - Risk-free rate (default 0.23 for Iran)
 * @returns {{ return: number, risk: number, sharpe: number }}
 */
export function portfolioStats(weights, expectedReturns, covMatrix, rfRate = 0.23) {
  const portReturn = dot(weights, expectedReturns);
  const covW = matVec(covMatrix, weights);
  const portVariance = dot(weights, covW);
  const portRisk = Math.sqrt(Math.max(portVariance, 0));
  const sharpe = portRisk > 0 ? (portReturn - rfRate) / portRisk : 0;

  return { return: portReturn, risk: portRisk, sharpe };
}

/* ── Projection onto feasible set ─────────────────────────────── */

/**
 * Project weights onto the constraint set:
 * sum(w) = 1, minWeight <= w_i <= maxWeight
 * Uses iterative clipping + renormalization (Michelot's algorithm variant).
 */
function projectWeights(w, minW, maxW, maxProjectIter = 50) {
  const n = w.length;
  const out = w.slice();

  for (let iter = 0; iter < maxProjectIter; iter++) {
    // Clip to box constraints
    for (let i = 0; i < n; i++) {
      out[i] = Math.max(minW, Math.min(maxW, out[i]));
    }
    // Renormalize to sum = 1
    const s = vecSum(out);
    if (s <= 0) {
      // fallback to equal weights
      for (let i = 0; i < n; i++) out[i] = 1 / n;
      return out;
    }
    for (let i = 0; i < n; i++) out[i] /= s;

    // Check feasibility
    let feasible = true;
    for (let i = 0; i < n; i++) {
      if (out[i] < minW - 1e-10 || out[i] > maxW + 1e-10) {
        feasible = false;
        break;
      }
    }
    if (feasible && Math.abs(vecSum(out) - 1) < 1e-10) return out;
  }
  return out;
}

/* ── Minimum Variance Portfolio ───────────────────────────────── */

/**
 * Find the minimum variance portfolio.
 * @param {number[]} expectedReturns - Annualized expected returns per asset
 * @param {number[][]} covMatrix - Annualized covariance matrix
 * @param {object} constraints - { minWeight, maxWeight }
 * @returns {{ return: number, risk: number, sharpe: number, weights: number[] }}
 */
export function minVariancePortfolio(expectedReturns, covMatrix, constraints = {}) {
  const { minWeight = 0, maxWeight = 1, rfRate = 0.23 } = constraints;
  const n = expectedReturns.length;
  const maxIter = 1000;
  const tol = 1e-10;
  let lr = 0.5;

  // Start with equal weights
  let w = new Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient of portfolio variance: 2 * Cov * w
    const grad = matVec(covMatrix, w).map((v) => 2 * v);

    // Gradient step
    const wNew = w.map((wi, i) => wi - lr * grad[i]);

    // Project onto constraints
    const wProj = projectWeights(wNew, minWeight, maxWeight);

    // Check convergence
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(wProj[i] - w[i]));
    }

    w = wProj;
    if (maxDiff < tol) break;

    // Adaptive learning rate: reduce if variance increased
    const varOld = dot(w, matVec(covMatrix, w));
    const varNew = dot(wProj, matVec(covMatrix, wProj));
    if (varNew > varOld) lr *= 0.5;
  }

  const stats = portfolioStats(w, expectedReturns, covMatrix, rfRate);
  return { ...stats, weights: w };
}

/* ── Efficient Frontier ───────────────────────────────────────── */

/**
 * Compute the efficient frontier.
 * @param {number[]} expectedReturns - Annualized expected returns per asset
 * @param {number[][]} covMatrix - Annualized covariance matrix
 * @param {object} constraints - { minWeight, maxWeight, numPortfolios, rfRate }
 * @returns {{ frontier, maxSharpe, minVariance, equalWeight }}
 */
export function efficientFrontier(expectedReturns, covMatrix, constraints = {}) {
  const {
    minWeight = 0,
    maxWeight = 1,
    numPortfolios = 100,
    rfRate = 0.23,
  } = constraints;
  const n = expectedReturns.length;

  if (n === 0) {
    return { frontier: [], maxSharpe: null, minVariance: null, equalWeight: null };
  }

  // Equal weight portfolio
  const eqW = new Array(n).fill(1 / n);
  const eqStats = portfolioStats(eqW, expectedReturns, covMatrix, rfRate);
  const equalWeight = { ...eqStats, weights: eqW };

  // Minimum variance portfolio
  const minVar = minVariancePortfolio(expectedReturns, covMatrix, { minWeight, maxWeight, rfRate });

  // Max return portfolio: put maxWeight in highest-return assets
  const maxRetW = _maxReturnWeights(expectedReturns, minWeight, maxWeight);
  const maxRetStats = portfolioStats(maxRetW, expectedReturns, covMatrix, rfRate);

  const minRet = minVar.return;
  const maxRet = maxRetStats.return;

  // Generate frontier points
  const frontier = [];
  const retStep = maxRet > minRet ? (maxRet - minRet) / (numPortfolios - 1) : 0;

  for (let p = 0; p < numPortfolios; p++) {
    const targetReturn = minRet + p * retStep;
    const w = _solveForTargetReturn(expectedReturns, covMatrix, targetReturn, minWeight, maxWeight);
    const stats = portfolioStats(w, expectedReturns, covMatrix, rfRate);
    frontier.push({ ...stats, weights: w });
  }

  // Find max Sharpe from frontier
  let maxSharpe = frontier[0];
  for (const pt of frontier) {
    if (pt.sharpe > maxSharpe.sharpe) maxSharpe = pt;
  }

  return { frontier, maxSharpe, minVariance: minVar, equalWeight };
}

/**
 * Compute weights for max-return portfolio given box constraints.
 */
function _maxReturnWeights(expectedReturns, minWeight, maxWeight) {
  const n = expectedReturns.length;
  // Sort assets by expected return descending
  const indices = expectedReturns.map((_, i) => i).sort((a, b) => expectedReturns[b] - expectedReturns[a]);
  const w = new Array(n).fill(minWeight);
  let remaining = 1 - minWeight * n;

  for (const idx of indices) {
    const add = Math.min(remaining, maxWeight - minWeight);
    w[idx] += add;
    remaining -= add;
    if (remaining <= 1e-10) break;
  }

  // Normalize in case of floating point drift
  const s = vecSum(w);
  if (s > 0) for (let i = 0; i < n; i++) w[i] /= s;
  return w;
}

/**
 * Solve for minimum variance portfolio with a target return constraint.
 * Uses projected gradient descent with Lagrange penalty for the return target.
 */
function _solveForTargetReturn(expectedReturns, covMatrix, targetReturn, minWeight, maxWeight) {
  const n = expectedReturns.length;
  const maxIter = 500;
  const tol = 1e-8;
  let lr = 0.3;
  const lambdaPenalty = 10; // Lagrange multiplier weight

  // Start with equal weights
  let w = new Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient of variance: 2 * Cov * w
    const gradVar = matVec(covMatrix, w).map((v) => 2 * v);

    // Gradient of return penalty: 2 * lambdaPenalty * (w'*mu - targetReturn) * mu
    const currentReturn = dot(w, expectedReturns);
    const returnError = currentReturn - targetReturn;
    const gradPenalty = expectedReturns.map((mu) => 2 * lambdaPenalty * returnError * mu);

    // Combined gradient
    const grad = gradVar.map((g, i) => g + gradPenalty[i]);

    // Gradient step
    const wNew = w.map((wi, i) => wi - lr * grad[i]);

    // Project
    const wProj = projectWeights(wNew, minWeight, maxWeight);

    // Check convergence
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(wProj[i] - w[i]));
    }

    w = wProj;
    if (maxDiff < tol) break;

    // Reduce learning rate over time
    if (iter > 0 && iter % 100 === 0) lr *= 0.7;
  }

  return w;
}

/* ── Max Sharpe Portfolio ─────────────────────────────────────── */

/**
 * Find the portfolio with maximum Sharpe ratio.
 * @param {number[]} expectedReturns - Annualized expected returns per asset
 * @param {number[][]} covMatrix - Annualized covariance matrix
 * @param {number} rfRate - Risk-free rate
 * @param {object} constraints - { minWeight, maxWeight }
 * @returns {{ return: number, risk: number, sharpe: number, weights: number[] }}
 */
export function maxSharpePortfolio(expectedReturns, covMatrix, rfRate = 0.23, constraints = {}) {
  const { minWeight = 0, maxWeight = 1 } = constraints;
  // Compute via efficient frontier and pick max Sharpe point
  const result = efficientFrontier(expectedReturns, covMatrix, {
    minWeight,
    maxWeight,
    numPortfolios: 200,
    rfRate,
  });
  return result.maxSharpe;
}

/* ── Risk Parity Portfolio ────────────────────────────────────── */

/**
 * Compute a risk parity portfolio where each asset contributes equally to total risk.
 * @param {number[][]} covMatrix - Annualized covariance matrix
 * @param {number} maxIter - Maximum iterations
 * @param {number} tol - Convergence tolerance
 * @returns {{ weights: number[], riskContributions: number[] }}
 */
export function riskParityPortfolio(covMatrix, maxIter = 1000, tol = 1e-8) {
  const n = covMatrix.length;
  if (n === 0) return { weights: [], riskContributions: [] };

  const targetRC = 1 / n;
  const dampingFactor = 0.5;

  // Start with equal weights
  let w = new Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    // Portfolio variance and risk
    const covW = matVec(covMatrix, w);
    const portVar = dot(w, covW);
    const portRisk = Math.sqrt(Math.max(portVar, 1e-16));

    // Marginal risk contribution: MR_i = (Cov * w)_i / sigma_p
    // Risk contribution: RC_i = w_i * MR_i / sigma_p (as fraction of total)
    const rc = new Array(n);
    for (let i = 0; i < n; i++) {
      rc[i] = (w[i] * covW[i]) / portVar; // fractional risk contribution
    }

    // Check convergence: max deviation from target
    let maxDev = 0;
    for (let i = 0; i < n; i++) {
      maxDev = Math.max(maxDev, Math.abs(rc[i] - targetRC));
    }
    if (maxDev < tol) {
      return { weights: w, riskContributions: rc };
    }

    // Update weights
    const wNew = new Array(n);
    for (let i = 0; i < n; i++) {
      const ratio = rc[i] > 1e-16 ? targetRC / rc[i] : 1;
      wNew[i] = w[i] * Math.pow(ratio, dampingFactor);
    }

    // Normalize
    const s = vecSum(wNew);
    for (let i = 0; i < n; i++) wNew[i] /= s;

    w = wNew;
  }

  // Final risk contributions
  const covW = matVec(covMatrix, w);
  const portVar = dot(w, covW);
  const riskContributions = w.map((wi, i) => (wi * covW[i]) / portVar);

  return { weights: w, riskContributions };
}
