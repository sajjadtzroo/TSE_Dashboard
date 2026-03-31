import { useState, useMemo } from 'react';
import {
  ActionIcon,
  Autocomplete,
  Badge,
  Box,
  Button,
  Center,
  Collapse,
  Group,
  Indicator,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconSearch, IconChartCandle, IconFilter, IconX } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyDataTable from '../components/RallyDataTable';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import StockChartSection from './stock/StockChartSection';
import { useMarketOverview, useStockHistory, useSectors } from '../hooks/useMarketData';
import useIndicatorPrefs from '../hooks/useIndicatorPrefs';
import usePagination from '../hooks/usePagination';
import { formatNum, toPersianNum, formatTrillion } from '../utils/formatUtils';
import { isFundSector } from '../utils/sectorUtils';
import { PRESETS } from '../constants/screener';
import rallyColors from '../theme/rallyColors';

const defaultFilters = {
  sectors: [],
  changeMin: '',
  changeMax: '',
  volumeMin: '',
  peMin: '',
  peMax: '',
  epsMin: '',
  epsMax: '',
};

export default function TechnicalAnalysis() {
  const [inputValue, setInputValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [duration, setDuration] = useState('90');
  const [filters, setFilters] = useState(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Data hooks
  const { data: overview = [] } = useMarketOverview();
  const { data: rawSectors = [] } = useSectors();
  const sectorList = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sectors.length > 0) count++;
    if (filters.changeMin !== '') count++;
    if (filters.changeMax !== '') count++;
    if (filters.volumeMin !== '') count++;
    if (filters.peMin !== '') count++;
    if (filters.peMax !== '') count++;
    if (filters.epsMin !== '') count++;
    if (filters.epsMax !== '') count++;
    return count;
  }, [filters]);

  // Filter overview data
  const filteredOverview = useMemo(() => {
    return overview.filter((row) => {
      if (filters.sectors.length > 0 && !filters.sectors.includes(row.sector_name_fa)) return false;
      if (filters.changeMin !== '' && (row.close_change_pct ?? -Infinity) < Number(filters.changeMin)) return false;
      if (filters.changeMax !== '' && (row.close_change_pct ?? Infinity) > Number(filters.changeMax)) return false;
      if (filters.volumeMin !== '' && (row.volume ?? 0) < Number(filters.volumeMin)) return false;
      if (filters.peMin !== '' && (row.pe_ratio == null || row.pe_ratio < Number(filters.peMin))) return false;
      if (filters.peMax !== '' && (row.pe_ratio == null || row.pe_ratio > Number(filters.peMax))) return false;
      if (filters.epsMin !== '' && (row.eps == null || row.eps < Number(filters.epsMin))) return false;
      if (filters.epsMax !== '' && (row.eps == null || row.eps > Number(filters.epsMax))) return false;
      return true;
    });
  }, [overview, filters]);

  // Autocomplete data from filtered results
  const autocompleteData = useMemo(
    () =>
      filteredOverview.map((s) => ({
        value: s.symbol,
        label: s.name_fa ? `${s.symbol} — ${s.name_fa}` : s.symbol,
      })),
    [filteredOverview],
  );

  // Pagination for results table
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredOverview);

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
    { accessor: 'symbol', title: 'نماد', width: 90, noWrap: true },
    { accessor: 'name_fa', title: 'نام', width: 150, ellipsis: true },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 140, ellipsis: true },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 80, textAlign: 'end', noWrap: true, render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 100, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.volume) },
    { accessor: 'pe_ratio', title: 'P/E', width: 60, textAlign: 'end', noWrap: true, render: (r) => r.pe_ratio != null ? toPersianNum(r.pe_ratio.toFixed(1)) : '-' },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', noWrap: true, render: (r) => formatTrillion(r.market_cap) },
  ];

  return (
    <Stack gap="md">
      {/* Header: brand + search + filter toggle */}
      <RallyMainCard>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            <IconChartCandle size={20} color={rallyColors.primary} />
            <Title order={4} fw={700}>تحلیل تکنیکال</Title>
          </Group>

          <Group gap="xs" wrap="nowrap">
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
                setShowResults(false);
                const item = autocompleteData.find((d) => d.value === val);
                setInputValue(item?.label || val);
              }}
              limit={12}
              w={{ base: 240, sm: 340 }}
              styles={{ input: { textAlign: 'right' } }}
            />
            <Indicator
              label={activeFilterCount}
              size={16}
              disabled={activeFilterCount === 0}
              color="rally-primary"
            >
              <ActionIcon
                variant={filtersOpen ? 'filled' : 'subtle'}
                color={filtersOpen ? 'rally-primary' : 'gray'}
                size="lg"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <IconFilter size={18} />
              </ActionIcon>
            </Indicator>
          </Group>
        </Group>
      </RallyMainCard>

      {/* Collapsible filter panel */}
      <Collapse in={filtersOpen}>
        <RallyMainCard title={
          <Group justify="space-between" w="100%">
            <Text fw={600} size="sm">فیلترهای پیشرفته</Text>
            <Badge color="rally-primary" variant="light" size="sm">
              {formatNum(filteredOverview.length)} نماد
            </Badge>
          </Group>
        }>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
            <MultiSelect
              label="صنایع"
              placeholder="همه صنایع"
              data={sectorList.map((s) => ({ value: s, label: s }))}
              value={filters.sectors}
              onChange={(v) => setFilter('sectors', v)}
              searchable clearable size="sm"
            />
            <Group gap="xs" grow>
              <NumberInput label="حداقل تغییر ٪" placeholder="حداقل" value={filters.changeMin} onChange={(v) => setFilter('changeMin', v)} size="sm" step={0.5} />
              <NumberInput label="حداکثر تغییر ٪" placeholder="حداکثر" value={filters.changeMax} onChange={(v) => setFilter('changeMax', v)} size="sm" step={0.5} />
            </Group>
            <NumberInput label="حداقل حجم" placeholder="حداقل حجم" value={filters.volumeMin} onChange={(v) => setFilter('volumeMin', v)} size="sm" />
            <Group gap="xs" grow>
              <NumberInput label="حداقل P/E" placeholder="حداقل" value={filters.peMin} onChange={(v) => setFilter('peMin', v)} size="sm" step={1} />
              <NumberInput label="حداکثر P/E" placeholder="حداکثر" value={filters.peMax} onChange={(v) => setFilter('peMax', v)} size="sm" step={1} />
            </Group>
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
            <Group gap="xs" grow>
              <NumberInput label="حداقل EPS" placeholder="حداقل" value={filters.epsMin} onChange={(v) => setFilter('epsMin', v)} size="sm" />
              <NumberInput label="حداکثر EPS" placeholder="حداکثر" value={filters.epsMax} onChange={(v) => setFilter('epsMax', v)} size="sm" />
            </Group>
          </SimpleGrid>

          <Group gap="xs" wrap="wrap">
            {PRESETS.map((preset) => (
              <Badge key={preset.label} size="lg" variant="light" color="rally-primary" style={{ cursor: 'pointer' }} onClick={() => handleApplyPreset(preset)}>
                {preset.label}
              </Badge>
            ))}
            <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={handleReset} color="gray">
              بازنشانی
            </Button>
            <Box style={{ flex: 1 }} />
            <Button
              size="sm"
              color="rally-primary"
              leftSection={<IconSearch size={16} />}
              onClick={handleSearch}
            >
              جستجو ({formatNum(filteredOverview.length)} نتیجه)
            </Button>
          </Group>
        </RallyMainCard>
      </Collapse>

      {/* Results table */}
      {showResults && (
        <RallyMainCard title={`نتایج جستجو (${formatNum(filteredOverview.length)})`} noPadding>
          <RallyDataTable
            records={paged}
            columns={resultColumns}
            idAccessor="ins_code"
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => handleSelectFromTable(record.symbol)}
            emptyMessage="نمادی با فیلترهای شما یافت نشد"
          />
        </RallyMainCard>
      )}

      {/* Thin high/low bar */}
      {selectedSymbol && high52w != null && (
        <RallyKPICard
          title="بالا / پایین دوره"
          value={`${formatNum(high52w)} / ${formatNum(low52w)}`}
          color={rallyColors.orange}
          animateValue
        />
      )}

      {/* Empty state */}
      {!selectedSymbol && !showResults && (
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
