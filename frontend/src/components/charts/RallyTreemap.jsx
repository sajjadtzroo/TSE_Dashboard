import { useMemo, useState, useRef, useEffect } from 'react';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import rallyColors from '../../theme/rallyColors';

function interpolateColor(value, min, max) {
  // Clamp value
  const v = Math.max(min, Math.min(max, value));
  const mid = 0;
  if (v >= mid) {
    // green side: gray (#475569) -> green (#10B981)
    const t = max > mid ? (v - mid) / (max - mid) : 0;
    const r = Math.round(0x47 + t * (0x10 - 0x47));
    const g = Math.round(0x55 + t * (0xB9 - 0x55));
    const b = Math.round(0x69 + t * (0x81 - 0x69));
    return `rgb(${r},${g},${b})`;
  } else {
    // red side: gray (#475569) -> red (#EF4444)
    const t = min < mid ? (mid - v) / (mid - min) : 0;
    const r = Math.round(0x47 + t * (0xEF - 0x47));
    const g = Math.round(0x55 + t * (0x44 - 0x55));
    const b = Math.round(0x69 + t * (0x44 - 0x69));
    return `rgb(${r},${g},${b})`;
  }
}

export default function RallyTreemap({
  data,
  groupBy = 'sector_name_fa',
  sizeAccessor = 'market_cap',
  colorAccessor = 'close_change_pct',
  onCellClick,
  height = 500,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { leaves, minColor, maxColor } = useMemo(() => {
    if (!data || data.length === 0) return { leaves: [], minColor: -5, maxColor: 5 };

    // Group data by groupBy field
    const groups = {};
    data.forEach((d) => {
      const group = d[groupBy] || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(d);
    });

    const root = hierarchy({
      name: 'root',
      children: Object.entries(groups).map(([name, items]) => ({
        name,
        children: items.map((item) => ({
          name: item.symbol,
          data: item,
          value: Math.abs(item[sizeAccessor] || 1),
        })),
      })),
    }).sum((d) => d.value || 0);

    const tm = treemap()
      .size([width, height])
      .padding(2)
      .paddingTop(16)
      .tile(treemapSquarify);

    tm(root);

    const allValues = data.map((d) => d[colorAccessor] || 0);
    const mn = Math.min(...allValues, -1);
    const mx = Math.max(...allValues, 1);

    return { leaves: root.leaves(), minColor: mn, maxColor: mx };
  }, [data, groupBy, sizeAccessor, colorAccessor, width, height]);

  // Group headers
  const groupHeaders = useMemo(() => {
    if (!leaves.length) return [];
    const seen = new Map();
    leaves.forEach((leaf) => {
      const parent = leaf.parent;
      if (parent && !seen.has(parent.data.name)) {
        seen.set(parent.data.name, { x: parent.x0, y: parent.y0, name: parent.data.name });
      }
    });
    return [...seen.values()];
  }, [leaves]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Group headers */}
        {groupHeaders.map((g) => (
          <text
            key={g.name}
            x={g.x + 3}
            y={g.y + 12}
            fill={rallyColors.textSecondary}
            fontSize={10}
            fontWeight={600}
          >
            {g.name.length > 20 ? g.name.slice(0, 20) + '...' : g.name}
          </text>
        ))}
        {/* Leaf cells */}
        {leaves.map((leaf, i) => {
          const d = leaf.data.data;
          if (!d) return null;
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const colorValue = d[colorAccessor] || 0;
          const fill = interpolateColor(colorValue, minColor, maxColor);
          const showLabel = w > 40 && h > 20;

          return (
            <g
              key={d.symbol || i}
              style={{ cursor: onCellClick ? 'pointer' : 'default' }}
              onClick={() => onCellClick && onCellClick(d)}
              onMouseEnter={(e) => setTooltip({
                x: e.clientX,
                y: e.clientY,
                data: d,
              })}
              onMouseMove={(e) => setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                fill={fill}
                rx={2}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1}
              />
              {showLabel && (
                <>
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 - (h > 35 ? 5 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={rallyColors.textPrimary}
                    fontSize={w > 70 ? 12 : 10}
                    fontWeight={600}
                  >
                    {d.symbol}
                  </text>
                  {h > 35 && (
                    <text
                      x={leaf.x0 + w / 2}
                      y={leaf.y0 + h / 2 + 10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(241, 245, 249, 0.7)"
                      fontSize={w > 70 ? 10 : 8}
                    >
                      {colorValue > 0 ? '+' : ''}{colorValue?.toFixed(2)}%
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      {/* Tooltip */}
      {tooltip && tooltip.data && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: rallyColors.elevated,
            border: `1px solid ${rallyColors.border}`,
            borderRadius: 6,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 1000,
            fontSize: 12,
            color: rallyColors.textPrimary,
            maxWidth: 250,
            boxShadow: rallyColors.glassShadow,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.data.symbol}</div>
          {tooltip.data.name_fa && <div style={{ color: rallyColors.textSecondary, marginBottom: 4 }}>{tooltip.data.name_fa}</div>}
          <div>
            تغییر:{' '}
            <span style={{ color: (tooltip.data[colorAccessor] || 0) >= 0 ? rallyColors.green : rallyColors.red }}>
              {(tooltip.data[colorAccessor] || 0) > 0 ? '+' : ''}{(tooltip.data[colorAccessor] || 0).toFixed(2)}%
            </span>
          </div>
          {tooltip.data.market_cap && (
            <div>ارزش بازار: {(tooltip.data.market_cap / 1e9).toFixed(1)}B</div>
          )}
        </div>
      )}
    </div>
  );
}
