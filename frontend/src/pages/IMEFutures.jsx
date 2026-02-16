import { useEffect, useState } from 'react';
import { Alert, Badge, Group } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';

export default function IMEFutures() {
  const [futures, setFutures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ime/futures');
      setFutures(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error && !futures.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'کد', width: 100 },
    { accessor: 'contract_description', title: 'شرح', width: 160 },
    { accessor: 'date_end', title: 'سررسید', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'روز مانده', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'آخرین', width: 90, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    { accessor: 'last_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'تسویه', width: 90, textAlign: 'end', render: (r) => r.settlement_price?.toLocaleString() },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'interest_open', title: 'موقعیت باز', width: 95, textAlign: 'end', render: (r) => r.interest_open?.toLocaleString() },
    { accessor: 'margin_initial', title: 'وجه تضمین', width: 90, textAlign: 'end', render: (r) => r.margin_initial?.toLocaleString() },
    { accessor: 'bid_price_1', title: 'خرید', width: 80, textAlign: 'end', render: (r) => r.bid_price_1?.toLocaleString() || '-' },
    { accessor: 'ask_price_1', title: 'فروش', width: 80, textAlign: 'end', render: (r) => r.ask_price_1?.toLocaleString() || '-' },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
  ];

  const paged = futures.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="آتی بورس کالا">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_futures" columns={columns} records={futures} />
      </PageHeader>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{futures.length} قرارداد</Badge>
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
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={futures.length}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
