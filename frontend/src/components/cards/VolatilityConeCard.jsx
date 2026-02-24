import { Text, Alert } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter,
} from 'recharts';
import { IconInfoCircle } from '@tabler/icons-react';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick } from '../charts/shared/chartStyles';

export default function VolatilityConeCard({ volConeData }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartMargin = isMobile
    ? { top: 5, right: 10, bottom: 15, left: 10 }
    : { top: 10, right: 20, bottom: 20, left: 20 };

  if (!volConeData || !volConeData.length) {
    return (
      <RallyMainCard title="مخروط نوسان" mb="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          حداقل ۲۵۰ روز داده لازم است
        </Alert>
      </RallyMainCard>
    );
  }

  return (
    <RallyMainCard title="مخروط نوسان (Volatility Cone)" mb="md">
      <Text size="xs" c="dimmed" mb="xs">نوسان تحقق‌یافته سالانه در پنجره‌های مختلف با باندهای درصدی تاریخی</Text>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={volConeData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="window"
            tick={axisTick(10)}
            label={{ value: 'پنجره (روز)', position: 'insideBottom', offset: -10, fill: rallyColors.textSecondary, fontSize: 10 }}
          />
          <YAxis
            tick={axisTick(10)}
            label={{ value: 'نوسان ٪', angle: -90, position: 'insideLeft', fill: rallyColors.textSecondary, fontSize: 10 }}
          />
          <Tooltip
            formatter={(val, name) => {
              const labels = { min: 'حداقل', max: 'حداکثر', p25: 'صدک ۲۵', p50: 'میانه', p75: 'صدک ۷۵', current: 'فعلی' };
              return [toPersianNum(val.toFixed(1)) + '٪', labels[name] || name];
            }}
            contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
          />
          {/* Min-Max range */}
          <Area type="monotone" dataKey="max" stroke="transparent" fill={rallyColors.blue} fillOpacity={0.06} />
          <Area type="monotone" dataKey="min" stroke="transparent" fill={rallyColors.bg} fillOpacity={1} />
          {/* P25-P75 range */}
          <Area type="monotone" dataKey="p75" stroke="transparent" fill={rallyColors.blue} fillOpacity={0.12} />
          <Area type="monotone" dataKey="p25" stroke="transparent" fill={rallyColors.bg} fillOpacity={1} />
          {/* Median line */}
          <Line type="monotone" dataKey="p50" stroke={rallyColors.textSecondary} strokeWidth={1} strokeDasharray="4 4" dot={false} name="p50" />
          {/* Current vol dots */}
          <Scatter dataKey="current" fill={rallyColors.primary} r={5} name="current" />
        </ComposedChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
