/**
 * Custom trend indicators for KLineChart.
 * Each export conforms to the registerIndicator spec:
 *   { name, shortName, calcParams, figures, calc }
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Highest high in a look-back window ending at index `i`. */
function highestHigh(dataList, i, period) {
  let max = -Infinity;
  const start = Math.max(0, i - period + 1);
  for (let j = start; j <= i; j++) {
    if (dataList[j].high > max) max = dataList[j].high;
  }
  return max;
}

/** Lowest low in a look-back window ending at index `i`. */
function lowestLow(dataList, i, period) {
  let min = Infinity;
  const start = Math.max(0, i - period + 1);
  for (let j = start; j <= i; j++) {
    if (dataList[j].low < min) min = dataList[j].low;
  }
  return min;
}

// ── SuperTrend ───────────────────────────────────────────────────────────────

const superTrendIndicator = {
  name: 'SUPERTREND',
  shortName: 'SuperTrend',
  calcParams: [10, 3],
  figures: [
    { key: 'superTrend', title: 'ST: ', type: 'line' },
  ],
  // Overlay on main price pane
  calc: (dataList, indicator) => {
    const [atrPeriod, multiplier] = indicator.calcParams;
    const result = [];
    const trArr = new Array(dataList.length).fill(0);

    // True Range
    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) {
        trArr[i] = dataList[i].high - dataList[i].low;
      } else {
        const prevClose = dataList[i - 1].close;
        trArr[i] = Math.max(
          dataList[i].high - dataList[i].low,
          Math.abs(dataList[i].high - prevClose),
          Math.abs(dataList[i].low - prevClose),
        );
      }
    }

    // ATR via Wilder smoothing
    const atr = new Array(dataList.length).fill(NaN);
    let atrSum = 0;
    for (let i = 0; i < dataList.length; i++) {
      atrSum += trArr[i];
      if (i === atrPeriod - 1) {
        atr[i] = atrSum / atrPeriod;
      } else if (i >= atrPeriod) {
        atr[i] = (atr[i - 1] * (atrPeriod - 1) + trArr[i]) / atrPeriod;
      }
    }

    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevSuperTrend = 0;
    let prevClose = 0;

    for (let i = 0; i < dataList.length; i++) {
      if (isNaN(atr[i])) { result.push({}); continue; }

      const hl2 = (dataList[i].high + dataList[i].low) / 2;
      let upperBand = hl2 + multiplier * atr[i];
      let lowerBand = hl2 - multiplier * atr[i];

      // Adjust bands based on previous values
      if (i > 0) {
        upperBand = upperBand < prevUpperBand || prevClose > prevUpperBand ? upperBand : prevUpperBand;
        lowerBand = lowerBand > prevLowerBand || prevClose < prevLowerBand ? lowerBand : prevLowerBand;
      }

      let superTrend;
      if (i === atrPeriod - 1) {
        superTrend = upperBand;
      } else if (prevSuperTrend === prevUpperBand) {
        superTrend = dataList[i].close <= upperBand ? upperBand : lowerBand;
      } else {
        superTrend = dataList[i].close >= lowerBand ? lowerBand : upperBand;
      }

      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
      prevSuperTrend = superTrend;
      prevClose = dataList[i].close;

      result.push({ superTrend });
    }
    return result;
  },
};

// ── Ichimoku Cloud ───────────────────────────────────────────────────────────

const ichimokuIndicator = {
  name: 'ICHIMOKU',
  shortName: 'Ichimoku',
  calcParams: [9, 26, 52, 26],
  figures: [
    { key: 'tenkan',  title: 'Tenkan: ',  type: 'line' },
    { key: 'kijun',   title: 'Kijun: ',   type: 'line' },
    { key: 'senkouA', title: 'SpanA: ',   type: 'line' },
    { key: 'senkouB', title: 'SpanB: ',   type: 'line' },
    { key: 'chikou',  title: 'Chikou: ',  type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [tenkanP, kijunP, senkouBP, displacement] = indicator.calcParams;
    const len = dataList.length;
    const result = new Array(len).fill(null).map(() => ({}));

    // Tenkan-sen & Kijun-sen
    const tenkanArr = new Array(len).fill(NaN);
    const kijunArr  = new Array(len).fill(NaN);

    for (let i = 0; i < len; i++) {
      if (i >= tenkanP - 1) {
        tenkanArr[i] = (highestHigh(dataList, i, tenkanP) + lowestLow(dataList, i, tenkanP)) / 2;
      }
      if (i >= kijunP - 1) {
        kijunArr[i] = (highestHigh(dataList, i, kijunP) + lowestLow(dataList, i, kijunP)) / 2;
      }
    }

    for (let i = 0; i < len; i++) {
      if (!isNaN(tenkanArr[i])) result[i].tenkan = tenkanArr[i];
      if (!isNaN(kijunArr[i]))  result[i].kijun  = kijunArr[i];

      // Senkou Span A — displaced forward by `displacement` periods
      if (!isNaN(tenkanArr[i]) && !isNaN(kijunArr[i])) {
        const targetA = i + displacement;
        if (targetA < len) {
          result[targetA].senkouA = (tenkanArr[i] + kijunArr[i]) / 2;
        }
      }

      // Senkou Span B — displaced forward by `displacement` periods
      if (i >= senkouBP - 1) {
        const spanB = (highestHigh(dataList, i, senkouBP) + lowestLow(dataList, i, senkouBP)) / 2;
        const targetB = i + displacement;
        if (targetB < len) {
          result[targetB].senkouB = spanB;
        }
      }

      // Chikou Span — close displaced back by `displacement` periods
      const chikouTarget = i - displacement;
      if (chikouTarget >= 0) {
        result[chikouTarget].chikou = dataList[i].close;
      }
    }

    return result;
  },
};

// ── Linear Regression Channel ────────────────────────────────────────────────

const linRegIndicator = {
  name: 'LINREG',
  shortName: 'LinReg',
  calcParams: [100, 2],
  figures: [
    { key: 'mid',   title: 'Mid: ',   type: 'line' },
    { key: 'upper', title: 'Upper: ', type: 'line' },
    { key: 'lower', title: 'Lower: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period, stdDevMult] = indicator.calcParams;
    const result = [];

    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) { result.push({}); continue; }

      // Collect close prices for the window
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      const n = period;
      for (let j = 0; j < n; j++) {
        const y = dataList[i - n + 1 + j].close;
        sumX  += j;
        sumY  += y;
        sumXY += j * y;
        sumX2 += j * j;
      }

      const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const midValue  = intercept + slope * (n - 1);

      // Standard deviation of residuals
      let ssResid = 0;
      for (let j = 0; j < n; j++) {
        const predicted = intercept + slope * j;
        const actual    = dataList[i - n + 1 + j].close;
        ssResid += (actual - predicted) * (actual - predicted);
      }
      const stdDev = Math.sqrt(ssResid / n);

      result.push({
        mid:   midValue,
        upper: midValue + stdDevMult * stdDev,
        lower: midValue - stdDevMult * stdDev,
      });
    }
    return result;
  },
};

export default [
  superTrendIndicator,
  ichimokuIndicator,
  linRegIndicator,
];
