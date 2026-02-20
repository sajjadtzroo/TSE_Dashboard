import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Group, Select, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import ErrorAlert from '../components/ErrorAlert';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import ColumnToggle from '../components/ColumnToggle';
import DensityToggle from '../components/DensityToggle';
import QuickFilters from '../components/table/QuickFilters';
import BulkActionsToolbar from '../components/table/BulkActionsToolbar';
import ColumnFilter from '../components/table/ColumnFilter';
import { useMarketOverview, useSectors } from '../hooks/useMarketData';
import useTablePage from '../hooks/useTablePage';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useColumnFilters from '../hooks/useColumnFilters';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import { FUND_QUICK_FILTERS } from '../constants/quickFilters';
import { applyMarketQuickFilter } from '../utils/applyQuickFilter';
import {
  symbolCol, nameFaCol, dateCol, closeCol, closePctCol, volumeCol, tradesCol, epsCol,
} from '../utils/columnFactories';

/* ══ Component ═══════════════════════════════════════════════════ */

export default function Funds() {
  /* ── State ──────────────────────────────────────────────────── */
  const [selectedSector, setSelectedSector] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  /* ── Data ───────────────────────────────────────────────────── */
  const { data: allSectors = [] } = useSectors();
  const sectors = useMemo(() => allSectors.filter((s) => isFundSector(s)), [allSectors]);

  const { data: rawFunds = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useMarketOverview({ sector: selectedSector || undefined });
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const fundsData = useMemo(() => rawFunds.filter((item) => isFundSector(item.sector_name_fa)), [rawFunds]);

  /* ── Quick filter presets ───────────────────────────────────── */
  const presetFilteredData = useMemo(
    () => applyMarketQuickFilter(fundsData, activePreset),
    [fundsData, activePreset],
  );

  /* ── Column filters ─────────────────────────────────────────── */
  const {
    filters: columnFilters,
    addFilter,
    removeFilter,
    clearFilters: clearColumnFilters,
    filteredData: columnFilteredData,
    activeFilterCount,
  } = useColumnFilters(presetFilteredData);

  /* ── Search → Sort → Paginate → Selection ─────────────────── */
  const {
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
    sortStatus, setSortStatus,
    paged, page, setPage, perPage, setPerPage, totalRecords,
    selectedRecords, clearSelection, selectedCount,
  } = useTablePage(columnFilteredData, {
    searchFields: ['symbol', 'name_fa', 'sector_name_fa'],
    defaultSort: { columnAccessor: 'close', direction: 'desc' },
    idAccessor: 'ins_code',
  });

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('funds', allColumns, fundsData),
  });

  /* ── Bulk export ────────────────────────────────────────────── */
  const handleBulkExport = () => {
    exportToCsv('funds-selected', allColumns, selectedRecords);
    notifications.show({ title: 'صادرات موفق', message: `${selectedCount} ردیف صادر شد`, color: 'green' });
  };

  /* ── Columns ────────────────────────────────────────────────── */
  const allColumns = [
    symbolCol(80),
    nameFaCol(180),
    { ...nameFaCol(140), accessor: 'sector_name_fa', title: 'نوع' },
    dateCol('date', 'تاریخ'),
    { ...closeCol(), title: 'NAV / قیمت' },
    closePctCol(),
    volumeCol(),
    tradesCol(),
    epsCol(),
  ];

  /* Build table columns: visible subset + column filter UI */
  const visibleCols = visibleColumns || allColumns;
  const tableColumns = visibleCols.map((col) => {
    const filterType = ['close', 'close_change_pct', 'volume', 'trades', 'eps'].includes(col.accessor)
      ? 'range' : ['symbol', 'name_fa', 'sector_name_fa'].includes(col.accessor) ? 'text' : null;
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

  if (error && !fundsData.length) {
    return <ErrorAlert error={error} onRetry={refresh} />;
  }

  const showingFiltered = isSearching || activePreset || activeFilterCount > 0;

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeader title="صندوق‌های سرمایه‌گذاری">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="funds" onChange={setVisibleColumns} />
        <ExportButton filename="funds" columns={allColumns} records={fundsData} />
      </PageHeader>

      {/* ── Filters Card ────────────────────────────────────── */}
      <RallyMainCard mb="md" noPadding>
        <Stack gap="sm" p="md">
          <Group gap="md" wrap="wrap">
            <Select
              placeholder="نوع صندوق"
              data={[{ value: '', label: 'همه انواع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              value={selectedSector || ''}
              onChange={(v) => { setSelectedSector(v || null); setPage(1); setActivePreset(null); }}
              clearable
              searchable
              style={{ flex: 1, minWidth: 140, maxWidth: 240 }}
              size="sm"
            />
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
            <Badge color="rally-purple" variant="light">
              {showingFiltered ? `${formatNum(resultCount)} از ${formatNum(fundsData.length)}` : `${formatNum(fundsData.length)} صندوق`}
            </Badge>
            {activeFilterCount > 0 && (
              <Badge color="blue" variant="light" style={{ cursor: 'pointer' }} onClick={clearColumnFilters}>
                {activeFilterCount} فیلتر ستونی ✕
              </Badge>
            )}
          </Group>
          <QuickFilters
            presets={FUND_QUICK_FILTERS}
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
          idAccessor="ins_code"
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          onRowClick={({ record }) => navigate(`/dashboard/stock/${record.symbol}`)}
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={clearSelection}
          storeColumnsKey="funds"
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
        />
      </RallyMainCard>
    </>
  );
}
