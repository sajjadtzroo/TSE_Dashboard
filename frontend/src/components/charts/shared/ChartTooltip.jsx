import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';

export default function ChartTooltip({ active, payload, tooltipFormatter }) {
  if (!active || !payload || !payload.length) return null;

  const datum = { x: payload[0].payload.name, y: payload[0].value };
  const label = tooltipFormatter
    ? tooltipFormatter(datum)
    : `${datum.x}: ${toPersianNum(String(datum.y ?? ''))}`;

  return (
    <div
      style={{
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        color: rallyColors.textPrimary,
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 11,
      }}
    >
      {label}
    </div>
  );
}
