/**
 * Custom moving average indicators for KLineChart.
 * Each export conforms to the registerIndicator spec:
 *   { name, shortName, calcParams, figures, calc }
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Exponential Moving Average. Returns array of same length. */
function ema(values, period) {
  const out = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    if (isNaN(values[i])) continue;
    if (isNaN(prev)) {
      prev = values[i];
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
}

/** Weighted Moving Average. Returns array of same length. */
function wmaCalc(values, period) {
  const out = new Array(values.length).fill(NaN);
  const weightSum = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j] * (j + 1);
    }
    out[i] = sum / weightSum;
  }
  return out;
}

// ── WMA (Weighted Moving Average) ────────────────────────────────────────────

const wmaIndicator = {
  name: 'WMA',
  shortName: 'WMA',
  calcParams: [20],
  figures: [
    { key: 'wma', title: 'WMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const closes = dataList.map((d) => d.close);
    const values = wmaCalc(closes, period);
    return values.map((v) => (isNaN(v) ? {} : { wma: v }));
  },
};

// ── HMA (Hull Moving Average) ────────────────────────────────────────────────

const hmaIndicator = {
  name: 'HMA',
  shortName: 'HMA',
  calcParams: [20],
  figures: [
    { key: 'hma', title: 'HMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const closes = dataList.map((d) => d.close);
    const halfPeriod  = Math.max(1, Math.floor(period / 2));
    const sqrtPeriod  = Math.max(1, Math.round(Math.sqrt(period)));

    const wmaHalf = wmaCalc(closes, halfPeriod);
    const wmaFull = wmaCalc(closes, period);

    // 2 * WMA(n/2) - WMA(n)
    const diff = new Array(dataList.length).fill(NaN);
    for (let i = 0; i < dataList.length; i++) {
      if (!isNaN(wmaHalf[i]) && !isNaN(wmaFull[i])) {
        diff[i] = 2 * wmaHalf[i] - wmaFull[i];
      }
    }

    const hull = wmaCalc(diff, sqrtPeriod);
    return hull.map((v) => (isNaN(v) ? {} : { hma: v }));
  },
};

// ── DEMA (Double Exponential Moving Average) ─────────────────────────────────

const demaIndicator = {
  name: 'DEMA',
  shortName: 'DEMA',
  calcParams: [20],
  figures: [
    { key: 'dema', title: 'DEMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const closes = dataList.map((d) => d.close);
    const ema1 = ema(closes, period);
    const ema2 = ema(ema1, period);

    return dataList.map((_, i) => {
      if (isNaN(ema1[i]) || isNaN(ema2[i])) return {};
      return { dema: 2 * ema1[i] - ema2[i] };
    });
  },
};

// ── TEMA (Triple Exponential Moving Average) ─────────────────────────────────

const temaIndicator = {
  name: 'TEMA_CUSTOM',
  shortName: 'TEMA',
  calcParams: [20],
  figures: [
    { key: 'tema', title: 'TEMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const closes = dataList.map((d) => d.close);
    const ema1 = ema(closes, period);
    const ema2 = ema(ema1, period);
    const ema3 = ema(ema2, period);

    return dataList.map((_, i) => {
      if (isNaN(ema1[i]) || isNaN(ema2[i]) || isNaN(ema3[i])) return {};
      return { tema: 3 * ema1[i] - 3 * ema2[i] + ema3[i] };
    });
  },
};

// ── KAMA (Kaufman Adaptive Moving Average) ───────────────────────────────────

const kamaIndicator = {
  name: 'KAMA',
  shortName: 'KAMA',
  calcParams: [10, 2, 30],
  figures: [
    { key: 'kama', title: 'KAMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period, fastSC, slowSC] = indicator.calcParams;
    const result = [];

    const fastConst = 2 / (fastSC + 1);
    const slowConst = 2 / (slowSC + 1);

    let kamaValue = NaN;

    for (let i = 0; i < dataList.length; i++) {
      if (i < period) { result.push({}); continue; }

      if (isNaN(kamaValue)) {
        kamaValue = dataList[i].close;
        result.push({ kama: kamaValue });
        continue;
      }

      // Efficiency Ratio
      const direction = Math.abs(dataList[i].close - dataList[i - period].close);
      let volatility = 0;
      for (let j = i - period + 1; j <= i; j++) {
        volatility += Math.abs(dataList[j].close - dataList[j - 1].close);
      }
      const er = volatility === 0 ? 0 : direction / volatility;

      // Smoothing Constant
      const sc = Math.pow(er * (fastConst - slowConst) + slowConst, 2);

      kamaValue = kamaValue + sc * (dataList[i].close - kamaValue);
      result.push({ kama: kamaValue });
    }
    return result;
  },
};

// ── VWMA (Volume Weighted Moving Average) ────────────────────────────────────

const vwmaIndicator = {
  name: 'VWMA',
  shortName: 'VWMA',
  calcParams: [20],
  figures: [
    { key: 'vwma', title: 'VWMA: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];

    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) { result.push({}); continue; }

      let sumCV = 0;
      let sumV  = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const v = dataList[j].volume || 0;
        sumCV += dataList[j].close * v;
        sumV  += v;
      }
      result.push({ vwma: sumV === 0 ? dataList[i].close : sumCV / sumV });
    }
    return result;
  },
};

export default [
  wmaIndicator,
  hmaIndicator,
  demaIndicator,
  temaIndicator,
  kamaIndicator,
  vwmaIndicator,
];
