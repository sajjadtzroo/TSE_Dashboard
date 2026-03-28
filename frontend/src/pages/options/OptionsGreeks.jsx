import { Stack } from '@mantine/core';
import {
  IconTriangle,
  IconWaveSine,
  IconClock,
  IconFlame,
  IconPercentage,
} from '@tabler/icons-react';
import RallyKPICard from '../../components/RallyKPICard';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

export default function OptionsGreeks({ greeks }) {
  return (
    <Stack gap="xs">
      <RallyKPICard
        animateValue
        title="دلتا"
        value={toPersianNum(greeks.delta.toFixed(4))}
        icon={IconTriangle}
        color={rallyColors.primary}
        subtitle="حساسیت قیمت"
      />
      <RallyKPICard
        animateValue
        title="گاما"
        value={toPersianNum(greeks.gamma.toFixed(4))}
        icon={IconWaveSine}
        color={rallyColors.blue}
        subtitle="نرخ تغییر دلتا"
      />
      <RallyKPICard
        animateValue
        title="تتا (روزانه)"
        value={toPersianNum(greeks.theta.toFixed(4))}
        icon={IconClock}
        color={rallyColors.purple}
        subtitle="افت زمانی روزانه"
      />
      <RallyKPICard
        animateValue
        title="وگا (هر ۱٪)"
        value={toPersianNum(greeks.vega.toFixed(4))}
        icon={IconFlame}
        color={rallyColors.yellow}
        subtitle="حساسیت نوسان"
      />
      <RallyKPICard
        animateValue
        title="رو (هر ۱٪)"
        value={toPersianNum(greeks.rho.toFixed(4))}
        icon={IconPercentage}
        color={rallyColors.orange}
        subtitle="حساسیت نرخ بهره"
      />
    </Stack>
  );
}
