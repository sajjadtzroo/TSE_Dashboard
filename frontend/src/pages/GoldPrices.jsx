import { motion } from 'motion/react';
import { Badge, Box, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { IconCoin, IconDiamond } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyAreaChart from '../components/charts/RallyAreaChart';
import { useGoldLatest, useGoldHistory } from '../hooks/useMarketData';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

// GOLD_18K first — it has 7-day chart history
const GOLD_SYMBOLS = ['GOLD_18K', 'XAU_OZ', 'XAU_TEHRAN', 'GOLD_24K'];
const COIN_SYMBOLS = ['COIN_FULL_NEW', 'COIN_FULL_OLD', 'COIN_HALF', 'COIN_QUARTER', 'COIN_GRAM'];

const SPRING = { type: 'spring', stiffness: 400, damping: 25 };

const glassBase = {
  background: rallyColors.glassBg,
  backdropFilter: rallyColors.glassBlur,
  border: `1px solid ${rallyColors.glassBorder}`,
  borderRadius: 14,
  overflow: 'hidden',
  cursor: 'default',
  position: 'relative',
  height: '100%',
};

// ── Shared delta pill — identical to IndexMiniCard ───────────────────────────
function DeltaPill({ value }) {
  if (value == null) return null;
  const n = Number(value);
  const isUp = n >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 9999,
      background: isUp ? `${rallyColors.green}1F` : `${rallyColors.red}1F`,
      fontSize: 11, fontWeight: 600,
      color: isUp ? rallyColors.green : rallyColors.red,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 8 }}>{isUp ? '▲' : '▼'}</span>
      {n > 0 ? '+' : ''}{toPersianNum(n.toFixed(2))}٪
    </span>
  );
}

