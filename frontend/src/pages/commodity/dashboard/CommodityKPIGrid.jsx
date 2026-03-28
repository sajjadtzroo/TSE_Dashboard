import { SimpleGrid, Box } from '@mantine/core';
import { IconBarrel, IconTrendingUp, IconTrendingDown, IconChartBar } from '@tabler/icons-react';
import RallyKPICard from '../../../components/RallyKPICard';
import rallyColors from '../../../theme/rallyColors';
import animStyles from '../../../components/shared/animations.module.css';
import { toPersianNum } from '../../../utils/formatUtils';

export default function CommodityKPIGrid({ prices = [], compact = false }) {
  const advancers = prices.filter(c => (c.change_pct ?? 0) > 0).length;
  const decliners = prices.filter(c => (c.change_pct ?? 0) < 0).length;

  const brent = prices.find(c => c.symbol === 'BRENT');
  const gold = prices.find(c => c.symbol === 'GOLD');
  const copper = prices.find(c => c.symbol === 'COPPER');

  const kpis = [
    {
      title: 'نفت برنت',
      value: brent ? `$${toPersianNum(Number(brent.price).toFixed(2))}` : '—',
      icon: IconBarrel,
      color: '#EA580C',
      bgColor: '#EA580C',
      change: brent?.change_pct,
    },
    {
      title: 'طلا',
      value: gold ? `$${toPersianNum(Number(gold.price).toLocaleString(undefined, { maximumFractionDigits: 0 }))}` : '—',
      icon: IconChartBar,
      color: '#F59E0B',
      bgColor: '#F59E0B',
      change: gold?.change_pct,
    },
    {
      title: 'مس',
      value: copper ? `$${toPersianNum(Number(copper.price).toFixed(2))}` : '—',
      icon: IconChartBar,
      color: '#3B82F6',
      bgColor: '#3B82F6',
      change: copper?.change_pct,
    },
    {
      title: 'صعودی / نزولی',
      value: `${toPersianNum(advancers)} / ${toPersianNum(decliners)}`,
      icon: advancers >= decliners ? IconTrendingUp : IconTrendingDown,
      color: advancers >= decliners ? rallyColors.green : rallyColors.red,
      bgColor: advancers >= decliners ? rallyColors.green : rallyColors.red,
    },
  ];

  return (
    <SimpleGrid
      cols={{ base: 2, xs: 2, sm: 2, md: 4 }}
      spacing="md"
      mb="md"
    >
      {kpis.map((kpi, i) => (
        <Box key={kpi.title} className={animStyles.cardEnter} h="100%">
          <RallyKPICard
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            bgColor={kpi.bgColor}
            change={kpi.change}
          />
        </Box>
      ))}
    </SimpleGrid>
  );
}
