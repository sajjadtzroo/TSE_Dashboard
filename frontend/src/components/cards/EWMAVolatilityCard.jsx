import { Text, Alert } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { IconInfoCircle } from '@tabler/icons-react';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick } from '../charts/shared/chartStyles';

export default function EWMAVolatilityCard({ ewmaData }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartMargin = isMobile
    ? { top: 5, right: 10, bottom: 15, left: 10 }
    : { top: 10, right: 20, bottom: 20, left: 20 };

  if (!ewmaData || !ewmaData.length) {
    return (
      <RallyMainCard title="نوسان EWMA" mb="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          حداقل ۳۰ روز داده لازم است
        </Alert>
      </RallyMainCard>
    );
  }

  return (
    <RallyMainCard title="نوسان EWMA در مقابل نوسان ساده (سالانه‌شده ٪)" mb="md">
      <Text size="xs" c="dimmed" mb="xs">EWMA (λ=۰.۹۴) واکنش سریع‌تری به تغییرات نوسان دارد</Text>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={ewmaData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={axisTick(9)} tickCount={6} />
          <YAxis tick={axisTick(10)} />
          <Tooltip
            formatter={(val, name) => {
              const labels = { ewmaVol: 'EWMA', simpleVol: 'ساده (۳۰ روزه)' };
              return [toPersianNum(val.toFixed(1)) + '٪', labels[name] || name];
            }}
            contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
          />
          <Legend
            formatter={(value) => {
              const labels = { ewmaVol: 'EWMA (λ=0.94)', simpleVol: 'ساده ۳۰ روزه' };
              return labels[value] || value;
            }}
            wrapperStyle={{ fontSize: 11, color: rallyColors.textSecondary }}
          />
          <Line type="monotone" dataKey="ewmaVol" stroke={rallyColors.blue} strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="simpleVol" stroke={rallyColors.purple} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
