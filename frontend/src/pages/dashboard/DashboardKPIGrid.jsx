import { SimpleGrid, Box } from '@mantine/core';
import {
  BankIcon, ActiveIcon, VolumeIcon, ValueIcon,
  HighLowIcon, PERatioIcon, LiquidityIcon,
} from '../../components/icons/KPIIcons';
import RallyKPICard from '../../components/RallyKPICard';
import KPICarousel from '../../components/KPICarousel';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import animStyles from '../../components/shared/animations.module.css';
import { useWidgetSize } from '../../core/context/WidgetSizeContext';

export default function DashboardKPIGrid({ stats, newHighs, newLows, avgPE, liquidityScore, compact = false, kpiSparklines = {} }) {
  const { density } = useWidgetSize();
  const isCompact = compact || density === 'compact';
  const cards = [
    { title: 'کل نمادها', value: formatNum(stats?.total_securities), icon: BankIcon, color: rallyColors.primary, bgColor: rallyColors.darkPrimary, sparkline: kpiSparklines.totalSecurities },
    { title: 'فعال امروز', value: formatNum(stats?.securities_with_data_today), icon: ActiveIcon, color: rallyColors.purple, bgColor: rallyColors.purple, sparkline: kpiSparklines.activeToday },
    { title: 'حجم کل', value: stats?.total_volume_today ? toPersianNum((stats.total_volume_today / 1e9).toFixed(1)) + 'B' : toPersianNum('0'), icon: VolumeIcon, color: rallyColors.primary, bgColor: rallyColors.primary, sparkline: kpiSparklines.volume },
    { title: 'ارزش کل', value: stats?.total_value_today ? toPersianNum((stats.total_value_today / 1e12).toFixed(2)) + 'T' : toPersianNum('0'), icon: ValueIcon, color: rallyColors.blue, bgColor: rallyColors.blue, subtitle: stats?.latest_date || '', sparkline: kpiSparklines.value },
    { title: 'رکوردهای جدید', value: `${toPersianNum(newHighs)} / ${toPersianNum(newLows)}`, subtitle: 'بالاترین / پایین‌ترین', icon: HighLowIcon, color: rallyColors.yellow, bgColor: rallyColors.yellow },
    { title: 'میانگین P/E بازار', value: avgPE ? toPersianNum(avgPE) : '-', subtitle: 'نسبت قیمت به سود', icon: PERatioIcon, color: rallyColors.blue, bgColor: rallyColors.blue },
    { title: 'نقدشوندگی بازار', value: toPersianNum(liquidityScore), subtitle: 'از ۱۰۰', icon: LiquidityIcon, color: rallyColors.primary, bgColor: rallyColors.primary },
  ];

  if (isCompact) {
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
    <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing={{ base: 'xs', md: 'sm' }} mb="sm">
      {cards.map((c, i) => (
        <Box key={i} className={animStyles.cardEnter}>
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
