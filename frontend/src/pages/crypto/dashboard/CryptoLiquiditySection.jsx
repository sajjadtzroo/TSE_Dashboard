import { useState, useMemo } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon, Group } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

export default function CryptoLiquiditySection({ liquidityMetrics = [] }) {
  const [expanded, setExpanded] = useState(true);

  const spreadBarData = useMemo(
    () => liquidityMetrics.map(c => ({ x: c.symbol, y: c.spread })),
    [liquidityMetrics],
  );

  const tightest = liquidityMetrics[0];
  const widest = liquidityMetrics[liquidityMetrics.length - 1];
  const avgSpread = useMemo(() => {
    if (!liquidityMetrics.length) return 0;
    return Number(
      (liquidityMetrics.reduce((s, c) => s + c.spread, 0) / liquidityMetrics.length).toFixed(4),
    );
  }, [liquidityMetrics]);

  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
      <RallyMainCard
        title="نقدشوندگی و اسپرد"
        secondary={
          <ActionIcon variant="subtle" onClick={() => setExpanded(!expanded)} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            <RallyMainCard>
              <Text size="xs" c="dimmed">کمترین اسپرد</Text>
              <Group justify="space-between" align="baseline" mt={4}>
                <Text size="lg" fw={700} style={{ color: rallyColors.green }}>
                  {tightest?.symbol || '-'}
                </Text>
                <Text size="sm" c="dimmed">{tightest?.spread != null ? toPersianNum(tightest.spread) : '-'}%</Text>
              </Group>
            </RallyMainCard>
            <RallyMainCard>
              <Text size="xs" c="dimmed">بیشترین اسپرد</Text>
              <Group justify="space-between" align="baseline" mt={4}>
                <Text size="lg" fw={700} style={{ color: rallyColors.red }}>
                  {widest?.symbol || '-'}
                </Text>
                <Text size="sm" c="dimmed">{widest?.spread != null ? toPersianNum(widest.spread) : '-'}%</Text>
              </Group>
            </RallyMainCard>
            <RallyMainCard>
              <Text size="xs" c="dimmed">میانگین اسپرد</Text>
              <Text size="lg" fw={700} mt={4} style={{ color: rallyColors.blue }}>
                {toPersianNum(avgSpread)}%
              </Text>
            </RallyMainCard>
          </SimpleGrid>

          <RallyMainCard title="اسپرد خرید-فروش (کمترین ← بیشترین)" fullscreenable>
            {spreadBarData.length > 0 ? (
              <RallyBarChart
                data={spreadBarData}
                horizontal
                height={Math.max(240, liquidityMetrics.length * 28)}
                barColor={rallyColors.purple}
                tooltipFormatter={d => `${d.x}: ${d.y}%`}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">داده اسپرد موجود نیست</Text>
            )}
          </RallyMainCard>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
