import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Group, Select, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconStar, IconStarFilled, IconSearch, IconX } from '@tabler/icons-react';
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
import StockPreviewDrawer from '../components/stock/StockPreviewDrawer';
import SparklineCell from '../components/cells/SparklineCell';
import useSparklineData from '../hooks/useSparklineData';
import { toJalali } from '../utils/dateUtils';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';
import { useMarketOverview, useSectors } from '../hooks/useMarketData';
import useTablePage from '../hooks/useTablePage';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useColumnFilters from '../hooks/useColumnFilters';
import ColumnFilter from '../components/table/ColumnFilter';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import { notifications } from '@mantine/notifications';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import { MARKET_QUICK_FILTERS } from '../constants/quickFilters';
import { applyMarketQuickFilter } from '../utils/applyQuickFilter';
import {
  symbolCol, nameFaCol, sectorCol, dateCol, closeCol, closePctCol,
  lowCol, highCol, volumeCol, tradesCol, peCol, epsCol, marketCapCol,
} from '../utils/columnFactories';

export default function MarketOverview() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [previewSymbol, setPreviewSymbol] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

  const { data: rawSectors = [] } = useSectors();
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const { data: rawMarket = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useMarketOverview({ sector: selectedSector || undefined });
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const marketData = useMemo(() => rawMarket.filter((item) => !isFundSector(item.sector_name_fa)), [rawMarket]);

  // Apply preset filters
  const presetFilteredData = useMemo(
    () => applyMarketQuickFilter(marketData, activePreset),
    [marketData, activePreset],
  );

  // Column filters
  const {
    filters: columnFilters,
    addFilter,
    removeFilter,
    clearFilters: clearColumnFilters,
    filteredData: columnFilteredData,
    activeFilterCount,
  } = useColumnFilters(presetFilteredData);

  // Search → Sort → Paginate → Selection
  const {
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
    sortStatus, setSortStatus,
    paged, page, setPage, perPage, setPerPage, totalRecords,
    selectedRecords, toggleSelection, clearSelection, selectedCount,
  } = useTablePage(columnFilteredData, {
    searchFields: ['symbol', 'name_fa', 'sector_name_fa'],
    defaultSort: { columnAccessor: 'symbol', direction: 'asc' },
    idAccessor: 'ins_code',
  });

  // Sparkline data for current page
  const pageSymbols = useMemo(() => paged.map((r) => r.symbol), [paged]);
  const { sparklines } = useSparklineData(pageSymbols);

  if (error && !marketData.length) {
    return <ErrorAlert error={error} onRetry={refresh} />;
  }

  const allColumns = [
    {
      accessor: '_star', title: '', width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} className="market-row-action" onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    symbolCol(),
    nameFaCol(),
    sectorCol(),
    dateCol('date', 'تاریخ'),
    closeCol(),
    closePctCol(),
    { accessor: '_sparkline', title: 'روند ۷ روز', width: 80, render: (r) => <SparklineCell data={sparklines.get(r.symbol)} /> },
    lowCol(),
    highCol(),
    volumeCol(),
    tradesCol(),
    peCol(),
    epsCol(),
    marketCapCol(),
  ];

  const columns = visibleColumns || allColumns;

  // Keyboard shortcuts
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('market-overview', columns, marketData),
  });

  // Bulk actions
  const handleBulkAddToWatchlist = () => {
    selectedRecords.forEach((record) => {
      if (!isWatched(record.symbol)) {
        toggleSymbol(record.symbol);
      }
    });
    notifications.show({
      title: 'موفق',
      message: `${selectedCount} نماد به دیده‌بان اضافه شد`,
      color: 'green',
    });
    clearSelection();
  };

  const handleBulkExport = () => {
    exportToCsv('market-overview-selected', columns, selectedRecords);
    notifications.show({
      title: 'صادرات موفق',
      message: `${selectedCount} ردیف صادر شد`,
      color: 'green',
    });
  };

  const handleBulkCompare = () => {
    const symbols = selectedRecords.map((r) => r.symbol).join(',');
    navigate(`/dashboard/compare?symbols=${symbols}`);
  };

  return (
    <>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'نمای بازار' }]} />
      <PageHeader title="نمای بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="market-overview" onChange={setVisibleColumns} />
        <ExportButton filename="market-overview" columns={columns} records={marketData} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Stack gap="md" p="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو در نماد، نام یا صنعت... (Ctrl+F یا /)"
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
              placeholder="فیلتر صنعت"
              data={sectors.filter(Boolean).map((s) => ({ value: s, label: s }))}
              value={selectedSector}
              onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
              clearable
              searchable
              style={{ flex: 1, minWidth: 160, maxWidth: 240 }}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-primary" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum(marketData.length)}` : `${formatNum(marketData.length)} نماد`}
            </Badge>
          </Group>
          <QuickFilters
            presets={MARKET_QUICK_FILTERS}
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
        onAddToWatchlist={handleBulkAddToWatchlist}
        onExport={handleBulkExport}
        onCompare={handleBulkCompare}
      />

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
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
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
          pinLeftColumns
          storeColumnsKey="market-overview"
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={toggleSelection}
        />
      </RallyMainCard>

      <StockPreviewDrawer symbol={previewSymbol} onClose={() => setPreviewSymbol(null)} />
    </>
  );
}
