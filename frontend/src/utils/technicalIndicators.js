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

/**
 * Ichimoku Cloud (Ichimoku Kinko Hyo)
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} tenkanPeriod - default 9
 * @param {number} kijunPeriod - default 26
 * @param {number} senkouBPeriod - default 52
 * @param {number} displacement - default 26
 * @returns {{ tenkan, kijun, senkouA, senkouB, chikou: (number|null)[] }}
 */
export function ichimoku(bars, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52, displacement = 26) {
  const len = bars.length;

  function midpoint(arr, end, period) {
    if (end - period + 1 < 0) return null;
    let hi = -Infinity, lo = Infinity;
    for (let j = end - period + 1; j <= end; j++) {
      if (arr[j].high > hi) hi = arr[j].high;
      if (arr[j].low < lo) lo = arr[j].low;
    }
    return (hi + lo) / 2;
  }

  const tenkan = [];
  const kijun = [];
  const senkouA = new Array(len + displacement).fill(null);
  const senkouB = new Array(len + displacement).fill(null);
  const chikou = new Array(len).fill(null);

  for (let i = 0; i < len; i++) {
    const t = i >= tenkanPeriod - 1 ? midpoint(bars, i, tenkanPeriod) : null;
    const k = i >= kijunPeriod - 1 ? midpoint(bars, i, kijunPeriod) : null;
    tenkan.push(t);
    kijun.push(k);

    // Senkou A = (tenkan + kijun) / 2, displaced forward
    if (t != null && k != null) {
      senkouA[i + displacement] = (t + k) / 2;
    }

    // Senkou B = midpoint of senkouBPeriod, displaced forward
    if (i >= senkouBPeriod - 1) {
      senkouB[i + displacement] = midpoint(bars, i, senkouBPeriod);
    }

    // Chikou = close displaced backward
    if (i >= displacement) {
      chikou[i - displacement] = bars[i].close;
    }
  }

  // Trim senkou arrays to match bars length (drop future projections beyond data)
  return {
    tenkan,
    kijun,
    senkouA: senkouA.slice(0, len),
    senkouB: senkouB.slice(0, len),
    chikou,
  };
}

/**
 * Williams %R
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} period - default 14
 * @returns {(number|null)[]}
 */
export function williamsR(bars, period = 14) {
  const result = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let highest = -Infinity, lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > highest) highest = bars[j].high;
      if (bars[j].low < lowest) lowest = bars[j].low;
    }
    const range = highest - lowest;
    result.push(range === 0 ? -50 : ((highest - bars[i].close) / range) * -100);
  }
  return result;
}

/**
 * Commodity Channel Index
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} period - default 20
 * @returns {(number|null)[]}
 */
export function cci(bars, period = 20) {
  const result = [];
  const tps = bars.map((b) => (b.high + b.low + b.close) / 3);

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tps[j];
    const mean = sum / period;

    let madSum = 0;
    for (let j = i - period + 1; j <= i; j++) madSum += Math.abs(tps[j] - mean);
    const mad = madSum / period;

    result.push(mad === 0 ? 0 : (tps[i] - mean) / (0.015 * mad));
  }
  return result;
}

/**
 * Average Directional Index (ADX) with +DI and -DI
 * @param {{ high: number, low: number, close: number }[]} bars
 * @param {number} period - default 14
 * @returns {{ adx: (number|null)[], plusDI: (number|null)[], minusDI: (number|null)[] }}
 */
export function adx(bars, period = 14) {
  const len = bars.length;
  const adxResult = new Array(len).fill(null);
  const plusDI = new Array(len).fill(null);
  const minusDI = new Array(len).fill(null);
  if (len < period * 2) return { adx: adxResult, plusDI, minusDI };

  // True Range, +DM, -DM
  const trs = [];
  const plusDMs = [];
  const minusDMs = [];

  for (let i = 1; i < len; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    trs.push(tr);

    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Wilder's smoothed sums (initial)
  let smoothTR = 0, smoothPlusDM = 0, smoothMinusDM = 0;
  for (let i = 0; i < period; i++) {
    smoothTR += trs[i];
    smoothPlusDM += plusDMs[i];
    smoothMinusDM += minusDMs[i];
  }

  const dxValues = [];

  for (let i = period; i < trs.length; i++) {
    if (i > period) {
      smoothTR = smoothTR - smoothTR / period + trs[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[i];
    }

    const pdi = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
    const mdi = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
    plusDI[i + 1] = pdi;
    minusDI[i + 1] = mdi;

    const diSum = pdi + mdi;
    dxValues.push(diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100);
  }

  // ADX = Wilder's smoothed DX
  if (dxValues.length >= period) {
    let adxVal = 0;
    for (let i = 0; i < period; i++) adxVal += dxValues[i];
    adxVal /= period;
    const startIdx = period * 2;
    if (startIdx < len) adxResult[startIdx] = adxVal;

    for (let i = period; i < dxValues.length; i++) {
      adxVal = (adxVal * (period - 1) + dxValues[i]) / period;
      const idx = i + period + 1;
      if (idx < len) adxResult[idx] = adxVal;
    }
  }

  return { adx: adxResult, plusDI, minusDI };
}

/**
 * Money Flow Index (volume-weighted RSI)
 * @param {{ high: number, low: number, close: number, volume: number }[]} bars
 * @param {number} period - default 14
 * @returns {(number|null)[]}
 */
export function mfi(bars, period = 14) {
  const result = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return result;

  const tps = bars.map((b) => (b.high + b.low + b.close) / 3);

  for (let i = period; i < bars.length; i++) {
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const flow = tps[j] * (bars[j].volume || 0);
      if (tps[j] > tps[j - 1]) posFlow += flow;
      else if (tps[j] < tps[j - 1]) negFlow += flow;
    }
    result[i] = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
  }
  return result;
}

/**
 * Rate of Change (momentum as percentage)
 * @param {number[]} closes
 * @param {number} period - default 12
 * @returns {(number|null)[]}
 */
export function roc(closes, period = 12) {
  const result = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const prev = closes[i - period];
      result.push(prev === 0 ? 0 : ((closes[i] - prev) / prev) * 100);
    }
  }
  return result;
}
