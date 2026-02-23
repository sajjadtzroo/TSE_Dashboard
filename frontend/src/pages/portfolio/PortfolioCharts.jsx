import { useState, useMemo, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { SimpleGrid, SegmentedControl } from '@mantine/core';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyPieChart from '../../components/charts/RallyPieChart';
import ChartTooltipV2 from '../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../components/charts/shared/ChartEmptyState';
import { useMarketIndexHistory } from '../../hooks/useMarketData';
import { TEDPIX_NAMES } from '../../constants/market';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick, activeDotFor } from '../../components/charts/shared/chartStyles';

const api = axios.create({ baseURL: '/api' });

const DAY_OPTIONS = [
  { label: '۳۰ روز', value: '30' },
  { label: '۹۰ روز', value: '90' },
  { label: '۳۶۵ روز', value: '365' },
];

export default function PortfolioCharts({ holdings, enriched }) {
  const [days, setDays] = useState('30');
  const daysNum = Number(days);

  // Gate queries in batches of 10 to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const [enabledBatches, setEnabledBatches] = useState(1);

  const stockHistories = useQueries({
    queries: holdings.map((h, i) => ({
      queryKey: ['stock-history', h.symbol, daysNum],
      queryFn: () =>
        api
          .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, { params: { days: daysNum } })
          .then((r) => r.data),
      enabled: holdings.length > 0 && !!h.symbol && i < enabledBatches * BATCH_SIZE,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Advance to next batch when current batch is complete
  const currentBatchEnd = Math.min(enabledBatches * BATCH_SIZE, holdings.length);
  const currentBatchDone = stockHistories
    .slice(0, currentBatchEnd)
    .every((q) => !q.isLoading);

  useEffect(() => {
    if (currentBatchDone && currentBatchEnd < holdings.length) {
      setEnabledBatches((b) => b + 1);
    }
  }, [currentBatchDone, currentBatchEnd, holdings.length]);

  const { data: tedpixHistory = [] } = useMarketIndexHistory(TEDPIX_NAMES[0], { days: daysNum });

  const chartData = useMemo(() => {
    if (!holdings.length) return [];

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
    tedpixHistory.forEach((d) => { tedpixMap[d.date] = d.close; });

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

  const allocationData = useMemo(
    () =>
      enriched
        .filter((h) => h.weight > 0)
        .map((h) => ({ x: h.symbol, y: Math.round(h.weight * 10) / 10 })),
    [enriched],
  );

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* Performance AreaChart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0 }}
      >
        <RallyMainCard
          title="عملکرد سبد (نرمال‌شده)"
          fullscreenable
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
            <ChartEmptyState height={300} message="داده‌ای موجود نیست" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rallyColors.blue} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={rallyColors.blue} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={rallyColors.blue} stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="tedpixGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rallyColors.textDimmed} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={rallyColors.textDimmed} stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  content={
                    <ChartTooltipV2
                      formatter={(v, name) => `${toPersianNum(Number(v).toFixed(1))}`}
                    />
                  }
                />
                <Legend
                  formatter={(value) => (value === 'portfolio' ? 'سبد' : 'شاخص کل')}
                  wrapperStyle={{ fontSize: 12, color: rallyColors.textSecondary }}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  stroke={rallyColors.blue}
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                  dot={false}
                  activeDot={activeDotFor(rallyColors.blue)}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="tedpix"
                  stroke={rallyColors.textDimmed}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fill="url(#tedpixGradient)"
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </RallyMainCard>
      </motion.div>

      {/* Allocation Donut */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
      >
        <RallyMainCard title="ترکیب پورتفولیو" fullscreenable>
          {allocationData.length === 0 ? (
            <ChartEmptyState height={300} message="داده‌ای موجود نیست" />
          ) : (
            <RallyPieChart
              data={allocationData}
              height={300}
              centerLabel="وزن٪"
            />
          )}
        </RallyMainCard>
      </motion.div>
    </SimpleGrid>
  );
}
