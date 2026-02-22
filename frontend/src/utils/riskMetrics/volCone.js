/**
 * Volatility Cone / Term Structure (CFA L2 / FRM).
 * Pure JavaScript — zero React dependencies.
 */

/**
 * Compute volatility cone — realized vol at multiple lookback windows
 * with historical percentile bands.
 * @param {number[]} returns - daily return array
 * @param {number[]} windows - lookback windows (default [20, 60, 90, 120, 250])
 * @returns {Array<{ window, current, min, max, p25, p50, p75 }>}
 */
export function computeVolatilityCone(returns, windows = [20, 60, 90, 120, 250]) {
  if (!returns || returns.length < 20) return [];

  return windows
    .filter((w) => returns.length >= w)
    .map((w) => {
      // Collect all realized vol observations for this window size
      const vols = [];
      for (let i = w; i <= returns.length; i++) {
        const slice = returns.slice(i - w, i);
        const m = slice.reduce((s, v) => s + v, 0) / slice.length;
        const variance = slice.reduce((s, v) => s + (v - m) ** 2, 0) / (slice.length - 1);
        vols.push(Math.sqrt(variance) * Math.sqrt(252)); // annualized
      }

      if (!vols.length) return null;

      const current = vols[vols.length - 1]; // most recent window's vol
      vols.sort((a, b) => a - b);

      return {
        window: w,
        current: current * 100,
        min: vols[0] * 100,
        max: vols[vols.length - 1] * 100,
        p25: percentile(vols, 0.25) * 100,
        p50: percentile(vols, 0.50) * 100,
        p75: percentile(vols, 0.75) * 100,
      };
    })
    .filter(Boolean);
}

function percentile(sorted, p) {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
