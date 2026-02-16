import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Group, TextInput, Title } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import rallyColors from '../theme/rallyColors';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';

export default function Shareholders() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [shareholders, setShareholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { if (urlSymbol) fetchData(urlSymbol); }, [urlSymbol]);

  const fetchData = async (sym) => {
    const target = sym || activeSymbol;
    if (!target) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/stocks/${target}/shareholders`);
      setShareholders(res.data);
      setActiveSymbol(target);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); setShareholders([]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchData(symbol); };

  const columns = [
    { accessor: 'name', title: 'Name', width: 200 },
    { accessor: 'volume', title: 'Volume', width: 100, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'percent', title: 'Percent', width: 80, textAlign: 'end', render: (r) => r.percent != null ? `${r.percent.toFixed(2)}%` : '-' },
    {
      accessor: 'change', title: 'Change', width: 100, textAlign: 'end',
      render: (r) => {
        const val = r.change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.orange : undefined;
        return <span style={{ color, fontWeight: 600 }}>{val > 0 ? '+' : ''}{val.toLocaleString()}</span>;
      },
    },
  ];

  const paged = shareholders.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'Dashboard', path: '/' },
        ...(activeSymbol ? [{ label: activeSymbol, path: `/stock/${activeSymbol}` }] : []),
        { label: 'Shareholders' },
      ]} />
      <PageHeader title={`Shareholders${activeSymbol ? ' - ' + activeSymbol : ''}`}><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="shareholders" columns={columns} records={shareholders} /></PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <TextInput
            value={symbol}
            onChange={(e) => setSymbol(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter symbol and press Enter"
            size="sm"
            w={220}
          />
          <RefreshButton onRefreshComplete={() => fetchData()} />
          {shareholders.length > 0 && (
            <Badge color="rally-green" variant="light">{shareholders.length} shareholders</Badge>
          )}
        </Group>
      </RallyMainCard>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={shareholders.length}
        />
      </RallyMainCard>
    </>
  );
}
