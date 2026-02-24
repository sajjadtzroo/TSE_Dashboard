import { useMemo, useState, useRef, useEffect } from 'react';
import { Portal } from '@mantine/core';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import rallyColors from '../../theme/rallyColors';
import { interpolateColor, clampColorRange, getTextColorForBg } from '../../utils/colorUtils';
import { toPersianNum } from '../../utils/formatUtils';
import TreemapTooltip from './shared/TreemapTooltip';

/** Determine label tier based on cell dimensions */
function getLabelTier(w, h) {
  if (w >= 70 && h >= 40) return 3;
  if (w >= 40 && h >= 28) return 2;
  if (w >= 24 && h >= 16) return 1;
  return 0;
}

export default function RallyTreemap({
  data,
  groupBy = 'sector_name_fa',
  sizeAccessor = 'market_cap',
  colorAccessor = 'close_change_pct',
  onCellClick,
  height = 500,
  logScale = false,
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
          value: logScale
            ? Math.log1p(Math.abs(item[sizeAccessor] || 1))
            : Math.abs(item[sizeAccessor] || 1),
        })),
      })),
    }).sum((d) => d.value || 0);

    const tm = treemap()
      .size([width, height])
      .padding(3)
      .paddingTop(18)
      .tile(treemapSquarify);

    tm(root);

    const allValues = data.map((d) => d[colorAccessor] || 0);
    const { min: mn, max: mx } = clampColorRange(allValues);

    return { leaves: root.leaves(), minColor: mn, maxColor: mx };
  }, [data, groupBy, sizeAccessor, colorAccessor, width, height, logScale]);

  const groupHeaders = useMemo(() => {
    if (!leaves.length) return [];
    const seen = new Map();
    leaves.forEach((leaf) => {
      const parent = leaf.parent;
      if (parent && !seen.has(parent.data.name)) {
        const pw = parent.x1 - parent.x0;
        const ph = parent.y1 - parent.y0;
        seen.set(parent.data.name, { x: parent.x0, y: parent.y0, w: pw, h: ph, name: parent.data.name });
      }
    });
    return [...seen.values()];
  }, [leaves]);

  const TEXT_SHADOW = '0 1px 2px rgba(0,0,0,0.5)';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {groupHeaders.map((g) => {
          if (g.w < 60 || g.h < 24) return null;
          const maxChars = Math.floor(g.w / 6);
          const label = g.name.length > maxChars ? g.name.slice(0, maxChars - 1) + '…' : g.name;
          return (
            <text
              key={g.name}
              x={g.x + 3}
              y={g.y + 13}
              fill={rallyColors.textSecondary}
              fontSize={11}
              fontWeight={700}
              style={{ textShadow: TEXT_SHADOW }}
            >
              {label}
            </text>
          );
        })}
        {leaves.map((leaf, i) => {
          const d = leaf.data.data;
          if (!d) return null;
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const colorValue = d[colorAccessor] || 0;
          const fill = interpolateColor(colorValue, minColor, maxColor);
          const tier = getLabelTier(w, h);
          const textColor = getTextColorForBg(fill);

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
                stroke={onCellClick ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.15)'}
                strokeWidth={1}
                style={{ transition: 'all 0.2s ease' }}
              />
              {onCellClick && (
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={w}
                  height={h}
                  rx={4}
                  fill="transparent"
                  className="heatmap-cell-hover"
                  style={{ transition: 'fill 0.2s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('fill', 'rgba(255,255,255,0.08)');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('fill', 'transparent');
                  }}
                />
              )}
              {tier >= 3 && (
                <>
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 - 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={12}
                    fontWeight={600}
                    style={{ textShadow: TEXT_SHADOW }}
                  >
                    {d.symbol}
                  </text>
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 + 9}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={11}
                    fontWeight={500}
                    opacity={0.85}
                    style={{ textShadow: TEXT_SHADOW }}
                  >
                    {toPersianNum(colorValue > 0 ? '+' : '')}{toPersianNum(colorValue?.toFixed(2))}٪
                  </text>
                </>
              )}
              {tier === 2 && (
                <>
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 - 4}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={10}
                    fontWeight={600}
                    style={{ textShadow: TEXT_SHADOW }}
                  >
                    {d.symbol}
                  </text>
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 + 8}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={9}
                    fontWeight={500}
                    opacity={0.85}
                    style={{ textShadow: TEXT_SHADOW }}
                  >
                    {toPersianNum(colorValue > 0 ? '+' : '')}{toPersianNum(colorValue?.toFixed(2))}٪
                  </text>
                </>
              )}
              {tier === 1 && (
                <text
                  x={leaf.x0 + w / 2}
                  y={leaf.y0 + h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontSize={8}
                  fontWeight={600}
                  style={{ textShadow: TEXT_SHADOW }}
                >
                  {w < 32 && d.symbol.length > 4 ? d.symbol.slice(0, 3) + '…' : d.symbol}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Portal>
        <TreemapTooltip tooltip={tooltip} colorAccessor={colorAccessor} />
      </Portal>
    </div>
  );
}
