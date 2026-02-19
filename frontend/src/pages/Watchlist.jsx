import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Text, ActionIcon, Popover, NumberInput, Stack, Button, Group, Tooltip } from '@mantine/core';
import { IconStarFilled, IconBell, IconBellOff, IconBellRinging } from '@tabler/icons-react';
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

function AlertPopover({ symbol, currentPrice, alerts, setAlert, clearAlert }) {
  const [high, setHigh] = useState(alerts[symbol]?.high ?? '');
  const [low, setLow] = useState(alerts[symbol]?.low ?? '');
  const hasAlert = !!alerts[symbol];

  const handleSave = () => {
    setAlert(symbol, {
      high: high !== '' ? Number(high) : undefined,
      low: low !== '' ? Number(low) : undefined,
    });
  };

  return (
    <Stack gap="xs" style={{ minWidth: 200 }}>
      <Text size="sm" fw={600}>{symbol} — هشدار قیمت</Text>
      <NumberInput
        label="سقف قیمت"
        placeholder={currentPrice ? `فعلی: ${formatNum(currentPrice)}` : ''}
        value={high}
        onChange={setHigh}
        size="xs"
        min={0}
        dir="ltr"
        styles={{ input: { textAlign: 'left' } }}
      />
      <NumberInput
        label="کف قیمت"
        placeholder={currentPrice ? `فعلی: ${formatNum(currentPrice)}` : ''}
        value={low}
        onChange={setLow}
        size="xs"
        min={0}
        dir="ltr"
        styles={{ input: { textAlign: 'left' } }}
      />
      <Group gap="xs">
        <Button size="xs" color="rally-green" onClick={handleSave} style={{ flex: 1 }}>ذخیره</Button>
        {hasAlert && (
          <Button size="xs" variant="light" color="red" onClick={() => clearAlert(symbol)}>حذف</Button>
        )}
      </Group>
    </Stack>
  );
}

export default function Watchlist() {
  const { watchlist, removeSymbol, alerts, setAlert, clearAlert, checkAlerts, requestNotificationPermission } = useWatchlist();
  const [previewSymbol, setPreviewSymbol] = useState(null);
  const navigate = useNavigate();

  const { data: rawMarket = [], isLoading: loading, dataUpdatedAt } = useMarketOverview();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const watchedStocks = useMemo(
    () => rawMarket.filter((item) => watchlist.includes(item.symbol)),
    [rawMarket, watchlist],
  );

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(watchedStocks);

  // Check alerts whenever market data updates
  useEffect(() => {
    if (watchedStocks.length > 0) {
      const priceMap = {};
      for (const s of watchedStocks) priceMap[s.symbol] = s.close;
      checkAlerts(priceMap);
    }
  }, [watchedStocks, checkAlerts]);

  // Request notification permission on first render
  useEffect(() => { requestNotificationPermission(); }, [requestNotificationPermission]);

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
    {
      accessor: 'alert',
      title: 'هشدار',
      width: 50,
      textAlign: 'center',
      render: (r) => {
        const hasAlert = !!alerts[r.symbol];
        return (
          <Popover width={240} position="bottom" shadow="md" withArrow>
            <Popover.Target>
              <Tooltip label={hasAlert ? 'ویرایش هشدار' : 'تنظیم هشدار'}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color={hasAlert ? 'rally-green' : 'gray'}
                  onClick={(e) => e.stopPropagation()}
                >
                  {hasAlert ? <IconBellRinging size={16} /> : <IconBell size={16} />}
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
              <AlertPopover symbol={r.symbol} currentPrice={r.close} alerts={alerts} setAlert={setAlert} clearAlert={clearAlert} />
            </Popover.Dropdown>
          </Popover>
        );
      },
    },
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
