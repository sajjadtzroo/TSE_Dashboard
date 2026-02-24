import { useState } from 'react';
import { Box, Group, SimpleGrid, Text } from '@mantine/core';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import { toPersianNum, formatNum } from '../../utils/formatUtils';

/* DS3 tokens */
const DS3 = {
  card: '#1A1D2E',
  cardHover: '#21253A',
  border: '#1E2234',
  borderHover: '#2A2E3E',
  fg: '#E8EAED',
  fg2: '#9CA3AF',
  fg3: '#6B7280',
  profit: '#22C55E',
  loss: '#EF4444',
  shadowSm: '0 2px 6px rgba(0,0,0,0.2)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.3)',
};

function IndexMiniCard({ title, trend, chartData, loading, fillColor }) {
  const [hovered, setHovered] = useState(false);
  const trendNum = Number(trend);
  const isUp = trendNum >= 0;
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].y : null;

  const deltaColor = isUp ? DS3.profit : DS3.loss;
  const deltaBg = isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? DS3.cardHover : DS3.card,
        border: `1px solid ${hovered ? DS3.borderHover : DS3.border}`,
        borderRadius: 14,
        padding: '16px 18px 12px',
        boxShadow: hovered ? DS3.shadowMd : DS3.shadowSm,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'default',
        overflow: 'hidden',
      }}
    >
      {/* Header: label + delta pill */}
      <Group justify="space-between" wrap="nowrap" mb={8} gap="xs">
        <Text
          size="xs"
          lineClamp={1}
          style={{
            flex: 1,
            color: DS3.fg2,
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
          <span style={{ fontSize: 8 }}>{isUp ? '\u25B2' : '\u25BC'}</span>
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
          color: DS3.fg,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}
      >
        {currentValue != null ? formatNum(Math.round(currentValue)) : '\u2014'}
      </Text>

      {/* Chart area */}
      {loading ? (
        <RallyChartSkeleton height={110} />
      ) : chartData.length > 0 ? (
        <Box mx={-18} mb={-12}>
          <RallyAreaChart
            data={chartData}
            fillColor={fillColor}
            height={110}
            hideAxes
          />
        </Box>
      ) : (
        <Box py="md" ta="center">
          <Text size="sm" style={{ color: DS3.fg3 }}>داده موجود نیست</Text>
        </Box>
      )}
    </div>
  );
}

export default function DashboardEqualWeightSection({
  tedpixChartData = [],
  tedpixTrend = 0,
  tedpixLoading = false,
  ewTotalChartData,
  ewTotalTrend,
  ewTotalLoading,
  ewPriceChartData,
  ewPriceTrend,
  ewPriceLoading,
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
      <IndexMiniCard
        title="شاخص کل (TEDPIX)"
        trend={tedpixTrend}
        chartData={tedpixChartData}
        loading={tedpixLoading}
        fillColor="#2962FF"
      />
      <IndexMiniCard
        title="شاخص کل (هم‌وزن)"
        trend={ewTotalTrend}
        chartData={ewTotalChartData}
        loading={ewTotalLoading}
        fillColor="#22C55E"
      />
      <IndexMiniCard
        title="شاخص قیمت (هم‌وزن)"
        trend={ewPriceTrend}
        chartData={ewPriceChartData}
        loading={ewPriceLoading}
        fillColor="#8B5CF6"
      />
    </SimpleGrid>
  );
}
