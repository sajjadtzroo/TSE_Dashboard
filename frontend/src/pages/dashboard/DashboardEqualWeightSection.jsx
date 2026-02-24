import { Badge, Box, Group, SimpleGrid, Text } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatTrillion } from '../../utils/formatUtils';

function EqualWeightCard({ title, trend, chartData, loading, fillColor }) {
  const trendNum = Number(trend);
  return (
    <RallyMainCard
      title={
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600}>{title}</Text>
          <Badge
            color={trendNum > 0 ? 'green' : 'red'}
            variant="light"
            size="sm"
          >
            {trendNum > 0 ? '+' : ''}{toPersianNum(trend)}%
          </Badge>
        </Group>
      }
      mb="md"
    >
      {loading ? (
        <RallyChartSkeleton height={130} />
      ) : chartData.length > 0 ? (
        <RallyAreaChart
          data={chartData}
          fillColor={fillColor}
          height={130}
          yFormatter={(v) => formatTrillion(v)}
        />
      ) : (
        <Box py="xl" ta="center">
          <Text c="dimmed" size="sm">داده موجود نیست</Text>
        </Box>
      )}
    </RallyMainCard>
  );
}

export default function DashboardEqualWeightSection({
  ewTotalChartData,
  ewTotalTrend,
  ewTotalLoading,
  ewPriceChartData,
  ewPriceTrend,
  ewPriceLoading,
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
      <EqualWeightCard
        title="شاخص کل (هم‌وزن)"
        trend={ewTotalTrend}
        chartData={ewTotalChartData}
        loading={ewTotalLoading}
        fillColor={rallyColors.green}
      />
      <EqualWeightCard
        title="شاخص قیمت (هم‌وزن)"
        trend={ewPriceTrend}
        chartData={ewPriceChartData}
        loading={ewPriceLoading}
        fillColor={rallyColors.purple}
      />
    </SimpleGrid>
  );
}
