import { useMemo } from 'react';
import { SimpleGrid, Box, Stack, Text } from '@mantine/core';
import RallyMainCard from '../../../../components/RallyMainCard';
import RallyPieChart from '../../../../components/charts/RallyPieChart';
import RallyBarChart from '../../../../components/charts/RallyBarChart';
import AssetSuggestionCard from './AssetSuggestionCard';
import PortfolioMetrics from './PortfolioMetrics';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../../../constants/riskQuestions';
import { useSuggestedPortfolio } from '../../../../hooks/useRiskProfile';
import { toPersianNum } from '../../../../utils/formatUtils';
import animStyles from '../../../../components/shared/animations.module.css';

/**
 * Suggested portfolio view: donut allocation, bar comparison, asset cards, KPI metrics.
 */
export default function SuggestedPortfolio({ category }) {
  const suggestion = useSuggestedPortfolio(category);

  const pieData = useMemo(() => {
    if (!suggestion) return [];
    return Object.entries(suggestion.allocation)
      .filter(([, pct]) => pct > 0)
      .map(([cls, pct]) => ({
        x: ASSET_CLASS_LABELS[cls],
        y: pct,
      }));
  }, [suggestion]);

  const pieColors = useMemo(() => {
    if (!suggestion) return [];
    return Object.entries(suggestion.allocation)
      .filter(([, pct]) => pct > 0)
      .map(([cls]) => ASSET_CLASS_COLORS[cls]);
  }, [suggestion]);

  const barData = useMemo(() => {
    if (!suggestion) return [];
    return Object.entries(suggestion.allocation)
      .filter(([, pct]) => pct > 0)
      .map(([cls, pct]) => ({
        x: ASSET_CLASS_LABELS[cls],
        y: pct,
      }));
  }, [suggestion]);

  if (!suggestion) {
    return (
      <RallyMainCard title="پیشنهاد سبد">
        <Text size="sm" c="dimmed" ta="center" py="xl">
          ابتدا پرسش‌نامه ریسک را تکمیل کنید
        </Text>
      </RallyMainCard>
    );
  }

  return (
    <Stack gap="md">
      {/* KPI Metrics */}
      <Box className={animStyles.sectionEnter}>
        <PortfolioMetrics metrics={suggestion.metrics} />
      </Box>

      {/* Charts Row */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title="تخصیص دارایی">
          <RallyPieChart
            data={pieData}
            colorScale={pieColors}
            height={280}
            centerLabel={suggestion.label}
            centerValue={toPersianNum(100) + '٪'}
          />
        </RallyMainCard>

        <RallyMainCard title="وزن طبقات دارایی">
          <RallyBarChart
            data={barData}
            height={280}
            barColor={ASSET_CLASS_COLORS.stocks}
            autoColorByValue={false}
            tooltipFormatter={({ x, y }) => `${x}: ${toPersianNum(y)}٪`}
          />
        </RallyMainCard>
      </SimpleGrid>

      {/* Asset Suggestion Cards */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="md"
        className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}
      >
        {suggestion.holdings.map((h) => (
          <AssetSuggestionCard
            key={h.assetClass}
            assetClass={h.assetClass}
            weight={h.weight}
            symbols={h.symbols}
            rationale={h.rationale}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
