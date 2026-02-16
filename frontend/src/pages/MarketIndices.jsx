import { Alert, Badge, Group } from '@mantine/core';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { formatNum } from '../utils/formatUtils';

export default function MarketIndices() {
  const { data: indices, loading, error, lastUpdated, refresh } = useApiData('/api/market/indices');
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(indices);

  if (error && !indices.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'index_value', title: 'مقدار', width: 100, textAlign: 'end', render: (r) => formatNum(r.index_value) },
    { accessor: 'index_change', title: 'تغییر', width: 90, textAlign: 'end', render: (r) => formatNum(r.index_change) },
    { accessor: 'index_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.index_change_pct} /> },
    { accessor: 'min_value', title: 'کمترین', width: 90, textAlign: 'end', render: (r) => formatNum(r.min_value) },
    { accessor: 'max_value', title: 'بیشترین', width: 90, textAlign: 'end', render: (r) => formatNum(r.max_value) },
    { accessor: 'volume', title: 'حجم', width: 90, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'value', title: 'ارزش', width: 100, textAlign: 'end', render: (r) => formatNum(r.value) },
    { accessor: 'state', title: 'وضعیت', width: 70 },
  ];

  return (
    <>
      <PageHeader title="شاخص‌های بازار"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="market-indices" columns={columns} records={indices} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(indices.length)} شاخص</Badge>
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
