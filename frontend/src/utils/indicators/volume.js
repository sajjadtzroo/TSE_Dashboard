/**
 * Custom volume indicators for KLineChart.
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

// ── Accumulation/Distribution Line ───────────────────────────────────────────

const adlIndicator = {
  name: 'ADL',
  shortName: 'A/D Line',
  calcParams: [],
  figures: [
    { key: 'ad', title: 'A/D: ', type: 'line' },
  ],
  calc: (dataList) => {
    const result = [];
    let cumAd = 0;

    for (let i = 0; i < dataList.length; i++) {
      const high  = dataList[i].high;
      const low   = dataList[i].low;
      const close = dataList[i].close;
      const vol   = dataList[i].volume || 0;

      let clv = 0;
      if (high !== low) {
        clv = ((close - low) - (high - close)) / (high - low);
      }
      cumAd += clv * vol;
      result.push({ ad: cumAd });
    }
    return result;
  },
};

// ── Chaikin Money Flow ───────────────────────────────────────────────────────

const cmfIndicator = {
  name: 'CMF',
  shortName: 'CMF',
  calcParams: [20],
  figures: [
    { key: 'cmf', title: 'CMF: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];
    const mfv = []; // money flow volume
    const vol = []; // raw volumes

    for (let i = 0; i < dataList.length; i++) {
      const high  = dataList[i].high;
      const low   = dataList[i].low;
      const close = dataList[i].close;
      const v     = dataList[i].volume || 0;

      let clv = 0;
      if (high !== low) {
        clv = ((close - low) - (high - close)) / (high - low);
      }
      mfv.push(clv * v);
      vol.push(v);

      if (i < period - 1) { result.push({}); continue; }

      let sumMfv = 0;
      let sumVol = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumMfv += mfv[j];
        sumVol += vol[j];
      }
      result.push({ cmf: sumVol === 0 ? 0 : sumMfv / sumVol });
    }
    return result;
  },
};

// ── Force Index ──────────────────────────────────────────────────────────────

const forceIndicator = {
  name: 'FORCE',
  shortName: 'Force',
  calcParams: [13],
  figures: [
    { key: 'force', title: 'Force: ', type: 'line' },
  ],
  calc: (dataList, indicator) => {
    const [period] = indicator.calcParams;
    const result = [];

    // Raw force: (close - prevClose) * volume
    const rawForce = new Array(dataList.length).fill(NaN);
    for (let i = 1; i < dataList.length; i++) {
      rawForce[i] = (dataList[i].close - dataList[i - 1].close) * (dataList[i].volume || 0);
    }

    const smoothed = ema(rawForce, period);

    for (let i = 0; i < dataList.length; i++) {
      result.push({
        force: isNaN(smoothed[i]) ? undefined : smoothed[i],
      });
    }
    return result;
  },
};

export default [
  adlIndicator,
  cmfIndicator,
  forceIndicator,
];
