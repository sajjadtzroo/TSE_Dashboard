import { useEffect, useState } from 'react';
import { Alert, Badge, Group, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';

export default function ETFNav() {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/market/etf-nav');
      setEtfs(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error && !etfs.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 90 },
    { accessor: 'name_fa', title: 'نام', width: 160 },
    { accessor: 'nav_issuance', title: 'NAV صدور', width: 110, textAlign: 'end', render: (r) => r.nav_issuance?.toLocaleString() },
    { accessor: 'nav_redemption', title: 'NAV ابطال', width: 110, textAlign: 'end', render: (r) => r.nav_redemption?.toLocaleString() },
    { accessor: 'last_price', title: 'آخرین قیمت', width: 100, textAlign: 'end', render: (r) => r.last_price?.toLocaleString() },
    { accessor: 'bubble_pct', title: 'حباب٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.bubble_pct} /> },
    { accessor: 'fund_type', title: 'نوع صندوق', width: 90 },
  ];

  const paged = etfs.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="NAV صندوق‌ها"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="etf-nav" columns={columns} records={etfs} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{etfs.length} صندوق</Badge>
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
          totalRecords={etfs.length}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
