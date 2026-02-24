import { Badge, Box, Card, Group, SimpleGrid, Text } from '@mantine/core';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatNum } from '../../utils/formatUtils';

function IndexMiniCard({ title, trend, chartData, loading, fillColor }) {
  const trendNum = Number(trend);
  const trendColor = trendNum >= 0 ? 'green' : 'red';
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].y : null;

  return (
    <Card
      radius="md"
      p="sm"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb={4} gap="xs">
        <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Badge color={trendColor} variant="light" size="xs">
          {trendNum > 0 ? '+' : ''}{toPersianNum(trendNum.toFixed(2))}٪
        </Badge>
      </Group>

      <Text
        size="md"
        fw={700}
        mb={4}
        style={{ fontVariantNumeric: 'tabular-nums', color: rallyColors.textPrimary }}
      >
        {currentValue != null ? formatNum(Math.round(currentValue)) : '—'}
      </Text>

      {loading ? (
        <RallyChartSkeleton height={110} />
      ) : chartData.length > 0 ? (
        <RallyAreaChart
          data={chartData}
          fillColor={fillColor}
          height={110}
          hideAxes
        />
      ) : (
        <Box py="md" ta="center">
          <Text c="dimmed" size="sm">داده موجود نیست</Text>
        </Box>
      )}
    </Card>
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
        fillColor={rallyColors.blue}
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
  );
}
