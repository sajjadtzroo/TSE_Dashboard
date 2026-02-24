import { Badge, Box, Center, Grid, Group, Loader, Text, Title } from '@mantine/core';
import { IconCoin, IconDiamond } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import RallyMainCard from '../components/RallyMainCard';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import { useGoldLatest } from '../hooks/useMarketData';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

// Display order and grouping
const GOLD_SYMBOLS = ['XAU_OZ', 'XAU_TEHRAN', 'GOLD_18K', 'GOLD_24K'];
const COIN_SYMBOLS = ['COIN_FULL_NEW', 'COIN_FULL_OLD', 'COIN_HALF', 'COIN_QUARTER', 'COIN_GRAM'];

function PriceCard({ item }) {
  const isGold = item.symbol.startsWith('XAU') || item.symbol.startsWith('GOLD');
  const price = item.price_usd != null
    ? `$${toPersianNum(item.price_usd.toLocaleString())}`
    : formatNum(item.price_irr);
  const sub = item.price_usd != null ? 'دلار' : 'ریال';

  return (
    <RallyMainCard>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box>
          <Text size="xs" c="dimmed" mb={2}>{item.name_fa}</Text>
          <Text size="xl" fw={700} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {price}
          </Text>
          <Text size="xs" c="dimmed">{sub}</Text>
        </Box>
        <Box ta="end">
          <Box mb={4}>
            {isGold
              ? <IconDiamond size={20} color={rallyColors.yellow ?? '#f59e0b'} />
              : <IconCoin size={20} color={rallyColors.yellow ?? '#f59e0b'} />}
          </Box>
          <PercentChangeCell value={item.change_pct_1h} />
          <Text size="xs" c="dimmed">۱ ساعته</Text>
        </Box>
      </Group>
    </RallyMainCard>
  );
}

export default function GoldPrices() {
  const { data, isLoading } = useGoldLatest();

  const gold = GOLD_SYMBOLS.map(s => data?.[s]).filter(Boolean);
  const coins = COIN_SYMBOLS.map(s => data?.[s]).filter(Boolean);

  return (
    <>
      <PageHeader title="طلا و سکه">
        <Badge color="rally-green" variant="light" size="sm">هر ۳۰ ثانیه</Badge>
      </PageHeader>

      {isLoading ? (
        <Center mih={300}><Loader color="rally-green" size="sm" /></Center>
      ) : (
        <>
          <Title order={5} mb="sm" c="dimmed">طلا</Title>
          <Grid gutter="md" mb="lg">
            {gold.map(item => (
              <Grid.Col key={item.symbol} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
                <PriceCard item={item} />
              </Grid.Col>
            ))}
          </Grid>

          <Title order={5} mb="sm" c="dimmed">سکه</Title>
          <Grid gutter="md">
            {coins.map(item => (
              <Grid.Col key={item.symbol} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
                <PriceCard item={item} />
              </Grid.Col>
            ))}
          </Grid>
        </>
      )}
    </>
  );
}
