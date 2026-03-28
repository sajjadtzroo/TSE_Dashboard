import { useState, useMemo } from 'react';
import {
  Badge,
  Group,
  Text,
  SimpleGrid,
  Divider,
  Select,
  SegmentedControl,
  Loader,
  Center,
} from '@mantine/core';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyKPICard from '../../components/RallyKPICard';
import RefreshButton from '../../components/RefreshButton';
import PageHeader from '../../components/PageHeader';
import FundingRateChart from '../../components/charts/FundingRateChart';
import useDeribitFutures from '../../hooks/useDeribitFutures';
import useDeribitOHLCV from '../../hooks/useDeribitOHLCV';
import useFundingRateHistory from '../../hooks/useFundingRateHistory';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';
import { DERIBIT_COINS } from '../../services/deribit';
import {
  GRID_STROKE, axisTick, TOOLTIP_STYLE, CURSOR_STROKE, barGradientDef,
} from '../../components/charts/shared/chartStyles';
import { IconCurrencyBitcoin, IconClock, IconChartBar, IconChartCandle, IconPercentage } from '@tabler/icons-react';

const RESOLUTION_OPTIONS = [
  { value: '60',  label: '۱ ساعته' },
  { value: '240', label: '۴ ساعته' },
  { value: '1D',  label: 'روزانه' },
];

const DAYS_OPTIONS = [
  { value: '7',  label: '۷ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
];

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

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 160 }}>
      <Text size="xs" fw={600} mb={4}>{label}</Text>
      <Text size="xs">باز: <b>${formatNum(d.open?.toFixed(2))}</b></Text>
      <Text size="xs">بالا: <b style={{ color: rallyColors.green }}>${formatNum(d.high?.toFixed(2))}</b></Text>
      <Text size="xs">پایین: <b style={{ color: rallyColors.red }}>${formatNum(d.low?.toFixed(2))}</b></Text>
      <Text size="xs">بسته: <b>${formatNum(d.close?.toFixed(2))}</b></Text>
      {d.volume != null && <Text size="xs" mt={2}>حجم: <b>{formatNum(Math.round(d.volume))}</b></Text>}
    </div>
  );
}

