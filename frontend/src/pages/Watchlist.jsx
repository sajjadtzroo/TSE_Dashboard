import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Text, Title } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import PageHeader from '../components/PageHeader';
import DataFreshness from '../components/DataFreshness';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';

export default function Watchlist() {
  const { watchlist, removeSymbol } = useWatchlist();
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (watchlist.length === 0) {
      setMarketData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get('/api/market-overview');
      const filtered = res.data.filter((item) => watchlist.includes(item.symbol));
      setMarketData(filtered);
      setLastUpdated(new Date());
    } catch {
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  }, [watchlist]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      accessor: 'star',
      title: '',
      width: 40,
      render: (r) => (
        <IconStarFilled
          size={16}
          color={rallyColors.yellow}
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); removeSymbol(r.symbol); }}
        />
      ),
    },
    { accessor: 'symbol', title: 'Symbol', width: 80 },
    { accessor: 'name_fa', title: 'Name', width: 150 },
    { accessor: 'close', title: 'Close Price', width: 100, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'close_change_pct', title: 'Change %', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'Volume', width: 110, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
  ];

  const paged = marketData.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader title="Watchlist">
        <DataFreshness lastUpdated={lastUpdated} />
        <Badge color="rally-yellow" variant="light">{watchlist.length} stocks</Badge>
      </PageHeader>

      {watchlist.length === 0 ? (
        <RallyMainCard>
          <Text c="dimmed" ta="center" py="xl">
            No stocks in your watchlist. Click the star icon on any stock to add it.
          </Text>
        </RallyMainCard>
      ) : (
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
            emptyMessage="No data for watched stocks"
          />
        </RallyMainCard>
      )}
    </>
  );
}
