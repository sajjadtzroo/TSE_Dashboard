import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert, Badge, Grid, Group, Title,
} from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import { useMarketIndices, useMarketIndexHistory } from '../hooks/useMarketData';
import usePagination from '../hooks/usePagination';
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';
import IndexChartSection from './index/IndexChartSection';
import IndexInfoSidebar from './index/IndexInfoSidebar';

export default function IndexDetail() {
  const { name: rawName } = useParams();
  // useParams() already decodes URI components; fallback decodeURIComponent for safety
  const decodedName = (() => {
    try { return decodeURIComponent(rawName); } catch { return rawName; }
  })();

  const [selectedDuration, setSelectedDuration] = useState('365');

  // Fetch all indices and find the current one client-side
  const { data: indices, isLoading: indicesLoading, error: indicesError } = useMarketIndices();
  const indexData = useMemo(
    () => (indices || []).find((i) => i.name === decodedName),
    [indices, decodedName],
  );

  // Fetch history for the chart + table
  const days = selectedDuration === '0' ? 9999 : Number(selectedDuration);
  const { data: history, isLoading: historyLoading } = useMarketIndexHistory(decodedName, { days });

  // Pagination for history table
  const sortedHistory = useMemo(
    () => [...(history || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
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
          <RallyKPISkeleton variant="accent-bar" />
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

  // History table columns
  const historyColumns = [
    { accessor: 'date', title: 'تاریخ', width: 100, render: (r) => toJalali(r.date) },
    { accessor: 'index_value', title: 'مقدار شاخص', width: 110, textAlign: 'end', render: (r) => formatNum(r.index_value) },
    { accessor: 'index_change_pct', title: 'تغییر ٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.index_change_pct} /> },
  ];

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
        {/* Chart + History Table */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <IndexChartSection
            history={history}
            historyLoading={historyLoading}
            duration={selectedDuration}
            onDurationChange={setSelectedDuration}
          />

          {(history || []).length > 0 && (
            <RallyMainCard title={`داده‌های تاریخی (${formatNum((history || []).length)} روز)`} noPadding>
              <RallyDataTable
                records={paged}
                columns={historyColumns}
                idAccessor="date"
                page={page}
                onPageChange={setPage}
                recordsPerPage={perPage}
                onRecordsPerPageChange={setPerPage}
                totalRecords={totalRecords}
                minHeight={300}
              />
            </RallyMainCard>
          )}
        </Grid.Col>

        {/* Info Sidebar */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <IndexInfoSidebar index={indexData} />
        </Grid.Col>
      </Grid>
    </>
  );
}
