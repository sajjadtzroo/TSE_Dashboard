import { Grid, Text, Alert } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { IconInfoCircle } from '@tabler/icons-react';
import RallyKPICard from '../RallyKPICard';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { formatMetric, toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick } from '../charts/shared/chartStyles';

export default function LiquidityRiskCard({ liquidityData }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartMargin = isMobile
    ? { top: 5, right: 10, bottom: 15, left: 10 }
    : { top: 10, right: 20, bottom: 20, left: 20 };

  if (!liquidityData) return null;

  const { amihud, currentTurnover, avgTurnover, spread, rollingAmihud } = liquidityData;

  return (
    <RallyMainCard title="ریسک نقدشوندگی" mb="md">
      <Grid gutter="sm" mb="md">
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <RallyKPICard
            title="Amihud"
            value={formatMetric(amihud, 4)}
            variant="accent-bar"
            color={rallyColors.purple}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <RallyKPICard
            title="گردش میانگین"
            value={formatMetric(avgTurnover != null ? avgTurnover * 100 : null, 4, '٪')}
            variant="accent-bar"
            color={rallyColors.blue}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <RallyKPICard
            title="گردش فعلی"
            value={formatMetric(currentTurnover != null ? currentTurnover * 100 : null, 4, '٪')}
            variant="accent-bar"
            color={rallyColors.green}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <RallyKPICard
            title="اسپرد خرید-فروش"
            value={formatMetric(spread?.relativeSpread != null ? spread.relativeSpread * 100 : null, 2, '٪')}
            variant="accent-bar"
            color={rallyColors.yellow}
          />
        </Grid.Col>
      </Grid>

      {rollingAmihud && rollingAmihud.length > 0 ? (
        <div>
          <Text size="sm" fw={600} mb="xs">شاخص Amihud غلتان (۲۰ روزه)</Text>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rollingAmihud} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="date" tick={axisTick(9)} tickCount={6} />
              <YAxis tick={axisTick(10)} />
              <Tooltip
                formatter={(val) => toPersianNum(val.toFixed(4))}
                contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
              />
              <Line type="monotone" dataKey="amihud" stroke={rallyColors.purple} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          داده کافی برای نمودار نقدشوندگی موجود نیست
        </Alert>
      )}
    </RallyMainCard>
  );
}
