import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Select } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import { toJalali } from '../utils/dateUtils';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';

export default function MarketOverview() {
  const [marketData, setMarketData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

  useEffect(() => { fetchSectors(); }, []);
  useEffect(() => { fetchMarketData(); }, [selectedSector]);

  const isFundSector = (s) => s && (s.includes('\u0635\u0646\u062f\u0648\u0642') || s.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc'));

  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors');
      setSectors(res.data.filter((s) => !isFundSector(s)));
    } catch (err) { console.error('Error fetching sectors:', err); }
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
      const res = await axios.get(`/api/market-overview${params}`);
      setMarketData(res.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (error && !marketData.length) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  const allColumns = [
    {
      accessor: '_star', title: '', width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    { accessor: 'symbol', title: 'Symbol', width: 80 },
    { accessor: 'name_fa', title: 'Name', width: 150 },
    { accessor: 'sector_name_fa', title: 'Sector', width: 120 },
    { accessor: 'date', title: 'Date', width: 90, render: (r) => toJalali(r.date) },
    { accessor: 'close', title: 'Close Price', width: 100, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'close_change_pct', title: 'Change %', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'low', title: 'Low', width: 80, textAlign: 'end', render: (r) => r.low?.toLocaleString() },
    { accessor: 'high', title: 'High', width: 80, textAlign: 'end', render: (r) => r.high?.toLocaleString() },
    { accessor: 'volume', title: 'Volume', width: 110, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'trades', title: 'Trades', width: 75, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
    { accessor: 'pe_ratio', title: 'P/E', width: 65, textAlign: 'end', render: (r) => r.pe_ratio?.toFixed(2) || '-' },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', render: (r) => r.eps?.toLocaleString() || '-' },
    { accessor: 'market_cap', title: 'Market Cap', width: 100, textAlign: 'end', render: (r) => r.market_cap ? (r.market_cap / 1e9).toFixed(2) + 'B' : '-' },
  ];

  const columns = visibleColumns || allColumns;
  const paged = marketData.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="Market Overview">
        <DataFreshness lastUpdated={lastUpdated} />
        <ColumnToggle columns={allColumns} storageKey="market-overview" onChange={setVisibleColumns} />
        <ExportButton filename="market-overview" columns={columns} records={marketData} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Filter by Sector"
            data={[{ value: '', label: 'All Sectors' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
            clearable
            searchable
            w={220}
            size="sm"
          />
          <RefreshButton onRefreshComplete={fetchMarketData} />
          <Badge color="rally-green" variant="light">{marketData.length} stocks</Badge>
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
          totalRecords={marketData.length}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="No market data available"
          onRetry={fetchMarketData}
          pinLeftColumns
        />
      </RallyMainCard>
    </>
  );
}
