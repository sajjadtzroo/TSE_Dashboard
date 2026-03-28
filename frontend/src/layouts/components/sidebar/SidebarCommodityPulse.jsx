import { Group, Stack, Text, Box } from '@mantine/core';
import { IconBarrel, IconDiamond } from '@tabler/icons-react';
import { useCommodityPrices } from '../../../hooks/useCommodityData';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

/**
 * Compact Brent/Gold mini-price widget for sidebar.
 * Shows current price + daily change for Brent Oil and Gold.
 */
export default function SidebarCommodityPulse({ collapsed = false }) {
  const { data: prices = [] } = useCommodityPrices({ staleTime: 60_000 });

  const brent = prices.find(c => c.symbol === 'BRENT');
  const gold = prices.find(c => c.symbol === 'GOLD');

  if (!brent && !gold) return null;

  const items = [
    { data: brent, color: '#EA580C', label: 'Brent', icon: IconBarrel },
    { data: gold, color: '#F59E0B', label: 'Gold', icon: IconDiamond },
  ].filter(c => c.data);

  if (collapsed) {
    return (
      <Stack gap={4} align="center" className={animStyles.widgetSlideIn}>
        {items.map(item => {
          const Icon = item.icon;
          return <Icon key={item.label} size={32} color={item.color} stroke={1.5} />;
        })}
      </Stack>
    );
  }

  return (
    <Stack gap={6} className={animStyles.widgetSlideIn}>
      <Text size="xs" c="dimmed" fw={500} px="xs">
        کالاها
      </Text>
      {items.map(item => {
        const price = Number(item.data.price);
        const change = item.data.change_pct ?? 0;
        const changeColor = change >= 0 ? rallyColors.green : rallyColors.red;
        const Icon = item.icon;

        return (
          <Box
            key={item.label}
            px="xs"
            py={4}
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
              background: 'rgba(156, 163, 175, 0.04)',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <Icon size={24} color={item.color} stroke={1.5} />
                <Text size="xs" fw={600} c={rallyColors.textPrimary}>
                  {item.label}
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
