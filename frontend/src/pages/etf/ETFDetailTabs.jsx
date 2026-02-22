import { useSearchParams } from 'react-router-dom';
import { Center, Tabs, Text } from '@mantine/core';
import { IconChartLine, IconShieldCheck, IconTable } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RiskMetricsPanel from '../../components/RiskMetricsPanel';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import ETFChartSection from './ETFChartSection';
import { toJalali } from '../../utils/dateUtils';
import { formatNum } from '../../utils/formatUtils';
import styles from '../stock/StockDetailTabs.module.css';

const TABS = [
  { value: 'chart', label: 'نمودار', icon: IconChartLine },
  { value: 'risk', label: 'تحلیل ریسک', icon: IconShieldCheck },
  { value: 'history', label: 'داده تاریخی', icon: IconTable },
];

const historyColumns = [
  { accessor: 'date', title: 'تاریخ', width: 100, render: (r) => toJalali(r.date) },
  { accessor: 'nav_issuance', title: 'NAV صدور', width: 110, textAlign: 'end', render: (r) => formatNum(r.nav_issuance) },
  { accessor: 'nav_redemption', title: 'NAV ابطال', width: 110, textAlign: 'end', render: (r) => formatNum(r.nav_redemption) },
  { accessor: 'last_price', title: 'آخرین قیمت', width: 100, textAlign: 'end', render: (r) => formatNum(r.last_price) },
  { accessor: 'bubble_pct', title: 'حباب٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.bubble_pct} /> },
];

export default function ETFDetailTabs({
  history,
  historyLoading,
  duration,
  onDurationChange,
  metrics,
  benchmarkLoading,
  insufficientData,
  monteCarloResult,
  monteCarloRunning,
  scenarios,
  varBacktestData,
  historyPaged,
  page,
  setPage,
  perPage,
  setPerPage,
  totalRecords,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'chart';

  const handleTabChange = (value) => {
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

  const hasEnoughHistory = history && history.length > 5;

  return (
    <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
      <Tabs.List className={styles.tabList}>
        {TABS.map(({ value, label, icon: Icon }) => (
          <Tabs.Tab key={value} value={value} className={styles.tab} leftSection={<Icon size={16} />}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {/* Chart Tab */}
      <Tabs.Panel value="chart" className={styles.panel}>
        <ETFChartSection
          history={history}
          loading={historyLoading}
          duration={duration}
          onDurationChange={onDurationChange}
        />
      </Tabs.Panel>

      {/* Risk Analysis Tab */}
      <Tabs.Panel value="risk" className={styles.panel}>
        {hasEnoughHistory ? (
          <RiskMetricsPanel
            metrics={metrics}
            benchmarkLoading={benchmarkLoading}
            insufficientData={insufficientData}
            monteCarloResult={monteCarloResult}
            monteCarloRunning={monteCarloRunning}
            scenarios={scenarios}
            varBacktestData={varBacktestData}
          />
        ) : (
          <RallyMainCard>
            <Center mih={200}>
              <Text c="dimmed">داده کافی برای تحلیل ریسک موجود نیست</Text>
            </Center>
          </RallyMainCard>
        )}
      </Tabs.Panel>

      {/* Historical Data Tab */}
      <Tabs.Panel value="history" className={styles.panel}>
        <RallyMainCard noPadding>
          <RallyDataTable
            records={historyPaged}
            columns={historyColumns}
            idAccessor="date"
            loading={historyLoading}
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            emptyMessage="داده‌ای موجود نیست"
          />
        </RallyMainCard>
      </Tabs.Panel>
    </Tabs>
  );
}
