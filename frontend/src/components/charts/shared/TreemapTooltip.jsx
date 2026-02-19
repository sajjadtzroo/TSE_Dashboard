import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';

function formatVolumePersian(vol) {
  if (vol == null) return null;
  if (vol >= 1e12) return toPersianNum((vol / 1e12).toFixed(1)) + ' تریلیون';
  if (vol >= 1e9) return toPersianNum((vol / 1e9).toFixed(1)) + ' میلیارد';
  if (vol >= 1e6) return toPersianNum((vol / 1e6).toFixed(1)) + ' میلیون';
  return toPersianNum(vol.toLocaleString());
}

export default function TreemapTooltip({ tooltip, colorAccessor }) {
  if (!tooltip || !tooltip.data) return null;

  const tooltipWidth = 240;
  const tooltipHeight = 120;
  const left = Math.min(tooltip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - tooltipWidth - 8);
  const top = Math.min(tooltip.y + 12, (typeof window !== 'undefined' ? window.innerHeight : 600) - tooltipHeight - 8);
  const d = tooltip.data;
  const changeVal = d[colorAccessor] || 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.max(8, left),
        top: Math.max(8, top),
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.borderStrong || rallyColors.border}`,
        borderRadius: 6,
        padding: '8px 12px',
        pointerEvents: 'none',
        zIndex: 1000,
        fontSize: 12,
        lineHeight: 1.5,
        color: rallyColors.textPrimary,
        maxWidth: tooltipWidth,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{d.symbol}</div>
      {d.name_fa && <div style={{ color: rallyColors.textSecondary, marginBottom: 2 }}>{d.name_fa}</div>}
      {d.sector_name_fa && <div style={{ color: rallyColors.textDimmed, marginBottom: 4, fontSize: 11 }}>صنعت: {d.sector_name_fa}</div>}
      <div>
        تغییر:{' '}
        <span style={{ color: changeVal >= 0 ? rallyColors.green : rallyColors.red, fontWeight: 600 }}>
          {changeVal > 0 ? '+' : ''}{toPersianNum(changeVal.toFixed(2))}٪
        </span>
      </div>
      {d.market_cap != null && d.market_cap > 0 && (
        <div>ارزش بازار: {formatVolumePersian(d.market_cap)}</div>
      )}
      {d.volume != null && d.volume > 0 && (
        <div>حجم: {formatVolumePersian(d.volume)}</div>
      )}
    </div>
  );
}
