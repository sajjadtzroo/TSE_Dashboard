import { useMemo } from 'react';
import { Box, Collapse, SimpleGrid, Text, ActionIcon, Group, Badge, Stack, ThemeIcon } from '@mantine/core';
import { IconChevronDown, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import TopMoversCards from '../../components/TopMoversCards';
import RallyBarChart from '../../components/charts/RallyBarChart';
import RallyPieChart, { RALLY_COLOR_SCALE } from '../../components/charts/RallyPieChart';
import ChartEmptyState from '../../components/charts/shared/ChartEmptyState';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

function SectorRotationCard({ recentData }) {
  const sectorChanges = useMemo(() => {
    if (!recentData?.length) return [];
    const sectors = {};
    for (const stock of recentData) {
      const sec = stock.sector_name_fa;
      if (!sec || stock.close_change_pct == null) continue;
      if (!sectors[sec]) sectors[sec] = { sum: 0, count: 0 };
      sectors[sec].sum += stock.close_change_pct;
      sectors[sec].count += 1;
    }
    return Object.entries(sectors)
      .map(([name, { sum, count }]) => ({ name, avgChange: sum / count, count }))
      .sort((a, b) => b.avgChange - a.avgChange);
  }, [recentData]);

  const top = sectorChanges.slice(0, 5);
  const bottom = sectorChanges.slice(-5).reverse();

  if (sectorChanges.length === 0) {
    return (
      <RallyMainCard title="چرخش صنایع">
        <Text c="dimmed" ta="center" py="xl">داده موجود نیست</Text>
      </RallyMainCard>
    );
  }

  return (
    <RallyMainCard title="چرخش صنایع" fullscreenable>
      <SimpleGrid cols={2} spacing="md">
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={600}>پرتقاضا</Text>
          {top.map((s) => (
            <Group key={s.name} justify="space-between" px="xs">
              <Text size="xs" lineClamp={1} style={{ flex: 1 }}>{s.name}</Text>
              <Badge
                variant="light"
                color={s.avgChange >= 0 ? 'green' : 'red'}
                size="sm"
                leftSection={s.avgChange >= 0 ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
              >
                {s.avgChange >= 0 ? '+' : ''}{toPersianNum(s.avgChange.toFixed(1))}٪
              </Badge>
            </Group>
          ))}
        </Stack>
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={600}>کم‌تقاضا</Text>
          {bottom.map((s) => (
            <Group key={s.name} justify="space-between" px="xs">
              <Text size="xs" lineClamp={1} style={{ flex: 1 }}>{s.name}</Text>
              <Badge
                variant="light"
                color={s.avgChange >= 0 ? 'green' : 'red'}
                size="sm"
                leftSection={s.avgChange >= 0 ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
              >
                {s.avgChange >= 0 ? '+' : ''}{toPersianNum(s.avgChange.toFixed(1))}٪
              </Badge>
            </Group>
          ))}
        </Stack>
      </SimpleGrid>
    </RallyMainCard>
  );
}

export default function DashboardChartsSection({
  expanded, onToggle,
  barData, volumeBySector, pieData, totalSectorCount, recentData,
}) {
  return (
    <Box>
      <RallyMainCard
        title="نمودارها و آمار"
        secondary={
          <ActionIcon variant="subtle" onClick={onToggle} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 2, xl: 2 }} spacing="md">
            <RallyMainCard title="بیشترین رشد و افت" fullscreenable>
              {barData.length > 0 ? (
                <RallyBarChart data={barData} autoColorByValue height={320} tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`} />
              ) : (
                <ChartEmptyState height={320} message="داده قیمتی موجود نیست" />
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع حجم معاملات (میلیارد)" fullscreenable>
              {volumeBySector.length > 0 ? (
                <RallyBarChart data={volumeBySector} horizontal height={320} barColor={rallyColors.blue} tooltipFormatter={(d) => `${d.x}: ${toPersianNum(d.y)}B`} />
              ) : (
                <ChartEmptyState height={320} message="داده حجم موجود نیست" />
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع صنایع" fullscreenable>
              {pieData.length > 0 ? (
                <RallyPieChart data={pieData} colorScale={RALLY_COLOR_SCALE.concat(['#4FC3F7', '#AED581', '#FFB74D'])} centerLabel="مجموع" centerValue={totalSectorCount} height={280} width={280} />
              ) : (
                <ChartEmptyState height={280} message="داده صنعت موجود نیست" />
              )}
            </RallyMainCard>

            <TopMoversCards data={recentData} />

            <SectorRotationCard recentData={recentData} />
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
