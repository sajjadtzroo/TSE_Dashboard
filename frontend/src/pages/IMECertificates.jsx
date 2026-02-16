import { useState } from 'react';
import { Alert, Badge, Group, SegmentedControl } from '@mantine/core';
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

export default function IMECertificates() {
  const [certType, setCertType] = useState('all');

  const { data: certificates, loading, error, lastUpdated, refresh } = useApiData('/api/ime/certificates');

  const filteredCerts = certType === 'all' ? certificates : certificates.filter((r) => String(r.cert_type) === certType);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredCerts);

  if (error && !certificates.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'commodity', title: 'کالا', width: 100 },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => formatNum(r.last) },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => formatNum(r.settlement_price) },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => formatNum(r.trades) },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => formatNum(r.ask_price_1) },
  ];

  return (
    <>
      <PageHeader title="گواهی سپرده کالایی">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_certificates" columns={columns} records={filteredCerts} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <SegmentedControl
            size="xs"
            value={certType}
            onChange={(v) => { setCertType(v); setPage(1); }}
            data={[
              { label: 'همه', value: 'all' },
              { label: 'عمومی', value: '1' },
              { label: 'سکه/زعفران', value: '2' },
            ]}
          />
          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">{formatNum(filteredCerts.length)} گواهی</Badge>
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
