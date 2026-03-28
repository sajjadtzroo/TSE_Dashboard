import { useNavigate } from 'react-router-dom';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { TOOLTIP_STYLE } from '../../../components/charts/shared/chartStyles';

function returnColor(pnlPct) {
  if (pnlPct >= 20) return 'rgba(34, 197, 94, 0.5)';
  if (pnlPct >= 10) return 'rgba(34, 197, 94, 0.35)';
  if (pnlPct >= 0) return 'rgba(34, 197, 94, 0.2)';
  if (pnlPct >= -10) return 'rgba(239, 68, 68, 0.2)';
  if (pnlPct >= -20) return 'rgba(239, 68, 68, 0.35)';
  return 'rgba(239, 68, 68, 0.5)';
}

function CustomContent({ x, y, width, height, name, pnlPct, weight }) {
  if (width < 40 || height < 30) return null;
  const textColor = pnlPct >= 0 ? rallyColors.green : rallyColors.red;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={returnColor(pnlPct || 0)}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
      />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill={rallyColors.textPrimary} fontSize={12} fontWeight={700}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 6} textAnchor="middle" fill={rallyColors.textDimmed} fontSize={9}>
        {toPersianNum((weight || 0).toFixed(0))}٪
      </text>
      <text x={x + width / 2} y={y + height / 2 + 18} textAnchor="middle" fill={textColor} fontSize={9} fontWeight={600}>
        {(pnlPct || 0) >= 0 ? '+' : ''}{toPersianNum((pnlPct || 0).toFixed(1))}٪
      </text>
    </g>
  );
}

export default function HoldingsTreemap({ enriched = [] }) {
  const navigate = useNavigate();

  const data = enriched
    .filter((h) => h.weight > 0.5)
    .map((h) => ({
      name: h.symbol,
      size: Math.max(h.weight, 1),
      pnlPct: h.pnlPct || 0,
      weight: h.weight,
      marketType: h.market_type,
    }));

  if (data.length === 0) {
    return (
      <RallyMainCard title="نقشه سبد">
        <ChartEmptyState height={280} message="داده‌ای موجود نیست" />
      </RallyMainCard>
    );
  }

  const handleClick = (node) => {
    if (!node?.name) return;
    const item = enriched.find((h) => h.symbol === node.name);
    if (item?.market_type === 'crypto') {
      navigate(`/crypto/coin/${node.name}`);
    } else {
      navigate(`/dashboard/stock/${node.name}`);
    }
  };

  return (
    <RallyMainCard title="نقشه سبد" fullscreenable>
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          content={<CustomContent />}
          onClick={handleClick}
          animationDuration={400}
        >
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name, props) => {
              const item = props?.payload;
              return [
                `وزن: ${toPersianNum((item?.weight || 0).toFixed(1))}٪ | بازده: ${(item?.pnlPct || 0) >= 0 ? '+' : ''}${toPersianNum((item?.pnlPct || 0).toFixed(1))}٪`,
                item?.name,
              ];
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
