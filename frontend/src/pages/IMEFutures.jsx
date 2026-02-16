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
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'contract_code', title: 'Code', width: 100 },
    { accessor: 'contract_description', title: 'Description', width: 160 },
    { accessor: 'date_end', title: 'Expiry', width: 90, render: (r) => toJalali(r.date_end) },
    { accessor: 'day_remain', title: 'Days Left', width: 70, textAlign: 'end' },
    { accessor: 'last', title: 'Last', width: 90, textAlign: 'end', render: (r) => r.last?.toLocaleString() },
    { accessor: 'last_change_pct', title: 'Change%', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.last_change_pct} /> },
    { accessor: 'settlement_price', title: 'Settlement', width: 90, textAlign: 'end', render: (r) => r.settlement_price?.toLocaleString() },
    { accessor: 'volume', title: 'Volume', width: 80, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'interest_open', title: 'Open Interest', width: 95, textAlign: 'end', render: (r) => r.interest_open?.toLocaleString() },
    { accessor: 'margin_initial', title: 'Margin', width: 90, textAlign: 'end', render: (r) => r.margin_initial?.toLocaleString() },
    { accessor: 'bid_price_1', title: 'Bid', width: 80, textAlign: 'end', render: (r) => r.bid_price_1?.toLocaleString() || '-' },
    { accessor: 'ask_price_1', title: 'Ask', width: 80, textAlign: 'end', render: (r) => r.ask_price_1?.toLocaleString() || '-' },
    { accessor: 'trades', title: 'Trades', width: 65, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
  ];

  const paged = futures.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="IME Futures">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="ime_futures" columns={columns} records={futures} />
      </PageHeader>
      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{futures.length} contracts</Badge>
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
          emptyMessage="No futures data available"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
