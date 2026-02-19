import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Text, ActionIcon, Group, Popover, NumberInput, Stack, Button, Tooltip } from '@mantine/core';
import { IconStarFilled, IconBell, IconBellRinging } from '@tabler/icons-react';
import usePagination from '../../hooks/usePagination';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import CryptoIcon from '../../components/CryptoIcon';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import rallyColors from '../../theme/rallyColors';
import { formatVolume, toPersianNum } from '../../utils/formatUtils';

const WATCHLIST_KEY = 'crypto-watchlist';

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; } catch { return []; }
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

export function useCryptoWatchlist() {
  const [watchlist, setWatchlist] = useState(loadWatchlist);

  const toggle = (symbol) => {
    const current = loadWatchlist();
    const next = current.includes(symbol)
      ? current.filter((s) => s !== symbol)
      : [...current, symbol];
    saveWatchlist(next);
    setWatchlist(next);
  };

  const isWatched = (symbol) => watchlist.includes(symbol);

  return { watchlist, toggle, isWatched };
}

export default function CryptoWatchlist() {
  const navigate = useNavigate();
  const { watchlist, toggle } = useCryptoWatchlist();
  const { data: market = [], isLoading } = useCryptoMarket();

  const watchedCoins = useMemo(
    () => market.filter((c) => watchlist.includes(c.symbol)),
    [market, watchlist],
  );

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(watchedCoins);

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
          onClick={(e) => { e.stopPropagation(); toggle(r.symbol); }}
        />
      ),
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 120,
      render: (r) => (
        <Group gap={8} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={22} />
          <Text size="sm" fw={600}>{r.symbol}</Text>
        </Group>
      ),
    },
    { accessor: 'name_fa', title: 'نام', width: 120, render: (r) => r.name_fa || r.symbol },
    {
      accessor: 'last_price',
      title: 'قیمت (USDT)',
      width: 130,
      textAlign: 'end',
      render: (r) => r.last_price ? '$' + toPersianNum(Number(r.last_price).toLocaleString(undefined, { maximumFractionDigits: 2 })) : '-',
    },
    {
      accessor: 'price_change_pct_24h',
      title: 'تغییر ۲۴h ٪',
      width: 110,
      textAlign: 'end',
      render: (r) => <PercentChangeCell value={r.price_change_pct_24h} />,
    },
    {
      accessor: 'volume_24h',
      title: 'حجم ۲۴h',
      width: 120,
      textAlign: 'end',
      render: (r) => formatVolume(r.volume_24h),
    },
    {
      accessor: 'price_toman',
      title: 'قیمت (تومان)',
      width: 130,
      textAlign: 'end',
      render: (r) => r.price_toman ? toPersianNum(Number(r.price_toman).toLocaleString()) + ' T' : '-',
    },
  ];

  return (
    <>
      <PageHeader title="دیده‌بان رمزارزها">
        <Badge color="yellow" variant="light">{watchlist.length} رمزارز</Badge>
      </PageHeader>

      {watchlist.length === 0 ? (
        <RallyMainCard>
          <Text c="dimmed" ta="center" py="xl">
            رمزارزی در دیده‌بان شما نیست. از صفحه داشبورد رمزارزها اضافه کنید.
          </Text>
        </RallyMainCard>
      ) : (
        <RallyMainCard noPadding>
          <RallyDataTable
            records={paged}
            columns={columns}
            idAccessor="symbol"
            loading={isLoading}
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => navigate(`/crypto/coin/${record.symbol}`)}
            emptyMessage="داده‌ای موجود نیست"
          />
        </RallyMainCard>
      )}
    </>
  );
}
