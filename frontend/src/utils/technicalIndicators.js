/**
 * Technical indicators — pure JavaScript, O(n) algorithms.
 * Zero React dependencies.
 */

/**
 * Simple Moving Average
 * @param {number[]} closes
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function sma(closes, period) {
  const result = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    result.push(i >= period - 1 ? sum / period : null);
  }
  return result;
}

/**
 * Exponential Moving Average
 * @param {number[]} closes
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function ema(closes, period) {
  const result = [];
  const k = 2 / (period + 1);
  let seedSum = 0;
  let emaVal = null;

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      seedSum += closes[i];
      result.push(null);
    } else if (i === period - 1) {
      seedSum += closes[i];
      emaVal = seedSum / period;
      result.push(emaVal);
    } else {
      emaVal = closes[i] * k + emaVal * (1 - k);
      result.push(emaVal);
    }
  }
  return result;
}

/**
 * Bollinger Bands
 * @param {number[]} closes
 * @param {number} period - default 20
 * @param {number} mult - default 2
 * @returns {{ upper: (number|null)[], middle: (number|null)[], lower: (number|null)[] }}
 */
export function bollingerBands(closes, period = 20, mult = 2) {
  const middle = sma(closes, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (closes[j] - middle[i]) ** 2;
    }
    const sd = Math.sqrt(sumSq / period);
    upper.push(middle[i] + mult * sd);
    lower.push(middle[i] - mult * sd);
  }

  return { upper, middle, lower };
}

/**
 * Volume Weighted Average Price
 * @param {{ high: number, low: number, close: number, volume: number }[]} bars
 * @returns {(number|null)[]}
 */
export function vwap(bars) {
  let cumTP = 0;
  let cumVol = 0;
  return bars.map((b) => {
    if (!b.volume) return null;
    const tp = (b.high + b.low + b.close) / 3;
    cumTP += tp * b.volume;
    cumVol += b.volume;
    return cumVol > 0 ? cumTP / cumVol : null;
  });
}

/**
 * RSI (Wilder's smoothed average gain/loss)
 * @param {number[]} closes
 * @param {number} period - default 14
 * @returns {(number|null)[]}
 */
export function rsi(closes, period = 14) {
  const result = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // Wilder's smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

/**
 * MACD
 * @param {number[]} closes
 * @param {number} fast - default 12
 * @param {number} slow - default 26
 * @param {number} signal - default 9
 * @returns {{ macd: (number|null)[], signal: (number|null)[], histogram: (number|null)[] }}
 */
export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const macdLine = emaFast.map((f, i) =>
    f != null && emaSlow[i] != null ? f - emaSlow[i] : null
  );

  // Signal line is EMA of MACD line
  const validMacd = macdLine.filter((v) => v != null);
  const signalEma = ema(validMacd, signal);

  // Map signal back to full array
  const signalLine = new Array(macdLine.length).fill(null);
  let si = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      signalLine[i] = signalEma[si] ?? null;
      si++;
    }
  }

  const histogram = macdLine.map((m, i) =>
    m != null && signalLine[i] != null ? m - signalLine[i] : null
  );

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Stochastic Oscillator (%K/%D)
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} period - default 14
 * @param {number} smoothK - default 3 (SMA smoothing for %K)
 * @returns {{ k: (number|null)[], d: (number|null)[] }}
 */
export function stochastic(bars, period = 14, smoothK = 3) {
  const rawK = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      rawK.push(null);
      continue;
    }
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > highest) highest = bars[j].high;
      if (bars[j].low < lowest) lowest = bars[j].low;
    }
    const range = highest - lowest;
    rawK.push(range === 0 ? 50 : ((bars[i].close - lowest) / range) * 100);
  }

  // %K = SMA of rawK
  const validRawK = rawK.filter((v) => v != null);
  const kSmoothed = sma(validRawK, smoothK);
  const k = new Array(rawK.length).fill(null);
  let ki = 0;
  for (let i = 0; i < rawK.length; i++) {
    if (rawK[i] != null) {
      k[i] = kSmoothed[ki] ?? null;
      ki++;
    }
  }

  // %D = SMA of %K (3-period)
  const validK = k.filter((v) => v != null);
  const dSmoothed = sma(validK, 3);
  const d = new Array(k.length).fill(null);
  let di = 0;
  for (let i = 0; i < k.length; i++) {
    if (k[i] != null) {
      d[i] = dSmoothed[di] ?? null;
      di++;
    }
  }

  return { k, d };
}

/**
 * Average True Range (Wilder's smoothed)
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} period - default 14
 * @returns {(number|null)[]}
 */
export function atr(bars, period = 14) {
  const result = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return result;

  // True ranges
  const trs = [bars[0].high - bars[0].low];
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    trs.push(tr);
  }

  // Initial ATR
  let atrVal = 0;
  for (let i = 0; i < period; i++) atrVal += trs[i];
  atrVal /= period;
  result[period - 1] = atrVal;

  // Wilder's smoothing
  for (let i = period; i < bars.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]) / period;
    result[i] = atrVal;
  }

  return result;
}

/**
 * On-Balance Volume
 * @param {{ close: number, volume: number }[]} bars
 * @returns {number[]}
 */
export function obv(bars) {
  const result = [0];
  for (let i = 1; i < bars.length; i++) {
    const sign = bars[i].close > bars[i - 1].close ? 1 : bars[i].close < bars[i - 1].close ? -1 : 0;
    result.push(result[i - 1] + sign * (bars[i].volume || 0));
  }
  return result;
}

/**
 * Standard Floor Pivot Points (from most recent bar)
 * @param {{ high: number, low: number, close: number }[]} bars
 * @returns {{ pivot: number, s1: number, s2: number, r1: number, r2: number } | null}
 */
export function pivotPoints(bars) {
  if (!bars.length) return null;
  const last = bars[bars.length - 1];
  const pivot = (last.high + last.low + last.close) / 3;
  return {
    pivot,
    s1: 2 * pivot - last.high,
    s2: pivot - (last.high - last.low),
    r1: 2 * pivot - last.low,
    r2: pivot + (last.high - last.low),
  };
}
