import { useMemo } from 'react';
import { SimpleGrid, Text, Group, Box } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyPieChart from '../../../components/charts/RallyPieChart';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { usePortfolioContext } from '../PortfolioProvider';

export default function DiversificationCard() {
  const { enriched, perStockMetrics, portfolioReturns, benchReturnSeries } = usePortfolioContext();

  const data = useMemo(() => {
    // Portfolio R² = corr(portfolio, benchmark)²
    // We need aligned portfolio vs bench returns
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 20 || !benchReturnSeries.length) {
      return null;
    }

    // Build date-keyed bench map
    const benchMap = new Map();
    for (const b of benchReturnSeries) benchMap.set(b.date, b.ret);

    const alignedPort = [];
    const alignedBench = [];
    for (let i = 0; i < portDates.length; i++) {
      const br = benchMap.get(portDates[i]);
      if (br !== undefined) {
        alignedPort.push(portRets[i]);
        alignedBench.push(br);
      }
    }

    if (alignedPort.length < 20) return null;

    // Compute correlation
    const n = alignedPort.length;
    const meanP = alignedPort.reduce((s, v) => s + v, 0) / n;
    const meanB = alignedBench.reduce((s, v) => s + v, 0) / n;
    let cov = 0, varP = 0, varB = 0;
    for (let i = 0; i < n; i++) {
      const dp = alignedPort[i] - meanP;
      const db = alignedBench[i] - meanB;
      cov += dp * db;
      varP += dp * dp;
      varB += db * db;
    }
    const corr = varP > 0 && varB > 0 ? cov / Math.sqrt(varP * varB) : 0;
    const rSq = corr * corr;

    // Actual portfolio vol
    const portVol = Math.sqrt(varP / (n - 1)) * Math.sqrt(252);

    // Naive weighted-average vol
    const naiveVol = enriched.reduce((sum, e) => {
      const pm = perStockMetrics.find((p) => p.symbol === e.symbol);
      return sum + (e.weight / 100) * (pm?.metrics?.volatility ?? 0);
    }, 0);

    const diversBenefit = naiveVol > 0 ? (naiveVol - portVol) / naiveVol : 0;

    return { rSq, portVol, naiveVol, diversBenefit };
  }, [portfolioReturns, benchReturnSeries, enriched, perStockMetrics]);

  if (!data) {
    return (
      <RallyMainCard title="تنوع‌بخشی">
        <Text size="sm" c="dimmed" ta="center" py="xl">
          داده کافی برای تحلیل تنوع‌بخشی موجود نیست
        </Text>
      </RallyMainCard>
    );
  }

  const pieData = [
    { x: 'ریسک سیستماتیک', y: Math.round(data.rSq * 100) },
    { x: 'ریسک غیرسیستماتیک', y: Math.round((1 - data.rSq) * 100) },
  ];

  return (
    <RallyMainCard title="تنوع‌بخشی">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Box>
          <RallyPieChart
            data={pieData}
            height={220}
            colorScale={[rallyColors.blue, rallyColors.purple]}
            centerLabel="R²"
            centerValue={toPersianNum((data.rSq * 100).toFixed(0)) + '٪'}
          />
        </Box>
        <Box>
          <Group gap="xs" mb="sm">
            <Text size="sm" c="dimmed">نوسان واقعی پرتفو:</Text>
            <Text size="sm" fw={700}>{formatPercent(data.portVol * 100, 1)}</Text>
          </Group>
          <Group gap="xs" mb="sm">
            <Text size="sm" c="dimmed">نوسان ساده وزنی:</Text>
            <Text size="sm" fw={700}>{formatPercent(data.naiveVol * 100, 1)}</Text>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed">اثر تنوع‌بخشی:</Text>
            <Text size="sm" fw={700} c={rallyColors.green}>
              {formatPercent(data.diversBenefit * 100, 1)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt="md">
            اختلاف بین نوسان ساده وزنی و نوسان واقعی، نشان‌دهنده اثر تنوع‌بخشی است.
            هرچه R² کمتر باشد، ریسک غیرسیستماتیک بیشتر و امکان حذف آن با تنوع‌بخشی بیشتر است.
          </Text>
        </Box>
      </SimpleGrid>
    </RallyMainCard>
  );
}
