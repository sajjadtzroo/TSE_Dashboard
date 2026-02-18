import { SimpleGrid, Box } from '@mantine/core';
import {
  IconBuildingBank, IconChartLine, IconVolume, IconCalendar,
  IconTrendingUp, IconDroplet,
} from '@tabler/icons-react';
import RallyKPICard from '../../components/RallyKPICard';
import KPICarousel from '../../components/KPICarousel';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import animStyles from '../../components/shared/animations.module.css';

export default function DashboardKPIGrid({ stats, newHighs, newLows, avgPE, liquidityScore, compact = false, kpiSparklines = {} }) {
  const cards = [
    { title: 'کل نمادها', value: formatNum(stats?.total_securities), icon: IconBuildingBank, color: rallyColors.green, bgColor: rallyColors.darkGreen, sparkline: kpiSparklines.totalSecurities },
    { title: 'فعال امروز', value: formatNum(stats?.securities_with_data_today), icon: IconChartLine, color: rallyColors.purple, bgColor: rallyColors.purple, sparkline: kpiSparklines.activeToday },
    { title: 'حجم کل', value: stats?.total_volume_today ? toPersianNum((stats.total_volume_today / 1e9).toFixed(1)) + 'B' : toPersianNum('0'), icon: IconVolume, color: rallyColors.green, bgColor: rallyColors.green, sparkline: kpiSparklines.volume },
    { title: 'ارزش کل', value: stats?.total_value_today ? toPersianNum((stats.total_value_today / 1e12).toFixed(2)) + 'T' : toPersianNum('0'), icon: IconCalendar, color: rallyColors.blue, bgColor: rallyColors.blue, subtitle: stats?.latest_date || '', sparkline: kpiSparklines.value },
    { title: 'رکوردهای جدید', value: `${toPersianNum(newHighs)} / ${toPersianNum(newLows)}`, subtitle: 'بالاترین / پایین‌ترین', icon: IconTrendingUp, color: rallyColors.yellow, bgColor: rallyColors.yellow },
    { title: 'میانگین P/E بازار', value: avgPE ? toPersianNum(avgPE) : '-', subtitle: 'نسبت قیمت به سود', icon: IconChartLine, color: rallyColors.blue, bgColor: rallyColors.blue },
    { title: 'نقدشوندگی بازار', value: toPersianNum(liquidityScore), subtitle: 'از ۱۰۰', icon: IconDroplet, color: rallyColors.green, bgColor: rallyColors.green },
  ];

  if (compact) {
    return (
      <KPICarousel>
        {cards.map((c, i) => (
          <RallyKPICard
            key={i}
            title={c.title}
            value={c.value}
            icon={c.icon}
            color={c.color}
            bgColor={c.bgColor}
            compact
            animateValue
          />
        ))}
      </KPICarousel>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 7 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
      {cards.map((c, i) => (
        <Box key={i} className={animStyles.cardEnter} h="100%">
          <RallyKPICard
            title={c.title}
            value={c.value}
            icon={c.icon}
            color={c.color}
            bgColor={c.bgColor}
            subtitle={c.subtitle}
            sparklineData={c.sparkline}
            animateValue
          />
        </Box>
      ))}
    </SimpleGrid>
  );
}
