import { Group, Text } from '@mantine/core';
import { DERIBIT_COINS } from '../../../services/deribit';
import RallyDataTable from '../../../components/RallyDataTable';
import PercentChangeCell from '../../../components/cells/PercentChangeCell';
import CryptoIcon from '../../../components/CryptoIcon';
import { toPersianNum, formatVol } from '../../../utils/formatUtils';

function formatPrice(v) {
  if (v == null) return '-';
  return '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Live spot index prices fed from the parent's shared WS hook.
 * Uses index_price extracted from ticker.{COIN}-PERPETUAL.100ms channels.
 */
export default function DeribitSpotTable({ messages, status }) {
  const records = DERIBIT_COINS.map(coin => {
    const channel = `ticker.${coin.perpetual}.100ms`;
    const ticker = messages[channel];
    return {
      symbol: coin.symbol,
      name_fa: coin.name_fa,
      index_price: ticker?.index_price ?? null,
      price_change_pct: ticker?.stats?.price_change ?? null,
      high_24h: ticker?.stats?.high ?? null,
      low_24h: ticker?.stats?.low ?? null,
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
    { accessor: 'name_fa', title: 'نام', width: 120, render: r => r.name_fa },
    {
      accessor: 'index_price',
      title: 'قیمت (USD)',
      width: 140,
      textAlign: 'end',
      render: r => (
        <Text size="sm" style={{ direction: 'ltr' }}>
          {formatPrice(r.index_price)}
        </Text>
      ),
    },
    {
      accessor: 'price_change_pct',
      title: 'تغییر ۲۴h%',
      width: 110,
      textAlign: 'end',
      render: r => <PercentChangeCell value={r.price_change_pct} />,
    },
    {
      accessor: 'high_24h',
      title: 'بالاترین',
      width: 130,
      textAlign: 'end',
      render: r => (
        <Text size="sm" style={{ direction: 'ltr' }}>
          {formatPrice(r.high_24h)}
        </Text>
      ),
    },
    {
      accessor: 'low_24h',
      title: 'پایین‌ترین',
      width: 130,
      textAlign: 'end',
      render: r => (
        <Text size="sm" style={{ direction: 'ltr' }}>
          {formatPrice(r.low_24h)}
        </Text>
      ),
    },
    {
      accessor: 'volume_usd',
      title: 'حجم ۲۴h',
      width: 120,
      textAlign: 'end',
      render: r => (
        <Text size="sm" style={{ direction: 'ltr' }}>
          {formatVol(r.volume_usd)}
        </Text>
      ),
    },
  ];

  return (
    <RallyDataTable
      records={records}
      columns={columns}
      idAccessor="symbol"
      emptyMessage={status === 'connecting' ? 'در حال اتصال به Deribit...' : 'داده‌ای موجود نیست'}
      minHeight={300}
    />
  );
}
