import { useState, useMemo, useRef } from 'react';
import { Badge, Group, TextInput, ActionIcon, Stack } from '@mantine/core';
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
import ErrorAlert from '../components/ErrorAlert';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';

/* ── Quick filter presets ────────────────────────────────────── */

const quickFilterPresets = [
  { key: 'top-gainers', label: 'بیشترین رشد', icon: 'trending-up' },
  { key: 'top-losers', label: 'بیشترین افت', icon: 'trending-down' },
  { key: 'top-value', label: 'بیشترین ارزش', icon: 'volume' },
];

/* ══ Component ═══════════════════════════════════════════════════ */

export default function MarketIndices() {
  /* ── State ──────────────────────────────────────────────────── */
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'index_value', direction: 'desc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);

  /* ── Data ───────────────────────────────────────────────────── */
  const { data: indices, loading, error, lastUpdated, refresh } = useApiData('/api/market/indices');

  /* ── Quick filter presets ───────────────────────────────────── */
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !indices?.length) return indices;
    switch (activePreset) {
      case 'top-gainers':
        return [...indices].sort((a, b) => (b.index_change_pct ?? 0) - (a.index_change_pct ?? 0));
      case 'top-losers':
        return [...indices].sort((a, b) => (a.index_change_pct ?? 0) - (b.index_change_pct ?? 0));
      case 'top-value':
        return [...indices].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      default:
        return indices;
    }
  }, [indices, activePreset]);

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
  } = useTableSearch(columnFilteredData, ['name', 'state']);

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
  const { selectedRecords, clearSelection, selectedCount } = useRowSelection('name');

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('market-indices', allColumns, indices),
  });

  /* ── Bulk export ────────────────────────────────────────────── */
  const handleBulkExport = () => {
    exportToCsv('market-indices-selected', allColumns, selectedRecords);
    notifications.show({ title: 'صادرات موفق', message: `${selectedCount} ردیف صادر شد`, color: 'green' });
  };

  /* ── Columns ────────────────────────────────────────────────── */
  const allColumns = [
    { accessor: 'name', title: 'نام', width: 160, sortable: true },
    { accessor: 'index_value', title: 'مقدار', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.index_value) },
    { accessor: 'index_change', title: 'تغییر', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.index_change) },
    { accessor: 'index_change_pct', title: 'تغییر٪', width: 80, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.index_change_pct} /> },
    { accessor: 'min_value', title: 'کمترین', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.min_value) },
    { accessor: 'max_value', title: 'بیشترین', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.max_value) },
    { accessor: 'volume', title: 'حجم', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.volume) },
    { accessor: 'value', title: 'ارزش', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.value) },
    { accessor: 'state', title: 'وضعیت', width: 70, sortable: true },
  ];

  /* Build table columns: visible subset + column filter UI */
  const visibleCols = visibleColumns || allColumns;
  const tableColumns = visibleCols.map((col) => {
    const filterType = ['index_value', 'index_change', 'index_change_pct', 'min_value', 'max_value', 'volume', 'value'].includes(col.accessor)
      ? 'range' : col.accessor === 'name' || col.accessor === 'state' ? 'text' : null;
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

  if (error && !indices.length) {
    return <ErrorAlert error={error} onRetry={refresh} />;
  }

  const showingFiltered = isSearching || activePreset || activeFilterCount > 0;

  return (
    <>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'شاخص‌ها' }]} />
      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeader title="شاخص‌های بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="market-indices" onChange={setVisibleColumns} />
        <ExportButton filename="market-indices" columns={allColumns} records={indices} />
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
              {showingFiltered ? `${formatNum(resultCount)} از ${formatNum(indices.length)}` : `${formatNum(indices.length)} شاخص`}
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
          idAccessor="name"
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
          storeColumnsKey="market-indices"
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
