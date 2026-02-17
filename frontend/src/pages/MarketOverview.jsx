import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Group, Select, TextInput, ActionIcon, Stack } from '@mantine/core';
import { IconStar, IconStarFilled, IconSearch, IconX } from '@tabler/icons-react';
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
import { toJalali } from '../utils/dateUtils';
import useWatchlist from '../hooks/useWatchlist';
import rallyColors from '../theme/rallyColors';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import useRowSelection from '../hooks/useRowSelection';
import useColumnFilters from '../hooks/useColumnFilters';
import ColumnFilter from '../components/table/ColumnFilter';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import { notifications } from '@mantine/notifications';

export default function MarketOverview() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'symbol', direction: 'asc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

  const { data: rawSectors } = useApiData('/api/sectors');
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const sectorParam = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
  const { data: rawMarket, loading, error, lastUpdated, refresh } = useApiData(`/api/market-overview${sectorParam}`, { deps: [selectedSector] });
  const marketData = useMemo(() => rawMarket.filter((item) => !isFundSector(item.sector_name_fa)), [rawMarket]);

  // Quick filter presets
  const quickFilterPresets = [
    { key: 'top-gainers', label: 'بیشترین رشد', icon: 'trending-up' },
    { key: 'top-losers', label: 'بیشترین افت', icon: 'trending-down' },
    { key: 'high-volume', label: 'حجم بالا', icon: 'volume' },
    { key: 'most-trades', label: 'معاملات بالا', icon: 'flame' },
  ];

  // Apply preset filters
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !marketData) return marketData;

    switch (activePreset) {
      case 'top-gainers':
        return [...marketData]
          .filter((item) => item.close_change_pct > 0)
          .sort((a, b) => b.close_change_pct - a.close_change_pct)
          .slice(0, 50);
      case 'top-losers':
        return [...marketData]
          .filter((item) => item.close_change_pct < 0)
          .sort((a, b) => a.close_change_pct - b.close_change_pct)
          .slice(0, 50);
      case 'high-volume':
        return [...marketData]
          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
          .slice(0, 50);
      case 'most-trades':
        return [...marketData]
          .sort((a, b) => (b.trades || 0) - (a.trades || 0))
          .slice(0, 50);
      default:
        return marketData;
    }
  }, [marketData, activePreset]);

  // Column filters
  const {
    filters: columnFilters,
    addFilter,
    removeFilter,
    clearFilters: clearColumnFilters,
    filteredData: columnFilteredData,
    activeFilterCount,
  } = useColumnFilters(presetFilteredData);

  // Search functionality
  const { searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching } = useTableSearch(
    columnFilteredData,
    ['symbol', 'name_fa', 'sector_name_fa']
  );

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortStatus?.columnAccessor || !filteredData) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortStatus.columnAccessor];
      const bVal = b[sortStatus.columnAccessor];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'fa');
      return sortStatus.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredData, sortStatus]);

  if (error && !marketData.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const allColumns = [
    {
      accessor: '_star', title: '', width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    { accessor: 'symbol', title: 'نماد', width: 80, sortable: true },
    { accessor: 'name_fa', title: 'نام', width: 150, sortable: true },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 120, sortable: true },
    { accessor: 'date', title: 'تاریخ', width: 90, sortable: true, render: (r) => toJalali(r.date) },
    { accessor: 'close', title: 'قیمت پایانی', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'low', title: 'کمترین', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.low) },
    { accessor: 'high', title: 'بیشترین', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.high) },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', sortable: true, render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'تعداد معاملات', width: 75, textAlign: 'end', sortable: true, render: (r) => formatNum(r.trades) },
    { accessor: 'pe_ratio', title: 'P/E', width: 65, textAlign: 'end', sortable: true, render: (r) => r.pe_ratio?.toFixed(2) || '-' },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.eps) },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 100, textAlign: 'end', sortable: true, render: (r) => r.market_cap ? (r.market_cap / 1e9).toFixed(2) + 'B' : '-' },
  ];

  const columns = visibleColumns || allColumns;
  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData);

  // Row selection
  const {
    selectedRecords,
    toggleSelection,
    clearSelection,
    selectedCount,
  } = useRowSelection('ins_code');

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
      <PageHeader title="نمای بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="market-overview" onChange={setVisibleColumns} />
        <ExportButton filename="market-overview" columns={columns} records={marketData} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Stack gap="md" p="md">
          <Group gap="md">
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو در نماد، نام یا صنعت... (Ctrl+F یا /)"
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
              w={320}
              size="sm"
            />
            <Select
              placeholder="فیلتر صنعت"
              data={[{ value: '', label: 'همه صنایع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              value={selectedSector || ''}
              onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
              clearable
              searchable
              w={220}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refresh} />
            <Badge color="rally-green" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum(marketData.length)}` : `${formatNum(marketData.length)} نماد`}
            </Badge>
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
    </>
  );
}
