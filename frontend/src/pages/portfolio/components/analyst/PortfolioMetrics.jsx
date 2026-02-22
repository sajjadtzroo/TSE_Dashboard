import { SimpleGrid, Box } from '@mantine/core';
import {
  IconTrendingUp,
  IconAlertTriangle,
  IconChartBar,
  IconArrowDown,
} from '@tabler/icons-react';
import RallyKPICard from '../../../../components/RallyKPICard';
import rallyColors from '../../../../theme/rallyColors';
import { toPersianNum } from '../../../../utils/formatUtils';
import animStyles from '../../../../components/shared/animations.module.css';

/**
 * 4 KPI cards showing expected portfolio metrics for a risk category.
 */
export default function PortfolioMetrics({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'بازدهی مورد انتظار',
      value: `${toPersianNum(metrics.expectedReturn[0])}–${toPersianNum(metrics.expectedReturn[1])}٪`,
      icon: IconTrendingUp,
      color: rallyColors.green,
    },
    {
      title: 'VaR ۹۵٪ روزانه',
      value: `${toPersianNum(metrics.var95)}٪`,
      icon: IconAlertTriangle,
      color: rallyColors.red,
    },
    {
      title: 'نسبت شارپ هدف',
      value: toPersianNum(metrics.sharpe.toFixed(1)),
      icon: IconChartBar,
      color: rallyColors.blue,
    },
    {
      title: 'حداکثر افت مجاز',
      value: `${toPersianNum(metrics.maxDrawdown)}٪`,
      icon: IconArrowDown,
      color: rallyColors.yellow,
    },
  ];

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {cards.map((c) => (
        <Box key={c.title} className={animStyles.cardEnter}>
          <RallyKPICard
            title={c.title}
            value={c.value}
            icon={c.icon}
            color={c.color}
          />
        </Box>
      ))}
    </SimpleGrid>
  );
}
