import { useState, useMemo, useRef } from 'react';
import { Badge, Group, Select, Text, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import DensityToggle from '../components/DensityToggle';
import QuickFilters from '../components/table/QuickFilters';
import BulkActionsToolbar from '../components/table/BulkActionsToolbar';
import RiskFreeRateSlider, { useRiskFreeRate } from '../components/options/RiskFreeRateSlider';
import { useOptionsUnderlyings } from '../hooks/useMarketData';
import { impliedVolatility, greeks as computeGreeks, blackScholesPrice, moneyness } from '../utils/blackScholes';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useRowSelection from '../hooks/useRowSelection';
import { toJalali, fromJalali, computeT } from '../utils/dateUtils';
import rallyColors from '../theme/rallyColors';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import { notifications } from '@mantine/notifications';
import ErrorAlert from '../components/ErrorAlert';

function ExpiryCell({ value }) {
  if (!value) return <Text size="sm">-</Text>;
  const year = parseInt(String(value).split(/[-/]/)[0], 10);
  const expiry = (year > 0 && year < 1800) ? fromJalali(value) : new Date(value);
  if (!expiry || isNaN(expiry.getTime())) return <Text size="sm">-</Text>;
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
    bgColor = 'rgba(34, 197, 94, 0.08)';
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

/** IV cell with color gradient */
function IVCell({ value }) {
  if (value == null) return <span style={{ color: 'rgba(156,163,175,0.3)' }}>-</span>;
  // Color: green <30%, yellow 30-60%, red >60%
  let color = rallyColors.green;
  if (value > 60) color = rallyColors.red;
  else if (value > 30) color = rallyColors.yellow;
  return <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</span>;
}

/** Moneyness badge */
function MoneynessCell({ value }) {
  if (!value) return <span style={{ color: 'rgba(156, 163, 175,0.3)' }}>-</span>;
  const colors = { ITM: 'green', ATM: 'yellow', OTM: 'red' };
  return <Badge size="xs" variant="light" color={colors[value] || 'gray'}>{value}</Badge>;
}

export default function Options() {
  const [underlying, setUnderlying] = useState(null);
  const [optionType, setOptionType] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'symbol', direction: 'asc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);
  const [riskFreeRate, setRiskFreeRate] = useRiskFreeRate();

  const {
    data: options,
    isLoading: loading,
    error,
    dataUpdatedAt: lastUpdated,
    refetch: refresh,
  } = useQuery({
    queryKey: ['options', underlying, optionType],
    queryFn: () => api.get('/options', { params: { ...(underlying && { underlying }), ...(optionType && { option_type: optionType }) } }).then(r => r.data),
    staleTime: 3 * 60 * 1000,
  });

  // Fetch underlying prices for IV calculation
  const { data: underlyingsData = [] } = useOptionsUnderlyings();
  const underlyingPriceLookup = useMemo(() => {
    const lookup = {};
    underlyingsData.forEach((u) => {
      if (u.close) lookup[u.underlying] = u.close;
    });
    return lookup;
  }, [underlyingsData]);

  // Enrich options with Greeks/IV per underlying group
  const enrichedOptions = useMemo(() => {
    if (!options?.length || !Object.keys(underlyingPriceLookup).length) return options || [];
    // Group by underlying, enrich each group
    const groups = {};
    options.forEach((opt) => {
      const key = opt.underlying || '_none';
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });
    const result = [];
    for (const [key, group] of Object.entries(groups)) {
      const price = underlyingPriceLookup[key];
      if (price) {
        const S = price;
        const r = (riskFreeRate || 23) / 100;
        for (const opt of group) {
          const K = opt.strike_price;
          const T = computeT(opt.expiry_date);
          const marketPrice = opt.last || opt.close;
          const type = opt.option_type;
          if (!K || !type || T <= 0) {
            result.push({ ...opt, iv: null, delta: null, gamma: null, theta: null, vega: null, rho: null, bs_price: null, moneyness: moneyness(type, S, K), time_to_expiry: T });
          } else {
            const iv = impliedVolatility(type, marketPrice, S, K, T, r);
            const sigma = iv || 0.3;
            const g = computeGreeks(type, S, K, T, r, sigma);
            const bsPrice = blackScholesPrice(type, S, K, T, r, sigma);
            result.push({
              ...opt,
              iv: iv != null ? iv * 100 : null,
              delta: g.delta,
              gamma: g.gamma,
              theta: g.theta,
              vega: g.vega,
              rho: g.rho,
              bs_price: bsPrice,
              moneyness: moneyness(type, S, K),
              time_to_expiry: T,
            });
          }
        }
      } else {
        result.push(...group.map((opt) => ({ ...opt, iv: null, delta: null, gamma: null, theta: null, vega: null, rho: null, bs_price: null, moneyness: null, time_to_expiry: 0 })));
      }
    }
    return result;
  }, [options, underlyingPriceLookup, riskFreeRate]);

  // Quick filter presets
  const quickFilterPresets = [
    { key: 'expiring-soon', label: 'سررسید نزدیک (<۷ روز)', icon: 'clock' },
    { key: 'high-volume', label: 'حجم بالا', icon: 'volume' },
    { key: 'itm', label: 'In-the-Money', icon: 'target' },
    { key: 'otm', label: 'Out-of-Money', icon: 'arrows-up-down' },
  ];

  // Apply preset filters
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !enrichedOptions) return enrichedOptions;

    const now = new Date();

    switch (activePreset) {
      case 'expiring-soon':
        return enrichedOptions.filter((opt) => {
          if (!opt.expiry_date) return false;
          const yr = parseInt(String(opt.expiry_date).split(/[-/]/)[0], 10);
          const expiry = (yr > 0 && yr < 1800) ? fromJalali(opt.expiry_date) : new Date(opt.expiry_date);
          if (!expiry || isNaN(expiry.getTime())) return false;
          const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          return daysUntil > 0 && daysUntil < 7;
        });
      case 'high-volume':
        return [...enrichedOptions]
          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
          .slice(0, 50);
      case 'itm':
        return enrichedOptions.filter((opt) => opt.moneyness === 'ITM');
      case 'otm':
        return enrichedOptions.filter((opt) => opt.moneyness === 'OTM');
      default:
        return enrichedOptions;
    }
  }, [enrichedOptions, activePreset]);

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

  const underlyingOptions = [...new Set((options || []).map((o) => o.underlying).filter(Boolean))].sort();
  const callCount = (options || []).filter((o) => o.option_type === 'call').length;
  const putCount = (options || []).filter((o) => o.option_type === 'put').length;

  if (error && !(options || []).length) {
    return <ErrorAlert error={error?.message ?? String(error)} onRetry={refresh} />;
  }

  const allColumns = [
    { accessor: 'symbol', title: 'نماد', width: 90, sortable: true },
    {
      accessor: 'option_type', title: 'نوع', width: 60, sortable: true,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-primary' : 'rally-red'}>
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
    // Analytics columns
    { accessor: 'iv', title: 'IV%', width: 65, textAlign: 'end', sortable: true, render: (r) => <IVCell value={r.iv} />, defaultHidden: false },
    { accessor: 'delta', title: 'دلتا', width: 60, textAlign: 'end', sortable: true, render: (r) => r.delta != null ? r.delta.toFixed(4) : '-', defaultHidden: false },
    { accessor: 'gamma', title: 'گاما', width: 60, textAlign: 'end', sortable: true, render: (r) => r.gamma != null ? r.gamma.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'theta', title: 'تتا', width: 60, textAlign: 'end', sortable: true, render: (r) => r.theta != null ? r.theta.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'vega', title: 'وگا', width: 60, textAlign: 'end', sortable: true, render: (r) => r.vega != null ? r.vega.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'rho', title: 'رو', width: 60, textAlign: 'end', sortable: true, render: (r) => r.rho != null ? r.rho.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'bs_price', title: 'BS قیمت', width: 80, textAlign: 'end', sortable: true, render: (r) => r.bs_price != null ? formatNum(Math.round(r.bs_price)) : '-', defaultHidden: true },
    { accessor: 'moneyness', title: 'وضعیت', width: 60, sortable: true, render: (r) => <MoneynessCell value={r.moneyness} />, defaultHidden: true },
    // Original columns continued
    { accessor: 'volume', title: 'حجم', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 65, textAlign: 'end', sortable: true, render: (r) => formatNum(r.trades) },
    { accessor: 'open', title: 'باز', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.open) },
    { accessor: 'high', title: 'بیشترین', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.high) },
    { accessor: 'low', title: 'کمترین', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.low) },
    { accessor: 'bid_price_1', title: 'خرید', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.bid_price_1) },
    { accessor: 'ask_price_1', title: 'فروش', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.ask_price_1) },
  ];

  const columns = visibleColumns || allColumns;

  // Row selection
  const {
    selectedRecords,
    toggleSelection,
    clearSelection,
    selectedCount,
  } = useRowSelection('symbol');

  // Keyboard shortcuts
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('options', columns, enrichedOptions),
  });

  // Bulk actions
  const handleBulkExport = () => {
    exportToCsv('options-selected', columns, selectedRecords);
    notifications.show({
      title: 'صادرات موفق',
      message: `${selectedCount} قرارداد صادر شد`,
      color: 'green',
    });
  };

  return (
    <>
      <PageHeader title="قراردادهای اختیار معامله">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="options" onChange={setVisibleColumns} />
        <ExportButton filename="options" columns={columns} records={enrichedOptions} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Stack gap="md" p="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو در نماد، دارایی پایه... (Ctrl+F یا /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={
                searchQuery && (
                  <ActionIcon size="sm" variant="subtle" onClick={clearSearch} aria-label="پاک کردن جستجو">
                    <IconX size={14} />
                  </ActionIcon>
                )
              }
              style={{ flex: 1, minWidth: 200 }}
              size="sm"
            />
            <Select
              placeholder="دارایی پایه"
              data={[{ value: '', label: 'همه' }, ...underlyingOptions.map((u) => ({ value: u, label: u }))]}
              value={underlying || ''}
              onChange={(v) => { setUnderlying(v || null); setPage(1); }}
              clearable
              style={{ flex: 1, minWidth: 120, maxWidth: 180 }}
              size="sm"
            />
            <Select
              placeholder="نوع اختیار"
              data={[{ value: '', label: 'همه' }, { value: 'call', label: 'خرید' }, { value: 'put', label: 'فروش' }]}
              value={optionType || ''}
              onChange={(v) => { setOptionType(v || null); setPage(1); }}
              clearable
              style={{ flex: 1, minWidth: 120, maxWidth: 180 }}
              size="sm"
            />
            <RiskFreeRateSlider value={riskFreeRate} onChange={setRiskFreeRate} />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-primary" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum((options || []).length)}` : `${formatNum((options || []).length)} اختیار`}
            </Badge>
            <Badge color="rally-primary" variant="light">{formatNum(callCount)} خرید</Badge>
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

      <BulkActionsToolbar
        selectedCount={selectedCount}
        onClear={clearSelection}
        onExport={handleBulkExport}
      />

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
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={toggleSelection}
        />
      </RallyMainCard>
    </>
  );
}
