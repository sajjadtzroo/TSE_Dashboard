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

    const toTimeSeries = (arr) =>
      arr.map((v, i) => v != null ? { time: dates[i], value: v } : null).filter(Boolean);

    // ── SMA overlays ────────────────────────────────────────────────────
    if (activeIndicators.sma10) overlays.sma10 = toTimeSeries(ti.sma(closes, 10));
    if (activeIndicators.sma20) overlays.sma20 = toTimeSeries(ti.sma(closes, 20));
    if (activeIndicators.sma50) overlays.sma50 = toTimeSeries(ti.sma(closes, 50));
    if (activeIndicators.sma100) overlays.sma100 = toTimeSeries(ti.sma(closes, 100));
    if (activeIndicators.sma200) overlays.sma200 = toTimeSeries(ti.sma(closes, 200));

    // ── EMA overlays ────────────────────────────────────────────────────
    if (activeIndicators.ema12) overlays.ema12 = toTimeSeries(ti.ema(closes, 12));
    if (activeIndicators.ema26) overlays.ema26 = toTimeSeries(ti.ema(closes, 26));
    if (activeIndicators.ema50) overlays.ema50 = toTimeSeries(ti.ema(closes, 50));
    if (activeIndicators.ema200) overlays.ema200 = toTimeSeries(ti.ema(closes, 200));

    // ── Bollinger ───────────────────────────────────────────────────────
    if (activeIndicators.bollinger) {
      const bb = ti.bollingerBands(closes);
      overlays.bollinger = {
        upper: toTimeSeries(bb.upper),
        middle: toTimeSeries(bb.middle),
        lower: toTimeSeries(bb.lower),
      };
    }

    // ── VWAP ────────────────────────────────────────────────────────────
    if (activeIndicators.vwap) {
      overlays.vwap = toTimeSeries(ti.vwap(bars));
    }

    // ── Ichimoku Cloud ──────────────────────────────────────────────────
    if (activeIndicators.ichimoku) {
      const ich = ti.ichimoku(bars);
      overlays.ichimoku = {
        tenkan: toTimeSeries(ich.tenkan),
        kijun: toTimeSeries(ich.kijun),
        senkouA: toTimeSeries(ich.senkouA),
        senkouB: toTimeSeries(ich.senkouB),
        chikou: toTimeSeries(ich.chikou),
      };
    }

    // ── RSI ─────────────────────────────────────────────────────────────
    if (activeIndicators.rsi) {
      subCharts.rsi = toTimeSeries(ti.rsi(closes));
    }

    // ── MACD ────────────────────────────────────────────────────────────
    if (activeIndicators.macd) {
      const m = ti.macd(closes);
      subCharts.macd = {
        macd: toTimeSeries(m.macd),
        signal: toTimeSeries(m.signal),
        histogram: m.histogram.map((v, i) => v != null ? { time: dates[i], value: v, color: v >= 0 ? '#10B981' : '#EF4444' } : null).filter(Boolean),
      };
    }

    // ── Stochastic ──────────────────────────────────────────────────────
    if (activeIndicators.stochastic) {
      const s = ti.stochastic(bars);
      subCharts.stochastic = {
        k: toTimeSeries(s.k),
        d: toTimeSeries(s.d),
      };
    }

    // ── Williams %R ─────────────────────────────────────────────────────
    if (activeIndicators.williamsR) {
      subCharts.williamsR = toTimeSeries(ti.williamsR(bars));
    }

    // ── CCI ─────────────────────────────────────────────────────────────
    if (activeIndicators.cci) {
      subCharts.cci = toTimeSeries(ti.cci(bars));
    }

    // ── ROC ─────────────────────────────────────────────────────────────
    if (activeIndicators.roc) {
      subCharts.roc = toTimeSeries(ti.roc(closes));
    }

    // ── ADX ─────────────────────────────────────────────────────────────
    if (activeIndicators.adx) {
      const a = ti.adx(bars);
      subCharts.adx = {
        adx: toTimeSeries(a.adx),
        plusDI: toTimeSeries(a.plusDI),
        minusDI: toTimeSeries(a.minusDI),
      };
    }

    // ── MFI ─────────────────────────────────────────────────────────────
    if (activeIndicators.mfi) {
      subCharts.mfi = toTimeSeries(ti.mfi(bars));
    }

    // ── ATR ─────────────────────────────────────────────────────────────
    if (activeIndicators.atr) {
      subCharts.atr = toTimeSeries(ti.atr(bars));
    }

    // ── OBV ─────────────────────────────────────────────────────────────
    if (activeIndicators.obv) {
      subCharts.obv = ti.obv(bars).map((v, i) => ({ time: dates[i], value: v }));
    }

    return { overlays, subCharts };
  }, [data, activeIndicators]);
}
