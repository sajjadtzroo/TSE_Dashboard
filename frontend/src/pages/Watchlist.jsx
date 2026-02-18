import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Text } from '@mantine/core';
import { IconStarFilled } from '@tabler/icons-react';
import usePagination from '../hooks/usePagination';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import PageHeader from '../components/PageHeader';
import DataFreshness from '../components/DataFreshness';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import WatchlistSummaryCard from '../components/watchlist/WatchlistSummaryCard';
import StockPreviewDrawer from '../components/stock/StockPreviewDrawer';
import useWatchlist from '../hooks/useWatchlist';
import { useMarketOverview } from '../hooks/useMarketData';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';

export default function Watchlist() {
  const { watchlist, removeSymbol } = useWatchlist();
  const [previewSymbol, setPreviewSymbol] = useState(null);
  const navigate = useNavigate();

  const { data: rawMarket = [], isLoading: loading, dataUpdatedAt } = useMarketOverview();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const watchedStocks = useMemo(
    () => rawMarket.filter((item) => watchlist.includes(item.symbol)),
    [rawMarket, watchlist],
  );

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(watchedStocks);

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
        <>
          {watchedStocks.length > 0 && (
            <WatchlistSummaryCard watchedStocks={watchedStocks} />
          )}

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
              onRowClick={({ record }) => setPreviewSymbol(record.symbol)}
              emptyMessage="داده‌ای موجود نیست"
            />
          </RallyMainCard>
        </>
      )}

      <StockPreviewDrawer symbol={previewSymbol} onClose={() => setPreviewSymbol(null)} />
    </>
  );
}
