import { useMemo } from 'react';
import { SimpleGrid, Text, Box } from '@mantine/core';
import {
  IconShieldCheck,
  IconChartBar,
  IconAlertTriangle,
  IconTarget,
  IconTrendingUp,
  IconPercentage,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RiskBudgetTable from './components/RiskBudgetTable';
import CorrelationMatrix from './components/CorrelationMatrix';
import DiversificationCard from './components/DiversificationCard';
import { usePortfolioContext } from './PortfolioProvider';
import {
  beta,
  jensensAlpha,
  rSquared,
  sharpeRatio,
} from '../../utils/riskMetrics/capm.js';
import { annualizedVolatility } from '../../utils/riskMetrics/descriptive.js';
import { parametricVaR, conditionalVaR } from '../../utils/riskMetrics/var.js';
import { alignReturnSeries } from '../../utils/riskMetrics/returns.js';
import { toPersianNum, formatPercent } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

export default function PortfolioRisk() {
  const { holdings, portfolioReturns, benchReturnSeries } = usePortfolioContext();

  const kpis = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 20) return null;

    // Align portfolio with benchmark
    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);

    const vol = annualizedVolatility(portRets);
    const var95 = parametricVaR(portRets, 0.95);
    const cvar95 = conditionalVaR(portRets, 0.95);

    let portBeta = null;
    let alpha = null;
    let r2 = null;

    if (aligned.stockReturns.length >= 20) {
      portBeta = beta(aligned.stockReturns, aligned.benchReturns);
      alpha = jensensAlpha(aligned.stockReturns, aligned.benchReturns);
      r2 = rSquared(aligned.stockReturns, aligned.benchReturns);
    }

    return { portBeta, vol, var95, cvar95, alpha, r2 };
  }, [portfolioReturns, benchReturnSeries]);

  const isEmpty = holdings.length === 0;

  if (isEmpty) {
    return (
      <>
        <PageHeader title="تحلیل ریسک" />
        <RallyMainCard>
          <Text size="sm" c="dimmed" ta="center" py="xl">
            برای مشاهده تحلیل ریسک، ابتدا دارایی به پورتفو اضافه کنید
          </Text>
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="تحلیل ریسک" />

      {kpis && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md" mb="md">
          <RallyKPICard
            title="بتای پرتفو"
            value={kpis.portBeta != null ? toPersianNum(kpis.portBeta.toFixed(2)) : '-'}
            icon={IconChartBar}
            color={rallyColors.blue}
          />
          <RallyKPICard
            title="نوسان‌پذیری"
            value={kpis.vol != null ? formatPercent(kpis.vol * 100, 1) : '-'}
            icon={IconShieldCheck}
            color={rallyColors.yellow}
          />
          <RallyKPICard
            title="VaR ۹۵٪"
            value={kpis.var95 != null ? formatPercent(kpis.var95 * 100, 1) : '-'}
            icon={IconAlertTriangle}
            color={rallyColors.red}
          />
          <RallyKPICard
            title="CVaR ۹۵٪"
            value={kpis.cvar95 != null ? formatPercent(kpis.cvar95 * 100, 1) : '-'}
            icon={IconAlertTriangle}
            color={rallyColors.red}
          />
          <RallyKPICard
            title="آلفای جنسن"
            value={kpis.alpha != null ? formatPercent(kpis.alpha * 100, 1) : '-'}
            icon={IconTrendingUp}
            color={kpis.alpha != null && kpis.alpha >= 0 ? rallyColors.green : rallyColors.red}
          />
          <RallyKPICard
            title="R²"
            value={kpis.r2 != null ? toPersianNum((kpis.r2 * 100).toFixed(0)) + '٪' : '-'}
            icon={IconPercentage}
            color={rallyColors.purple}
          />
        </SimpleGrid>
      )}

      <Box mb="md">
        <RiskBudgetTable />
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <CorrelationMatrix />
        <DiversificationCard />
      </SimpleGrid>
    </>
  );
}
