/**
 * Descriptive statistics for financial returns.
 * Pure JavaScript — zero React dependencies.
 */

/** Arithmetic mean */
export function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Sample variance (Bessel-corrected, n-1 denominator) */
export function variance(arr) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/** Standard deviation (sample) */
export function stdDev(arr) {
  const v = variance(arr);
  return v != null ? Math.sqrt(v) : null;
}

/** Annualized volatility: daily σ × √252 */
export function annualizedVolatility(dailyReturns) {
  const sd = stdDev(dailyReturns);
  return sd != null ? sd * Math.sqrt(252) : null;
}

/** Annualized return from daily returns: (1 + mean_daily)^252 - 1 */
export function annualizedReturn(dailyReturns) {
  const m = mean(dailyReturns);
  if (m == null) return null;
  return Math.pow(1 + m, 252) - 1;
}

/** Coefficient of Variation: σ / |μ| */
export function coefficientOfVariation(dailyReturns) {
  const m = mean(dailyReturns);
  const sd = stdDev(dailyReturns);
  if (m == null || sd == null || m === 0) return null;
  return sd / Math.abs(m);
}

/**
 * Bias-corrected skewness (third standardized moment)
 * Fisher's adjustment: [n / ((n-1)(n-2))] × Σ((x-μ)/σ)³
 */
export function skewness(arr) {
  const n = arr.length;
  if (n < 3) return null;
  const m = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0 || sd == null) return null;

  const m3 = arr.reduce((s, v) => s + ((v - m) / sd) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

/**
 * Excess kurtosis (bias-corrected, fourth standardized moment)
 * Fisher's definition: excess = kurtosis - 3
 */
export function kurtosis(arr) {
  const n = arr.length;
  if (n < 4) return null;
  const m = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0 || sd == null) return null;

  const m4 = arr.reduce((s, v) => s + ((v - m) / sd) ** 4, 0);
  const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4;
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return k - correction;
}

/**
 * Downside deviation — standard deviation of returns below MAR
 * @param {number[]} returns - array of daily returns
 * @param {number} mar - minimum acceptable return (daily)
 */
export function downsideDev(returns, mar = 0) {
  if (returns.length < 2) return null;
  if (!returns.some((r) => r < mar)) return 0;
  const sumSq = returns.reduce((s, r) => {
    const diff = Math.min(r - mar, 0);
    return s + diff * diff;
  }, 0);
  return Math.sqrt(sumSq / (returns.length - 1));
}
