import { SegmentedControl, Center, Loader, Text } from '@mantine/core';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, ACTIVE_DOT } from '../../components/charts/shared/chartStyles';
import { toPersianNum, formatNum } from '../../utils/formatUtils';
import { toJalali } from '../../utils/dateUtils';

const DURATION_OPTIONS = [
  { label: '۳۰', value: '30' },
  { label: '۹۰', value: '90' },
  { label: '۱۸۰', value: '180' },
  { label: '۳۶۵', value: '365' },
  { label: 'همه', value: '0' },
];

function ChartTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <Text size="xs" fw={600} mb={4}>{toJalali(d.date)}</Text>
      <Text size="xs">آخرین قیمت: {formatNum(d.last_price)}</Text>
      {d.nav_issuance != null && <Text size="xs">NAV صدور: {formatNum(d.nav_issuance)}</Text>}
      {d.nav_redemption != null && <Text size="xs">NAV ابطال: {formatNum(d.nav_redemption)}</Text>}
    </div>
  );
}

export default function ETFChartSection({ history, loading, duration, onDurationChange }) {
  if (loading) {
    return (
      <RallyMainCard title="نمودار قیمت" mb="md">
        <Center mih={300}><Loader size="md" /></Center>
      </RallyMainCard>
    );
  }

  if (!history?.length) {
    return (
      <RallyMainCard title="نمودار قیمت" mb="md">
        <Center mih={300}><Text c="dimmed">داده‌ای موجود نیست</Text></Center>
      </RallyMainCard>
    );
  }

  return (
    <RallyMainCard
      title="نمودار قیمت"
      mb="md"
      secondary={
        <SegmentedControl
          size="xs"
          data={DURATION_OPTIONS}
          value={String(duration)}
          onChange={onDurationChange}
        />
      }
    >
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={history} margin={{ top: 10, right: 16, bottom: 20, left: 16 }}>
          <defs>
            <linearGradient id="etfPriceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rallyColors.green} stopOpacity={0.3} />
              <stop offset="100%" stopColor={rallyColors.green} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => toJalali(d, { short: true })}
            tick={axisTick(10)}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={axisTick(10)}
            tickFormatter={(v) => toPersianNum(formatNum(v))}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="last_price"
            stroke={rallyColors.green}
            fill="url(#etfPriceGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={ACTIVE_DOT}
            name="آخرین قیمت"
          />
          <Line
            type="monotone"
            dataKey="nav_issuance"
            stroke={rallyColors.blue}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="NAV صدور"
          />
          <Line
            type="monotone"
            dataKey="nav_redemption"
            stroke={rallyColors.purple}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="NAV ابطال"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
