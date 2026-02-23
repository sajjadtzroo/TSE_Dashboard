import { useState } from 'react';
import { Box, Group, SegmentedControl, Select, Button } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [period, setPeriod]                     = useState('1Y');
  const [benchmark, setBenchmark]               = useState(TEDPIX_NAMES[0]);
  const [metricsEnabled, setMetricsEnabled]     = useState(false);
  const [selectedSymbols, setSelectedSymbols]   = useState([]);
  const [showCompare, setShowCompare]           = useState(false);

  const { data: etfs = [], isLoading: listLoading } = useETFNav();

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

  const handleSelectionChange = (symbols) => {
    setSelectedSymbols(symbols);
    if (symbols.length < 2) setShowCompare(false);
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
            onClick={() => setShowCompare((v) => !v)}
            variant={showCompare ? 'filled' : 'light'}
            color="blue"
          >
            {showCompare ? 'بستن مقایسه' : `مقایسه (${selectedSymbols.length})`}
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
          onSelectionChange={handleSelectionChange}
          metricsEnabled={metricsEnabled}
        />
      </Box>

      <AnimatePresence>
        {showCompare && selectedSymbols.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ETFComparePanel
              selectedSymbols={selectedSymbols}
              metricsMap={metricsMap}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
