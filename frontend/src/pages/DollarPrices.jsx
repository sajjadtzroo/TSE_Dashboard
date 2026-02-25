import { motion } from 'motion/react';
import { Badge, Box, Group, SimpleGrid, Text } from '@mantine/core';
import { IconCurrencyDollar } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyAreaChart from '../components/charts/RallyAreaChart';
import { useDollarRate, useDollarHistory } from '../hooks/useMarketData';
import { formatNum, toPersianNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

const SIDE_FA = { buy: 'خرید', sell: 'فروش', traded: 'معامله شد' };
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

function DollarChartCard({ title, rate, chartData, chartLoading, fillColor }) {
  const price = rate?.price != null ? formatNum(rate.price) : '—';
  const sideLabel = SIDE_FA[rate?.side] ?? '';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={SPRING}
      style={{ ...glassBase, display: 'flex', flexDirection: 'column' }}
    >
      {/* Accent glow top-right */}
      <Box style={{
        position: 'absolute', width: 80, height: 80,
        background: `radial-gradient(circle, ${fillColor}18 0%, transparent 70%)`,
        top: -28, right: -28, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header + value */}
      <Box style={{ padding: '16px 18px 10px', position: 'relative', zIndex: 1, flex: 'none' }}>
        <Group justify="space-between" wrap="nowrap" mb={8} gap="xs">
          <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <IconCurrencyDollar size={13} color={fillColor} style={{ flexShrink: 0 }} />
            <Text size="xs" lineClamp={1} style={{
              color: rallyColors.textSecondary, fontWeight: 500, letterSpacing: '0.02em',
            }}>
              {title}
            </Text>
          </Group>
          <DeltaPill value={rate?.change_pct} />
        </Group>

        <Text fw={700} mb={2} style={{
          fontVariantNumeric: 'tabular-nums', color: rallyColors.textPrimary,
          letterSpacing: '-0.03em', lineHeight: 1.1, fontSize: 20,
        }}>
          {price}
        </Text>
        <Text size="xs" mb={8} style={{ color: rallyColors.textDimmed }}>
          تومان{sideLabel ? ` · ${sideLabel}` : ''}
        </Text>
      </Box>

      {/* Chart — full-width bleed */}
      <Box style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {chartLoading ? (
          <Box px={18} pb={12}>
            <RallyChartSkeleton height={110} />
          </Box>
        ) : chartData?.length ? (
          <RallyAreaChart
            data={chartData}
            fillColor={fillColor}
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

export default function DollarPrices() {
  const { data: dollarRate, isLoading: rateLoading } = useDollarRate();
  const { data: history, isLoading: histLoading } = useDollarHistory(7);

  return (
    <>
      <PageHeader title="نرخ دلار">
        <Badge size="sm" variant="light" style={{
          background: `${rallyColors.primary}20`,
          color: rallyColors.primary,
          border: `1px solid ${rallyColors.primary}40`,
        }}>
          هر ۳۰ ثانیه
        </Badge>
      </PageHeader>

      {rateLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {['spot', 'forward'].map(k => (
            <Box key={k} style={{ ...glassBase, padding: 16 }}>
              <RallyChartSkeleton height={160} />
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <DollarChartCard
            title="دلار نقدی"
            rate={dollarRate?.spot}
            chartData={history?.spot}
            chartLoading={histLoading}
            fillColor={rallyColors.primary}
          />
          <DollarChartCard
            title="دلار فردایی"
            rate={dollarRate?.forward}
            chartData={history?.forward}
            chartLoading={histLoading}
            fillColor={rallyColors.blue}
          />
        </SimpleGrid>
      )}
    </>
  );
}
