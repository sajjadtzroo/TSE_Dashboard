/**
 * CryptoMarketOverview — TradingView-inspired crypto market summary.
 *
 * Layout:
 *   [BTC] [ETH] [BNB] [XRP] [SOL]     <- clickable featured coins
 *   +--------------------------------------+  +------------------+
 *   | Selected coin price chart (30d)      |  | Fear & Greed     |
 *   | value + volume + 24h change          |  | BTC Dominance    |
 *   | [interactive area chart]             |  | Stablecoin + IV  |
 *   +--------------------------------------+  +------------------+
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Group, SimpleGrid, Stack, Text, Paper, UnstyledButton } from '@mantine/core';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import CryptoIcon from '../../../components/CryptoIcon';
import FearGreedGauge from '../../../components/crypto/FearGreedGauge';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import { useCryptoHistory } from '../../../hooks/useCryptoData';
import useCryptoLive from '../../../hooks/useCryptoLive';
import useDeribitLive from '../../../hooks/useDeribitLive';
import { FEAR_GREED_LABELS } from '../../../constants/crypto';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

const FEATURED_COINS = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL'];

const COIN_COLORS = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  BNB: '#F3BA2F',
  XRP: '#00AAE4',
  SOL: '#9945FF',
};

const DERIBIT_IV_CHANNELS = [
  'ticker.BTC-PERPETUAL.100ms',
  'ticker.ETH-PERPETUAL.100ms',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt$(n, decimals = 2) {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e12) return '$' + toPersianNum((n / 1e12).toFixed(decimals)) + 'T';
  if (Math.abs(n) >= 1e9) return '$' + toPersianNum((n / 1e9).toFixed(decimals)) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + toPersianNum((n / 1e6).toFixed(decimals)) + 'M';
  return '$' + toPersianNum(Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals }));
}

function fmtPrice(n) {
  if (n == null) return '-';
  if (n >= 1000) return '$' + toPersianNum(Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  if (n >= 1) return '$' + toPersianNum(Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));
  return '$' + toPersianNum(Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }));
}

function fmtPct(v) {
  if (v == null) return '';
  const sign = v >= 0 ? '+' : '';
  return toPersianNum(sign + v.toFixed(2)) + '%';
}

function pctColor(v) {
  if (v == null) return rallyColors.textDimmed;
  return v >= 0 ? rallyColors.green : rallyColors.red;
}

function fgColor(value) {
  if (value == null) return rallyColors.textDimmed;
  if (value <= 25) return rallyColors.red;
  if (value <= 45) return '#F97316';
  if (value <= 55) return rallyColors.yellow;
  if (value <= 75) return rallyColors.green;
  return rallyColors.darkGreen;
}

const cardStyle = {
  backgroundColor: rallyColors.card,
  border: `1px solid ${rallyColors.border}`,
  borderRadius: 8,
  padding: '12px 16px',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function FeaturedCoinCard({ coin, selected, onClick }) {
  if (!coin) return null;
  const pct = coin.price_change_pct_24h;
  return (
    <UnstyledButton onClick={onClick} style={{ width: '100%' }}>
      <Paper
        style={{
          ...cardStyle,
          borderColor: selected ? (COIN_COLORS[coin.symbol] || rallyColors.primary) : rallyColors.border,
          borderWidth: selected ? 2 : 1,
        }}
        py={10}
        px={14}
      >
        <Group gap={10} wrap="nowrap">
          <CryptoIcon symbol={coin.symbol} size={28} />
          <Stack gap={0}>
            <Text size="sm" fw={600} c={rallyColors.textPrimary}>{coin.symbol}</Text>
            <Group gap={6} wrap="nowrap">
              <Text size="xs" c={rallyColors.textSecondary}>
                {fmtPrice(coin.last_price)}
              </Text>
              <Text size="xs" fw={600} c={pctColor(pct)}>
                {fmtPct(pct)}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

function CoinPriceChart({ symbol, color, liveCandle }) {
  const { data: history = [], isLoading } = useCryptoHistory(symbol, { interval: '1day', limit: 30 });
  const [visibleCount, setVisibleCount] = useState(0);
  const [animDone, setAnimDone] = useState(false);

  // Base historical data (stable, only changes when history refetches)
  const baseData = useMemo(() => {
    if (!history?.length) return [];
    return history.map(d => ({
      date: d.open_time?.slice(5, 10) || '',
      close: d.close,
      high: d.high,
      low: d.low,
    }));
  }, [history]);

  // Full data = base + live candle appended (updates every 5s without re-triggering animation)
  const fullData = useMemo(() => {
    if (!baseData.length) return [];
    const points = baseData.map(d => ({ ...d }));
    if (liveCandle) {
      const now = new Date();
      const liveDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const lastPoint = points[points.length - 1];
      if (lastPoint && lastPoint.date === liveDate) {
        lastPoint.close = liveCandle.c;
        lastPoint.high = Math.max(lastPoint.high || 0, liveCandle.h);
        lastPoint.low = Math.min(lastPoint.low || Infinity, liveCandle.l);
      } else {
        points.push({
          date: liveDate,
          close: liveCandle.c,
          high: liveCandle.h,
          low: liveCandle.l,
        });
      }
    }
    return points;
  }, [baseData, liveCandle]);

  // Progressive reveal on initial load only (when baseData changes = new coin selected)
  useEffect(() => {
    if (!baseData.length) return;
    setAnimDone(false);
    setVisibleCount(0);
    const duration = 2000;
    const total = baseData.length;
    const start = performance.now();
    let rafId;
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVisibleCount(Math.round(eased * total));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setAnimDone(true);
      }
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [baseData]);

  // During animation: progressive reveal. After animation: show all (including live updates)
  const chartData = animDone
    ? fullData
    : fullData.map((d, i) => i < visibleCount ? d : { ...d, close: null });

  if (isLoading || !fullData.length) {
    return (
      <Box h={300} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size="sm" c={rallyColors.textDimmed}>{isLoading ? 'در حال بارگذاری...' : 'داده‌ای موجود نیست'}</Text>
      </Box>
    );
  }

  const strokeColor = color || rallyColors.green;

  const allCloses = fullData.map(d => d.close).filter(Boolean);
  const yMin = Math.min(...allCloses) * 0.995;
  const yMax = Math.max(...allCloses) * 1.005;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
        <defs>
          <linearGradient id={`coinGrad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={rallyColors.border} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: rallyColors.textDimmed }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => toPersianNum(v)}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: rallyColors.textDimmed }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v >= 1000 ? toPersianNum((v/1000).toFixed(1)) + 'k' : toPersianNum(v.toFixed(2))}
          width={55}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <ChartTooltipV2
                active
                payload={[
                  { name: 'بسته', value: fmtPrice(d?.close), color: strokeColor },
                  { name: 'بالاترین', value: fmtPrice(d?.high), color: rallyColors.green },
                  { name: 'پایین‌ترین', value: fmtPrice(d?.low), color: rallyColors.red },
                ]}
                label={toPersianNum(d?.date)}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#coinGrad-${symbol})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: rallyColors.elevated }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DominanceBar({ btcDom, ethDom }) {
  const btc = btcDom ?? 0;
  const eth = ethDom ?? 0;
  const other = Math.max(0, 100 - btc - eth);
  return (
    <Stack gap={4}>
      <Group gap="md" wrap="wrap">
        <Group gap={4}><Box w={8} h={8} style={{ borderRadius: '50%', background: '#F7931A' }} /><Text size="xs" c={rallyColors.textSecondary}>بیت‌کوین {toPersianNum(btc.toFixed(1))}%</Text></Group>
        <Group gap={4}><Box w={8} h={8} style={{ borderRadius: '50%', background: '#627EEA' }} /><Text size="xs" c={rallyColors.textSecondary}>اتریوم {toPersianNum(eth.toFixed(1))}%</Text></Group>
        <Group gap={4}><Box w={8} h={8} style={{ borderRadius: '50%', background: rallyColors.red }} /><Text size="xs" c={rallyColors.textSecondary}>سایر {toPersianNum(other.toFixed(1))}%</Text></Group>
      </Group>
      <Box style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
        <Box style={{ width: `${btc}%`, background: '#F7931A' }} />
        <Box style={{ width: `${eth}%`, background: '#627EEA' }} />
        <Box style={{ width: `${other}%`, background: rallyColors.red }} />
      </Box>
    </Stack>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CryptoMarketOverview({ globalStats, market = [] }) {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const { messages: deribitMessages } = useDeribitLive(DERIBIT_IV_CHANNELS);
  const { getLiveCandle, getLivePrice } = useCryptoLive();

  const featuredCoins = useMemo(
    () => FEATURED_COINS.map(sym => market.find(c => c.symbol === sym)).filter(Boolean),
    [market],
  );

  const activeCoin = market.find(c => c.symbol === selectedCoin);
  const livePrice = getLivePrice(selectedCoin);
  const displayPrice = livePrice ?? activeCoin?.last_price;
  const coinColor = COIN_COLORS[selectedCoin] || rallyColors.primary;

  const fgValue = globalStats?.fear_greed_value;
  const fgLabel = globalStats?.fear_greed_label;

  // Deribit perpetual data
  const btcPerp = deribitMessages['ticker.BTC-PERPETUAL.100ms'];
  const ethPerp = deribitMessages['ticker.ETH-PERPETUAL.100ms'];

  // Stablecoin market cap
  const stablecoinCap = useMemo(() => {
    const stables = ['USDT', 'USDC', 'DAI', 'FDUSD'];
    return market
      .filter(c => stables.includes(c.symbol) && c.market_cap_usd)
      .reduce((sum, c) => sum + c.market_cap_usd, 0);
  }, [market]);

  return (
    <Stack gap="md" mb="md">
      {/* Featured coins row */}
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing="sm">
        {featuredCoins.map(coin => (
          <FeaturedCoinCard
            key={coin.symbol}
            coin={coin}
            selected={coin.symbol === selectedCoin}
            onClick={() => setSelectedCoin(coin.symbol)}
          />
        ))}
      </SimpleGrid>

      {/* Main 2-column layout: 7fr chart / 3fr sidebar */}
      <Box style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}
           className="crypto-overview-grid"
      >
        {/* LEFT: Coin price chart */}
        <Paper style={{ ...cardStyle, padding: '16px 20px' }}>
          <Stack gap="xs">
            <Group gap={8} align="center">
              <CryptoIcon symbol={selectedCoin} size={24} />
              <Text size="md" fw={700} c={rallyColors.textPrimary}>{selectedCoin}</Text>
              <Box px={6} py={1} style={{ borderRadius: 4, background: rallyColors.elevated }}>
                <Text size="xs" fw={500} c={rallyColors.textDimmed}>{toPersianNum('30')} روزه</Text>
              </Box>
            </Group>

            <Group gap="xl" wrap="wrap">
              <Stack gap={0}>
                <Group gap={6} align="baseline">
                  <Text size="xl" fw={800} c={rallyColors.textPrimary}>
                    {fmtPrice(displayPrice)}
                  </Text>
                  <Text size="sm" fw={600} c={pctColor(activeCoin?.price_change_pct_24h)}>
                    {fmtPct(activeCoin?.price_change_pct_24h)}
                  </Text>
                </Group>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c={rallyColors.textDimmed}>ارزش بازار</Text>
                <Text size="sm" fw={600} c={rallyColors.textPrimary}>{fmt$(activeCoin?.market_cap_usd)}</Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c={rallyColors.textDimmed}>حجم ۲۴ ساعته</Text>
                <Text size="sm" fw={600} c={rallyColors.textPrimary}>{fmt$(activeCoin?.volume_24h)}</Text>
              </Stack>
            </Group>

            <CoinPriceChart key={selectedCoin} symbol={selectedCoin} color={coinColor} liveCandle={getLiveCandle(selectedCoin)} />
          </Stack>
        </Paper>

        {/* RIGHT: Compact sidebar */}
        <Stack gap="sm" style={{ minWidth: 0 }}>
          {/* Fear & Greed */}
          <Paper style={{ ...cardStyle, padding: '10px 14px' }}>
            <Text size="xs" fw={600} c={rallyColors.textPrimary} mb={6}>شاخص ترس و طمع</Text>
            <Group justify="center" gap="md">
              <FearGreedGauge value={fgValue} label={fgLabel} size={110} />
              <Stack gap={0} align="center">
                <Text size="lg" fw={800} c={fgColor(fgValue)}>
                  {fgValue != null ? toPersianNum(String(Math.round(fgValue))) : '-'}
                </Text>
                <Text size="xs" c={fgColor(fgValue)}>
                  {fgLabel ? (FEAR_GREED_LABELS[fgLabel] || fgLabel) : ''}
                </Text>
              </Stack>
            </Group>
          </Paper>

          {/* BTC Dominance */}
          <Paper style={{ ...cardStyle, padding: '10px 14px' }}>
            <Text size="xs" fw={600} c={rallyColors.textPrimary} mb={6}>سلطه بازار</Text>
            <DominanceBar btcDom={globalStats?.btc_dominance_pct} ethDom={globalStats?.eth_dominance_pct} />
          </Paper>

          {/* Stablecoin + Total cap */}
          <Paper style={{ ...cardStyle, padding: '10px 14px' }}>
            <Group justify="space-between" wrap="wrap" gap={8}>
              <Stack gap={0}>
                <Text size="xs" c={rallyColors.textDimmed}>ارزش استیبل‌کوین‌ها</Text>
                <Text size="sm" fw={700} c={rallyColors.textPrimary}>{fmt$(stablecoinCap, 1)}</Text>
              </Stack>
              <Stack gap={0}>
                <Text size="xs" c={rallyColors.textDimmed}>ارزش کل بازار</Text>
                <Text size="sm" fw={700} c={rallyColors.textPrimary}>{fmt$(globalStats?.total_market_cap_usd)}</Text>
              </Stack>
            </Group>
          </Paper>

          {/* Deribit perpetuals */}
          <Paper style={{ ...cardStyle, padding: '10px 14px' }}>
            <Text size="xs" fw={600} c={rallyColors.textPrimary} mb={4}>قراردادهای پرپچوال</Text>
            <Stack gap={4}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={4}><CryptoIcon symbol="BTC" size={14} /><Text size="xs" c={rallyColors.textDimmed}>BTC</Text></Group>
                <Text size="xs" fw={600} c={rallyColors.textPrimary}>
                  {btcPerp ? fmtPrice(btcPerp.mark_price) : '...'}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={4}><CryptoIcon symbol="ETH" size={14} /><Text size="xs" c={rallyColors.textDimmed}>ETH</Text></Group>
                <Text size="xs" fw={600} c={rallyColors.textPrimary}>
                  {ethPerp ? fmtPrice(ethPerp.mark_price) : '...'}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}
