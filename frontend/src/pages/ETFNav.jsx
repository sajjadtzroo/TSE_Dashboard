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
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 90 },
    { accessor: 'name_fa', title: 'Name', width: 160 },
    { accessor: 'nav_issuance', title: 'NAV Issuance', width: 110, textAlign: 'end', render: (r) => r.nav_issuance?.toLocaleString() },
    { accessor: 'nav_redemption', title: 'NAV Redemption', width: 110, textAlign: 'end', render: (r) => r.nav_redemption?.toLocaleString() },
    { accessor: 'last_price', title: 'Last Price', width: 100, textAlign: 'end', render: (r) => r.last_price?.toLocaleString() },
    { accessor: 'bubble_pct', title: 'Bubble%', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.bubble_pct} /> },
    { accessor: 'fund_type', title: 'Fund Type', width: 90 },
  ];

  const paged = etfs.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="ETF NAV"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="etf-nav" columns={columns} records={etfs} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <RefreshButton onRefreshComplete={fetchData} />
          <Badge color="rally-green" variant="light">{etfs.length} ETFs</Badge>
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
          emptyMessage="No ETF data available"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
