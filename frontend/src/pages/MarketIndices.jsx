import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Loader, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import rallyColors from '../theme/rallyColors';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';

export default function MarketIndices() {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/market/indices');
      setIndices(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error && !indices.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'name', title: 'نام', width: 160 },
    { accessor: 'index_value', title: 'مقدار', width: 100, textAlign: 'end', render: (r) => r.index_value?.toLocaleString() },
    { accessor: 'index_change', title: 'تغییر', width: 90, textAlign: 'end', render: (r) => r.index_change?.toLocaleString() },
    { accessor: 'index_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.index_change_pct} /> },
    { accessor: 'min_value', title: 'کمترین', width: 90, textAlign: 'end', render: (r) => r.min_value?.toLocaleString() },
    { accessor: 'max_value', title: 'بیشترین', width: 90, textAlign: 'end', render: (r) => r.max_value?.toLocaleString() },
    { accessor: 'volume', title: 'حجم', width: 90, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'value', title: 'ارزش', width: 100, textAlign: 'end', render: (r) => r.value?.toLocaleString() },
    { accessor: 'state', title: 'وضعیت', width: 70 },
  ];

  const paged = indices.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="شاخص‌های بازار"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="market-indices" columns={columns} records={indices} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{indices.length} شاخص</Badge>
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
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={indices.length}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
