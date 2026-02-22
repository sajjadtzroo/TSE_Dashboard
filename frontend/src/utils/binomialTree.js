/**
 * Binomial Tree option pricing model (CRR).
 * Supports European and American exercise styles.
 * Pure JavaScript — zero React dependencies.
 */

/**
 * Build a binomial price tree and compute option value via backward induction.
 *
 * @param {number} S     - Current spot price
 * @param {number} K     - Strike price
 * @param {number} T     - Time to expiry in years
 * @param {number} r     - Risk-free rate (decimal)
 * @param {number} sigma - Volatility (decimal)
 * @param {number} steps - Number of time steps
 * @param {'call'|'put'} type - Option type
 * @param {'european'|'american'} style - Exercise style
 * @returns {{ nodes: object[][], optionPrice: number, earlyExerciseNodes: [number,number][], u: number, d: number, p: number }}
 */
export function buildTree(S, K, T, r, sigma, steps, type, style = 'european') {
  const n = Math.max(1, Math.round(steps));
  const dt = T / n;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const disc = Math.exp(-r * dt);
  const p = (Math.exp(r * dt) - d) / (u - d); // risk-neutral probability

  // Forward pass: build stock price tree
  // nodes[i][j] = { stockPrice, optionValue, earlyExercise }
  // i = time step (0..n), j = up moves (0..i)
  const nodes = [];
  for (let i = 0; i <= n; i++) {
    nodes[i] = [];
    for (let j = 0; j <= i; j++) {
      const stockPrice = S * Math.pow(u, j) * Math.pow(d, i - j);
      nodes[i][j] = { stockPrice, optionValue: 0, earlyExercise: false };
    }
  }

  // Terminal payoff
  for (let j = 0; j <= n; j++) {
    const sT = nodes[n][j].stockPrice;
    nodes[n][j].optionValue =
      type === 'call' ? Math.max(sT - K, 0) : Math.max(K - sT, 0);
  }

  // Backward induction
  const earlyExerciseNodes = [];
  for (let i = n - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      const continuation = disc * (p * nodes[i + 1][j + 1].optionValue + (1 - p) * nodes[i + 1][j].optionValue);
      const intrinsic =
        type === 'call'
          ? Math.max(nodes[i][j].stockPrice - K, 0)
          : Math.max(K - nodes[i][j].stockPrice, 0);

      if (style === 'american' && intrinsic > continuation) {
        nodes[i][j].optionValue = intrinsic;
        nodes[i][j].earlyExercise = true;
        earlyExerciseNodes.push([i, j]);
      } else {
        nodes[i][j].optionValue = continuation;
      }
    }
  }

  return {
    nodes,
    optionPrice: nodes[0][0].optionValue,
    earlyExerciseNodes,
    u,
    d,
    p,
    dt,
  };
}

/**
 * Compute binomial prices for step counts 1→maxSteps for convergence analysis.
 * @returns {Array<{ steps: number, price: number }>}
 */
export function convergenceData(S, K, T, r, sigma, type, style, maxSteps = 50) {
  const data = [];
  for (let n = 1; n <= maxSteps; n++) {
    const { optionPrice } = buildTree(S, K, T, r, sigma, n, type, style);
    data.push({ steps: n, price: Math.round(optionPrice * 100) / 100 });
  }
  return data;
}
