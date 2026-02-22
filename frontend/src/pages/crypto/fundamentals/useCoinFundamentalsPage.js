import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import jalaali from 'jalaali-js';
import { useCryptoHistory } from '../../../hooks/useCryptoData';
import { METRIC_DEFS, HOT_METRICS } from './cryptoFundamentalsConfig';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

/** Convert "YYYY-MM-DD" → Jalali { jy, jm, jd } */
function dateToJalali(dateStr) {
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  return jalaali.toJalaali(gy, gm, gd);
}

/** Jalali year-month key, e.g. "1404-11" */
function jalaliMonthKey(j) {
  return `${j.jy}-${String(j.jm).padStart(2, '0')}`;
}

/**
 * Hook for the crypto fundamentals page.
 * Fetches daily OHLCV and aggregates into Jalali-monthly metrics.
 */
export default function useCoinFundamentalsPage() {
  const { symbol } = useParams();
  const [windowMonths, setWindowMonths] = useState('12');

  const limit = Number(windowMonths) * 31;
  const { data: rawHistory, isLoading } = useCryptoHistory(symbol, {
    interval: '1day',
    limit,
  });

  // Compute monthly aggregated metrics from daily OHLCV data
  const monthMetrics = useMemo(() => {
    if (!rawHistory?.length) return [];

    // Normalize raw data
    const days = rawHistory
      .map((c) => ({
        date: (c.open_time || '').split('T')[0],
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      }))
      .filter((d) => d.date && !isNaN(d.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!days.length) return [];

    // Group by Jalali year-month
    const monthMap = new Map();
    for (const day of days) {
      const j = dateToJalali(day.date);
      const key = jalaliMonthKey(j);
      if (!monthMap.has(key)) monthMap.set(key, { jy: j.jy, jm: j.jm, days: [] });
      monthMap.get(key).days.push(day);
    }

    // Compute metrics per Jalali month
    const monthKeys = [...monthMap.keys()].sort();
    const result = [];

    for (let mi = 0; mi < monthKeys.length; mi++) {
      const { jy, jm, days: monthDays } = monthMap.get(monthKeys[mi]);
      const lastClose = monthDays[monthDays.length - 1].close;
      const prevClose = mi > 0
        ? monthMap.get(monthKeys[mi - 1]).days.at(-1).close
        : null;

      // Daily returns for volatility
      const dailyReturns = [];
      for (let i = 1; i < monthDays.length; i++) {
        const prev = monthDays[i - 1].close;
        if (prev > 0) dailyReturns.push((monthDays[i].close - prev) / prev);
      }

      // Volatility: annualized stddev of daily returns (365 for crypto)
      let volatility = null;
      if (dailyReturns.length > 1) {
        const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
        volatility = Math.sqrt(variance) * Math.sqrt(365) * 100;
      }

      // Max drawdown within the month (using high for peak, low for trough)
      let peak = monthDays[0].high;
      let maxDD = 0;
      for (const day of monthDays) {
        if (day.high > peak) peak = day.high;
        const dd = (peak - day.low) / peak;
        if (dd > maxDD) maxDD = dd;
      }

      const totalVol = monthDays.reduce((s, d) => s + d.volume, 0);

      const jalaliLabel = `${JALALI_MONTHS[jm - 1]} ${jy}`;

      result.push({
        key: monthKeys[mi],
        jalaliLabel,
        dayCount: monthDays.length,
        close: lastClose,
        return_pct: prevClose != null && prevClose !== 0
          ? ((lastClose - prevClose) / prevClose) * 100
          : null,
        high: monthDays.reduce((max, d) => Math.max(max, d.high), -Infinity),
        low: monthDays.reduce((min, d) => Math.min(min, d.low), Infinity),
        avg_volume: totalVol / monthDays.length,
        total_volume: totalVol,
        volatility,
        max_drawdown: maxDD > 0 ? -maxDD * 100 : 0,
      });
    }

    return result;
  }, [rawHistory]);

  // Derive table periods + rows from monthMetrics
  const { periods, rows } = useMemo(() => {
    if (!monthMetrics.length) return { periods: [], rows: [] };

    // Build periods (columns) — newest first for RTL display
    const periodDefs = [...monthMetrics].reverse().map((m) => ({
      id: m.key,
      jalaliLabel: m.jalaliLabel,
      dayCount: m.dayCount,
    }));

    // Build rows (one per metric)
    const metricRows = METRIC_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      format: def.format,
      isHot: HOT_METRICS.has(def.key),
      values: [...monthMetrics].reverse().map((m) => m[def.key] ?? null),
    }));

    return { periods: periodDefs, rows: metricRows };
  }, [monthMetrics]);

  return { symbol, windowMonths, setWindowMonths, monthMetrics, periods, rows, isLoading };
}
