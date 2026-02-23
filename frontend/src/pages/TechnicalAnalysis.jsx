import { useState, useMemo } from 'react';
import {
  Autocomplete,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconSearch, IconChartCandle } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import StockChartSection from './stock/StockChartSection';
import { useMarketOverview, useStockHistory } from '../hooks/useMarketData';
import useTechnicalIndicators from '../hooks/useTechnicalIndicators';
import useIndicatorPrefs from '../hooks/useIndicatorPrefs';
import { formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';

export default function TechnicalAnalysis() {
  const [inputValue, setInputValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [duration, setDuration] = useState('90');

  // All stocks for the autocomplete
  const { data: overview = [] } = useMarketOverview();
  const autocompleteData = useMemo(
    () =>
      overview.map((s) => ({
        value: s.symbol,
        label: s.name_fa ? `${s.symbol} — ${s.name_fa}` : s.symbol,
      })),
    [overview],
  );

  // Chart history data
  const { data: history = [], isLoading: historyLoading } = useStockHistory(
    selectedSymbol,
    { days: Number(duration) || 0, enabled: !!selectedSymbol },
  );

  // Indicator state + computations
  const { prefs: indicators, toggle: onIndicatorToggle } = useIndicatorPrefs();
  const { overlays, subCharts } = useTechnicalIndicators(history, indicators);
  const activeSubCharts = Object.entries(subCharts);

  // KPI values derived from last history item
  const last = history.length > 0 ? history[history.length - 1] : null;
  const close = last?.close ?? null;
  const changePct = last?.close_change_pct ?? null;
  const volume = last?.volume ?? null;

  const high52w = useMemo(
    () => (history.length ? Math.max(...history.map((d) => d.high)) : null),
    [history],
  );
  const low52w = useMemo(
    () => (history.length ? Math.min(...history.map((d) => d.low)) : null),
    [history],
  );

  const changeColor = changePct == null ? undefined : changePct >= 0 ? rallyColors.green : rallyColors.red;

  return (
    <Stack gap="md">
      {/* Header + symbol search */}
      <RallyMainCard>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            <IconChartCandle size={22} color={rallyColors.green} />
            <Title order={3}>تحلیل تکنیکال</Title>
          </Group>
          <Autocomplete
            placeholder="جستجوی نماد…"
            leftSection={<IconSearch size={16} />}
            data={autocompleteData}
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              // Clear selection if user manually clears the input
              if (!val) setSelectedSymbol('');
            }}
            onOptionSubmit={(val) => {
              // val is always the item's `value` field = s.symbol (the ticker)
              setSelectedSymbol(val);
              const item = autocompleteData.find((d) => d.value === val);
              setInputValue(item?.label || val);
            }}
            limit={12}
            w={280}
            styles={{ input: { textAlign: 'right' } }}
          />
        </Group>
      </RallyMainCard>

      {/* KPI row — only visible when a symbol is selected */}
      {selectedSymbol && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <RallyKPICard
            title="آخرین قیمت"
            value={close != null ? formatNum(close) : '—'}
            color={rallyColors.green}
            variant="accent-bar"
          />
          <RallyKPICard
            title="تغییر"
            value={
              changePct != null
                ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                : '—'
            }
            color={changeColor ?? rallyColors.textDimmed}
            variant="accent-bar"
            trend={changePct}
          />
          <RallyKPICard
            title="حجم معامله"
            value={volume != null ? formatNum(volume) : '—'}
            color={rallyColors.blue}
            variant="accent-bar"
          />
          <RallyKPICard
            title="بالا / پایین دوره"
            value={
              high52w != null && low52w != null
                ? `${formatNum(high52w)} / ${formatNum(low52w)}`
                : '—'
            }
            color={rallyColors.orange}
            variant="accent-bar"
          />
        </SimpleGrid>
      )}

      {/* Empty state */}
      {!selectedSymbol && (
        <Center mih={480} style={{ flexDirection: 'column', gap: 12 }}>
          <IconChartCandle size={48} color={rallyColors.textDimmed} />
          <Text c="dimmed" size="lg">یک نماد انتخاب کنید</Text>
          <Text c="dimmed" size="sm">نماد مورد نظر را در کادر بالا جستجو کنید</Text>
        </Center>
      )}

      {/* Chart section */}
      {selectedSymbol && (
        <StockChartSection
          symbol={selectedSymbol}
          history={history}
          historyLoading={historyLoading}
          duration={duration}
          onDurationChange={setDuration}
          indicators={indicators}
          onIndicatorToggle={onIndicatorToggle}
          overlays={overlays}
          activeSubCharts={activeSubCharts}
        />
      )}
    </Stack>
  );
}