export default function CryptoFutures() {
  const { perpetuals, dated, loading, refetch } = useDeribitFutures();

  // ── Chart state ──────────────────────────────────────────────────────────
  const [chartInstrument, setChartInstrument] = useState('BTC-PERPETUAL');
  const [chartResolution, setChartResolution] = useState('1D');
  const [chartDays, setChartDays]             = useState('90');

  const { data: ohlcv, loading: chartLoading } = useDeribitOHLCV(
    chartInstrument, chartResolution, Number(chartDays)
  );

  // ── Funding Rate History state ──────────────────────────────────────────
  const [fundingInstrument, setFundingInstrument] = useState('BTC-PERPETUAL');
  const { data: fundingData, loading: fundingLoading } = useFundingRateHistory(
    fundingInstrument, 30
  );

  // Build instrument selector options: perpetuals + dated futures
  const instrumentOptions = useMemo(() => {
    const perps = DERIBIT_COINS.map((c) => ({
      group: 'پرپچوال',
      value: c.perpetual,
      label: `${c.perpetual} (${c.name_fa})`,
    }));
    const datedOpts = dated.map((d) => ({
      group: 'فیوچرز تاریخ‌دار',
      value: d.instrument_name,
      label: d.instrument_name,
    }));
    return [...perps, ...datedOpts];
  }, [dated]);

  // KPI cards
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

  // Latest close for price axis reference
  const lastClose = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].close : null;

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
          animateValue
        />
        <RallyKPICard
          title="BTC — مارک پرایس"
          value={btcPerp?.mark_price != null ? `$${formatNum(btcPerp.mark_price?.toFixed(0))}` : '-'}
          icon={IconChartBar}
          color={rallyColors.blue}
          animateValue
        />
        <RallyKPICard
          title="ETH — فاندینگ ۸h"
          value={ethPerp?.funding_8h != null ? `${(ethPerp.funding_8h * 100).toFixed(4)}%` : '-'}
          icon={IconCurrencyBitcoin}
          color={rallyColors.yellow}
          animateValue
        />
        <RallyKPICard
          title="ETH — مارک پرایس"
          value={ethPerp?.mark_price != null ? `$${formatNum(ethPerp.mark_price?.toFixed(0))}` : '-'}
          icon={IconChartBar}
          color={rallyColors.green}
          animateValue
        />
      </SimpleGrid>

      {/* ── Historical Price Chart ───────────────────────────────────────── */}
      <RallyMainCard
        mb="md"
        title={
          <Group gap="xs" wrap="wrap">
            <IconChartCandle size={18} color={rallyColors.primary} />
            <Text fw={600}>نمودار قیمت تاریخی</Text>
            {lastClose != null && (
              <Badge color="rally-primary" variant="light">
                ${formatNum(lastClose.toFixed(2))}
              </Badge>
            )}
          </Group>
        }
        headerRight={
          <Group gap="xs" wrap="wrap">
            <Select
              value={chartInstrument}
              onChange={setChartInstrument}
              data={instrumentOptions}
              size="xs"
              style={{ width: 200 }}
              searchable
            />
            <SegmentedControl
              value={chartResolution}
              onChange={setChartResolution}
              data={RESOLUTION_OPTIONS}
              size="xs"
            />
            <SegmentedControl
              value={chartDays}
              onChange={setChartDays}
              data={DAYS_OPTIONS}
              size="xs"
            />
          </Group>
        }
        fullscreenable
      >
        {chartLoading ? (
          <Center h={320}><Loader size="sm" color="rally-primary" /></Center>
        ) : ohlcv.length === 0 ? (
          <Center h={320}><Text c="dimmed" size="sm">داده‌ای موجود نیست</Text></Center>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={ohlcv} margin={{ top: 8, right: 50, bottom: 0, left: 10 }}>
              {barGradientDef('volGrad', rallyColors.primary)}
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="time"
                tick={axisTick(10)}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                orientation="left"
                tick={axisTick(10)}
                tickFormatter={(v) => `$${formatNum(v.toFixed(0))}`}
                width={75}
              />
              <YAxis
                yAxisId="vol"
                orientation="right"
                tick={axisTick(10)}
                tickFormatter={(v) => formatNum(Math.round(v))}
                width={55}
              />
              <Tooltip content={<PriceTooltip />} cursor={CURSOR_STROKE} />
              <Legend
                formatter={(v) => ({ close: 'قیمت بسته', volume: 'حجم' }[v] || v)}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar yAxisId="vol" dataKey="volume" name="volume" fill="url(#volGrad)" opacity={0.35} />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                name="close"
                stroke={rallyColors.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: rallyColors.primary }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </RallyMainCard>

      {/* ── Funding Rate History ──────────────────────────────────────── */}
      <RallyMainCard
        mb="md"
        title={
          <Group gap="xs">
            <IconPercentage size={18} color={rallyColors.yellow} />
            <Text fw={600}>تاریخچه نرخ فاندینگ (Funding Rate History)</Text>
          </Group>
        }
        headerRight={
          <SegmentedControl
            value={fundingInstrument}
            onChange={setFundingInstrument}
            data={[
              { value: 'BTC-PERPETUAL', label: 'BTC' },
              { value: 'ETH-PERPETUAL', label: 'ETH' },
            ]}
            size="xs"
          />
        }
        fullscreenable
      >
        {fundingLoading ? (
          <Center h={280}><Loader size="sm" color="rally-primary" /></Center>
        ) : fundingData.length === 0 ? (
          <Center h={280}><Text c="dimmed" size="sm">داده‌ای موجود نیست</Text></Center>
        ) : (
          <FundingRateChart data={fundingData} />
        )}
      </RallyMainCard>

      <Divider mb="md" />

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
