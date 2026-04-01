import { useState, useMemo } from 'react';
import {
  ActionIcon, Autocomplete, Badge, Box, Button, Center, Collapse,
  Group, Indicator, MultiSelect, NumberInput, SimpleGrid, Stack, Text, Title,
} from '@mantine/core';
import { IconSearch, IconChartCandle, IconFilter, IconX } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import RallyDataTable from '../../components/RallyDataTable';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import CryptoIcon from '../../components/CryptoIcon';
import CoinChartSection from './coin/CoinChartSection';
import { useCryptoMarket, useCryptoHistory, useCryptoDetail } from '../../hooks/useCryptoData';
import useIndicatorPrefs from '../../hooks/useIndicatorPrefs';
import usePagination from '../../hooks/usePagination';
import { CRYPTO_CATEGORIES, CRYPTO_CATEGORY_LABELS, getCryptoCategory } from '../../constants/crypto';
import { CRYPTO_PRESETS } from '../../constants/cryptoScreener';
import { formatNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

const ACCENT = '#F59E0B';

const categoryOptions = Object.keys(CRYPTO_CATEGORIES).map((cat) => ({
  value: cat,
  label: CRYPTO_CATEGORY_LABELS[cat] || cat,
}));

const defaultFilters = {
  categories: [],
  changeMin: '',
  changeMax: '',
  volumeMin: '',
  mcapMin: '',
  mcapMax: '',
};

function formatMcap(v) {
  if (v == null) return '-';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${formatNum(v)}`;
}

export default function CryptoTechnicalAnalysis() {
  const [inputValue, setInputValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [chartInterval, setChartInterval] = useState('1day');
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { data: market = [] } = useCryptoMarket();
  const { prefs: indicators, toggle: onIndicatorToggle } = useIndicatorPrefs();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const [, v] of Object.entries(filters)) {
      if (Array.isArray(v) ? v.length > 0 : v !== '') count++;
    }
    return count;
  }, [filters]);

  const allCoins = useMemo(() =>
    market.map((c) => ({ ...c, category: getCryptoCategory(c.symbol) })),
    [market],
  );

  const filteredCoins = useMemo(() => {
    return allCoins.filter((row) => {
      if (filters.categories.length > 0 && !filters.categories.includes(row.category)) return false;
      if (filters.changeMin !== '' && (row.price_change_pct_24h ?? -Infinity) < Number(filters.changeMin)) return false;
      if (filters.changeMax !== '' && (row.price_change_pct_24h ?? Infinity) > Number(filters.changeMax)) return false;
      if (filters.volumeMin !== '' && (row.volume_24h ?? 0) < Number(filters.volumeMin)) return false;
      if (filters.mcapMin !== '' && (row.market_cap_usd ?? 0) < Number(filters.mcapMin)) return false;
      if (filters.mcapMax !== '' && (row.market_cap_usd ?? Infinity) > Number(filters.mcapMax)) return false;
      return true;
    });
  }, [allCoins, filters]);

  const autocompleteData = useMemo(
    () => filteredCoins.map((c) => ({
      value: c.symbol,
      label: c.name_fa ? `${c.symbol} — ${c.name_fa}` : c.symbol,
    })),
    [filteredCoins],
  );

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredCoins);

  const { data: detail = null } = useCryptoDetail(selectedSymbol);
  // For "live" mode, fetch 1min candles as the base; WS updates the last bar
  const isLive = chartInterval === 'live';
  const fetchInterval = isLive ? '1min' : chartInterval;
  const isIntraday = isLive || fetchInterval === '1min' || fetchInterval === '5min';
  const { data: chartHistory = [], isLoading: chartLoading } = useCryptoHistory(
    selectedSymbol, {
      interval: fetchInterval,
      limit: isIntraday ? 500 : 200,
      staleTime: isIntraday ? 15_000 : 60_000,
      refetchInterval: isIntraday ? 15_000 : false,
    },
  );

  const normalizedChart = useMemo(() => {
    if (!chartHistory?.length) return [];
    return chartHistory.map((c) => ({
      date: isIntraday ? c.open_time : (c.open_time || '').split('T')[0],
      open: Number(c.open), high: Number(c.high), low: Number(c.low),
      close: Number(c.close), volume: Number(c.volume),
    })).filter((c) => c.date);
  }, [chartHistory, isIntraday]);

  const high = useMemo(() => (normalizedChart.length ? Math.max(...normalizedChart.map((d) => d.high)) : null), [normalizedChart]);
  const low = useMemo(() => (normalizedChart.length ? Math.min(...normalizedChart.map((d) => d.low)) : null), [normalizedChart]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleReset = () => { setFilters(defaultFilters); setShowResults(false); };
  const handleApplyPreset = (preset) => setFilters((prev) => ({ ...prev, ...preset.apply() }));
  const handleSearch = () => { setShowResults(true); setPage(1); };
  const handleSelectFromTable = (symbol) => {
    setSelectedSymbol(symbol);
    setShowResults(false);
    setFiltersOpen(false);
    const item = autocompleteData.find((d) => d.value === symbol);
    setInputValue(item?.label || symbol);
  };

  const resultColumns = [
    {
      accessor: 'symbol', title: 'نماد', width: 110, noWrap: true,
      render: (r) => <Group gap={6} wrap="nowrap"><CryptoIcon symbol={r.symbol} size={20} />{r.symbol}</Group>,
    },
    { accessor: 'name_fa', title: 'نام', width: 120, ellipsis: true },
    { accessor: 'category', title: 'دسته', width: 90, render: (r) => CRYPTO_CATEGORY_LABELS[r.category] || r.category || '-' },
    { accessor: 'last_price', title: 'قیمت ($)', width: 100, textAlign: 'end', noWrap: true, render: (r) => r.last_price != null ? `$${formatNum(r.last_price)}` : '-' },
    { accessor: 'price_change_pct_24h', title: 'تغییر ۲۴h', width: 85, textAlign: 'end', noWrap: true, render: (r) => <PercentChangeCell value={r.price_change_pct_24h} /> },
    { accessor: 'volume_24h', title: 'حجم ۲۴h', width: 110, textAlign: 'end', noWrap: true, render: (r) => formatMcap(r.volume_24h) },
    { accessor: 'market_cap_usd', title: 'ارزش بازار', width: 110, textAlign: 'end', noWrap: true, render: (r) => formatMcap(r.market_cap_usd) },
  ];

  return (
    <Stack gap="md">
      <RallyMainCard>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            <IconChartCandle size={20} color={ACCENT} />
            <Title order={4} fw={700}>تحلیل تکنیکال رمزارز</Title>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Autocomplete
              placeholder="جستجوی رمزارز…"
              leftSection={<IconSearch size={16} />}
              data={autocompleteData}
              value={inputValue}
              onChange={(val) => { setInputValue(val); if (!val) setSelectedSymbol(''); }}
              onOptionSubmit={(val) => {
                setSelectedSymbol(val);
                setShowResults(false);
                const item = autocompleteData.find((d) => d.value === val);
                setInputValue(item?.label || val);
              }}
              limit={12}
              w={{ base: 240, sm: 340 }}
              styles={{ input: { textAlign: 'right' } }}
            />
            <Indicator label={activeFilterCount} size={16} disabled={activeFilterCount === 0} color="yellow">
              <ActionIcon variant={filtersOpen ? 'filled' : 'subtle'} color={filtersOpen ? 'yellow' : 'gray'} size="lg" onClick={() => setFiltersOpen((o) => !o)}>
                <IconFilter size={18} />
              </ActionIcon>
            </Indicator>
          </Group>
        </Group>
      </RallyMainCard>

      <Collapse in={filtersOpen}>
        <RallyMainCard title={
          <Group justify="space-between" w="100%">
            <Text fw={600} size="sm">فیلترهای پیشرفته</Text>
            <Badge color="yellow" variant="light" size="sm">{formatNum(filteredCoins.length)} رمزارز</Badge>
          </Group>
        }>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
            <MultiSelect label="دسته‌بندی" placeholder="همه دسته‌ها" data={categoryOptions} value={filters.categories} onChange={(v) => setFilter('categories', v)} searchable clearable size="sm" />
            <Group gap="xs" grow>
              <NumberInput label="حداقل تغییر ٪" placeholder="حداقل" value={filters.changeMin} onChange={(v) => setFilter('changeMin', v)} size="sm" step={1} />
              <NumberInput label="حداکثر تغییر ٪" placeholder="حداکثر" value={filters.changeMax} onChange={(v) => setFilter('changeMax', v)} size="sm" step={1} />
            </Group>
            <NumberInput label="حداقل حجم ($)" placeholder="حداقل" value={filters.volumeMin} onChange={(v) => setFilter('volumeMin', v)} size="sm" />
            <Group gap="xs" grow>
              <NumberInput label="حداقل ارزش بازار ($)" placeholder="حداقل" value={filters.mcapMin} onChange={(v) => setFilter('mcapMin', v)} size="sm" />
              <NumberInput label="حداکثر ارزش بازار ($)" placeholder="حداکثر" value={filters.mcapMax} onChange={(v) => setFilter('mcapMax', v)} size="sm" />
            </Group>
          </SimpleGrid>
          <Group gap="xs" wrap="wrap">
            {CRYPTO_PRESETS.map((preset) => (
              <Badge key={preset.label} size="lg" variant="light" color="yellow" style={{ cursor: 'pointer' }} onClick={() => handleApplyPreset(preset)}>
                {preset.label}
              </Badge>
            ))}
            <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={handleReset} color="gray">بازنشانی</Button>
            <Box style={{ flex: 1 }} />
            <Button size="sm" color="yellow" leftSection={<IconSearch size={16} />} onClick={handleSearch}>
              جستجو ({formatNum(filteredCoins.length)} نتیجه)
            </Button>
          </Group>
        </RallyMainCard>
      </Collapse>

      {/* Results table */}
      {showResults && (
        <RallyMainCard title={`نتایج جستجو (${formatNum(filteredCoins.length)})`} noPadding>
          <RallyDataTable
            records={paged}
            columns={resultColumns}
            idAccessor="symbol"
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => handleSelectFromTable(record.symbol)}
            emptyMessage="رمزارزی با فیلترهای شما یافت نشد"
          />
        </RallyMainCard>
      )}

      {selectedSymbol && high != null && (
        <RallyKPICard title="بالا / پایین دوره" value={`$${formatNum(high)} / $${formatNum(low)}`} color={ACCENT} animateValue />
      )}

      {!selectedSymbol && !showResults && (
        <Center mih={520} style={{ flexDirection: 'column', gap: 16 }}>
          <Box style={{
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${ACCENT}18, ${ACCENT}06)`,
            border: `1px solid ${ACCENT}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconChartCandle size={36} color={ACCENT} stroke={1.5} />
          </Box>
          <Stack align="center" gap={4}>
            <Text fw={600} c={rallyColors.textPrimary}>رمزارزی انتخاب نشده</Text>
            <Text size="sm" c={rallyColors.textSecondary}>رمزارز مورد نظر را در کادر بالا جستجو کنید</Text>
          </Stack>
        </Center>
      )}

      {selectedSymbol && (
        <CoinChartSection
          symbol={selectedSymbol}
          chartHistory={normalizedChart}
          interval={chartInterval}
          onIntervalChange={setChartInterval}
          detail={detail}
          loading={chartLoading}
          indicators={indicators}
          onIndicatorToggle={onIndicatorToggle}
        />
      )}
    </Stack>
  );
}
