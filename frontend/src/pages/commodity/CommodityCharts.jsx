import { useState } from 'react';
import { Select, Group, SegmentedControl, Text } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyLineChart from '../../components/charts/RallyLineChart';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import { useCommodityHistory } from '../../hooks/useCommodityData';
import { COMMODITY_SYMBOLS, COMMODITY_KEYS, COMMODITY_TIMEFRAMES } from '../../constants/commodity';

export default function CommodityCharts() {
  const [symbol, setSymbol] = useState('BRENT');
  const [period, setPeriod] = useState('6mo');

  const { data: history = [], isLoading, isError, refetch } = useCommodityHistory(symbol, { period });

  const series = history.length > 0
    ? [{
        name: COMMODITY_SYMBOLS[symbol]?.name_fa ?? symbol,
        data: history.map(h => ({
          x: h.date,
          y: h.close,
        })),
      }]
    : [];

  return (
    <>
      <RallyBreadcrumbs items={[{ label: 'کالاها', path: '/commodity' }, { label: 'نمودار قیمت' }]} />
      <PageHeader title="نمودار قیمت کالاها" />

      <RallyMainCard mb="md">
        <Group mb="md" justify="space-between">
          <Select
            placeholder="انتخاب کالا"
            data={COMMODITY_KEYS.map(s => ({ value: s, label: COMMODITY_SYMBOLS[s]?.name_fa ?? s }))}
            value={symbol}
            onChange={setSymbol}
            searchable
            w={200}
          />
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            data={COMMODITY_TIMEFRAMES}
            size="xs"
          />
        </Group>

        <PageShell loading={isLoading} error={isError ? 'خطا' : null} hasData={series.length > 0} onRetry={refetch}>
          {series.length > 0 ? (
            <RallyLineChart
              series={series}
              height={500}
              yUnit={COMMODITY_SYMBOLS[symbol]?.unit ?? 'USD'}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </PageShell>
      </RallyMainCard>
    </>
  );
}
