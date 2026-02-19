import { Group, Stack, Text, Box } from '@mantine/core';
import { useCryptoMarket } from '../../../hooks/useCryptoData';
import CryptoIcon from '../../../components/CryptoIcon';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

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
    { data: btc, color: '#F7931A', label: 'BTC' },
    { data: eth, color: '#627EEA', label: 'ETH' },
  ].filter(c => c.data);

  if (collapsed) {
    return (
      <Stack gap={4} align="center" className={animStyles.widgetSlideIn}>
        {coins.map(coin => (
          <CryptoIcon key={coin.label} symbol={coin.label} size={32} />
        ))}
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
                <CryptoIcon symbol={coin.label} size={24} />
                <Text size="xs" fw={600} c={rallyColors.textPrimary}>
                  {coin.label}
                </Text>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="xs" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${toPersianNum(price >= 1000 ? price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : price.toFixed(2))}
                </Text>
                <Text size="xs" fw={600} c={changeColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {change >= 0 ? '+' : ''}{toPersianNum(change.toFixed(2))}%
                </Text>
              </Stack>
            </Group>
          </Box>
        );
      })}
    </Stack>
  );
}
