import { useMemo } from 'react';
import { Portal } from '@mantine/core';
import { useState } from 'react';
import rallyColors from '../../theme/rallyColors';
import { interpolateColor, clampColorRange, getTextColorForBg } from '../../utils/colorUtils';
import { toPersianNum } from '../../utils/formatUtils';
import TreemapTooltip from './shared/TreemapTooltip';

const CELL_W = 80;
const CELL_H = 52;
const CELL_W_MOBILE = 64;
const CELL_H_MOBILE = 44;
const GAP = 3;

export default function HeatmapGrid({
  data,
  groupBy = 'sector_name_fa',
  colorAccessor = 'close_change_pct',
  onCellClick,
}) {
  const [tooltip, setTooltip] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cellW = isMobile ? CELL_W_MOBILE : CELL_W;
  const cellH = isMobile ? CELL_H_MOBILE : CELL_H;

  const { groups, minColor, maxColor } = useMemo(() => {
    if (!data || data.length === 0) return { groups: [], minColor: -5, maxColor: 5 };

    const allValues = data.map((d) => d[colorAccessor] || 0);
    const { min, max } = clampColorRange(allValues);

    const map = {};
    data.forEach((d) => {
      const key = d[groupBy] || 'سایر';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });

    const sorted = Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => Math.abs(b[colorAccessor] || 0) - Math.abs(a[colorAccessor] || 0)),
      }));

    return { groups: sorted, minColor: min, maxColor: max };
  }, [data, groupBy, colorAccessor]);

  if (!groups.length) return null;

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      {groups.map((group) => (
        <div key={group.name} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: rallyColors.textSecondary,
              marginBottom: 6,
              paddingInlineStart: 2,
              letterSpacing: '0.02em',
            }}
          >
            {group.name}
            <span style={{ color: rallyColors.textDimmed, fontWeight: 400, marginInlineStart: 6 }}>
              ({toPersianNum(group.items.length)})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: GAP,
            }}
          >
            {group.items.map((d) => {
              const changeVal = d[colorAccessor] || 0;
              const fill = interpolateColor(changeVal, minColor, maxColor);
              const textColor = getTextColorForBg(fill);

              return (
                <div
                  key={d.symbol}
                  onClick={() => onCellClick && onCellClick(d)}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
                  onMouseMove={(e) => setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    setTooltip({ x: touch.clientX, y: touch.clientY, data: d });
                  }}
                  onTouchEnd={() => setTooltip(null)}
                  style={{
                    width: cellW,
                    height: cellH,
                    background: fill,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: onCellClick ? 'pointer' : 'default',
                    userSelect: 'none',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    transition: 'filter 0.15s ease',
                    overflow: 'hidden',
                    gap: 1,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                  onFocus={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; }}
                  onBlur={(e) => { e.currentTarget.style.filter = 'none'; }}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 10 : 11,
                      fontWeight: 700,
                      color: textColor,
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      lineHeight: 1.1,
                      maxWidth: cellW - 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.symbol}
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? 9 : 10,
                      fontWeight: 500,
                      color: textColor,
                      opacity: 0.9,
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      lineHeight: 1.1,
                    }}
                  >
                    {changeVal > 0 ? '+' : ''}{toPersianNum(changeVal.toFixed(2))}٪
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Portal>
        <TreemapTooltip tooltip={tooltip} colorAccessor={colorAccessor} />
      </Portal>
    </div>
  );
}
