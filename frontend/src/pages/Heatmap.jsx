import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Center, Group, Select, SimpleGrid, Text,
} from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyTreemap from '../components/charts/RallyTreemap';
import ColorScaleLegend from '../components/charts/ColorScaleLegend';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import useApiData from '../hooks/useApiData';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

export default function Heatmap() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [sizeMetric, setSizeMetric] = useState('market_cap');
  const navigate = useNavigate();

  const { data: rawMarket, loading, error, lastUpdated, refresh } = useApiData('/api/market-overview');
  const { data: rawSectors } = useApiData('/api/sectors');
  const marketData = useMemo(() => rawMarket.filter((item) => !isFundSector(item.sector_name_fa)), [rawMarket]);
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const filteredData = selectedSector
    ? marketData.filter((d) => d.sector_name_fa === selectedSector)
    : marketData;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const positive = filteredData.filter((d) => (d.close_change_pct || 0) > 0).length;
    const negative = filteredData.filter((d) => (d.close_change_pct || 0) < 0).length;
    const neutral = filteredData.length - positive - negative;
    return { positive, negative, neutral, total: filteredData.length };
  }, [filteredData]);

  if (loading && !marketData.length) {
    return (
      <>
        <PageHeader title="نقشه بازار" />
        <RallyChartSkeleton height={600} />
      </>
    );
  }

  if (error && !marketData.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  return (
    <>
      <PageHeader title="نقشه بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md" justify="space-between" wrap="wrap">
          <Group gap="md">
            <Select
              placeholder="فیلتر صنعت"
              data={[{ value: '', label: 'همه صنایع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              value={selectedSector || ''}
              onChange={(v) => setSelectedSector(v || null)}
              clearable
              searchable
              w={220}
              size="sm"
            />
            <Select
              label="اندازه بر اساس"
              data={[
                { value: 'market_cap', label: 'ارزش بازار' },
                { value: 'volume', label: 'حجم' },
              ]}
              value={sizeMetric}
              onChange={(v) => setSizeMetric(v)}
              w={160}
              size="sm"
            />
          </Group>

          {/* Market statistics */}
          {stats && (
            <Group gap="xs">
              <Badge
                size="md"
                variant="light"
                color="rally-green"
                leftSection={<IconTrendingUp size={14} />}
              >
                {formatNum(stats.positive)}
              </Badge>
              <Badge
                size="md"
                variant="light"
                color="gray"
                leftSection={<IconMinus size={14} />}
              >
                {formatNum(stats.neutral)}
              </Badge>
              <Badge
                size="md"
                variant="light"
                color="rally-orange"
                leftSection={<IconTrendingDown size={14} />}
              >
                {formatNum(stats.negative)}
              </Badge>
              <Text size="xs" c="dimmed" fw={500}>
                از {formatNum(stats.total)} نماد
              </Text>
            </Group>
          )}
        </Group>
      </RallyMainCard>

      <RallyMainCard>
        {filteredData.length > 0 ? (
          <>
            <RallyTreemap
              data={filteredData}
              groupBy="sector_name_fa"
              sizeAccessor={sizeMetric}
              colorAccessor="close_change_pct"
              onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
              height={Math.max(500, Math.min(800, Math.round(window.innerHeight * 0.65)))}
            />
            <ColorScaleLegend
              min={Math.min(...filteredData.map((d) => d.close_change_pct || 0), -1)}
              max={Math.max(...filteredData.map((d) => d.close_change_pct || 0), 1)}
            />
          </>
        ) : (
          <Center py="xl">
            <Alert color="gray">داده‌ای موجود نیست</Alert>
          </Center>
        )}
      </RallyMainCard>
    </>
  );
}
