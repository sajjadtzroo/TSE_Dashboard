import { useNavigate, useSearchParams } from 'react-router-dom';
import { Center, Grid, Group, Tabs, Text } from '@mantine/core';
import {
  IconChartLine,
  IconShieldCheck,
  IconReportAnalytics,
  IconActivity,
  IconTable,
  IconFileSpreadsheet,
} from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RiskMetricsPanel from '../../components/RiskMetricsPanel';
import FinancialRatiosPanel from '../../components/FinancialRatiosPanel';
import MovingAverageCard from '../../components/cards/MovingAverageCard';
import PeerComparisonCard from '../../components/cards/PeerComparisonCard';
import ScenarioAnalysisCard from '../../components/cards/ScenarioAnalysisCard';
import RelativePerformanceChart from '../../components/charts/RelativePerformanceChart';
import LiquidityRiskCard from '../../components/cards/LiquidityRiskCard';
import VolatilityConeCard from '../../components/cards/VolatilityConeCard';
import EWMAVolatilityCard from '../../components/cards/EWMAVolatilityCard';
import CodalAnnouncementsCard from '../../components/cards/CodalAnnouncementsCard';
import StockChartSection from './StockChartSection';
import styles from './StockDetailTabs.module.css';

const TABS = [
  { value: 'chart', label: 'نمودار', icon: IconChartLine },
  { value: 'risk', label: 'تحلیل ریسک', icon: IconShieldCheck },
  { value: 'fundamental', label: 'تحلیل بنیادی', icon: IconReportAnalytics },
  { value: 'technical', label: 'تحلیل تکنیکال', icon: IconActivity },
  { value: 'history', label: 'داده تاریخی', icon: IconTable },
  { value: 'financials', label: 'صورت‌های مالی', icon: IconFileSpreadsheet },
];

export default function StockDetailTabs({
  symbol,
  security,
  history,
  historyLoading,
  selectedDuration,
  setSelectedDuration,
  indicatorPrefs,
  toggleIndicator,
  metrics,
  benchmarkLoading,
  insufficientData,
  monteCarloResult,
  monteCarloRunning,
  scenarios,
  benchHistory,
  ratioTimeSeries,
  ratiosLoading,
  historyColumns,
  historyPaged,
  page,
  setPage,
  perPage,
  setPerPage,
  totalRecords,
  ewmaData,
  liquidityData,
  varBacktestData,
  volConeData,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'chart';

  const handleTabChange = (value) => {
    if (value === 'financials') {
      navigate(`/dashboard/stock/${symbol}/financials`);
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'chart') {
        next.delete('tab');
      } else {
        next.set('tab', value);
      }
      return next;
    }, { replace: true });
  };

  const hasEnoughHistory = history.length > 5;

  return (
    <Tabs
      value={activeTab}
      onChange={handleTabChange}
      keepMounted={false}
    >
      <Tabs.List className={styles.tabList}>
        {TABS.map(({ value, label, icon: Icon }) => (
          <Tabs.Tab key={value} value={value} className={styles.tab} leftSection={<Icon size={16} />}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {/* Chart Tab */}
      <Tabs.Panel value="chart" className={styles.panel}>
        <StockChartSection
          symbol={security.symbol}
          history={history}
          historyLoading={historyLoading}
          duration={selectedDuration}
          onDurationChange={setSelectedDuration}
          indicators={indicatorPrefs}
          onIndicatorToggle={toggleIndicator}

        />
      </Tabs.Panel>

      {/* Risk Tab */}
      <Tabs.Panel value="risk" className={styles.panel}>
        {hasEnoughHistory ? (
          <>
            <RiskMetricsPanel
              metrics={metrics}
              benchmarkLoading={benchmarkLoading}
              insufficientData={insufficientData}
              monteCarloResult={monteCarloResult}
              monteCarloRunning={monteCarloRunning}
              scenarios={scenarios}
              varBacktestData={varBacktestData}
            />
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <LiquidityRiskCard liquidityData={liquidityData} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <VolatilityConeCard volConeData={volConeData} />
              </Grid.Col>
            </Grid>
            <EWMAVolatilityCard ewmaData={ewmaData} />
          </>
        ) : (
          <RallyMainCard>
            <Center mih={200}>
              <Text c="dimmed">داده کافی برای تحلیل ریسک موجود نیست</Text>
            </Center>
          </RallyMainCard>
        )}
      </Tabs.Panel>

      {/* Fundamental Tab */}
      <Tabs.Panel value="fundamental" className={styles.panel}>
        <FinancialRatiosPanel
          ratioTimeSeries={ratioTimeSeries}
          loading={ratiosLoading}
        />
        <PeerComparisonCard
          sectorName={security.sector_name_fa}
          currentSymbol={security.symbol}
        />
        <CodalAnnouncementsCard symbol={security.symbol} />
      </Tabs.Panel>

      {/* Technical Tab */}
      <Tabs.Panel value="technical" className={styles.panel}>
        {hasEnoughHistory ? (
          <>
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <MovingAverageCard history={history} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                {benchHistory.length > 0 && (
                  <RallyMainCard title="عملکرد نسبی در مقابل شاخص" mb="md">
                    <RelativePerformanceChart
                      stockHistory={history}
                      benchHistory={benchHistory}
                      height={220}
                    />
                  </RallyMainCard>
                )}
              </Grid.Col>
            </Grid>
            {scenarios.length > 0 && (
              <Grid gutter="md" mb="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <ScenarioAnalysisCard scenarios={scenarios} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }} />
              </Grid>
            )}
          </>
        ) : (
          <RallyMainCard>
            <Center mih={200}>
              <Text c="dimmed">داده کافی برای تحلیل تکنیکال موجود نیست</Text>
            </Center>
          </RallyMainCard>
        )}
      </Tabs.Panel>

      {/* History Tab */}
      <Tabs.Panel value="history" className={styles.panel}>
        {history.length > 0 ? (
          <RallyMainCard title={`داده‌های تاریخی (${history.length} days)`} noPadding>
            <RallyDataTable
              records={historyPaged}
              columns={historyColumns}
              page={page}
              onPageChange={setPage}
              recordsPerPage={perPage}
              onRecordsPerPageChange={setPerPage}
              totalRecords={totalRecords}
              minHeight={300}
            />
          </RallyMainCard>
        ) : (
          <RallyMainCard>
            <Center mih={200}>
              <Text c="dimmed">داده تاریخی موجود نیست</Text>
            </Center>
          </RallyMainCard>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}
