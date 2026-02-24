import { useMemo } from 'react';
import { Stack, Text, Group, Badge, Box, Progress, Divider } from '@mantine/core';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import CryptoIcon from '../../../components/CryptoIcon';
import CryptoVolumeFlowCard from './CryptoVolumeFlowCard';
import rallyColors from '../../../theme/rallyColors';
import { formatUsd, formatBig, toPersianNum } from '../../../utils/formatUtils';

function InfoRow({ label, value, color }) {
  return (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );
}

export default function CoinInfoSidebar({ detail, symbol, market, dailyHistory }) {
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

  const spreadPct = spread ? parseFloat(spread) : 0;
  // Visual spread bar: map 0-1% spread to 0-100 progress (cap at 1%)
  const spreadBarValue = Math.min(spreadPct / 1 * 100, 100);

  return (
    <Stack gap="md">
      {/* ── Section 1: Price Hero ─────────────────────────────────── */}
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
              {change >= 0 ? '+' : ''}{toPersianNum(change.toFixed(2))}%
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
        <Divider my="xs" color="#1E2234" />
        <InfoRow label="بالاترین ۲۴h" value={formatUsd(detail.high_24h)} color={rallyColors.green} />
        <InfoRow label="پایین‌ترین ۲۴h" value={formatUsd(detail.low_24h)} color={rallyColors.red} />
        <InfoRow label="حجم ۲۴h" value={formatBig(detail.volume_24h)} />
        <InfoRow label="قیمت تومان" value={detail.price_toman ? toPersianNum(Number(detail.price_toman).toLocaleString()) + ' T' : '—'} color={rallyColors.yellow} />
      </RallyMainCard>

      {/* ── Section 2: Market Metrics ─────────────────────────────── */}
      <RallyMainCard title="شاخص‌های بازار">
        <InfoRow label="ارزش بازار" value={formatBig(detail.market_cap_usd)} color={rallyColors.blue} />
        {rank && <InfoRow label="رتبه CMC" value={`#${rank}`} color={rallyColors.blue} />}
        {volMcapRatio && <InfoRow label="نسبت حجم/ارزش بازار" value={`${toPersianNum(volMcapRatio)}%`} color={rallyColors.purple} />}
      </RallyMainCard>

      {/* ── Section 3: Bid/Ask & Spread ───────────────────────────── */}
      {(detail.best_bid || detail.best_ask) && (
        <RallyMainCard title="عرضه و تقاضا">
          <InfoRow label="بهترین خرید" value={formatUsd(detail.best_bid)} color={rallyColors.green} />
          <InfoRow label="بهترین فروش" value={formatUsd(detail.best_ask)} color={rallyColors.red} />
          {spread && (
            <>
              <Divider my="xs" color="#1E2234" />
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">اسپرد</Text>
                <Text size="xs" fw={500}>{toPersianNum(spread)}%</Text>
              </Group>
              <Progress
                value={spreadBarValue}
                color={spreadPct < 0.1 ? 'rally-green' : spreadPct < 0.5 ? 'rally-yellow' : 'rally-red'}
                size="sm"
              />
            </>
          )}
        </RallyMainCard>
      )}

      {/* ── Section 4: Volume Flow ────────────────────────────────── */}
      <CryptoVolumeFlowCard dailyHistory={dailyHistory} />

      {/* ── Section 5: Supply Info (placeholder for backend data) ── */}
      <RallyMainCard title="اطلاعات عرضه">
        <InfoRow label="عرضه در گردش" value="—" />
        <InfoRow label="عرضه کل" value="—" />
        <InfoRow label="بالاترین قیمت تاریخ (ATH)" value="—" />
      </RallyMainCard>
    </Stack>
  );
}
