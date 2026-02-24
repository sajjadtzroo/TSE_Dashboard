import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Group, SegmentedControl, Select, Button } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import ETFMetricsTable from './ETFMetricsTable';
import ETFComparePanel from './ETFComparePanel';
import useETFAllMetrics from '../../hooks/useETFAllMetrics';
import { useETFNav } from '../../hooks/useMarketData';
import { TEDPIX_NAMES } from '../../constants/market';

const PERIOD_OPTIONS = [
  { label: '۳ ماه', value: '3M' },
  { label: '۶ ماه', value: '6M' },
  { label: '۱ سال', value: '1Y' },
  { label: '۳ سال', value: '3Y' },
];

const BENCHMARK_OPTIONS = [
  { label: 'شاخص کل (TEDPIX)', value: TEDPIX_NAMES[0] },
  { label: 'فرابورس', value: 'فرابورس' },
];

export default function ETFComparePage() {
  const [searchParams] = useSearchParams();
  const compareSymbols = searchParams.get('symbols');

  /* ── Comparison mode: opened via new tab with ?symbols=X,Y,Z ── */
  if (compareSymbols) {
    return (
      <CompareView
        symbols={compareSymbols.split(',').filter(Boolean)}
        initialPeriod={searchParams.get('period') || '1Y'}
        initialBenchmark={searchParams.get('benchmark') || TEDPIX_NAMES[0]}
      />
    );
  }

  /* ── Selection mode: pick ETFs, then open comparison in new tab ── */
  return <SelectionView />;
}

/* ─────────────────────────── Comparison Mode ─────────────────────────── */

function CompareView({ symbols, initialPeriod, initialBenchmark }) {
  const [period, setPeriod]       = useState(initialPeriod);
  const [benchmark, setBenchmark] = useState(initialBenchmark);

  const { data: etfs = [] } = useETFNav();
  const { metricsMap } = useETFAllMetrics(etfs, period, benchmark, true);

  return (
    <>
      <PageHeader title="مقایسه ETFها">
        <Group gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            data={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
          />
          <Select
            size="xs"
            w={180}
            data={BENCHMARK_OPTIONS}
            value={benchmark}
            onChange={setBenchmark}
            allowDeselect={false}
          />
        </Group>
      </PageHeader>

      <ETFComparePanel
        selectedSymbols={symbols}
        metricsMap={metricsMap}
      />
    </>
  );
}

/* ─────────────────────────── Selection Mode ─────────────────────────── */

function SelectionView() {
  const [period, setPeriod]                     = useState('1Y');
  const [benchmark, setBenchmark]               = useState(TEDPIX_NAMES[0]);
  const [metricsEnabled, setMetricsEnabled]     = useState(false);
  const [selectedSymbols, setSelectedSymbols]   = useState([]);

  const { data: etfs = [] } = useETFNav();

  const { metricsMap, loadedCount, totalCount, isLoading: metricsLoading } = useETFAllMetrics(
    etfs,
    period,
    benchmark,
    metricsEnabled,
  );

  const handlePeriodChange = (val) => {
    setPeriod(val);
    if (metricsEnabled) setMetricsEnabled(false);
  };

  const handleBenchmarkChange = (val) => {
    setBenchmark(val);
    if (metricsEnabled) setMetricsEnabled(false);
  };

  const openCompareTab = () => {
    const params = new URLSearchParams({
      symbols: selectedSymbols.join(','),
      period,
      benchmark,
    });
    window.open(`/dashboard/etf-nav/compare?${params}`, '_blank');
  };

  return (
    <>
      <PageHeader title="مقایسه ETFها — متریک‌های کامل">
        <Group gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            data={PERIOD_OPTIONS}
            value={period}
            onChange={handlePeriodChange}
          />
          <Select
            size="xs"
            w={180}
            data={BENCHMARK_OPTIONS}
            value={benchmark}
            onChange={handleBenchmarkChange}
            allowDeselect={false}
          />
        </Group>
      </PageHeader>

      {selectedSymbols.length >= 2 && (
        <Box mb="sm">
          <Button
            size="xs"
            leftSection={<IconChartBar size={14} />}
            onClick={openCompareTab}
            variant="light"
            color="blue"
          >
            {`مقایسه (${selectedSymbols.length})`}
          </Button>
        </Box>
      )}

      <Box mb="md">
        <ETFMetricsTable
          etfs={etfs}
          metricsMap={metricsMap}
          loadedCount={loadedCount}
          totalCount={totalCount}
          isLoading={metricsLoading}
          onLoadMetrics={() => setMetricsEnabled(true)}
          selectedSymbols={selectedSymbols}
          onSelectionChange={setSelectedSymbols}
          metricsEnabled={metricsEnabled}
        />
      </Box>
    </>
  );
}
