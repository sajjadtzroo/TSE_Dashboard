import { Alert, Badge, Group } from '@mantine/core';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import { formatNum } from '../utils/formatUtils';

export default function ETFNav() {
  const { data: etfs, loading, error, lastUpdated, refresh } = useApiData('/api/market/etf-nav');
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(etfs);

  if (error && !etfs.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name_fa', title: 'نام', width: 160 },
    { accessor: 'nav_issuance', title: 'NAV صدور', width: 110, textAlign: 'end', render: (r) => formatNum(r.nav_issuance) },
    { accessor: 'nav_redemption', title: 'NAV ابطال', width: 110, textAlign: 'end', render: (r) => formatNum(r.nav_redemption) },
    { accessor: 'last_price', title: 'آخرین قیمت', width: 100, textAlign: 'end', render: (r) => formatNum(r.last_price) },
    { accessor: 'bubble_pct', title: 'حباب٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.bubble_pct} /> },
    { accessor: 'fund_type', title: 'نوع صندوق', width: 90 },
  ];

  return (
    <>
      <PageHeader title="NAV صندوق‌ها"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="etf-nav" columns={columns} records={etfs} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(etfs.length)} صندوق</Badge>
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
