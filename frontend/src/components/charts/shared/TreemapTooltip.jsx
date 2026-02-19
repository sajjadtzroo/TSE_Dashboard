import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';

export default function TreemapTooltip({ tooltip, colorAccessor }) {
  if (!tooltip || !tooltip.data) return null;

  const tooltipWidth = 220;
  const tooltipHeight = 100;
  const left = Math.min(tooltip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - tooltipWidth - 8);
  const top = Math.min(tooltip.y + 12, (typeof window !== 'undefined' ? window.innerHeight : 600) - tooltipHeight - 8);

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.max(8, left),
        top: Math.max(8, top),
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        borderRadius: 6,
        padding: '8px 12px',
        pointerEvents: 'none',
        zIndex: 1000,
        fontSize: 12,
        color: rallyColors.textPrimary,
        maxWidth: tooltipWidth,
        boxShadow: rallyColors.glassShadow,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.data.symbol}</div>
      {tooltip.data.name_fa && <div style={{ color: rallyColors.textSecondary, marginBottom: 4 }}>{tooltip.data.name_fa}</div>}
      <div>
        تغییر:{' '}
        <span style={{ color: (tooltip.data[colorAccessor] || 0) >= 0 ? rallyColors.green : rallyColors.red }}>
          {(tooltip.data[colorAccessor] || 0) > 0 ? '+' : ''}{toPersianNum((tooltip.data[colorAccessor] || 0).toFixed(2))}%
        </span>
      </div>
      {tooltip.data.market_cap && (
        <div>ارزش بازار: {toPersianNum((tooltip.data.market_cap / 1e9).toFixed(1))}B</div>
      )}
    </div>
  );
}
