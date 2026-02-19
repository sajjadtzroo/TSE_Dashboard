import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SimpleGrid,
  SegmentedControl,
  Slider,
  Button,
  Group,
  Text,
  Box,
  Stack,
} from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyEmptyState from '../../components/RallyEmptyState';
import RallyBarChart from '../../components/charts/RallyBarChart';
import MonteCarloCard from './components/MonteCarloCard';
import PortfolioScenarioCard from './components/PortfolioScenarioCard';
import useMonteCarloWorker from '../../hooks/useMonteCarloWorker';
import { usePortfolioContext } from './PortfolioProvider';
import {
  beta,
  jensensAlpha,
} from '../../utils/riskMetrics/capm.js';
import {
  annualizedVolatility,
  annualizedReturn,
  mean,
} from '../../utils/riskMetrics/descriptive.js';
import { parametricVaR, historicalVaR, conditionalVaR } from '../../utils/riskMetrics/var.js';
import { alignReturnSeries } from '../../utils/riskMetrics/returns.js';
import { toPersianNum, formatPercent } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

const HORIZON_OPTIONS = [
  { label: '۳۰ روز', value: '30' },
  { label: '۹۰ روز', value: '90' },
  { label: '۱۸۰ روز', value: '180' },
  { label: '۳۶۵ روز', value: '365' },
];

export default function PortfolioSimulation() {
  const [horizon, setHorizon] = useState('90');
  const [numPaths, setNumPaths] = useState(1000);
  const [mcConfig, setMcConfig] = useState(null);
  const navigate = useNavigate();

  const {
    holdings,
    enriched,
    portfolioReturns,
    benchReturnSeries,
  } = usePortfolioContext();

  const totalValue = enriched.reduce((s, h) => s + h.value, 0);

  // Compute portfolio-level stats for simulation
  const portStats = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 20) return null;

    const vol = annualizedVolatility(portRets);
    const mu = annualizedReturn(portRets);

    // VaR metrics
    const var95 = parametricVaR(portRets, 0.95);
    const var99Hist = historicalVaR(portRets, 0.99);
    const cvar95 = conditionalVaR(portRets, 0.95);

    // Align with benchmark for beta/alpha
    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);

    let portBeta = null;
    let portAlpha = null;
    if (aligned.stockReturns.length >= 20) {
      portBeta = beta(aligned.stockReturns, aligned.benchReturns);
      portAlpha = jensensAlpha(aligned.stockReturns, aligned.benchReturns);
    }

    return { vol, mu, var95, var99Hist, cvar95, portBeta, portAlpha };
  }, [portfolioReturns, benchReturnSeries]);

  const { result: mcResult, running: mcRunning } = useMonteCarloWorker(mcConfig);

  const handleRun = () => {
    if (!portStats || totalValue <= 0) return;
    setMcConfig({
      currentPrice: totalValue,
      mu: portStats.mu ?? 0,
      sigma: portStats.vol ?? 0.3,
      days: Number(horizon),
      numPaths,
    });
  };

  // VaR comparison chart data
  const varChartData = useMemo(() => {
    if (!portStats) return [];
    const data = [];
    if (portStats.var95 != null) {
      data.push({ x: 'VaR پارامتری ۹۵٪', y: +(portStats.var95 * 100).toFixed(2) });
    }
    if (portStats.var99Hist != null) {
      data.push({ x: 'VaR تاریخی ۹۹٪', y: +(portStats.var99Hist * 100).toFixed(2) });
    }
    if (portStats.cvar95 != null) {
      data.push({ x: 'CVaR ۹۵٪', y: +(portStats.cvar95 * 100).toFixed(2) });
    }
    return data;
  }, [portStats]);

  const isEmpty = holdings.length === 0;

  if (isEmpty) {
    return (
      <>
        <PageHeader title="شبیه‌سازی" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconPlayerPlay}
            message="برای اجرای شبیه‌سازی، ابتدا دارایی به پورتفو اضافه کنید"
            actionLabel="رفتن به داشبورد"
            onAction={() => navigate('/portfolio')}
          />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="شبیه‌سازی" />

      {/* Config Panel */}
      <Box className={animStyles.sectionEnter}>
        <RallyMainCard title="تنظیمات شبیه‌سازی">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            <Box>
              <Text size="sm" fw={500} mb={4}>افق زمانی</Text>
              <SegmentedControl
                fullWidth
                size="xs"
                data={HORIZON_OPTIONS}
                value={horizon}
                onChange={setHorizon}
              />
            </Box>
            <Box>
              <Text size="sm" fw={500} mb={4}>
                تعداد مسیر: {toPersianNum(numPaths)}
              </Text>
              <Slider
                min={500}
                max={10000}
                step={500}
                value={numPaths}
                onChange={setNumPaths}
                color="blue"
                marks={[
                  { value: 500, label: '۵۰۰' },
                  { value: 5000, label: '۵K' },
                  { value: 10000, label: '۱۰K' },
                ]}
              />
            </Box>
            <Stack justify="flex-end">
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={handleRun}
                color="blue"
                disabled={!portStats}
                loading={mcRunning}
              >
                اجرای شبیه‌سازی
              </Button>
            </Stack>
          </SimpleGrid>
        </RallyMainCard>
      </Box>

      <Box mb="md" mt="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <MonteCarloCard result={mcResult} running={mcRunning} />
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md" className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <PortfolioScenarioCard
          totalValue={totalValue}
          portBeta={portStats?.portBeta}
          portVol={portStats?.vol}
          portAlpha={portStats?.portAlpha}
        />

        <RallyMainCard title="مقایسه VaR">
          {varChartData.length === 0 ? (
            <Box style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text size="sm" c="dimmed">داده کافی موجود نیست</Text>
            </Box>
          ) : (
            <RallyBarChart
              data={varChartData}
              horizontal
              height={200}
              yFormatter={(v) => `${toPersianNum(v)}٪`}
              tooltipFormatter={(v) => `${toPersianNum(Number(v).toFixed(2))}٪`}
            />
          )}
        </RallyMainCard>
      </SimpleGrid>
    </>
  );
}
