import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

/**
 * Smart Money Divergence scatter: X=real net flow, Y=legal net flow.
 * Stocks in quadrant II (real sell, legal buy) = smart money accumulation.
 * Stocks in quadrant IV (real buy, legal sell) = smart money distribution.
 * @param {{ data: Array }} props — client-type data with real/legal buy/sell volumes
 */
export default function SmartMoneyChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter((s) =>
        s.real_buy_volume != null && s.real_sell_volume != null &&
        s.legal_buy_volume != null && s.legal_sell_volume != null
      )
      .map((s) => ({
        symbol: s.symbol,
        name: s.name_fa || s.symbol,
        realNet: Math.round((s.real_buy_volume - s.real_sell_volume) / 1e6), // millions
        legalNet: Math.round((s.legal_buy_volume - s.legal_sell_volume) / 1e6),
      }))
      .filter((s) => s.realNet !== 0 || s.legalNet !== 0)
      .slice(0, 200);
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          type="number"
          dataKey="realNet"
          tick={axisTick(10)}
          name="جریان حقیقی"
          label={{ value: 'جریان خالص حقیقی (M)', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <YAxis
          type="number"
          dataKey="legalNet"
          tick={axisTick(10)}
          name="جریان حقوقی"
          label={{ value: 'جریان خالص حقوقی (M)', angle: -90, position: 'insideLeft', offset: -35, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <ReferenceLine x={0} stroke={rallyColors.yellow} strokeDasharray="3 3" />
        <ReferenceLine y={0} stroke={rallyColors.yellow} strokeDasharray="3 3" />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            const d = payload[0].payload;
            // Quadrant detection
            let signal = '';
            if (d.realNet < 0 && d.legalNet > 0) signal = '🔵 جمع‌آوری حقوقی';
            else if (d.realNet > 0 && d.legalNet < 0) signal = '🔴 توزیع حقوقی';
            else if (d.realNet > 0 && d.legalNet > 0) signal = '🟢 خرید هماهنگ';
            else signal = '⚪ فروش هماهنگ';
            return (
              <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                <div>حقیقی: <span style={{ color: d.realNet >= 0 ? rallyColors.green : rallyColors.red }}>{toPersianNum(formatNum(d.realNet))}M</span></div>
                <div>حقوقی: <span style={{ color: d.legalNet >= 0 ? rallyColors.green : rallyColors.red }}>{toPersianNum(formatNum(d.legalNet))}M</span></div>
                <div style={{ marginTop: 4, fontSize: 11 }}>{signal}</div>
              </div>
            );
          }}
        />
        <Scatter
          data={chartData}
          fill={rallyColors.primary}
          fillOpacity={0.5}
          stroke={rallyColors.primary}
          strokeOpacity={0.3}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
