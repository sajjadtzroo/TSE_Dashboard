/**
 * Liquidity risk metrics (FRM).
 * Pure JavaScript — zero React dependencies.
 */

/**
 * Amihud Illiquidity Ratio — mean(|return| / dollar volume).
 * Higher = more illiquid. Uses daily data with close, volume fields.
 * @param {Array<{close: number, volume: number}>} dailyData - OHLCV array (needs consecutive days)
 * @returns {number|null}
 */
export function amihudIlliquidity(dailyData) {
  if (!dailyData || dailyData.length < 2) return null;

  let sum = 0;
  let count = 0;

  for (let i = 1; i < dailyData.length; i++) {
    const prev = dailyData[i - 1];
    const curr = dailyData[i];
    if (!prev.close || !curr.close || !curr.volume) continue;

    const ret = Math.abs((curr.close - prev.close) / prev.close);
    const dollarVol = curr.volume * curr.close;
    if (dollarVol > 0) {
      sum += ret / dollarVol;
      count++;
    }
  }

  return count > 0 ? (sum / count) * 1e9 : null; // scaled ×10⁹ for readability
}

/**
 * Turnover Ratio — volume / total shares outstanding.
 * @param {number} volume - daily volume
 * @param {number} totalShares - total shares outstanding
 */
export function turnoverRatio(volume, totalShares) {
  if (!volume || !totalShares || totalShares === 0) return null;
  return volume / totalShares;
}

/**
 * Average Turnover Ratio over a history period.
 * @param {Array<{volume: number}>} history
 * @param {number} totalShares
 */
export function avgTurnoverRatio(history, totalShares) {
  if (!history || !history.length || !totalShares) return null;
  const sum = history.reduce((s, h) => s + (h.volume || 0), 0);
  return sum / history.length / totalShares;
}

/**
 * Bid-Ask Spread from order book data.
 * @param {Array<{demand_price: number, supply_price: number}>} orderBook
 * @returns {{ absoluteSpread: number, relativeSpread: number }|null}
 */
export function bidAskSpread(orderBook) {
  if (!orderBook || !orderBook.length) return null;

  // Find best bid (highest demand) and best ask (lowest supply)
  let bestBid = 0;
  let bestAsk = Infinity;

  for (const row of orderBook) {
    if (row.demand_price && row.demand_price > bestBid) bestBid = row.demand_price;
    if (row.supply_price && row.supply_price < bestAsk) bestAsk = row.supply_price;
  }

  if (bestBid === 0 || bestAsk === Infinity || bestAsk <= bestBid) return null;

  const mid = (bestBid + bestAsk) / 2;
  return {
    absoluteSpread: bestAsk - bestBid,
    relativeSpread: mid > 0 ? (bestAsk - bestBid) / mid : null,
  };
}

/**
 * Rolling Amihud Illiquidity — time series for charting.
 * @param {Array<{close: number, volume: number, date: string}>} dailyData
 * @param {number} window - rolling window (default 20)
 * @returns {Array<{ date: string, amihud: number }>}
 */
export function rollingAmihud(dailyData, window = 20) {
  if (!dailyData || dailyData.length < window + 1) return [];

  // Pre-compute daily illiquidity ratios
  const dailyRatios = [];
  for (let i = 1; i < dailyData.length; i++) {
    const prev = dailyData[i - 1];
    const curr = dailyData[i];
    if (!prev.close || !curr.close || !curr.volume) {
      dailyRatios.push({ date: curr.date, ratio: null });
      continue;
    }
    const ret = Math.abs((curr.close - prev.close) / prev.close);
    const dollarVol = curr.volume * curr.close;
    dailyRatios.push({
      date: curr.date,
      ratio: dollarVol > 0 ? (ret / dollarVol) * 1e9 : null,
    });
  }

  const results = [];
  for (let i = window - 1; i < dailyRatios.length; i++) {
    const slice = dailyRatios.slice(i - window + 1, i + 1);
    const valid = slice.filter((d) => d.ratio != null);
    if (valid.length > 0) {
      const avg = valid.reduce((s, d) => s + d.ratio, 0) / valid.length;
      results.push({ date: dailyRatios[i].date, amihud: avg });
    }
  }

  return results;
}
