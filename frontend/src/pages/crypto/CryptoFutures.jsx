import { useMemo } from 'react';
import {
  Badge,
  Group,
  Text,
  SimpleGrid,
  Divider,
} from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyKPICard from '../../components/RallyKPICard';
import RefreshButton from '../../components/RefreshButton';
import PageHeader from '../../components/PageHeader';
import useDeribitFutures from '../../hooks/useDeribitFutures';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';
import { IconCurrencyBitcoin, IconClock, IconChartBar } from '@tabler/icons-react';

function FundingCell({ value }) {
  if (value == null) return <span style={{ color: 'rgba(156,163,175,0.3)' }}>-</span>;
  const pct = value * 100;
  const color = pct > 0 ? rallyColors.green : pct < 0 ? rallyColors.red : undefined;
  return <span style={{ color, fontWeight: 600 }}>{pct > 0 ? '+' : ''}{pct.toFixed(4)}%</span>;
}

function ChangeCell({ value }) {
  if (value == null) return <span style={{ color: 'rgba(156,163,175,0.3)' }}>-</span>;
  const color = value > 0 ? rallyColors.green : value < 0 ? rallyColors.red : undefined;
  return <span style={{ color, fontWeight: 600 }}>{value > 0 ? '+' : ''}{value?.toFixed(2)}%</span>;
}

