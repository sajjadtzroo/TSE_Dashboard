import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Text, Title } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import axios from 'axios';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import PageHeader from '../components/PageHeader';
import DataFreshness from '../components/DataFreshness';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';

export default function Watchlist() {
  const { watchlist, removeSymbol } = useWatchlist();
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(marketData);

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
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 150 },
    { accessor: 'close', title: 'قیمت پایانی', width: 100, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
  ];

  return (
    <>
      <PageHeader title="دیده‌بان">
        <DataFreshness lastUpdated={lastUpdated} />
        <Badge color="rally-yellow" variant="light">{formatNum(watchlist.length)} نماد</Badge>
      </PageHeader>

      {watchlist.length === 0 ? (
        <RallyMainCard>
          <Text c="dimmed" ta="center" py="xl">
            نمادی در دیده‌بان شما نیست. روی ستاره کلیک کنید تا اضافه شود.
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
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => navigate(`/dashboard/stock/${record.symbol}`)}
            emptyMessage="داده‌ای موجود نیست"
          />
        </RallyMainCard>
      )}
    </>
  );
}
