import { COMPARISON_COLORS } from '../constants/chartColors';

/**
 * Normalize a map of { symbol: history[] } into chart series showing % change from first day.
 * @param {Record<string, Array>} chartData  — keyed by symbol
 * @param {(item: any) => string} dateAccessor — extracts the x-axis label from a history entry
 * @param {(item: any) => number} closeAccessor — extracts the close price from a history entry
 * @param {string[]} [colors] — optional color scale (defaults to COMPARISON_COLORS)
 * @returns {Array<{symbol: string, data: Array<{x: string, y: number}>, color: string}>}
 */
export function normalizeChartSeries(chartData, dateAccessor, closeAccessor, colors = COMPARISON_COLORS) {
  return Object.entries(chartData).map(([symbol, history], idx) => {
    if (!history || history.length === 0) return null;
    const basePrice = Number(closeAccessor(history[0]));
    const data = history.map((h) => ({
      x: dateAccessor(h),
      y: basePrice ? Number(((Number(closeAccessor(h)) - basePrice) / basePrice * 100).toFixed(2)) : 0,
    }));
    return { symbol, data, color: colors[idx % colors.length] };
  }).filter(Boolean);
}

/**
 * Catmull-Rom spline interpolation — produces a smooth SVG path through all points.
 * @param {[number, number][]} pts - Array of [x, y] coordinate pairs
 * @returns {string} SVG path data string (M...C...)
 */
export function catmullRom(pts) {
  const d = [`M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
  }
  return d.join(' ');
}
