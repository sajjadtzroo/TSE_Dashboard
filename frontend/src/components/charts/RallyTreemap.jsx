import { useMemo, useState, useRef, useEffect } from 'react';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import rallyColors from '../../theme/rallyColors';
import { interpolateColor } from '../../utils/colorUtils';
import { toPersianNum } from '../../utils/formatUtils';
import TreemapTooltip from './shared/TreemapTooltip';

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
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
              onMouseMove={(e) => setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                setTooltip({ x: touch.clientX, y: touch.clientY, data: d });
              }}
              onTouchEnd={() => setTooltip(null)}
            >
              <rect
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                fill={fill}
                rx={4}
                stroke={onCellClick ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)'}
                strokeWidth={1}
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Hover effect overlay */}
              {onCellClick && (
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={w}
                  height={h}
                  rx={4}
                  fill="transparent"
                  className="heatmap-cell-hover"
                  style={{
                    transition: 'fill 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('fill', 'rgba(255,255,255,0.08)');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('fill', 'transparent');
                  }}
                />
              )}
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
                      fill="rgba(241, 245, 249, 0.85)"
                      fontSize={w > 70 ? 11 : 9}
                      fontWeight={500}
                    >
                      {toPersianNum(colorValue > 0 ? '+' : '')}{toPersianNum(colorValue?.toFixed(2))}٪
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      <TreemapTooltip tooltip={tooltip} colorAccessor={colorAccessor} />
    </div>
  );
}