// ── All gold metals: chart card (IndexMiniCard pattern) ──────────────────────
function GoldChartCard({ item, chartData, chartLoading }) {
  const trend = (() => {
    if (!chartData?.length) return 0;
    const first = chartData[0]?.y;
    const last  = chartData[chartData.length - 1]?.y;
    return (first && last) ? ((last - first) / first * 100) : 0;
  })();

  const isUsd  = item.price_usd != null;
  const price  = isUsd
    ? `$${toPersianNum(item.price_usd.toLocaleString())}`
    : item.price_irr != null ? formatNum(item.price_irr) : '—';
  const currency = isUsd ? 'دلار' : 'ریال';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={SPRING}
      style={{ ...glassBase, display: 'flex', flexDirection: 'column' }}
    >
      {/* Accent glow */}
      <Box style={{
        position: 'absolute', width: 80, height: 80,
        background: `radial-gradient(circle, ${rallyColors.yellow}18 0%, transparent 70%)`,
        top: -28, right: -28, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header + value */}
      <Box style={{ padding: '16px 18px 10px', position: 'relative', zIndex: 1, flex: 'none' }}>
        <Group justify="space-between" wrap="nowrap" mb={8} gap="xs">
          <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <IconDiamond size={13} color={rallyColors.yellow} style={{ flexShrink: 0 }} />
            <Text size="xs" lineClamp={1} style={{
              color: rallyColors.textSecondary, fontWeight: 500, letterSpacing: '0.02em',
            }}>
              {item.name_fa}
            </Text>
          </Group>
          <DeltaPill value={trend} />
        </Group>

        <Text fw={700} mb={2} style={{
          fontVariantNumeric: 'tabular-nums', color: rallyColors.textPrimary,
          letterSpacing: '-0.03em', lineHeight: 1.1, fontSize: 20,
        }}>
          {price}
        </Text>
        <Text size="xs" mb={8} style={{ color: rallyColors.textDimmed }}>{currency}</Text>
      </Box>

      {/* Chart — no wrapper padding, full-width bleed, clipped by overflow:hidden */}
      <Box style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {chartLoading ? (
          <Box px={18} pb={12}>
            <RallyChartSkeleton height={110} />
          </Box>
        ) : chartData?.length ? (
          <RallyAreaChart
            data={chartData}
            fillColor={rallyColors.yellow}
            height={110}
            hideAxes
          />
        ) : (
          <Box py="md" ta="center">
            <Text size="sm" style={{ color: rallyColors.textDimmed }}>داده موجود نیست</Text>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}

// ── All other items: KPI card (glassmorphic + icon + price + delta) ───────────
function GoldKPICard({ item }) {
  const isGold = item.symbol.startsWith('XAU') || item.symbol.startsWith('GOLD');
  const Icon   = isGold ? IconDiamond : IconCoin;
  const accent = rallyColors.yellow;

  const price    = item.price_usd != null
    ? `$${toPersianNum(item.price_usd.toLocaleString())}`
    : item.price_irr != null ? formatNum(item.price_irr) : '—';
  const currency = item.price_usd != null ? 'دلار' : 'ریال';

  return (
    <motion.div whileHover={{ y: -3 }} transition={SPRING} style={glassBase}>
      {/* Accent glow */}
      <Box style={{
        position: 'absolute', width: 56, height: 56,
        background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
        top: -18, right: -18, pointerEvents: 'none', zIndex: 0,
      }} />

      <Box style={{
        padding: '14px 16px', position: 'relative', zIndex: 1,
        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* Top: icon + name + price */}
        <Box>
          <Box mb={8}>
            <ThemeIcon size={32} radius={8} style={{
              background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0a 100%)`,
              color: accent,
              border: `1px solid ${accent}25`,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06)`,
            }}>
              <Icon size={17} stroke={1.5} />
            </ThemeIcon>
          </Box>
          <Text size="xs" mb={3} style={{ color: rallyColors.textSecondary, fontWeight: 500 }}>
            {item.name_fa}
          </Text>
          <Text fw={700} style={{
            fontVariantNumeric: 'tabular-nums', color: rallyColors.textPrimary,
            letterSpacing: '-0.02em', lineHeight: 1.15, fontSize: 17,
          }}>
            {price}
          </Text>
          <Text size="xs" mt={2} style={{ color: rallyColors.textDimmed }}>{currency}</Text>
        </Box>

        {/* Bottom: delta pill + timeframe label */}
        <Group justify="space-between" align="center" mt={12}>
          <DeltaPill value={item.change_pct_1h} />
          <Text size="xs" style={{ color: rallyColors.textDimmed }}>۱ ساعته</Text>
        </Group>
      </Box>
    </motion.div>
  );
}

// ── Section divider with gold accent bar ─────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <Group gap={8} mb="sm" align="center">
      <Box style={{ width: 3, height: 16, borderRadius: 2, background: rallyColors.yellow, flexShrink: 0 }} />
      <Text size="sm" fw={600} style={{ color: rallyColors.textSecondary, letterSpacing: '0.04em' }}>
        {label}
      </Text>
    </Group>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GoldPrices() {
  const { data, isLoading } = useGoldLatest();

  // One history hook per symbol — independent cache keys, parallel fetches
  const { data: hist18K,    isLoading: load18K }    = useGoldHistory(7, 'GOLD_18K');
  const { data: histOZ,     isLoading: loadOZ }     = useGoldHistory(7, 'XAU_OZ');
  const { data: histTehran, isLoading: loadTehran } = useGoldHistory(7, 'XAU_TEHRAN');
  const { data: hist24K,    isLoading: load24K }    = useGoldHistory(7, 'GOLD_24K');

  const chartMap = {
    GOLD_18K:   { data: hist18K,    loading: load18K    },
    XAU_OZ:     { data: histOZ,     loading: loadOZ     },
    XAU_TEHRAN: { data: histTehran, loading: loadTehran },
    GOLD_24K:   { data: hist24K,    loading: load24K    },
  };

  const gold  = GOLD_SYMBOLS.map(s => data?.[s]).filter(Boolean);
  const coins = COIN_SYMBOLS.map(s => data?.[s]).filter(Boolean);

  return (
    <>
      <PageHeader title="طلا و سکه">
        <Badge size="sm" variant="light" style={{
          background: `${rallyColors.yellow}20`,
          color: rallyColors.yellow,
          border: `1px solid ${rallyColors.yellow}40`,
        }}>
          هر ۳۰ ثانیه
        </Badge>
      </PageHeader>

      {isLoading ? (
        <>
          <SectionLabel label="طلا" />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="lg">
            {GOLD_SYMBOLS.map(s => (
              <Box key={s} style={{ ...glassBase, padding: 16 }}>
                <RallyChartSkeleton height={160} />
              </Box>
            ))}
          </SimpleGrid>
          <SectionLabel label="سکه" />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md">
            {COIN_SYMBOLS.map(s => (
              <Box key={s} style={{ ...glassBase, padding: 16 }}>
                <RallyChartSkeleton height={100} />
              </Box>
            ))}
          </SimpleGrid>
        </>
      ) : (
        <>
          <SectionLabel label="طلا" />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="lg">
            {gold.map(item => (
              <GoldChartCard
                key={item.symbol}
                item={item}
                chartData={chartMap[item.symbol]?.data}
                chartLoading={chartMap[item.symbol]?.loading ?? false}
              />
            ))}
          </SimpleGrid>

          <SectionLabel label="سکه" />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md">
            {coins.map(item => <GoldKPICard key={item.symbol} item={item} />)}
          </SimpleGrid>
        </>
      )}
    </>
  );
}
