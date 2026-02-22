import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Group, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useRowSelection from '../hooks/useRowSelection';
import useColumnFilters from '../hooks/useColumnFilters';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import ErrorAlert from '../components/ErrorAlert';

/* ── Quick filter presets ────────────────────────────────────── */

const quickFilterPresets = [
  { key: 'positive-bubble', label: 'حباب مثبت', icon: 'trending-up' },
  { key: 'negative-bubble', label: 'حباب منفی', icon: 'trending-down' },
  { key: 'highest-nav', label: 'بیشترین NAV', icon: 'volume' },
];

/* ══ Component ═══════════════════════════════════════════════════ */

export default function ETFNav() {
  /* ── State ──────────────────────────────────────────────────── */
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'nav_issuance', direction: 'desc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  /* ── Data ───────────────────────────────────────────────────── */
  const { data: etfs, loading, error, lastUpdated, refresh } = useApiData('/api/market/etf-nav');

  /* ── Quick filter presets ───────────────────────────────────── */
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !etfs?.length) return etfs;
    switch (activePreset) {
      case 'positive-bubble':
        return etfs.filter((r) => (r.bubble_pct ?? 0) > 0);
      case 'negative-bubble':
        return etfs.filter((r) => (r.bubble_pct ?? 0) < 0);
      case 'highest-nav':
        return [...etfs].sort((a, b) => (b.nav_issuance ?? 0) - (a.nav_issuance ?? 0));
      default:
        return etfs;
    }
  }, [etfs, activePreset]);

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
  } = useTableSearch(columnFilteredData, ['symbol', 'name_fa', 'fund_type']);

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
    onExport: () => exportToCsv('etf-nav', allColumns, etfs),
  });

  /* ── Bulk export ────────────────────────────────────────────── */
  const handleBulkExport = () => {
    exportToCsv('etf-nav-selected', allColumns, selectedRecords);
    notifications.show({ title: 'صادرات موفق', message: `${selectedCount} ردیف صادر شد`, color: 'green' });
  };

  /* ── Columns ────────────────────────────────────────────────── */
  const allColumns = [
    { accessor: 'symbol', title: 'نماد', width: 90, sortable: true },
    { accessor: 'name_fa', title: 'نام', width: 160, sortable: true },
    { accessor: 'nav_issuance', title: 'NAV صدور', width: 110, textAlign: 'end', sortable: true, render: (r) => formatNum(r.nav_issuance) },
    { accessor: 'nav_redemption', title: 'NAV ابطال', width: 110, textAlign: 'end', sortable: true, render: (r) => formatNum(r.nav_redemption) },
    { accessor: 'last_price', title: 'آخرین قیمت', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.last_price) },
    { accessor: 'bubble_pct', title: 'حباب٪', width: 80, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.bubble_pct} /> },
    { accessor: 'fund_type', title: 'نوع صندوق', width: 90, sortable: true },
  ];

  /* Build table columns: visible subset + column filter UI */
  const visibleCols = visibleColumns || allColumns;
  const tableColumns = visibleCols.map((col) => {
    const filterType = ['nav_issuance', 'nav_redemption', 'last_price', 'bubble_pct'].includes(col.accessor)
      ? 'range' : ['symbol', 'name_fa', 'fund_type'].includes(col.accessor) ? 'text' : null;
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

  if (error && !etfs.length) {
    return <ErrorAlert error={error} onRetry={refresh} />;
  }

  const showingFiltered = isSearching || activePreset || activeFilterCount > 0;

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeader title="NAV صندوق‌ها">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="etf-nav" onChange={setVisibleColumns} />
        <ExportButton filename="etf-nav" columns={allColumns} records={etfs} />
      </PageHeader>

      {/* ── Filters Card ────────────────────────────────────── */}
      <RallyMainCard mb="md" noPadding>
        <Stack gap="sm" p="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو... (Ctrl+F یا /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={searchQuery && (
                <ActionIcon size="sm" variant="subtle" onClick={clearSearch} aria-label="پاک کردن جستجو"><IconX size={14} /></ActionIcon>
              )}
              style={{ flex: 1, minWidth: 200 }}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-green" variant="light">
              {showingFiltered ? `${formatNum(resultCount)} از ${formatNum(etfs.length)}` : `${formatNum(etfs.length)} صندوق`}
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
          storeColumnsKey="etf-nav"
          onRowClick={({ record }) => navigate(`/dashboard/etf-nav/${record.symbol}`)}
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
