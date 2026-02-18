import { useState, useMemo, useRef } from 'react';
import { Alert, Badge, Group, Tabs, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useRowSelection from '../hooks/useRowSelection';
import useColumnFilters from '../hooks/useColumnFilters';
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
import BulkActionsToolbar from '../components/table/BulkActionsToolbar';
import ColumnFilter from '../components/table/ColumnFilter';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';

/* ── Quick filter presets ────────────────────────────────────── */

const quickFilterPresets = [
  { key: 'top-gainers', label: 'بیشترین رشد', icon: 'trending-up' },
  { key: 'top-losers', label: 'بیشترین افت', icon: 'trending-down' },
  { key: 'top-cap', label: 'بیشترین ارزش بازار', icon: 'volume' },
];

/* ══ Component ═══════════════════════════════════════════════════ */

export default function MarketPrices() {
  /* ── State ──────────────────────────────────────────────────── */
  const [category, setCategory] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'price', direction: 'desc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);

  /* ── Data ───────────────────────────────────────────────────── */
  const { data: prices, loading, error, lastUpdated, refresh } = useApiData('/api/market/prices');
  const filteredByCategory = category === 'all' ? prices : prices.filter((r) => r.market_type === category);

  /* ── Quick filter presets ───────────────────────────────────── */
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !filteredByCategory?.length) return filteredByCategory;
    switch (activePreset) {
      case 'top-gainers':
        return [...filteredByCategory].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
      case 'top-losers':
        return [...filteredByCategory].sort((a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0));
      case 'top-cap':
        return [...filteredByCategory].sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
      default:
        return filteredByCategory;
    }
  }, [filteredByCategory, activePreset]);

  /* ── Column filters ─────────────────────────────────────────── */
  const {
    filters: columnFilters,
    addFilter,
    removeFilter,
    clearFilters: clearColumnFilters,
    filteredData: columnFilteredData,
    activeFilterCount,
  } = useColumnFilters(presetFilteredData);

  /* ── Global search ──────────────────────────────────────────── */
  const {
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
  } = useTableSearch(columnFilteredData, ['symbol', 'name_fa', 'unit']);

  /* ── Sorting ────────────────────────────────────────────────── */
  const sortedData = useMemo(() => {
    if (!sortStatus?.columnAccessor || !filteredData) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortStatus.columnAccessor];
      const bVal = b[sortStatus.columnAccessor];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'fa');
      return sortStatus.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortStatus]);

  /* ── Pagination & Selection ─────────────────────────────────── */
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData);
  const { selectedRecords, clearSelection, selectedCount } = useRowSelection('symbol');

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('market-prices', allColumns, filteredByCategory),
  });

  /* ── Bulk export ────────────────────────────────────────────── */
  const handleBulkExport = () => {
    exportToCsv('market-prices-selected', allColumns, selectedRecords);
    notifications.show({ title: 'صادرات موفق', message: `${selectedCount} ردیف صادر شد`, color: 'green' });
  };

  /* ── Columns ────────────────────────────────────────────────── */
  const allColumns = [
    { accessor: 'symbol', title: 'نماد', width: 90, sortable: true },
    { accessor: 'name_fa', title: 'نام', width: 160, sortable: true },
    { accessor: 'price', title: 'قیمت', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.price) },
    { accessor: 'price_toman', title: 'قیمت (تومان)', width: 110, textAlign: 'end', sortable: true, render: (r) => formatNum(r.price_toman) },
    { accessor: 'change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.change_pct} /> },
    { accessor: 'unit', title: 'واحد', width: 70, sortable: true },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.market_cap) },
  ];

  /* Build table columns: visible subset + column filter UI */
  const visibleCols = visibleColumns || allColumns;
  const tableColumns = visibleCols.map((col) => {
    const filterType = ['price', 'price_toman', 'change_pct', 'market_cap'].includes(col.accessor)
      ? 'range' : ['symbol', 'name_fa', 'unit'].includes(col.accessor) ? 'text' : null;
    if (!filterType) return col;
    return {
      ...col,
      title: (
        <Group gap={4} wrap="nowrap">
          <span>{col.title}</span>
          <ColumnFilter accessor={col.accessor} type={filterType} value={columnFilters[col.accessor]} onChange={addFilter} onClear={removeFilter} />
        </Group>
      ),
    };
  });

  if (error && !prices.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const showingFiltered = isSearching || activePreset || activeFilterCount > 0;

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeader title="قیمت بازارها">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="market-prices" onChange={setVisibleColumns} />
        <ExportButton filename="market-prices" columns={allColumns} records={filteredByCategory} />
      </PageHeader>

      {/* ── Filters Card ────────────────────────────────────── */}
      <RallyMainCard mb="md" noPadding>
        <Stack gap="sm" p="md">
          <Group gap="md" align="center" wrap="wrap">
            <Tabs value={category} onChange={(v) => { setCategory(v); setPage(1); setActivePreset(null); }}>
              <Tabs.List>
                <Tabs.Tab value="all">همه</Tabs.Tab>
                <Tabs.Tab value="gold">طلا</Tabs.Tab>
                <Tabs.Tab value="currency">ارز</Tabs.Tab>
                <Tabs.Tab value="commodity">کالا</Tabs.Tab>
                <Tabs.Tab value="crypto">کریپتو</Tabs.Tab>
              </Tabs.List>
            </Tabs>
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو... (Ctrl+F یا /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={searchQuery && (
                <ActionIcon size="sm" variant="subtle" onClick={clearSearch}><IconX size={14} /></ActionIcon>
              )}
              style={{ flex: 1, minWidth: 200 }}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-green" variant="light">
              {showingFiltered ? `${formatNum(resultCount)} از ${formatNum(filteredByCategory.length)}` : `${formatNum(filteredByCategory.length)} مورد`}
            </Badge>
            {activeFilterCount > 0 && (
              <Badge color="blue" variant="light" style={{ cursor: 'pointer' }} onClick={clearColumnFilters}>
                {activeFilterCount} فیلتر ستونی ✕
              </Badge>
            )}
          </Group>
          <QuickFilters
            presets={quickFilterPresets}
            activePreset={activePreset}
            onPresetClick={(key) => { setActivePreset(key); setPage(1); }}
          />
        </Stack>
      </RallyMainCard>

      {/* ── Bulk Actions ────────────────────────────────────── */}
      <BulkActionsToolbar
        selectedCount={selectedCount}
        onClear={clearSelection}
        onExport={handleBulkExport}
      />

      {/* ── Data Table ──────────────────────────────────────── */}
      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={tableColumns}
          idAccessor="symbol"
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={clearSelection}
          storeColumnsKey="market-prices"
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
