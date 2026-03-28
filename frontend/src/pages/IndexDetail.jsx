import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert, Badge, Grid, Group, Title,
} from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import { useMarketIndices, useMarketIndexHistory } from '../hooks/useMarketData';
import useIndicatorPrefs from '../hooks/useIndicatorPrefs';

import usePagination from '../hooks/usePagination';
import IndexDetailTabs from './index/IndexDetailTabs';
import IndexInfoSidebar from './index/IndexInfoSidebar';

export default function IndexDetail() {
  const { name: rawName } = useParams();
  const decodedName = (() => {
    try { return decodeURIComponent(rawName); } catch { return rawName; }
  })();

  const [selectedDuration, setSelectedDuration] = useState('365');

  // Technical indicator preferences (persisted in localStorage)
  const { prefs: indicatorPrefs, toggle: toggleIndicator } = useIndicatorPrefs();

  // Fetch all indices and find the current one client-side
  const { data: indices, isLoading: indicesLoading, error: indicesError } = useMarketIndices();
  const indexData = useMemo(
    () => (indices || []).find((i) => i.name === decodedName),
    [indices, decodedName],
  );

  // Fetch OHLCV history for the chart + table
  const days = selectedDuration === '0' ? 9999 : Number(selectedDuration);
  const { data: history = [], isLoading: historyLoading } = useMarketIndexHistory(decodedName, { days });

  // Pagination for history table (newest first)
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [history],
  );
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedHistory);

  const breadcrumbs = [
    { label: 'داشبورد', path: '/dashboard' },
    { label: 'شاخص‌ها', path: '/dashboard/market-indices' },
    { label: decodedName },
  ];

  // Loading state
  if (indicesLoading) return (
    <>
      <RallyBreadcrumbs items={breadcrumbs} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={400} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RallyKPISkeleton animateValue />
        </Grid.Col>
      </Grid>
    </>
  );

  // Error state
  if (indicesError) return <Alert color="red">خطا در بارگذاری: {indicesError.message || String(indicesError)}</Alert>;

  // Not found
  if (!indexData) return (
    <>
      <RallyBreadcrumbs items={breadcrumbs} />
      <Alert color="yellow">شاخص «{decodedName}» یافت نشد.</Alert>
    </>
  );

  return (
    <>
      <RallyBreadcrumbs items={breadcrumbs} />

      {/* Header */}
      <Group gap="sm" mb="md" wrap="wrap">
        <Title order={3}>{decodedName}</Title>
        {indexData?.state && (
          <Badge color="rally-blue" variant="light">{indexData.state}</Badge>
        )}
      </Group>

      <Grid gutter="md">
        {/* Tabs (Chart / History / Comparison) */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <IndexDetailTabs
            indexName={decodedName}
            history={history}
            historyLoading={historyLoading}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            indicatorPrefs={indicatorPrefs}
            toggleIndicator={toggleIndicator}

            historyPaged={paged}
            page={page}
            setPage={setPage}
            perPage={perPage}
            setPerPage={setPerPage}
            totalRecords={totalRecords}
          />
        </Grid.Col>

        {/* Info Sidebar */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <IndexInfoSidebar index={indexData} />
        </Grid.Col>
      </Grid>
    </>
  );
}
