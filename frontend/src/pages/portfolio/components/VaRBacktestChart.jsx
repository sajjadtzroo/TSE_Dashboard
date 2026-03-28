import { useMemo } from 'react';
import { Group, Badge, Text, SimpleGrid } from '@mantine/core';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { usePortfolioContext } from '../PortfolioProvider';
import { backtestVaR, kupiecPOF, baselTrafficLight } from '../../../utils/riskMetrics/varBacktest';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../../components/charts/shared/chartStyles';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { IconAlertTriangle, IconShieldCheck, IconTarget } from '@tabler/icons-react';

const BASEL_COLORS = { green: rallyColors.green, yellow: rallyColors.yellow, red: rallyColors.red };
const BASEL_LABELS = { green: 'سبز — مدل دقیق', yellow: 'زرد — نیاز به بررسی', red: 'قرمز — مدل ناکافی' };

function BacktestTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <Text size="xs" fw={600} mb={4}>{d.date}</Text>
      <Text size="xs" c={d.isViolation ? rallyColors.red : rallyColors.textSecondary}>
        بازده: {d.actualReturn?.toFixed(2)}٪
      </Text>
      <Text size="xs" c={rallyColors.yellow}>VaR: {d.varThreshold?.toFixed(2)}٪</Text>
      {d.isViolation && <Badge size="xs" color="red" mt={4}>نقض VaR!</Badge>}
    </div>
  );
}

export default function VaRBacktestChart() {
  const { portfolioReturns } = usePortfolioContext();

  const result = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 60) return null;

    // Use smaller window for portfolios with limited data
    const window = Math.min(250, Math.floor(portRets.length * 0.6));
    if (window < 30) return null;

    const bt = backtestVaR(portRets, portDates, window, 0.95);
    if (!bt || !bt.series.length) return null;

    const kupiec = kupiecPOF(bt.totalDays, bt.violations, 0.05);
    const basel = baselTrafficLight(bt.violations, bt.totalDays, 0.95);

    return { ...bt, kupiec, basel };
  }, [portfolioReturns]);

  if (!result) {
    return (
      <RallyMainCard title="بک‌تست VaR">
        <ChartEmptyState height={250} message="داده کافی برای بک‌تست VaR نیست (حداقل ۶۰ روز)" />
      </RallyMainCard>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="md">
        <RallyKPICard
          title="تعداد نقض"
          value={toPersianNum(String(result.violations))}
          icon={IconAlertTriangle}
          color={result.violations > 0 ? rallyColors.red : rallyColors.green}
        />
        <RallyKPICard
          title="نرخ نقض"
          value={`${toPersianNum((result.violationRate * 100).toFixed(1))}٪`}
          subtitle={`انتظار: ${toPersianNum('5')}٪`}
          icon={IconTarget}
          color={rallyColors.yellow}
        />
        <RallyKPICard
          title="آزمون کوپیک"
          value={result.kupiec ? (result.kupiec.reject ? 'رد' : 'تأیید') : '-'}
          subtitle={result.kupiec ? `LR: ${result.kupiec.lr.toFixed(2)}` : ''}
          icon={IconShieldCheck}
          color={result.kupiec?.reject ? rallyColors.red : rallyColors.green}
        />
        <RallyKPICard
          title="چراغ بازل"
          value={BASEL_LABELS[result.basel]?.split(' — ')[0] || '-'}
          icon={IconShieldCheck}
          color={BASEL_COLORS[result.basel]}
        />
      </SimpleGrid>

      <RallyMainCard
        title="بک‌تست VaR ۹۵٪"
        secondary={
          <Badge color={result.basel} variant="light" size="sm">
            {BASEL_LABELS[result.basel]}
          </Badge>
        }
        fullscreenable
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={result.series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" tick={axisTick(9)} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick()} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}٪`} />
            <Tooltip content={<BacktestTooltip />} />
            <Bar dataKey="actualReturn" maxBarSize={3} opacity={0.6}>
              {result.series.map((d, i) => (
                <Cell key={i} fill={d.isViolation ? rallyColors.red : rallyColors.textDimmed} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="varThreshold" stroke={rallyColors.yellow} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </RallyMainCard>
    </>
  );
}
