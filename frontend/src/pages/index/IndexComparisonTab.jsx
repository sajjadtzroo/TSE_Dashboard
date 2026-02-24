import { useState, useMemo } from 'react';
import {
  Center, Group, Loader, Select, Text,
} from '@mantine/core';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import ChartTooltipV2 from '../../components/charts/shared/ChartTooltipV2';
import useChartBreakpoint from '../../hooks/useChartBreakpoint';
import { GRID_STROKE, axisTick, activeDotFor } from '../../components/charts/shared/chartStyles';
import { useMarketIndices, useMarketIndexHistory } from '../../hooks/useMarketData';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

const COMPARE_COLORS = [rallyColors.primary, rallyColors.blue, rallyColors.orange, rallyColors.purple];

/**
 * Compares two indices on a normalized percentage chart.
 *
 * Props:
 *   currentName   - name of the currently viewed index
 *   currentHistory - OHLCV history of the current index
 */
export default function IndexComparisonTab({ currentName, currentHistory }) {
  const [compareName, setCompareName] = useState(null);

  const { data: allIndices = [] } = useMarketIndices();

  const indexOptions = useMemo(
    () => allIndices
      .filter((i) => i.name !== currentName)
      .map((i) => ({ value: i.name, label: i.name })),
    [allIndices, currentName],
  );

  const { data: compareHistory, isLoading: compareLoading } = useMarketIndexHistory(
    compareName,
    { days: 365 },
  );

  // Normalize both series to cumulative % from first overlapping date
  const chartData = useMemo(() => {
    if (!currentHistory?.length) return [];

    const currentMap = new Map();
    for (const h of currentHistory) {
      if (h.close) currentMap.set(h.date, h.close);
    }

    if (!compareName || !compareHistory?.length) {
      // Show just the current index normalized
      const dates = [...currentMap.keys()].sort();
      if (dates.length < 2) return [];
      const base = currentMap.get(dates[0]);
      return dates.map((date) => ({
        date: date.slice(5),
        current: +((currentMap.get(date) / base - 1) * 100).toFixed(2),
      }));
    }

    const compareMap = new Map();
    for (const h of compareHistory) {
      if (h.close) compareMap.set(h.date, h.close);
    }

    const dates = [...currentMap.keys()].filter((d) => compareMap.has(d)).sort();
    if (dates.length < 2) return [];

    const currentBase = currentMap.get(dates[0]);
    const compareBase = compareMap.get(dates[0]);

    return dates.map((date) => ({
      date: date.slice(5),
      current: +((currentMap.get(date) / currentBase - 1) * 100).toFixed(2),
      compare: +((compareMap.get(date) / compareBase - 1) * 100).toFixed(2),
    }));
  }, [currentHistory, compareHistory, compareName]);

  const { isMobile, fontSize, tickCount } = useChartBreakpoint();

  return (
    <RallyMainCard
      title={
        <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
          <Text fw={600}>مقایسه شاخص‌ها</Text>
          <Select
            size="xs"
            placeholder="انتخاب شاخص برای مقایسه..."
            searchable
            clearable
            value={compareName}
            onChange={setCompareName}
            data={indexOptions}
            w={260}
            nothingFoundMessage="شاخصی یافت نشد"
          />
        </Group>
      }
    >
      {compareLoading ? (
        <Center mih={350}><Loader color="rally-primary" size="sm" /></Center>
      ) : chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={isMobile
              ? { top: 5, right: 10, bottom: 10, left: 10 }
              : { top: 10, right: 20, bottom: 20, left: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="date"
              tick={axisTick(9)}
              tickCount={isMobile ? 4 : tickCount}
            />
            <YAxis
              tick={axisTick(fontSize)}
              tickFormatter={(v) => v + '%'}
            />
            <Tooltip
              content={
                <ChartTooltipV2
                  formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
                  labelFormatter={(l) => l}
                />
              }
            />
            <Legend
              formatter={(value) =>
                value === 'current' ? currentName : (compareName || '')
              }
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={COMPARE_COLORS[0]}
              strokeWidth={2}
              dot={false}
              activeDot={activeDotFor(COMPARE_COLORS[0])}
            />
            {compareName && (
              <Line
                type="monotone"
                dataKey="compare"
                stroke={COMPARE_COLORS[1]}
                strokeWidth={2}
                dot={false}
                activeDot={activeDotFor(COMPARE_COLORS[1])}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Center mih={350}>
          <Text c="dimmed" size="sm">
            {compareName ? 'داده کافی برای مقایسه موجود نیست' : 'یک شاخص برای مقایسه انتخاب کنید'}
          </Text>
        </Center>
      )}
    </RallyMainCard>
  );
}
