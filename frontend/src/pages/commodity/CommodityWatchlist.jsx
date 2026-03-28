import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Text, ActionIcon, Tooltip } from '@mantine/core';
import { IconStarFilled } from '@tabler/icons-react';
import usePagination from '../../hooks/usePagination';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import { useCommodityPrices } from '../../hooks/useCommodityData';
import { COMMODITY_SYMBOLS, getCommodityCategory } from '../../constants/commodity';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

const WATCHLIST_KEY = 'commodity-watchlist';

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; } catch { return []; }
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

export function useCommodityWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist);

  const toggle = (symbol) => {
    const current = loadWatchlist();
    const next = current.includes(symbol)
      ? current.filter(s => s !== symbol)
      : [...current, symbol];
    saveWatchlist(next);
    setWatchlist(next);
  };

  const isWatched = (symbol) => watchlist.includes(symbol);

  return { watchlist, toggle, isWatched };
}

export default function CommodityWatchlist() {
  const navigate = useNavigate();
  const { watchlist, toggle } = useCommodityWatchlist();
  const { data: prices = [], isLoading } = useCommodityPrices();

  const watchedItems = useMemo(
    () => prices.filter(c => watchlist.includes(c.symbol)).map(p => ({
      ...p,
      name_fa: COMMODITY_SYMBOLS[p.symbol]?.name_fa ?? p.symbol,
      category_fa: getCommodityCategory(p.symbol),
    })),
    [prices, watchlist],
  );

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(watchedItems);

  const columns = [
    {
      accessor: 'star',
      title: '',
      width: 40,
      render: (r) => (
        <Tooltip label="حذف از دیده‌بان">
          <ActionIcon variant="subtle" size="sm" onClick={(e) => { e.stopPropagation(); toggle(r.symbol); }}>
            <IconStarFilled size={16} color="#EA580C" />
          </ActionIcon>
        </Tooltip>
      ),
    },
    {
      accessor: 'name_fa',
      title: 'کالا',
      sortable: true,
    },
    {
      accessor: 'category_fa',
      title: 'دسته',
      render: (r) => <Badge variant="light" color="orange" size="xs">{r.category_fa}</Badge>,
    },
    {
      accessor: 'price',
      title: 'قیمت',
      sortable: true,
      render: (r) => `$${toPersianNum(Number(r.price) >= 1000 ? Number(r.price).toLocaleString(undefined, { maximumFractionDigits: 0 }) : Number(r.price).toFixed(2))}`,
    },
    {
      accessor: 'change_pct',
      title: 'تغییر',
      sortable: true,
      render: (r) => <PercentChangeCell value={r.change_pct} />,
    },
  ];

  return (
    <>
      <RallyBreadcrumbs items={[{ label: 'کالاها', path: '/commodity' }, { label: 'دیده‌بان' }]} />
      <PageHeader title="دیده‌بان کالاها">
        <Badge color="orange" variant="light">{watchlist.length} کالا</Badge>
        <ExportButton data={watchedItems} filename="commodity-watchlist" />
      </PageHeader>

      <RallyMainCard noPadding>
        {watchlist.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            هنوز کالایی به دیده‌بان اضافه نشده. از صفحه داشبورد کالاها اضافه کنید.
          </Text>
        ) : (
          <RallyDataTable
            records={paged}
            columns={columns}
            onRowClick={({ record }) => navigate(`/commodity/${record.symbol}`)}
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            fetching={isLoading}
          />
        )}
      </RallyMainCard>
    </>
  );
}
