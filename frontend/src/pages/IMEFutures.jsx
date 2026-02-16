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
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';

export default function IMEFutures() {
  const { data: futures, loading, error, lastUpdated, refresh } = useApiData('/api/ime/futures');
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(futures);

  if (error && !futures.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'contract_description', title: 'شرح', width: 160 },
    { accessor: 'date_end', title: 'سررسید', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'interest_open', title: 'موقعیت باز', width: 95, textAlign: 'end', render: (r) => formatNum(r.interest_open) },
    { accessor: 'margin_initial', title: 'وجه تضمین', width: 90, textAlign: 'end', render: (r) => formatNum(r.margin_initial) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
  ];

  return (
    <>
      <PageHeader title="آتی بورس کالا">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_futures" columns={columns} records={futures} />
      </PageHeader>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(futures.length)} قرارداد</Badge>
        </Group>
      </RallyMainCard>
      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          pinLeftColumns
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
