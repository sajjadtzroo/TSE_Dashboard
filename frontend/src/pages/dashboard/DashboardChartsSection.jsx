import { Box, Collapse, SimpleGrid, Text, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import TopMoversCards from '../../components/TopMoversCards';
import RallyBarChart from '../../components/charts/RallyBarChart';
import RallyPieChart, { RALLY_COLOR_SCALE } from '../../components/charts/RallyPieChart';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';
import animStyles from '../../components/shared/animations.module.css';

export default function DashboardChartsSection({
  expanded, onToggle,
  barData, volumeBySector, pieData, totalSectorCount, recentData,
}) {
  return (
    <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
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
          <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 3, xl: 4 }} spacing="md">
            <RallyMainCard title="بیشترین رشد و افت" fullscreenable>
              {barData.length > 0 ? (
                <RallyBarChart data={barData} autoColorByValue height={280} tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده قیمتی موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع حجم معاملات (میلیارد)" fullscreenable>
              {volumeBySector.length > 0 ? (
                <RallyBarChart data={volumeBySector} horizontal height={280} barColor={rallyColors.blue} tooltipFormatter={(d) => `${d.x}: ${toPersianNum(d.y)}B`} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده حجم موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع صنایع" fullscreenable>
              {pieData.length > 0 ? (
                <RallyPieChart data={pieData} colorScale={RALLY_COLOR_SCALE.concat(['#4FC3F7', '#AED581', '#FFB74D'])} centerLabel="مجموع" centerValue={totalSectorCount} height={280} width={280} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده صنعت موجود نیست</Text>
              )}
            </RallyMainCard>

            <TopMoversCards data={recentData} />
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
