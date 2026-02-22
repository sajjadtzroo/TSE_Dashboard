import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import rallyColors from '../../theme/rallyColors';
import ChartTooltipV2 from './shared/ChartTooltipV2';
import { GRID_STROKE, axisTick, barGradientDef } from './shared/chartStyles';
import { toPersianNum } from '../../utils/formatUtils';

/**
 * Order book depth chart — vertical bar chart showing bid/ask levels.
 */
export default function OrderBookDepthChart({ orderBook, height = 200 }) {
  if (!orderBook || !orderBook.length) return null;

  const data = [];
  const sorted = [...orderBook].sort((a, b) => a.row - b.row);

  for (const level of sorted) {
    data.push({
      price: toPersianNum(level.demand_price?.toLocaleString() || ''),
      bid: level.demand_volume || 0,
      ask: -(level.supply_volume || 0),
      demandPrice: level.demand_price,
      supplyPrice: level.supply_price,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <defs>
          {barGradientDef('ob-bid-grad', rallyColors.green)}
          {barGradientDef('ob-ask-grad', rallyColors.red)}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" tick={axisTick(9)} tickFormatter={(v) => toPersianNum(Math.abs(v).toLocaleString())} />
        <YAxis type="category" dataKey="price" tick={axisTick(9)} width={70} />
        <Tooltip
          content={
            <ChartTooltipV2
              formatter={(val) => toPersianNum(Math.abs(val).toLocaleString())}
            />
          }
        />
        <Bar dataKey="bid" fill="url(#ob-bid-grad)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="ask" fill="url(#ob-ask-grad)" radius={[3, 0, 0, 3]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
