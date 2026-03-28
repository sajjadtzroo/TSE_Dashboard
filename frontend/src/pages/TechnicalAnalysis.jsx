import { useState, useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Center,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconSearch, IconChartCandle } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import StockChartSection from './stock/StockChartSection';
import { useMarketOverview, useStockHistory } from '../hooks/useMarketData';
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

  // Indicator state
  const { prefs: indicators, toggle: onIndicatorToggle } = useIndicatorPrefs();


  const high52w = useMemo(
    () => (history.length ? Math.max(...history.map((d) => d.high)) : null),
    [history],
  );
  const low52w = useMemo(
    () => (history.length ? Math.min(...history.map((d) => d.low)) : null),
    [history],
  );

  return (
    <Stack gap="md">
      {/* Compact header: brand + search */}
      <RallyMainCard>
        <Group justify="space-between" wrap="wrap" gap="sm">
          {/* Left: brand */}
          <Group gap="xs">
            <IconChartCandle size={20} color={rallyColors.primary} />
            <Title order={4} fw={700}>تحلیل تکنیکال</Title>
          </Group>

          {/* Center: search */}
          <Autocomplete
            placeholder="جستجوی نماد…"
            leftSection={<IconSearch size={16} />}
            data={autocompleteData}
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              if (!val) setSelectedSymbol('');
            }}
            onOptionSubmit={(val) => {
              setSelectedSymbol(val);
              const item = autocompleteData.find((d) => d.value === val);
              setInputValue(item?.label || val);
            }}
            limit={12}
            w={{ base: '100%', sm: 340 }}
            styles={{ input: { textAlign: 'right' } }}
          />
        </Group>
      </RallyMainCard>

      {/* Thin high/low bar — only when symbol + data loaded */}
      {selectedSymbol && high52w != null && (
        <RallyKPICard
          title="بالا / پایین دوره"
          value={`${formatNum(high52w)} / ${formatNum(low52w)}`}
          color={rallyColors.orange}
          animateValue
        />
      )}

      {/* Empty state */}
      {!selectedSymbol && (
        <Center mih={520} style={{ flexDirection: 'column', gap: 16 }}>
          <Box style={{
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${rallyColors.primary}18, ${rallyColors.primary}06)`,
            border: `1px solid ${rallyColors.primary}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconChartCandle size={36} color={rallyColors.primary} stroke={1.5} />
          </Box>
          <Stack align="center" gap={4}>
            <Text fw={600} c={rallyColors.textPrimary}>نمادی انتخاب نشده</Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              نماد مورد نظر را در کادر بالا جستجو کنید
            </Text>
          </Stack>
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
        />
      )}
    </Stack>
  );
}
