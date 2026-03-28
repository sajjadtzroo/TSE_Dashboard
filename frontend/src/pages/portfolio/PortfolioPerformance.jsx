import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleGrid, Text, Box } from '@mantine/core';
import {
  IconChartLine,
  IconTrendingUp,
  IconTarget,
  IconChartBar,
  IconFlame,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import DataFreshness from '../../components/DataFreshness';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RallyEmptyState from '../../components/RallyEmptyState';
import PerformanceAttributionTable from './components/PerformanceAttributionTable';
import RollingStatsChart from './components/RollingStatsChart';
import PortfolioDrawdownChart from './components/PortfolioDrawdownChart';
import ReturnDistributionChart from './components/ReturnDistributionChart';
import { usePortfolioContext } from './PortfolioProvider';
import {
  sharpeRatio,
  treynorRatio,
  trackingError,
  informationRatio,
} from '../../utils/riskMetrics/capm.js';
import { annualizedReturn } from '../../utils/riskMetrics/descriptive.js';
import { omegaRatio } from '../../utils/riskMetrics/scenario.js';
import { alignReturnSeries } from '../../utils/riskMetrics/returns.js';
import { toPersianNum, formatPercent } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';
import MonthlyReturnsHeatmap from './components/MonthlyReturnsHeatmap';

export default function PortfolioPerformance() {
  const { holdings, portfolioReturns, benchReturnSeries } = usePortfolioContext();
  const navigate = useNavigate();

  const kpis = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 20) return null;

    const annRet = annualizedReturn(portRets);
    const rfAnnual = 0.23;
    const rfDaily = Math.pow(1 + rfAnnual, 1 / 252) - 1;
    const omega = omegaRatio(portRets, rfDaily);

    // Align with benchmark
    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);

    let te = null;
    let ir = null;
    let treynor = null;

    if (aligned.stockReturns.length >= 20) {
      te = trackingError(aligned.stockReturns, aligned.benchReturns);
      ir = informationRatio(aligned.stockReturns, aligned.benchReturns);
      treynor = treynorRatio(aligned.stockReturns, aligned.benchReturns);
    }

    return { annRet, te, ir, treynor, omega };
  }, [portfolioReturns, benchReturnSeries]);

  const isEmpty = holdings.length === 0;

  if (isEmpty) {
    return (
      <>
        <PageHeader title="عملکرد" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconChartLine}
            message="برای مشاهده عملکرد، ابتدا دارایی به پورتفو اضافه کنید"
            actionLabel="رفتن به داشبورد"
            onAction={() => navigate('/portfolio')}
          />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="عملکرد">
        <DataFreshness lastUpdated={holdings.length > 0 ? new Date() : null} />
      </PageHeader>

      {kpis && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md" mb="md">
          <Box className={animStyles.cardEnter}>
            <RallyKPICard
              title="بازده سالانه"
              value={kpis.annRet != null ? formatPercent(kpis.annRet * 100, 1) : '-'}
              icon={IconTrendingUp}
              color={kpis.annRet != null && kpis.annRet >= 0 ? rallyColors.green : rallyColors.red}
            />
          </Box>
          <Box className={animStyles.cardEnter}>
            <RallyKPICard
              title="خطای ردیابی"
              value={kpis.te != null ? formatPercent(kpis.te * 100, 1) : '-'}
              icon={IconTarget}
              color={rallyColors.yellow}
            />
          </Box>
          <Box className={animStyles.cardEnter}>
            <RallyKPICard
              title="نسبت اطلاعات"
              value={kpis.ir != null ? toPersianNum(kpis.ir.toFixed(2)) : '-'}
              icon={IconChartBar}
              color={rallyColors.blue}
            />
          </Box>
          <Box className={animStyles.cardEnter}>
            <RallyKPICard
              title="نسبت ترینر"
              value={kpis.treynor != null ? toPersianNum(kpis.treynor.toFixed(2)) : '-'}
              icon={IconChartLine}
              color={rallyColors.purple}
            />
          </Box>
          <Box className={animStyles.cardEnter}>
            <RallyKPICard
              title="نسبت امگا"
              value={kpis.omega != null && isFinite(kpis.omega) ? toPersianNum(kpis.omega.toFixed(2)) : '-'}
              icon={IconFlame}
              color={rallyColors.primary}
            />
          </Box>
        </SimpleGrid>
      )}

      <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <PerformanceAttributionTable />
      </Box>

      <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RollingStatsChart />
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
        <PortfolioDrawdownChart />
        <ReturnDistributionChart />
      </SimpleGrid>

      <Box mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay3}`}>
        <MonthlyReturnsHeatmap data={[]} />
      </Box>
    </>
  );
}
