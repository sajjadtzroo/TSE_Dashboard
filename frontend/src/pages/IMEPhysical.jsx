import { Alert, Badge, Group } from '@mantine/core';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { formatNum } from '../utils/formatUtils';

export default function IMEPhysical() {
  const { data: physical, loading, error, lastUpdated, refresh } = useApiData('/api/ime/physical');
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(physical);

  if (error && !physical.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'code_offer', title: 'کد عرضه', width: 90 },
    { accessor: 'producer', title: 'تولیدکننده', width: 130 },
    { accessor: 'price_last', title: 'آخرین قیمت', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_last) },
    { accessor: 'price_base_offer', title: 'قیمت پایه', width: 90, textAlign: 'end', render: (r) => formatNum(r.price_base_offer) },
    { accessor: 'volume_contract', title: 'حجم قرارداد', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume_contract) },
    { accessor: 'demand', title: 'تقاضا', width: 80, textAlign: 'end', render: (r) => formatNum(r.demand) },
    { accessor: 'value', title: 'ارزش', width: 90, textAlign: 'end', render: (r) => formatNum(r.value) },
    { accessor: 'settlement_type', title: 'تسویه', width: 80 },
    { accessor: 'market_hall', title: 'تالار', width: 80 },
  ];

  return (
    <>
      <PageHeader title="فیزیکی بورس کالا">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_physical" columns={columns} records={physical} />
      </PageHeader>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(physical.length)} مورد</Badge>
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
        />
      </RallyMainCard>
    </>
  );
}
