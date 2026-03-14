import { useState, useEffect } from 'react';
import { Stack, Text, Title, Divider, Group, Loader } from '@mantine/core';
import { DERIBIT_COINS, deribitRest } from '../../../services/deribit';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import CryptoIcon from '../../../components/CryptoIcon';
import { formatVol, toPersianNum } from '../../../utils/formatUtils';

function formatPrice(v) {
  if (v == null) return '-';
  return '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatFunding(v) {
  if (v == null) return '-';
  return (v * 100).toFixed(4) + '%';
}

function formatOI(v) {
  if (v == null) return '-';
  if (v >= 1e9) return toPersianNum((v / 1e9).toFixed(1)) + 'B';
  if (v >= 1e6) return toPersianNum((v / 1e6).toFixed(1)) + 'M';
  if (v >= 1e3) return toPersianNum((v / 1e3).toFixed(0)) + 'K';
  return toPersianNum(String(v));
}

/** Section A: Perpetual contracts live via parent WS messages */
function PerpetualsTable({ messages }) {
  const records = DERIBIT_COINS.map(coin => {
    const channel = `ticker.${coin.perpetual}.100ms`;
    const ticker = messages[channel];
    return {
      symbol: coin.symbol,
      instrument: coin.perpetual,
      mark_price: ticker?.mark_price ?? null,
      index_price: ticker?.index_price ?? null,
      price_change_pct: ticker?.stats?.price_change ?? null,
      funding_8h: ticker?.funding_8h ?? null,
      open_interest: ticker?.open_interest ?? null,
      volume_usd: ticker?.stats?.volume_usd ?? null,
    };
  });

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 120,
      render: r => (
        <Group gap={8} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={22} />
          <Text size="sm" fw={600}>{r.symbol}</Text>
        </Group>
      ),
    },
    {
      accessor: 'mark_price',
      title: 'مارک پرایس',
      width: 140,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatPrice(r.mark_price)}</Text>,
    },
    {
      accessor: 'index_price',
      title: 'قیمت ایندکس',
      width: 140,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatPrice(r.index_price)}</Text>,
    },
    {
      accessor: 'price_change_pct',
      title: 'بازده ۲۴h%',
      width: 110,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.price_change_pct} />,
    },
    {
      accessor: 'funding_8h',
      title: 'فاندینگ ۸h%',
      width: 110,
      textAlign: 'end',
      render: r => (
        <Text
          size="sm"
          fw={600}
          c={r.funding_8h > 0 ? 'green' : r.funding_8h < 0 ? 'red' : undefined}
          style={{ direction: 'ltr' }}
        >
          {formatFunding(r.funding_8h)}
        </Text>
      ),
    },
    {
      accessor: 'open_interest',
      title: 'بهره باز',
      width: 110,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatOI(r.open_interest)}</Text>,
    },
    {
      accessor: 'volume_usd',
      title: 'حجم ۲۴h',
      width: 120,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatVol(r.volume_usd)}</Text>,
    },
  ];

  return (
    <RallyDataTable
      records={records}
      columns={columns}
      idAccessor="instrument"
      emptyMessage="در حال دریافت داده..."
      minHeight={260}
    />
  );
}

/** Section B: Dated futures polled via REST every 30 s */
function DatedFuturesTable() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDated() {
      try {
        // Fetch BTC + ETH dated futures in parallel
        const [btc, eth] = await Promise.all([
          deribitRest('public/get_book_summary_by_currency', { currency: 'BTC', kind: 'future' }),
          deribitRest('public/get_book_summary_by_currency', { currency: 'ETH', kind: 'future' }),
        ]);
        if (cancelled) return;

        const allFutures = [...(btc || []), ...(eth || [])];
        const dated = allFutures
          .filter(f => !f.instrument_name.endsWith('-PERPETUAL'))
          .map(f => {
            // Parse expiry from instrument name, e.g. BTC-28MAR25 → 28MAR25
            const parts = f.instrument_name.split('-');
            const expiry = parts.length >= 2 ? parts[1] : '-';
            const baseCurrency = parts[0];
            return {
              instrument_name: f.instrument_name,
              base_currency: baseCurrency,
              expiry,
              mark_price: f.mark_price ?? null,
              price_change: f.price_change ?? null,
              open_interest: f.open_interest ?? null,
            };
          })
          .sort((a, b) => a.instrument_name.localeCompare(b.instrument_name));

        setRecords(dated);
      } catch (_) {
        // keep stale data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDated();
    const interval = setInterval(fetchDated, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const columns = [
    {
      accessor: 'instrument_name',
      title: 'قرارداد',
      width: 160,
      render: r => (
        <Group gap={8} wrap="nowrap">
          <CryptoIcon symbol={r.base_currency} size={20} />
          <Text size="sm" fw={600} style={{ direction: 'ltr' }}>{r.instrument_name}</Text>
        </Group>
      ),
    },
    {
      accessor: 'mark_price',
      title: 'مارک پرایس',
      width: 140,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatPrice(r.mark_price)}</Text>,
    },
    { accessor: 'expiry', title: 'سررسید', width: 100, render: r => r.expiry },
    {
      accessor: 'price_change',
      title: 'بازده ۲۴h%',
      width: 110,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.price_change} />,
    },
    {
      accessor: 'open_interest',
      title: 'بهره باز',
      width: 110,
      textAlign: 'end',
      render: r => <Text size="sm" style={{ direction: 'ltr' }}>{formatOI(r.open_interest)}</Text>,
    },
  ];

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">در حال بارگذاری...</Text>
      </Group>
    );
  }

  return (
    <RallyDataTable
      records={records}
      columns={columns}
      idAccessor="instrument_name"
      emptyMessage="قرارداد فیوچرز پیدا نشد"
      minHeight={260}
    />
  );
}

/**
 * Futures tab: Section A (perpetuals, live WS) + Section B (dated, REST polling).
 */
export default function DeribitFuturesTable({ messages }) {
  return (
    <Stack gap="md" pt="xs">
      <Title order={6} c="dimmed">پرپچوال</Title>
      <PerpetualsTable messages={messages} />
      <Divider />
      <Title order={6} c="dimmed">فیوچرز با سررسید (BTC / ETH)</Title>
      <DatedFuturesTable />
    </Stack>
  );
}
