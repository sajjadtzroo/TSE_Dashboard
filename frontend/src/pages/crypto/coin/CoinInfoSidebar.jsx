import { Stack, Text, Group, Badge, Box } from '@mantine/core';
import {
  IconCurrencyDollar, IconChartBar, IconTrendingUp, IconTrendingDown,
  IconArrowsExchange, IconCoin,
} from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
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

export default function CoinInfoSidebar({ detail, symbol }) {
  if (!detail) return null;

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
      {/* Price + Change Badge */}
      <RallyMainCard>
        <Group justify="space-between" align="center">
          <Box>
            <Text size="xs" c="dimmed">{symbol}</Text>
            <Text size="xl" fw={800} c={rallyColors.textPrimary}>
              {formatUsd(detail.last_price)}
            </Text>
          </Box>
          {detail.price_change_pct_24h != null && (
            <Badge
              size="lg"
              color={detail.price_change_pct_24h >= 0 ? 'green' : 'red'}
              variant="light"
            >
              {detail.price_change_pct_24h >= 0 ? '+' : ''}{detail.price_change_pct_24h.toFixed(2)}%
            </Badge>
          )}
        </Group>
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

      {/* Bid/Ask */}
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
        </RallyMainCard>
      )}
    </Stack>
  );
}
