import rallyColors from '../../../theme/rallyColors';

export default function PayoffTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload.find((p) => p.dataKey === 'payoff') || payload[0];
  const price = entry?.payload?.price;
  const pnl = entry?.payload?.payoff;

  if (price == null || pnl == null) return null;

  return (
    <div
      style={{
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        borderRadius: 4,
        padding: '6px 10px',
        color: rallyColors.textPrimary,
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <div>قیمت: {price.toLocaleString()}</div>
      <div>
        سود/زیان: {pnl >= 0 ? '+' : ''}
        {pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
