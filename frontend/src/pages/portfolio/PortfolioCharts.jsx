import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { SimpleGrid, SegmentedControl, Box, Text } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyPieChart from '../../components/charts/RallyPieChart';
import { useMarketIndexHistory } from '../../hooks/useMarketData';
import { TEDPIX_NAMES } from '../../constants/market';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../../components/charts/shared/chartStyles';

const api = axios.create({ baseURL: '/api' });

const DAY_OPTIONS = [
  { label: '۳۰ روز', value: '30' },
  { label: '۹۰ روز', value: '90' },
  { label: '۳۶۵ روز', value: '365' },
];

export default function PortfolioCharts({ holdings, enriched }) {
  const [days, setDays] = useState('30');
  const daysNum = Number(days);

  // Per-stock history for portfolio timeline
  const stockHistories = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ['stock-history', h.symbol, daysNum],
      queryFn: () =>
        api
          .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, { params: { days: daysNum } })
          .then((r) => r.data),
      enabled: holdings.length > 0 && !!h.symbol,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // TEDPIX benchmark
  const { data: tedpixHistory = [] } = useMarketIndexHistory(TEDPIX_NAMES[0], { days: daysNum });

  // Build normalized portfolio + TEDPIX timeline
  const chartData = useMemo(() => {
    if (!holdings.length) return [];

    // date → { symbol: price }
    const dateMap = new Map();
    holdings.forEach((h, i) => {
      const histData = stockHistories[i]?.data;
      if (!histData) return;
      histData.forEach((d) => {
        if (!dateMap.has(d.date)) dateMap.set(d.date, {});
        dateMap.get(d.date)[h.symbol] = d.close;
      });
    });

    const sortedDates = [...dateMap.keys()].sort();
    if (!sortedDates.length) return [];

    const tedpixMap = {};
    tedpixHistory.forEach((d) => { tedpixMap[d.date] = d.index_value; });

    const lastKnown = {};
    let firstPortValue = null;
    let firstTedpix = null;

    return sortedDates.map((date) => {
      const prices = dateMap.get(date);
      let value = 0;
      holdings.forEach((h) => {
        const price = prices[h.symbol] ?? lastKnown[h.symbol] ?? h.buyPrice;
        if (prices[h.symbol] != null) lastKnown[h.symbol] = prices[h.symbol];
        value += h.quantity * price;
      });
      if (firstPortValue == null) firstPortValue = value;

      const tedpixVal = tedpixMap[date];
      if (firstTedpix == null && tedpixVal != null) firstTedpix = tedpixVal;

      return {
        date,
        portfolio: firstPortValue ? (value / firstPortValue) * 100 : 100,
        tedpix: tedpixVal != null && firstTedpix ? (tedpixVal / firstTedpix) * 100 : null,
      };
    });
  }, [holdings, stockHistories, tedpixHistory]);

  // Allocation pie data by weight
  const allocationData = useMemo(
    () =>
      enriched
        .filter((h) => h.weight > 0)
        .map((h) => ({ x: h.symbol, y: Math.round(h.weight * 10) / 10 })),
    [enriched],
  );

  const tooltipStyle = {
    contentStyle: {
      background: rallyColors.card,
      border: `1px solid ${rallyColors.border}`,
      borderRadius: 8,
    },
    labelStyle: { color: rallyColors.textSecondary, fontSize: 12 },
    itemStyle: { fontSize: 12 },
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* Portfolio Performance Chart */}
      <RallyMainCard
        title="عملکرد سبد (نرمال‌شده)"
        secondary={
          <SegmentedControl
            size="xs"
            data={DAY_OPTIONS}
            value={days}
            onChange={setDays}
          />
        }
      >
        {chartData.length === 0 ? (
          <Box style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" c="dimmed">داده‌ای موجود نیست</Text>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="date"
                tick={axisTick(9)}
                angle={-45}
                textAnchor="end"
                tickCount={6}
              />
              <YAxis
                tick={axisTick()}
                tickFormatter={(v) => `${toPersianNum(v.toFixed(0))}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, name) => [
                  `${toPersianNum(Number(v).toFixed(1))}`,
                  name === 'portfolio' ? 'سبد' : 'شاخص کل',
                ]}
              />
              <Legend
                formatter={(value) => (value === 'portfolio' ? 'سبد' : 'شاخص کل')}
                wrapperStyle={{ fontSize: 12, color: rallyColors.textSecondary }}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke={rallyColors.blue}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="tedpix"
                stroke={rallyColors.textDimmed}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </RallyMainCard>

      {/* Allocation Pie Chart */}
      <RallyMainCard title="ترکیب پورتفولیو">
        {allocationData.length === 0 ? (
          <Box style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" c="dimmed">داده‌ای موجود نیست</Text>
          </Box>
        ) : (
          <RallyPieChart
            data={allocationData}
            height={280}
            centerLabel="وزن٪"
          />
        )}
      </RallyMainCard>
    </SimpleGrid>
  );
}
