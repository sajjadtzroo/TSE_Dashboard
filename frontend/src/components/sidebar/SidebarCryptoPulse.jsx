import { Group, Stack, Text, Box, ThemeIcon } from '@mantine/core';
import { IconCurrencyBitcoin, IconCurrencyEthereum } from '@tabler/icons-react';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../shared/animations.module.css';

/**
 * Compact BTC/ETH mini-price widget for sidebar.
 * Shows current price + 24h change for BTC and ETH.
 */
export default function SidebarCryptoPulse({ collapsed = false }) {
  const { data: market = [] } = useCryptoMarket({ staleTime: 60_000 });

  const btc = market.find(c => c.symbol === 'BTC');
  const eth = market.find(c => c.symbol === 'ETH');

  if (!btc && !eth) return null;

  const coins = [
    { data: btc, icon: IconCurrencyBitcoin, color: rallyColors.yellow, label: 'BTC' },
    { data: eth, icon: IconCurrencyEthereum, color: rallyColors.purple, label: 'ETH' },
  ].filter(c => c.data);

  if (collapsed) {
    return (
      <Stack gap={4} align="center" className={animStyles.widgetSlideIn}>
        {coins.map(coin => {
          const change = coin.data.price_change_pct_24h ?? 0;
          const changeColor = change >= 0 ? rallyColors.green : rallyColors.red;
          return (
            <ThemeIcon
              key={coin.label}
              size={32}
              radius="sm"
              variant="filled"
              style={{
                backgroundColor: `${coin.color}18`,
                color: coin.color,
                border: `1px solid ${coin.color}25`,
              }}
            >
              <coin.icon size={16} stroke={1.5} />
            </ThemeIcon>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack gap={6} className={animStyles.widgetSlideIn}>
      <Text size="xs" c="dimmed" fw={500} px="xs">
        رمزارزها
      </Text>
      {coins.map(coin => {
        const price = Number(coin.data.last_price);
        const change = coin.data.price_change_pct_24h ?? 0;
        const changeColor = change >= 0 ? rallyColors.green : rallyColors.red;

        return (
          <Box
            key={coin.label}
            px="xs"
            py={4}
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
              background: 'rgba(148, 163, 184, 0.04)',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <ThemeIcon
                  size={24}
                  radius="sm"
                  variant="filled"
                  style={{
                    backgroundColor: `${coin.color}18`,
                    color: coin.color,
                    border: `1px solid ${coin.color}25`,
                    flexShrink: 0,
                  }}
                >
                  <coin.icon size={13} stroke={1.5} />
                </ThemeIcon>
                <Text size="xs" fw={600} c={rallyColors.textPrimary}>
                  {coin.label}
                </Text>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="xs" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${price >= 1000 ? price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : price.toFixed(2)}
                </Text>
                <Text size="xs" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </Text>
              </Stack>
            </Group>
          </Box>
        );
      })}
    </Stack>
  );
}
