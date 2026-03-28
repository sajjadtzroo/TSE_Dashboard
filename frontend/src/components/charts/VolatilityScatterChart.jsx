import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

/**
 * Scatter plot: X=volume (log), Y=price change %, Z (size)=market cap.
 * Shows risk-return profile of all stocks.
 * @param {{ data: Array }} props — market-overview records
 */
export default function VolatilityScatterChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter((s) => s.volume > 0 && s.close_change_pct != null && s.market_cap > 0)
      .map((s) => ({
        symbol: s.symbol,
        name: s.name_fa || s.symbol,
        volume: Math.round(s.volume / 1e6), // millions
        change: Math.round(s.close_change_pct * 100) / 100,
        marketCap: Math.round(s.market_cap / 1e9), // billions
      }))
      .slice(0, 200); // limit for performance
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          type="number"
          dataKey="volume"
          tick={axisTick(10)}
          name="حجم"
          label={{ value: 'حجم (میلیون)', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <YAxis
          type="number"
          dataKey="change"
          tick={axisTick(10)}
          name="تغییر"
          label={{ value: 'تغییر (%)', angle: -90, position: 'insideLeft', offset: -25, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <ZAxis type="number" dataKey="marketCap" range={[20, 400]} name="ارزش بازار" />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                <div>تغییر: <span style={{ color: d.change >= 0 ? rallyColors.green : rallyColors.red }}>{d.change > 0 ? '+' : ''}{toPersianNum(d.change)}٪</span></div>
                <div>حجم: {toPersianNum(formatNum(d.volume))}M</div>
                <div>ارزش بازار: {toPersianNum(formatNum(d.marketCap))}B</div>
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke={rallyColors.yellow} strokeDasharray="5 5" />
        <Scatter
          data={chartData}
          fill={rallyColors.primary}
          fillOpacity={0.6}
          stroke={rallyColors.primary}
          strokeOpacity={0.3}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
