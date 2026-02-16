import { useMemo } from 'react';
import * as ti from '../utils/technicalIndicators.js';

/**
 * Computes technical indicators based on active indicator preferences.
 * Only computes indicators that are toggled on.
 *
 * @param {Array} data - stock history array [{date, open, high, low, close, volume}]
 * @param {Object} activeIndicators - { sma20: true, rsi: true, ... }
 * @returns {{ overlays: Object, subCharts: Object }}
 */
export default function useTechnicalIndicators(data, activeIndicators = {}) {
  return useMemo(() => {
    if (!data || !data.length) return { overlays: {}, subCharts: {} };

    const closes = data.map((d) => d.close);
    const bars = data.map((d) => ({
      high: d.high, low: d.low, close: d.close, volume: d.volume,
    }));
    const dates = data.map((d) => d.date);

    const overlays = {};
    const subCharts = {};

    // SMA overlays
    if (activeIndicators.sma10) overlays.sma10 = ti.sma(closes, 10).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    if (activeIndicators.sma20) overlays.sma20 = ti.sma(closes, 20).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    if (activeIndicators.sma50) overlays.sma50 = ti.sma(closes, 50).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    if (activeIndicators.sma100) overlays.sma100 = ti.sma(closes, 100).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    if (activeIndicators.sma200) overlays.sma200 = ti.sma(closes, 200).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);

    // EMA overlays
    if (activeIndicators.ema12) overlays.ema12 = ti.ema(closes, 12).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    if (activeIndicators.ema26) overlays.ema26 = ti.ema(closes, 26).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);

    // Bollinger
    if (activeIndicators.bollinger) {
      const bb = ti.bollingerBands(closes);
      overlays.bollinger = {
        upper: bb.upper.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
        middle: bb.middle.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
        lower: bb.lower.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
      };
    }

    // VWAP
    if (activeIndicators.vwap) {
      overlays.vwap = ti.vwap(bars).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    }

    // Sub-chart indicators
    if (activeIndicators.rsi) {
      subCharts.rsi = ti.rsi(closes).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    }

    if (activeIndicators.macd) {
      const m = ti.macd(closes);
      subCharts.macd = {
        macd: m.macd.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
        signal: m.signal.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
        histogram: m.histogram.map((v, i) => v != null ? { time: dates[i], value: v, color: v >= 0 ? '#10B981' : '#EF4444' } : null).filter(Boolean),
      };
    }

    if (activeIndicators.stochastic) {
      const s = ti.stochastic(bars);
      subCharts.stochastic = {
        k: s.k.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
        d: s.d.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean),
      };
    }

    if (activeIndicators.atr) {
      subCharts.atr = ti.atr(bars).map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);
    }

    if (activeIndicators.obv) {
      subCharts.obv = ti.obv(bars).map((v, i) => ({ time: dates[i], value: v }));
    }

    return { overlays, subCharts };
  }, [data, activeIndicators]);
}