export default function CryptoFutures() {
  const { perpetuals, dated, loading, refetch } = useDeribitFutures();

  // KPI: avg funding for BTC and ETH
  const btcPerp = perpetuals.find((p) => p.symbol === 'BTC');
  const ethPerp = perpetuals.find((p) => p.symbol === 'ETH');

  const perpColumns = [
    { accessor: 'symbol', title: 'رمزارز', width: 80, sortable: true,
      render: (r) => <Badge color="rally-primary" variant="light">{r.symbol}</Badge> },
    { accessor: 'name_fa', title: 'نام', width: 100, sortable: true },
    {
      accessor: 'mark_price', title: 'مارک پرایس', width: 130, textAlign: 'end', sortable: true,
      render: (r) => r.mark_price != null ? `$${formatNum(r.mark_price?.toFixed(2))}` : '-',
    },
    {
      accessor: 'index_price', title: 'قیمت ایندکس', width: 130, textAlign: 'end', sortable: true,
      render: (r) => r.index_price != null ? `$${formatNum(r.index_price?.toFixed(2))}` : '-',
    },
    {
      accessor: 'price_change_pct', title: 'بازده ۲۴h', width: 90, textAlign: 'end', sortable: true,
      render: (r) => <ChangeCell value={r.price_change_pct} />,
    },
    {
      accessor: 'funding_8h', title: 'فاندینگ ۸h', width: 100, textAlign: 'end', sortable: true,
      render: (r) => <FundingCell value={r.funding_8h} />,
    },
    {
      accessor: 'open_interest', title: 'بهره باز', width: 110, textAlign: 'end', sortable: true,
      render: (r) => r.open_interest != null ? formatNum(Math.round(r.open_interest)) : '-',
    },
    {
      accessor: 'volume_usd', title: 'حجم ۲۴h (USD)', width: 150, textAlign: 'end', sortable: true,
      render: (r) => r.volume_usd != null ? `$${formatNum(Math.round(r.volume_usd))}` : '-',
    },
  ];

  const datedColumns = [
    {
      accessor: 'instrument_name', title: 'قرارداد', width: 160, sortable: true,
      render: (r) => <Text size="sm" fw={500} ff="monospace">{r.instrument_name}</Text>,
    },
    { accessor: 'base_currency', title: 'رمزارز', width: 80, sortable: true,
      render: (r) => <Badge color="rally-primary" variant="light">{r.base_currency}</Badge> },
    { accessor: 'expiry', title: 'سررسید', width: 100, sortable: true,
      render: (r) => <Badge color="rally-blue" variant="dot">{r.expiry}</Badge> },
    {
      accessor: 'mark_price', title: 'مارک پرایس', width: 130, textAlign: 'end', sortable: true,
      render: (r) => r.mark_price != null ? `$${formatNum(r.mark_price?.toFixed(2))}` : '-',
    },
    {
      accessor: 'price_change', title: 'بازده ۲۴h', width: 90, textAlign: 'end', sortable: true,
      render: (r) => <ChangeCell value={r.price_change} />,
    },
    {
      accessor: 'open_interest', title: 'بهره باز', width: 110, textAlign: 'end', sortable: true,
      render: (r) => r.open_interest != null ? formatNum(Math.round(r.open_interest)) : '-',
    },
  ];

  const datedBTC = useMemo(() => dated.filter((d) => d.base_currency === 'BTC'), [dated]);
  const datedETH = useMemo(() => dated.filter((d) => d.base_currency === 'ETH'), [dated]);

  return (
    <>
      <PageHeader title="فیوچرز رمزارز — Deribit">
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      {/* KPI cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <RallyKPICard
          title="BTC — فاندینگ ۸h"
          value={btcPerp?.funding_8h != null ? `${(btcPerp.funding_8h * 100).toFixed(4)}%` : '-'}
          icon={IconCurrencyBitcoin}
          color={rallyColors.primary}
          variant="accent-bar"
        />
        <RallyKPICard
          title="BTC — مارک پرایس"
          value={btcPerp?.mark_price != null ? `$${formatNum(btcPerp.mark_price?.toFixed(0))}` : '-'}
          icon={IconChartBar}
          color={rallyColors.blue}
          variant="accent-bar"
        />
        <RallyKPICard
          title="ETH — فاندینگ ۸h"
          value={ethPerp?.funding_8h != null ? `${(ethPerp.funding_8h * 100).toFixed(4)}%` : '-'}
          icon={IconCurrencyBitcoin}
          color={rallyColors.yellow}
          variant="accent-bar"
        />
        <RallyKPICard
          title="ETH — مارک پرایس"
          value={ethPerp?.mark_price != null ? `$${formatNum(ethPerp.mark_price?.toFixed(0))}` : '-'}
          icon={IconChartBar}
          color={rallyColors.green}
          variant="accent-bar"
        />
      </SimpleGrid>

      {/* Perpetuals */}
      <RallyMainCard mb="md" title={
        <Group gap="xs">
          <IconCurrencyBitcoin size={18} color={rallyColors.primary} />
          <Text fw={600}>پرپچوال فیوچرز (لایو)</Text>
        </Group>
      }>
        <RallyDataTable
          records={perpetuals}
          columns={perpColumns}
          loading={loading}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refetch}
          storeColumnsKey="crypto-futures-perp"
        />
      </RallyMainCard>

      {/* Dated futures — BTC */}
      <RallyMainCard mb="md" title={
        <Group gap="xs">
          <IconClock size={18} color={rallyColors.blue} />
          <Text fw={600}>فیوچرز تاریخ‌دار BTC</Text>
          <Badge color="rally-blue" variant="light">{datedBTC.length} قرارداد</Badge>
        </Group>
      }>
        <RallyDataTable
          records={datedBTC}
          columns={datedColumns}
          loading={loading}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refetch}
          storeColumnsKey="crypto-futures-btc"
        />
      </RallyMainCard>

      {/* Dated futures — ETH */}
      <RallyMainCard title={
        <Group gap="xs">
          <IconClock size={18} color={rallyColors.yellow} />
          <Text fw={600}>فیوچرز تاریخ‌دار ETH</Text>
          <Badge color="rally-yellow" variant="light">{datedETH.length} قرارداد</Badge>
        </Group>
      }>
        <RallyDataTable
          records={datedETH}
          columns={datedColumns}
          loading={loading}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={refetch}
          storeColumnsKey="crypto-futures-eth"
        />
      </RallyMainCard>
    </>
  );
}
