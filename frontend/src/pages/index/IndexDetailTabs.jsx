import { useSearchParams } from 'react-router-dom';
import { Center, Tabs, Text } from '@mantine/core';
import {
  IconChartLine, IconTable, IconChartArrows,
} from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import IndexChartSection from './IndexChartSection';
import IndexComparisonTab from './IndexComparisonTab';
import { toJalali } from '../../utils/dateUtils';
import { formatNum } from '../../utils/formatUtils';
import styles from '../stock/StockDetailTabs.module.css';

const TABS = [
  { value: 'chart', label: 'نمودار', icon: IconChartLine },
  { value: 'history', label: 'داده تاریخی', icon: IconTable },
  { value: 'comparison', label: 'مقایسه', icon: IconChartArrows },
];

const historyColumns = [
  { accessor: 'date', title: 'تاریخ', width: 100, render: (r) => toJalali(r.date) },
  { accessor: 'open', title: 'باز', width: 110, textAlign: 'end', render: (r) => formatNum(r.open) },
  { accessor: 'high', title: 'بیشترین', width: 110, textAlign: 'end', render: (r) => formatNum(r.high) },
  { accessor: 'low', title: 'کمترین', width: 110, textAlign: 'end', render: (r) => formatNum(r.low) },
  { accessor: 'close', title: 'مقدار شاخص', width: 120, textAlign: 'end', render: (r) => formatNum(r.close) },
  { accessor: 'index_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.index_change_pct} /> },
  { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
  { accessor: 'value', title: 'ارزش', width: 130, textAlign: 'end', render: (r) => formatNum(r.value) },
  { accessor: 'trades', title: 'معاملات', width: 100, textAlign: 'end', render: (r) => formatNum(r.trades) },
];

/**
 * Tabbed layout for index detail: Chart, History, Comparison.
 */
export default function IndexDetailTabs({
  indexName,
  history,
  historyLoading,
  selectedDuration,
  setSelectedDuration,
  indicatorPrefs,
  toggleIndicator,
  overlays,
  activeSubCharts,
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
        <IndexChartSection
          history={history}
          historyLoading={historyLoading}
          duration={selectedDuration}
          onDurationChange={setSelectedDuration}
          indicators={indicatorPrefs}
          onIndicatorToggle={toggleIndicator}
          overlays={overlays}
          activeSubCharts={activeSubCharts}
        />
      </Tabs.Panel>

      {/* History Tab */}
      <Tabs.Panel value="history" className={styles.panel}>
        {(history || []).length > 0 ? (
          <RallyMainCard
            title={`داده‌های تاریخی (${formatNum((history || []).length)} روز)`}
            noPadding
          >
            <RallyDataTable
              records={historyPaged}
              columns={historyColumns}
              idAccessor="date"
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

      {/* Comparison Tab */}
      <Tabs.Panel value="comparison" className={styles.panel}>
        <IndexComparisonTab
          currentName={indexName}
          currentHistory={history}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
