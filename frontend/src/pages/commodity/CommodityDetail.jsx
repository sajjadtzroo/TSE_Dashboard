import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { SimpleGrid, Text, SegmentedControl, Group, Box, Badge, Stack } from '@mantine/core';
import { IconBarrel, IconTrendingUp, IconTrendingDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import RallyLineChart from '../../components/charts/RallyLineChart';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import { useCommodityDetail, useCommodityHistory } from '../../hooks/useCommodityData';
import { COMMODITY_SYMBOLS, COMMODITY_TIMEFRAMES, getCommodityCategory } from '../../constants/commodity';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';
import { toPersianNum } from '../../utils/formatUtils';

export default function CommodityDetail() {
  const { symbol } = useParams();
  const [period, setPeriod] = useState('6mo');

  const meta = COMMODITY_SYMBOLS[symbol] || {};
  const { data: detail, isLoading, isError, refetch, dataUpdatedAt } = useCommodityDetail(symbol);
  const { data: history = [], isLoading: histLoading } = useCommodityHistory(symbol, { period });
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const price = detail?.price ? Number(detail.price) : null;
  const change = detail?.change_pct ?? 0;
  const isUp = change >= 0;

  const chartData = history.map(h => ({ x: h.date, y: h.close }));

  return (
    <PageShell loading={isLoading} error={isError ? 'خطا در بارگذاری' : null} hasData={!!detail} onRetry={refetch}>
      <RallyBreadcrumbs items={[
        { label: 'کالاها', path: '/commodity' },
        { label: meta.name_fa ?? symbol },
      ]} />
      <PageHeader title={meta.name_fa ?? symbol}>
        <Badge color="orange" variant="light">{getCommodityCategory(symbol)}</Badge>
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      {/* KPI row */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="قیمت"
            value={price != null ? `$${toPersianNum(price >= 1000 ? price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : price.toFixed(2))}` : '—'}
            icon={IconBarrel}
            color="#EA580C"
            bgColor="#EA580C"
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="تغییر"
            value={`${isUp ? '+' : ''}${toPersianNum(change.toFixed(2))}%`}
            icon={isUp ? IconTrendingUp : IconTrendingDown}
            color={isUp ? rallyColors.green : rallyColors.red}
            bgColor={isUp ? rallyColors.green : rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="بالاترین"
            value={detail?.high ? `$${toPersianNum(Number(detail.high).toFixed(2))}` : '—'}
            icon={IconArrowUp}
            color={rallyColors.green}
            bgColor={rallyColors.green}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="پایین‌ترین"
            value={detail?.low ? `$${toPersianNum(Number(detail.low).toFixed(2))}` : '—'}
            icon={IconArrowDown}
            color={rallyColors.red}
            bgColor={rallyColors.red}
          />
        </Box>
      </SimpleGrid>

      {/* Price chart */}
      <RallyMainCard title="نمودار قیمت" mb="md">
        <Group mb="md" justify="flex-end">
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            data={COMMODITY_TIMEFRAMES}
            size="xs"
          />
        </Group>
        {chartData.length > 0 ? (
          <RallyLineChart
            data={chartData}
            height={400}
          />
        ) : (
          <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
        )}
      </RallyMainCard>

      {/* Info card */}
      <RallyMainCard title="اطلاعات کالا">
        <Stack gap="xs" style={{ direction: 'rtl' }}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">نام انگلیسی</Text>
            <Text size="sm" fw={600}>{meta.name ?? symbol}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">واحد</Text>
            <Text size="sm" fw={600}>{meta.unit ?? '—'}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">دسته</Text>
            <Text size="sm" fw={600}>{getCommodityCategory(symbol)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">نماد Yahoo Finance</Text>
            <Text size="sm" fw={600} ff="monospace">{meta.yf ?? '—'}</Text>
          </Group>
          {detail?.open && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">قیمت باز شدن</Text>
              <Text size="sm" fw={600}>${toPersianNum(Number(detail.open).toFixed(2))}</Text>
            </Group>
          )}
          {detail?.prev_close && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">بسته شدن قبلی</Text>
              <Text size="sm" fw={600}>${toPersianNum(Number(detail.prev_close).toFixed(2))}</Text>
            </Group>
          )}
        </Stack>
      </RallyMainCard>
    </PageShell>
  );
}
