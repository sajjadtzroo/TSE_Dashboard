import { useMemo } from 'react';
import { Stack, Text, Group, Badge, Box } from '@mantine/core';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import {
  IconCurrencyDollar, IconChartBar, IconTrendingUp, IconTrendingDown,
  IconArrowsExchange, IconCoin, IconHash, IconPercentage,
} from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import CryptoIcon from '../../../components/CryptoIcon';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';

function formatUsd(v) {
  return v != null ? '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';
}

function formatBig(v) {
  if (!v) return '-';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + Number(v).toLocaleString();
}

export default function CoinInfoSidebar({ detail, symbol, market }) {
  if (!detail) return null;

  const change = detail.price_change_pct_24h;
  const sparkColor = change >= 0 ? rallyColors.green : rallyColors.red;

  // Sparkline data from detail.sparkline_24h (array of prices)
  const sparkData = useMemo(() => {
    if (!detail.sparkline_24h?.length) return [];
    return detail.sparkline_24h.map((v, i) => ({ i, v: Number(v) }));
  }, [detail.sparkline_24h]);

  // Market cap rank (derive from market array position by market_cap_usd desc)
  const rank = useMemo(() => {
    if (!market?.length || !symbol) return null;
    const sorted = [...market].sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0));
    const idx = sorted.findIndex((c) => c.symbol?.toUpperCase() === symbol.toUpperCase());
    return idx >= 0 ? idx + 1 : null;
  }, [market, symbol]);

  // Volume/Market-Cap ratio
  const volMcapRatio = detail.volume_24h && detail.market_cap_usd
    ? ((detail.volume_24h / detail.market_cap_usd) * 100).toFixed(2)
    : null;

  // Spread calculation
  const spread = detail.best_bid && detail.best_ask
    ? (((detail.best_ask - detail.best_bid) / detail.best_ask) * 100).toFixed(3)
    : null;

  const metrics = [
    { title: 'قیمت فعلی', value: formatUsd(detail.last_price), icon: IconCurrencyDollar, color: rallyColors.green },
    { title: 'ارزش بازار', value: formatBig(detail.market_cap_usd), icon: IconChartBar, color: rallyColors.blue },
    { title: 'حجم ۲۴h', value: formatBig(detail.volume_24h), icon: IconArrowsExchange, color: rallyColors.purple },
    { title: 'بالاترین ۲۴h', value: formatUsd(detail.high_24h), icon: IconTrendingUp, color: rallyColors.green },
    { title: 'پایین‌ترین ۲۴h', value: formatUsd(detail.low_24h), icon: IconTrendingDown, color: rallyColors.red },
    { title: 'قیمت تومان', value: detail.price_toman ? Number(detail.price_toman).toLocaleString() + ' T' : '-', icon: IconCoin, color: rallyColors.yellow },
  ];

  return (
    <Stack gap="md">
      {/* Price + Change Badge + Sparkline */}
      <RallyMainCard>
        <Group justify="space-between" align="center">
          <Group gap="sm" align="center">
            <CryptoIcon symbol={symbol} size={40} />
            <Box>
              <Text size="xs" c="dimmed">{symbol}</Text>
              <Text size="xl" fw={800} c={rallyColors.textPrimary}>
                {formatUsd(detail.last_price)}
              </Text>
            </Box>
          </Group>
          {change != null && (
            <Badge
              size="lg"
              color={change >= 0 ? 'green' : 'red'}
              variant="light"
            >
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </Badge>
          )}
        </Group>
        {sparkData.length > 0 && (
          <Box mt="xs">
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  fill={sparkColor}
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </RallyMainCard>

      {/* Key Metrics */}
      <RallyMainCard title="اطلاعات کلیدی">
        <Stack gap="xs">
          {metrics.map((m, i) => (
            <Box key={i} className={animStyles.cardEnter}>
              <RallyKPICard
                title={m.title}
                value={m.value}
                icon={m.icon}
                color={m.color}
                bgColor={m.color}
                compact
              />
            </Box>
          ))}
        </Stack>
      </RallyMainCard>

      {/* Market Metrics */}
      <RallyMainCard title="شاخص‌های بازار">
        <Stack gap="xs">
          {rank && (
            <RallyKPICard
              title="رتبه ارزش بازار"
              value={`#${rank}`}
              icon={IconHash}
              color={rallyColors.blue}
              bgColor={rallyColors.blue}
              compact
            />
          )}
          {volMcapRatio && (
            <RallyKPICard
              title="نسبت حجم/ارزش بازار"
              value={`${volMcapRatio}%`}
              icon={IconPercentage}
              color={rallyColors.purple}
              bgColor={rallyColors.purple}
              compact
            />
          )}
        </Stack>
      </RallyMainCard>

      {/* Bid/Ask + Spread */}
      {(detail.best_bid || detail.best_ask) && (
        <RallyMainCard title="عرضه و تقاضا">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed">بهترین خرید</Text>
              <Text fw={700} c={rallyColors.green}>{formatUsd(detail.best_bid)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">بهترین فروش</Text>
              <Text fw={700} c={rallyColors.red}>{formatUsd(detail.best_ask)}</Text>
            </Box>
          </Group>
          {spread && (
            <Text size="xs" c="dimmed" mt="xs" ta="center">
              اسپرد: {spread}%
            </Text>
          )}
        </RallyMainCard>
      )}
    </Stack>
  );
}
