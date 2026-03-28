/**
 * Custom volatility indicators for KLineChart.
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

// ── ATR (Average True Range) ─────────────────────────────────────────────────

const atrIndicator = {
  name: 'ATR_CUSTOM',
  shortName: 'ATR',
  calcParams: [14],
  figures: [
    { key: 'atr', title: 'ATR: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    const trArr = [];

    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) {
        trArr.push(dataList[i].high - dataList[i].low);
      } else {
        const prevClose = dataList[i - 1].close;
        trArr.push(Math.max(
          dataList[i].high - dataList[i].low,
          Math.abs(dataList[i].high - prevClose),
          Math.abs(dataList[i].low - prevClose),
        ));
      }

      if (i < period - 1) { result.push({}); continue; }

      if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += trArr[j];
        result.push({ atr: sum / period });
      } else {
        const prevAtr = result[i - 1].atr;
        result.push({ atr: (prevAtr * (period - 1) + trArr[i]) / period });
      }
    }
    return result;
  },
};

// ── Keltner Channels ─────────────────────────────────────────────────────────

const keltnerIndicator = {
  name: 'KELTNER',
  shortName: 'Keltner',
  calcParams: [20, 10, 1.5],
  figures: [
    { key: 'mid',   title: 'Mid: ',   type: 'line' },
    { key: 'upper', title: 'Upper: ', type: 'line' },
    { key: 'lower', title: 'Lower: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [emaPeriod, atrPeriod, multiplier] = indicator.calcParams;
    const result = [];

    // EMA of close
    const closes = dataList.map((d) => d.close);
    const emaValues = ema(closes, emaPeriod);

    // ATR via Wilder smoothing
    const trArr = new Array(dataList.length).fill(0);
    const atr   = new Array(dataList.length).fill(NaN);
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
      if (i === atrPeriod - 1) {
        let sum = 0;
        for (let j = 0; j < atrPeriod; j++) sum += trArr[j];
        atr[i] = sum / atrPeriod;
      } else if (i >= atrPeriod) {
        atr[i] = (atr[i - 1] * (atrPeriod - 1) + trArr[i]) / atrPeriod;
      }
    }

    for (let i = 0; i < dataList.length; i++) {
      if (isNaN(emaValues[i]) || isNaN(atr[i])) { result.push({}); continue; }
      result.push({
        mid:   emaValues[i],
        upper: emaValues[i] + multiplier * atr[i],
        lower: emaValues[i] - multiplier * atr[i],
      });
    }
    return result;
  },
};

// ── Donchian Channel ─────────────────────────────────────────────────────────

const donchianIndicator = {
  name: 'DONCHIAN',
  shortName: 'Donchian',
  calcParams: [20],
  figures: [
    { key: 'upper', title: 'Upper: ', type: 'line' },
    { key: 'lower', title: 'Lower: ', type: 'line' },
    { key: 'mid',   title: 'Mid: ',   type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) { result.push({}); continue; }
      let highest = -Infinity;
      let lowest  = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (dataList[j].high > highest) highest = dataList[j].high;
        if (dataList[j].low < lowest) lowest = dataList[j].low;
      }
      result.push({
        upper: highest,
        lower: lowest,
        mid:   (highest + lowest) / 2,
      });
    }
    return result;
  },
};

// ── Historical Volatility ────────────────────────────────────────────────────

const histVolIndicator = {
  name: 'HISTVOL',
  shortName: 'HistVol',
  calcParams: [20],
  figures: [
    { key: 'hv', title: 'HV: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    const logReturns = new Array(dataList.length).fill(NaN);

    for (let i = 1; i < dataList.length; i++) {
      if (dataList[i - 1].close > 0 && dataList[i].close > 0) {
        logReturns[i] = Math.log(dataList[i].close / dataList[i - 1].close);
      }
    }

    for (let i = 0; i < dataList.length; i++) {
      if (i < period) { result.push({}); continue; }

      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (!isNaN(logReturns[j])) { sum += logReturns[j]; count++; }
      }
      if (count < 2) { result.push({}); continue; }

      const mean = sum / count;
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (!isNaN(logReturns[j])) {
          variance += (logReturns[j] - mean) * (logReturns[j] - mean);
        }
      }
      variance /= (count - 1);
      // Annualize: * sqrt(252), express as percentage
      const hv = Math.sqrt(variance) * Math.sqrt(252) * 100;
      result.push({ hv });
    }
    return result;
  },
};

// ── Acceleration Bands ───────────────────────────────────────────────────────

const accBandsIndicator = {
  name: 'ACCBANDS',
  shortName: 'AccBands',
  calcParams: [20],
  figures: [
    { key: 'upper', title: 'Upper: ', type: 'line' },
    { key: 'lower', title: 'Lower: ', type: 'line' },
    { key: 'mid',   title: 'Mid: ',   type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;

    // Raw upper/lower band values before EMA
    const rawUpper = new Array(dataList.length).fill(NaN);
    const rawLower = new Array(dataList.length).fill(NaN);
    const closes   = dataList.map((d) => d.close);

    for (let i = 0; i < dataList.length; i++) {
      const h = dataList[i].high;
      const l = dataList[i].low;
      const denom = h + l;
      if (denom === 0) continue;
      const factor = 4 * (h - l) / denom;
      rawUpper[i] = h * (1 + factor);
      rawLower[i] = l * (1 - factor);
    }

    const emaUpper = ema(rawUpper, period);
    const emaLower = ema(rawLower, period);
    const emaMid   = ema(closes, period);

    const result = [];
    for (let i = 0; i < dataList.length; i++) {
      if (isNaN(emaUpper[i]) || isNaN(emaLower[i]) || isNaN(emaMid[i])) {
        result.push({});
        continue;
      }
      result.push({
        upper: emaUpper[i],
        lower: emaLower[i],
        mid:   emaMid[i],
      });
    }
    return result;
  },
};

export default [
  atrIndicator,
  keltnerIndicator,
  donchianIndicator,
  histVolIndicator,
  accBandsIndicator,
];
