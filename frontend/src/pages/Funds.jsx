import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Select, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import { toJalali } from '../utils/dateUtils';

export default function Funds() {
  const [fundsData, setFundsData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const navigate = useNavigate();

  useEffect(() => { fetchSectors(); }, []);
  useEffect(() => { fetchFundsData(); }, [selectedSector]);

  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors');
      setSectors(res.data.filter((s) => s && (s.includes('\u0635\u0646\u062f\u0648\u0642') || s.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc'))));
    } catch (err) { console.error('Error fetching sectors:', err); }
  };

  const fetchFundsData = async () => {
    try {
      setLoading(true);
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
      const res = await axios.get(`/api/market-overview${params}`);
      const funds = res.data.filter((item) => {
        const sector = item.sector_name_fa || '';
        return sector.includes('\u0635\u0646\u062f\u0648\u0642') || sector.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc');
      });
      setFundsData(funds);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error && !fundsData.length) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 80 },
    { accessor: 'name_fa', title: 'Name', width: 180 },
    { accessor: 'sector_name_fa', title: 'Type', width: 140 },
    { accessor: 'date', title: 'Date', width: 90, render: (r) => toJalali(r.date) },
    { accessor: 'close', title: 'NAV / Price', width: 100, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'close_change_pct', title: 'Change %', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'Volume', width: 110, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'trades', title: 'Trades', width: 75, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', render: (r) => r.eps?.toLocaleString() || 'N/A' },
  ];

  const paged = fundsData.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="Investment Funds"><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="funds" columns={columns} records={fundsData} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Filter by Type"
            data={[{ value: '', label: 'All Fund Types' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
            clearable
            searchable
            w={250}
            size="sm"
          />
          <RefreshButton onRefreshComplete={fetchFundsData} />
          <Badge color="rally-purple" variant="light">{fundsData.length} funds</Badge>
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={fundsData.length}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="No fund data available"
          onRetry={fetchFundsData}
        />
      </RallyMainCard>
    </>
  );
}
