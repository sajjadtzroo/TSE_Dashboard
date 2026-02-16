import { useState, useMemo, useRef } from 'react';
import { Alert, Badge, Group, Select, Text, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import DensityToggle from '../components/DensityToggle';
import QuickFilters from '../components/table/QuickFilters';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import { toJalali } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';

function ExpiryCell({ value }) {
  if (!value) return <Text size="sm">-</Text>;
  const expiry = new Date(value);
  const now = new Date();
  const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  let color;
  let bgColor;
  if (daysUntil < 7) {
    color = rallyColors.red;
    bgColor = 'rgba(239, 68, 68, 0.12)';
  } else if (daysUntil < 30) {
    color = rallyColors.yellow;
    bgColor = 'rgba(245, 158, 11, 0.10)';
  } else {
    color = rallyColors.green;
    bgColor = 'rgba(16, 185, 129, 0.08)';
  }

  return (
    <Text
      size="sm"
      fw={500}
      c={color}
      style={{
        backgroundColor: bgColor,
        borderRadius: 4,
        padding: '2px 6px',
        display: 'inline-block',
      }}
    >
      {toJalali(value)}
      <Text span size="xs" c="dimmed" ml={4}>
        ({daysUntil}ر)
      </Text>
    </Text>
  );
}

export default function Options() {
  const [underlying, setUnderlying] = useState(null);
  const [optionType, setOptionType] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'symbol', direction: 'asc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);

  const params = new URLSearchParams();
  if (underlying) params.set('underlying', underlying);
  if (optionType) params.set('option_type', optionType);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const { data: options, loading, error, lastUpdated, refresh } = useApiData(`/api/options${qs}`, { deps: [underlying, optionType] });

  // Quick filter presets
  const quickFilterPresets = [
    { key: 'expiring-soon', label: 'سررسید نزدیک (<۷ روز)', icon: 'clock' },
    { key: 'high-volume', label: 'حجم بالا', icon: 'volume' },
    { key: 'itm', label: 'In-the-Money', icon: 'target' },
    { key: 'otm', label: 'Out-of-Money', icon: 'arrows-up-down' },
  ];

  // Apply preset filters
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !options) return options;

    const now = new Date();

    switch (activePreset) {
      case 'expiring-soon':
        return options.filter((opt) => {
          if (!opt.expiry_date) return false;
          const expiry = new Date(opt.expiry_date);
          const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          return daysUntil > 0 && daysUntil < 7;
        });
      case 'high-volume':
        return [...options]
          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
          .slice(0, 50);
      case 'itm':
        // Simplified ITM filter - would need underlying price for accuracy
        return options.filter((opt) => {
          if (opt.option_type === 'call') {
            return (opt.close || 0) > (opt.strike_price || 0) * 0.05; // Has intrinsic value
          } else {
            return (opt.strike_price || 0) > (opt.close || 0);
          }
        });
      case 'otm':
        return options.filter((opt) => {
          if (opt.option_type === 'call') {
            return (opt.close || 0) <= (opt.strike_price || 0) * 0.05;
          } else {
            return (opt.strike_price || 0) <= (opt.close || 0);
          }
        });
      default:
        return options;
    }
  }, [options, activePreset]);

  // Search functionality
  const { searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching } = useTableSearch(
    presetFilteredData,
    ['symbol', 'underlying', 'option_type']
  );

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortStatus?.columnAccessor || !filteredData) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortStatus.columnAccessor];
      const bVal = b[sortStatus.columnAccessor];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'fa');
      return sortStatus.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredData, sortStatus]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData);

  const underlyingOptions = [...new Set(options.map((o) => o.underlying).filter(Boolean))].sort();
  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  if (error && !options.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const allColumns = [
    { accessor: 'symbol', title: 'نماد', width: 90, sortable: true },
    {
      accessor: 'option_type', title: 'نوع', width: 60, sortable: true,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-green' : 'rally-red'}>
          {r.option_type === 'call' ? 'خرید' : 'فروش'}
        </Badge>
      ),
    },
    { accessor: 'underlying', title: 'دارایی پایه', width: 80, sortable: true },
    { accessor: 'strike_price', title: 'قیمت اعمال', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.strike_price) },
    { accessor: 'expiry_date', title: 'سررسید', width: 120, sortable: true, render: (r) => <ExpiryCell value={r.expiry_date} /> },
    { accessor: 'close', title: 'پایانی', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.close) },
    { accessor: 'last', title: 'آخرین', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.last) },
    {
      accessor: 'close_change', title: 'تغییر', width: 80, textAlign: 'end', sortable: true,
      render: (r) => {
        const val = r.close_change;
        if (val == null) return '-';
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.red : undefined;
        return <span style={{ color, fontWeight: 600 }}>{val > 0 ? '+' : ''}{formatNum(val)}</span>;
      },
    },
    { accessor: 'volume', title: 'حجم', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', sortable: true, render: (r) => formatNum(r.trades) },
    { accessor: 'open', title: 'باز', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.open) },
    { accessor: 'high', title: 'بیشترین', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.high) },
    { accessor: 'low', title: 'کمترین', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.low) },
    { accessor: 'bid_price_1', title: 'خرید', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.ask_price_1) },
  ];

  const columns = visibleColumns || allColumns;

  // Keyboard shortcuts
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('options', columns, options),
  });

  return (
    <>
      <PageHeader title="قراردادهای اختیار معامله">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="options" onChange={setVisibleColumns} />
        <ExportButton filename="options" columns={columns} records={options} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Stack gap="md" p="md">
          <Group gap="md">
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو در نماد، دارایی پایه... (Ctrl+F یا /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={
                searchQuery && (
                  <ActionIcon size="sm" variant="subtle" onClick={clearSearch}>
                    <IconX size={14} />
                  </ActionIcon>
                )
              }
              w={300}
              size="sm"
            />
            <Select
              placeholder="دارایی پایه"
              data={[{ value: '', label: 'همه' }, ...underlyingOptions.map((u) => ({ value: u, label: u }))]}
              value={underlying || ''}
              onChange={(v) => { setUnderlying(v || null); setPage(1); }}
              clearable
              w={160}
              size="sm"
            />
            <Select
              placeholder="نوع اختیار"
              data={[{ value: '', label: 'همه' }, { value: 'call', label: 'خرید' }, { value: 'put', label: 'فروش' }]}
              value={optionType || ''}
              onChange={(v) => { setOptionType(v || null); setPage(1); }}
              clearable
              w={130}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-green" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum(options.length)}` : `${formatNum(options.length)} اختیار`}
            </Badge>
            <Badge color="rally-green" variant="light">{formatNum(callCount)} خرید</Badge>
            <Badge color="rally-red" variant="light">{formatNum(putCount)} فروش</Badge>
          </Group>
          <QuickFilters
            presets={quickFilterPresets}
            activePreset={activePreset}
            onPresetClick={(key) => {
              setActivePreset(key);
              setPage(1);
            }}
          />
        </Stack>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          pinLeftColumns
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
          storeColumnsKey="options"
        />
      </RallyMainCard>
    </>
  );
}
