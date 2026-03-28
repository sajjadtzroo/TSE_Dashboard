/**
 * Custom momentum indicators for KLineChart.
 * Each export conforms to the registerIndicator spec:
 *   { name, shortName, calcParams, figures, calc }
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simple Moving Average over `period` values from an array. */
function sma(values, period) {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (isNaN(values[i])) continue;
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

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

// ── Stochastic RSI ───────────────────────────────────────────────────────────

const stochRsiIndicator = {
  name: 'STOCHRSI',
  shortName: 'StochRSI',
  calcParams: [14, 14, 3, 3],
  figures: [
    { key: 'k', title: 'K: ', type: 'line' },
    { key: 'd', title: 'D: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [rsiPeriod, stochPeriod, kSmooth, dSmooth] = indicator.calcParams;
    const result = [];

    // Step 1: compute RSI
    const rsiValues = new Array(dataList.length).fill(NaN);
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) { result.push({}); continue; }
      const change = dataList[i].close - dataList[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      if (i < rsiPeriod) {
        avgGain += gain;
        avgLoss += loss;
        result.push({});
        if (i === rsiPeriod - 1) {
          avgGain /= rsiPeriod;
          avgLoss /= rsiPeriod;
          rsiValues[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        }
        continue;
      }
      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      rsiValues[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      result.push({});
    }

    // Step 2: Stochastic of RSI
    const rawK = new Array(dataList.length).fill(NaN);
    for (let i = 0; i < dataList.length; i++) {
      if (isNaN(rsiValues[i]) || i < rsiPeriod - 1 + stochPeriod - 1) continue;
      let minRsi = Infinity;
      let maxRsi = -Infinity;
      for (let j = i - stochPeriod + 1; j <= i; j++) {
        if (isNaN(rsiValues[j])) { minRsi = NaN; break; }
        if (rsiValues[j] < minRsi) minRsi = rsiValues[j];
        if (rsiValues[j] > maxRsi) maxRsi = rsiValues[j];
      }
      if (isNaN(minRsi)) continue;
      rawK[i] = maxRsi === minRsi ? 50 : ((rsiValues[i] - minRsi) / (maxRsi - minRsi)) * 100;
    }

    // Step 3: smooth K, then D = SMA(K)
    const kLine = sma(rawK, kSmooth);
    const dLine = sma(kLine, dSmooth);

    for (let i = 0; i < dataList.length; i++) {
      result[i] = {
        k: isNaN(kLine[i]) ? undefined : kLine[i],
        d: isNaN(dLine[i]) ? undefined : dLine[i],
      };
    }
    return result;
  },
};

// ── Aroon ────────────────────────────────────────────────────────────────────

const aroonIndicator = {
  name: 'AROON',
  shortName: 'Aroon',
  calcParams: [25],
  figures: [
    { key: 'up', title: 'Up: ', type: 'line' },
    { key: 'down', title: 'Down: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    for (let i = 0; i < dataList.length; i++) {
      if (i < period) { result.push({}); continue; }
      let highIdx = i;
      let lowIdx = i;
      for (let j = i - period; j <= i; j++) {
        if (dataList[j].high > dataList[highIdx].high) highIdx = j;
        if (dataList[j].low < dataList[lowIdx].low) lowIdx = j;
      }
      result.push({
        up:   ((period - (i - highIdx)) / period) * 100,
        down: ((period - (i - lowIdx)) / period) * 100,
      });
    }
    return result;
  },
};

// ── Aroon Oscillator ─────────────────────────────────────────────────────────

const aroonOscIndicator = {
  name: 'AROONOSC',
  shortName: 'AroonOsc',
  calcParams: [25],
  figures: [
    { key: 'aroonOsc', title: 'AroonOsc: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    for (let i = 0; i < dataList.length; i++) {
      if (i < period) { result.push({}); continue; }
      let highIdx = i;
      let lowIdx = i;
      for (let j = i - period; j <= i; j++) {
        if (dataList[j].high > dataList[highIdx].high) highIdx = j;
        if (dataList[j].low < dataList[lowIdx].low) lowIdx = j;
      }
      const up   = ((period - (i - highIdx)) / period) * 100;
      const down = ((period - (i - lowIdx)) / period) * 100;
      result.push({ aroonOsc: up - down });
    }
    return result;
  },
};

// ── Ultimate Oscillator ──────────────────────────────────────────────────────

const ultimateOscillator = {
  name: 'UO',
  shortName: 'UO',
  calcParams: [7, 14, 28],
  figures: [
    { key: 'uo', title: 'UO: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [p1, p2, p3] = indicator.calcParams;
    const maxPeriod = Math.max(p1, p2, p3);
    const result = [];
    const bp = [];
    const tr = [];

    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) {
        bp.push(0);
        tr.push(0);
        result.push({});
        continue;
      }
      const prevClose = dataList[i - 1].close;
      const low = dataList[i].low;
      const high = dataList[i].high;
      const close = dataList[i].close;
      bp.push(close - Math.min(low, prevClose));
      tr.push(Math.max(high, prevClose) - Math.min(low, prevClose));

      if (i < maxPeriod) { result.push({}); continue; }

      let bpSum1 = 0, trSum1 = 0;
      let bpSum2 = 0, trSum2 = 0;
      let bpSum3 = 0, trSum3 = 0;
      for (let j = i - p1 + 1; j <= i; j++) { bpSum1 += bp[j]; trSum1 += tr[j]; }
      for (let j = i - p2 + 1; j <= i; j++) { bpSum2 += bp[j]; trSum2 += tr[j]; }
      for (let j = i - p3 + 1; j <= i; j++) { bpSum3 += bp[j]; trSum3 += tr[j]; }

      const avg1 = trSum1 === 0 ? 0 : bpSum1 / trSum1;
      const avg2 = trSum2 === 0 ? 0 : bpSum2 / trSum2;
      const avg3 = trSum3 === 0 ? 0 : bpSum3 / trSum3;

      result.push({ uo: 100 * (4 * avg1 + 2 * avg2 + avg3) / 7 });
    }
    return result;
  },
};

// ── Money Flow Index ─────────────────────────────────────────────────────────

const mfiIndicator = {
  name: 'MFI',
  shortName: 'MFI',
  calcParams: [14],
  figures: [
    { key: 'mfi', title: 'MFI: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    const tp = [];
    const mf = [];

    for (let i = 0; i < dataList.length; i++) {
      const typicalPrice = (dataList[i].high + dataList[i].low + dataList[i].close) / 3;
      tp.push(typicalPrice);
      mf.push(typicalPrice * (dataList[i].volume || 0));

      if (i < period) { result.push({}); continue; }

      let posMF = 0;
      let negMF = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (tp[j] > tp[j - 1]) {
          posMF += mf[j];
        } else if (tp[j] < tp[j - 1]) {
          negMF += mf[j];
        }
      }

      const mfiVal = negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF);
      result.push({ mfi: mfiVal });
    }
    return result;
  },
};

// ── True Strength Index ──────────────────────────────────────────────────────

const tsiIndicator = {
  name: 'TSI',
  shortName: 'TSI',
  calcParams: [25, 13, 7],
  figures: [
    { key: 'tsi', title: 'TSI: ', type: 'line' },
    { key: 'signal', title: 'Signal: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [longPeriod, shortPeriod, signalPeriod] = indicator.calcParams;
    const result = [];

    // Momentum and absolute momentum
    const mom = new Array(dataList.length).fill(NaN);
    const absMom = new Array(dataList.length).fill(NaN);
    for (let i = 1; i < dataList.length; i++) {
      mom[i] = dataList[i].close - dataList[i - 1].close;
      absMom[i] = Math.abs(mom[i]);
    }

    // Double smooth: EMA(EMA(x, long), short)
    const emaLongMom    = ema(mom, longPeriod);
    const dsMom         = ema(emaLongMom, shortPeriod);
    const emaLongAbsMom = ema(absMom, longPeriod);
    const dsAbsMom      = ema(emaLongAbsMom, shortPeriod);

    const tsiValues = new Array(dataList.length).fill(NaN);
    for (let i = 0; i < dataList.length; i++) {
      if (isNaN(dsMom[i]) || isNaN(dsAbsMom[i]) || dsAbsMom[i] === 0) continue;
      tsiValues[i] = (dsMom[i] / dsAbsMom[i]) * 100;
    }

    const signalLine = ema(tsiValues, signalPeriod);

    for (let i = 0; i < dataList.length; i++) {
      result.push({
        tsi:    isNaN(tsiValues[i]) ? undefined : tsiValues[i],
        signal: isNaN(signalLine[i]) ? undefined : signalLine[i],
      });
    }
    return result;
  },
};

// ── Detrended Price Oscillator ───────────────────────────────────────────────

const dpoIndicator = {
  name: 'DPO',
  shortName: 'DPO',
  calcParams: [20],
  figures: [
    { key: 'dpo', title: 'DPO: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    const shift = Math.floor(period / 2) + 1;

    // Compute SMA of close prices
    const closes = dataList.map((d) => d.close);
    const smaValues = sma(closes, period);

    for (let i = 0; i < dataList.length; i++) {
      // DPO looks back `shift` bars to compare against the SMA
      const smaIdx = i - shift;
      if (smaIdx < 0 || isNaN(smaValues[i])) {
        result.push({});
        continue;
      }
      result.push({ dpo: dataList[i].close - smaValues[i] });
    }
    return result;
  },
};

export default [
  stochRsiIndicator,
  aroonIndicator,
  aroonOscIndicator,
  ultimateOscillator,
  mfiIndicator,
  tsiIndicator,
  dpoIndicator,
];
