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

export default function TickTrades() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [trades, setTrades] = useState([]);
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
      const res = await axios.get(`/api/stocks/${target}/tick-trades`);
      setTrades(res.data);
      setActiveSymbol(target);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); setTrades([]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchData(symbol); };

  const columns = [
    { accessor: 'row_num', title: '#', width: 50, textAlign: 'end' },
    { accessor: 'time', title: 'Time', width: 80 },
    { accessor: 'price', title: 'Price', width: 100, textAlign: 'end', render: (r) => r.price?.toLocaleString() },
    { accessor: 'volume', title: 'Volume', width: 100, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    {
      accessor: 'canceled', title: 'Canceled', width: 70,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.canceled ? 'rally-orange' : 'rally-green'}>
          {r.canceled ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  const paged = trades.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <RallyBreadcrumbs items={[
        { label: 'Dashboard', path: '/' },
        ...(activeSymbol ? [{ label: activeSymbol, path: `/stock/${activeSymbol}` }] : []),
        { label: 'Tick Trades' },
      ]} />
      <PageHeader title={`Tick Trades${activeSymbol ? ' - ' + activeSymbol : ''}`}><DataFreshness lastUpdated={lastUpdated} /><ExportButton filename="tick-trades" columns={columns} records={trades} /></PageHeader>

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
          {trades.length > 0 && (
            <Badge color="rally-green" variant="light">{trades.length} trades</Badge>
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
          totalRecords={trades.length}
        />
      </RallyMainCard>
    </>
  );
}
