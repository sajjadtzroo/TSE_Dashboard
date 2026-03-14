import { useState, useMemo } from 'react';
import { Card, SimpleGrid, Text, Box, Button, Group } from '@mantine/core';
import { IconEye, IconTrendingUp, IconTrendingDown, IconChartBar } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import RallyKPICard from '../RallyKPICard';
import rallyColors from '../../theme/rallyColors';
import { axisTick } from '../charts/shared/chartStyles';
import { formatNum, formatPercent, toPersianNum } from '../../utils/formatUtils';

export default function WatchlistSummaryCard({ watchedStocks = [] }) {
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    if (!watchedStocks.length) return null;

    const sorted = [...watchedStocks].sort(
      (a, b) => (b.close_change_pct || 0) - (a.close_change_pct || 0),
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const avg =
      watchedStocks.reduce((sum, s) => sum + (s.close_change_pct || 0), 0) /
      watchedStocks.length;

    return { count: watchedStocks.length, best, worst, avg, sorted };
  }, [watchedStocks]);

  if (!stats) return null;

  // For the bar chart: show top 10 + bottom 10 if >30, else show all
  const chartData = useMemo(() => {
    const { sorted } = stats;
    if (sorted.length <= 30 || showAll) {
      return sorted.map((s) => ({
        symbol: s.symbol,
        change: s.close_change_pct || 0,
      }));
    }
    const top = sorted.slice(0, 10);
    const bottom = sorted.slice(-10);
    return [...top, ...bottom].map((s) => ({
      symbol: s.symbol,
      change: s.close_change_pct || 0,
    }));
  }, [stats, showAll]);

  const chartHeight = Math.max(120, chartData.length * 28);

  return (
    <Card
      radius="md"
      p="md"
      mb="md"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <RallyKPICard
          compact
          title="تعداد نمادها"
          value={formatNum(stats.count)}
          icon={IconEye}
          color={rallyColors.blue}
        />
        <RallyKPICard
          compact
          title="بهترین"
          value={stats.best.symbol}
          subtitle={formatPercent(stats.best.close_change_pct)}
          icon={IconTrendingUp}
          color={rallyColors.green}
        />
        <RallyKPICard
          compact
          title="بدترین"
          value={stats.worst.symbol}
          subtitle={formatPercent(stats.worst.close_change_pct)}
          icon={IconTrendingDown}
          color={rallyColors.red}
        />
        <RallyKPICard
          compact
          title="میانگین تغییر"
          value={formatPercent(stats.avg)}
          icon={IconChartBar}
          color={stats.avg >= 0 ? rallyColors.green : rallyColors.red}
        />
      </SimpleGrid>

      <Box style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
            <XAxis type="number" tick={axisTick(11)} tickFormatter={(v) => `${toPersianNum(v.toFixed(1))}%`} />
            <YAxis type="category" dataKey="symbol" tick={axisTick(11)} width={55} />
            <Tooltip
              contentStyle={{
                background: rallyColors.elevated,
                border: `1px solid ${rallyColors.border}`,
                borderRadius: 8,
                fontSize: 12,
                color: rallyColors.textPrimary,
              }}
              formatter={(v) => [`${toPersianNum(v.toFixed(2))}%`, 'تغییر']}
            />
            <Bar dataKey="change" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.change >= 0 ? rallyColors.green : rallyColors.red} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {stats.sorted.length > 30 && !showAll && (
        <Group justify="center" mt="xs">
          <Button variant="subtle" size="xs" color="gray" onClick={() => setShowAll(true)}>
            نمایش همه ({formatNum(stats.sorted.length)} نماد)
          </Button>
        </Group>
      )}
    </Card>
  );
}
