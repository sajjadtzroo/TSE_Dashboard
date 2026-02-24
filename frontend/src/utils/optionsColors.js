/** Delta heatmap color: green for positive (calls), red for negative (puts) */
export function deltaColor(delta, type) {
  if (delta == null) return 'transparent';
  const abs = Math.abs(delta);
  if (type === 'call') {
    return `rgba(34, 197, 94, ${(abs * 0.35).toFixed(2)})`;
  }
  return `rgba(239, 68, 68, ${(abs * 0.35).toFixed(2)})`;
}

/** IV surface heatmap color: blue (low IV) → yellow → red (high IV) */
export function ivSurfaceColor(iv, minIV, maxIV) {
  if (iv == null || maxIV <= minIV) return 'transparent';
  const t = (iv - minIV) / (maxIV - minIV);
  if (t < 0.5) {
    const r = Math.round(59 + (234 - 59) * t * 2);
    const g = Math.round(130 + (179 - 130) * t * 2);
    const b = Math.round(246 + (8 - 246) * t * 2);
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  }
  const t2 = (t - 0.5) * 2;
  const r = Math.round(234 + (239 - 234) * t2);
  const g = Math.round(179 + (68 - 179) * t2);
  const b = Math.round(8 + (68 - 8) * t2);
  return `rgba(${r}, ${g}, ${b}, 0.35)`;
}

/** Sensitivity matrix diverging color: red (low) → white → green (high) */
export function sensHeatColor(val, allCells) {
  if (val == null) return 'transparent';
  const min = Math.min(...allCells);
  const max = Math.max(...allCells);
  if (max === min) return 'transparent';
  const t = (val - min) / (max - min);
  if (t < 0.5) {
    const alpha = ((0.5 - t) * 0.6).toFixed(2);
    return `rgba(239, 68, 68, ${alpha})`;
  }
  const alpha = ((t - 0.5) * 0.6).toFixed(2);
  return `rgba(34, 197, 94, ${alpha})`;
}
