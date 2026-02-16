/**
 * Return computation utilities for financial analytics.
 * Pure JavaScript — zero React dependencies.
 */

/**
 * Extract adjusted close prices from history array.
 * Falls back to close if adj_close is not available.
 */
export function extractPrices(history) {
  return history
    .filter((h) => h.adj_close != null || h.close != null)
    .map((h) => ({
      date: h.date,
      price: h.adj_close != null ? h.adj_close : h.close,
    }));
}

/**
 * Compute simple (arithmetic) returns: (P_t - P_{t-1}) / P_{t-1}
 */
export function computeSimpleReturns(history) {
  const prices = extractPrices(history);
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].price === 0) continue;
    returns.push({
      date: prices[i].date,
      ret: (prices[i].price - prices[i - 1].price) / prices[i - 1].price,
    });
  }
  return returns;
}

/**
 * Compute log (continuously compounded) returns: ln(P_t / P_{t-1})
 */
export function computeLogReturns(history) {
  const prices = extractPrices(history);
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].price <= 0 || prices[i].price <= 0) continue;
    returns.push({
      date: prices[i].date,
      ret: Math.log(prices[i].price / prices[i - 1].price),
    });
  }
  return returns;
}

/**
 * Align two return series by date using a Date-keyed Map.
 * Returns { stockReturns: number[], benchReturns: number[], dates: string[] }
 */
export function alignReturnSeries(stockReturns, benchReturns) {
  const benchMap = new Map();
  for (const b of benchReturns) {
    benchMap.set(b.date, b.ret);
  }

  const aligned = { stockReturns: [], benchReturns: [], dates: [] };
  for (const s of stockReturns) {
    const benchRet = benchMap.get(s.date);
    if (benchRet !== undefined) {
      aligned.stockReturns.push(s.ret);
      aligned.benchReturns.push(benchRet);
      aligned.dates.push(s.date);
    }
  }
  return aligned;
}
