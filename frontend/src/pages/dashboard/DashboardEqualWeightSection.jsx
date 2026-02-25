import { motion } from 'motion/react';
import { Box, Group, SimpleGrid, Text } from '@mantine/core';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import { toPersianNum, formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

function IndexMiniCard({ title, trend, chartData, loading, fillColor }) {
  const trendNum = Number(trend);
  const isUp = trendNum >= 0;
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].y : null;

  const deltaColor = isUp ? rallyColors.green : rallyColors.red;
  const deltaBg = isUp ? `${rallyColors.green}1F` : `${rallyColors.red}1F`;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        borderRadius: 14,
        padding: '16px 18px 12px',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Header: label + delta pill */}
      <Group justify="space-between" wrap="nowrap" mb={8} gap="xs">
        <Text
          size="xs"
          lineClamp={1}
          style={{
            flex: 1,
            color: rallyColors.textSecondary,
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </Text>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 8px',
            borderRadius: 9999,
            background: deltaBg,
            fontSize: 11,
            fontWeight: 600,
            color: deltaColor,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 8 }}>{isUp ? '▲' : '▼'}</span>
          {trendNum > 0 ? '+' : ''}{toPersianNum(trendNum.toFixed(2))}٪
        </span>
      </Group>

      {/* Value */}
      <Text
        size="xl"
        fw={700}
        mb={10}
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: rallyColors.textPrimary,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}
      >
        {currentValue != null ? formatNum(Math.round(currentValue)) : '—'}
      </Text>

      {/* Chart area */}
      {loading ? (
        <RallyChartSkeleton height={110} />
      ) : chartData.length > 0 ? (
        <Box mx={-18} mb={-12}>
          <RallyAreaChart data={chartData} fillColor={fillColor} height={110} hideAxes />
        </Box>
      ) : (
        <Box py="md" ta="center">
          <Text size="sm" style={{ color: rallyColors.textDimmed }}>داده موجود نیست</Text>
        </Box>
      )}
    </motion.div>
  );
}

export default function DashboardEqualWeightSection({
  tedpixChartData = [],
  tedpixTrend = 0,
  tedpixLoading = false,
  ewTotalChartData = [],
  ewTotalTrend = 0,
  ewTotalLoading = false,
  ewPriceChartData = [],
  ewPriceTrend = 0,
  ewPriceLoading = false,
  dollarSpotChartData = [],
  dollarSpotTrend = 0,
  dollarSpotLoading = false,
  dollarFwdChartData = [],
  dollarFwdTrend = 0,
  dollarFwdLoading = false,
  goldChartData = [],
  goldTrend = 0,
  goldLoading = false,
}) {
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <IndexMiniCard
          title="شاخص کل (TEDPIX)"
          trend={tedpixTrend}
          chartData={tedpixChartData}
          loading={tedpixLoading}
          fillColor={rallyColors.primary}
        />
        <IndexMiniCard
          title="شاخص کل (هم‌وزن)"
          trend={ewTotalTrend}
          chartData={ewTotalChartData}
          loading={ewTotalLoading}
          fillColor={rallyColors.green}
        />
        <IndexMiniCard
          title="شاخص قیمت (هم‌وزن)"
          trend={ewPriceTrend}
          chartData={ewPriceChartData}
          loading={ewPriceLoading}
          fillColor={rallyColors.purple}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <IndexMiniCard
          title="دلار (نقدی)"
          trend={dollarSpotTrend}
          chartData={dollarSpotChartData}
          loading={dollarSpotLoading}
          fillColor={rallyColors.primary}
        />
        <IndexMiniCard
          title="دلار (فردایی)"
          trend={dollarFwdTrend}
          chartData={dollarFwdChartData}
          loading={dollarFwdLoading}
          fillColor={rallyColors.blue}
        />
        <IndexMiniCard
          title="طلای ۱۸ عیار"
          trend={goldTrend}
          chartData={goldChartData}
          loading={goldLoading}
          fillColor={rallyColors.yellow}
        />
      </SimpleGrid>
    </>
  );
}
