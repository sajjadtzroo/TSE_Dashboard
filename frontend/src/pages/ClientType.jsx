import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor, Badge, Group, Select, SimpleGrid, Text, TextInput, ActionIcon, Stack,
} from '@mantine/core';
import {
  IconArrowUpRight, IconArrowDownRight, IconArrowsLeftRight,
  IconBuildingBank, IconSearch, IconX,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyDataTable from '../components/RallyDataTable';
import RallyBarChart from '../components/charts/RallyBarChart';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import PageShell from '../components/PageShell';
import ExportButton from '../components/ExportButton';
import DensityToggle from '../components/DensityToggle';
import ColumnToggle from '../components/ColumnToggle';
import QuickFilters from '../components/table/QuickFilters';
import BulkActionsToolbar from '../components/table/BulkActionsToolbar';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import { useClientType, useSectors } from '../hooks/useMarketData';
import useTablePage from '../hooks/useTablePage';
import useTableKeyboard from '../hooks/useTableKeyboard';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, formatTrillion } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';
import { notifications } from '@mantine/notifications';

export default function ClientType() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const { data: rawData = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useClientType({ sector: selectedSector || undefined });
  const { data: rawSectors = [] } = useSectors();
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const data = useMemo(() => rawData.filter((item) => !isFundSector(item.sector_name_fa)), [rawData]);
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  // Computed KPI values (including net flows)
  const kpis = useMemo(() => {
    let realIn = 0, realOut = 0, legalIn = 0, legalOut = 0;
    data.forEach((row) => {
      realIn += (row.real_buy_volume || 0);
      realOut += (row.real_sell_volume || 0);
      legalIn += (row.legal_buy_volume || 0);
      legalOut += (row.legal_sell_volume || 0);
    });
    return { realIn, realOut, legalIn, legalOut, netReal: realIn - realOut, netLegal: legalIn - legalOut };
  }, [data]);

  // Computed flows per stock
  const enriched = useMemo(() => {
    return data.map((row) => ({
      ...row,
      net_real_flow: (row.real_buy_volume || 0) - (row.real_sell_volume || 0),
      net_legal_flow: (row.legal_buy_volume || 0) - (row.legal_sell_volume || 0),
    }));
  }, [data]);

  // Quick filter presets
  const quickFilterPresets = [
    { key: 'strong-real-buy', label: 'خرید قوی حقیقی', icon: 'trending-up' },
    { key: 'strong-legal-buy', label: 'خرید قوی حقوقی', icon: 'trending-up' },
    { key: 'divergence', label: 'واگرایی', icon: 'arrows-up-down' },
  ];

  // Apply preset filters
  const presetFilteredData = useMemo(() => {
    if (!activePreset || !enriched) return enriched;

    switch (activePreset) {
      case 'strong-real-buy':
        return [...enriched]
          .filter((item) => item.net_real_flow > 0)
          .sort((a, b) => b.net_real_flow - a.net_real_flow)
          .slice(0, 50);
      case 'strong-legal-buy':
        return [...enriched]
          .filter((item) => item.net_legal_flow > 0)
          .sort((a, b) => b.net_legal_flow - a.net_legal_flow)
          .slice(0, 50);
      case 'divergence':
        return enriched.filter((item) => {
          const realPositive = item.net_real_flow > 0;
          const legalPositive = item.net_legal_flow > 0;
          return realPositive !== legalPositive && Math.abs(item.net_real_flow) > 100000 && Math.abs(item.net_legal_flow) > 100000;
        });
      default:
        return enriched;
    }
  }, [enriched, activePreset]);

  // Track whether current preset is sliced to top-50
  const isPresetSliced = activePreset === 'strong-real-buy' || activePreset === 'strong-legal-buy';

  // Search → Sort → Paginate → Selection
  const {
    searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching,
    sortStatus, setSortStatus,
    paged, page, setPage, perPage, setPerPage, totalRecords,
    selectedRecords, toggleSelection, clearSelection, selectedCount,
  } = useTablePage(presetFilteredData, {
    searchFields: ['symbol', 'name_fa', 'sector_name_fa'],
    defaultSort: { columnAccessor: 'symbol', direction: 'asc' },
    idAccessor: 'ins_code',
  });

  const anyFilterActive = !!(searchQuery || selectedSector || activePreset);

  const clearAllFilters = () => {
    clearSearch();
    setSelectedSector(null);
    setActivePreset(null);
    setPage(1);
  };

  // Top 10 charts
  const topRealBuyers = useMemo(() => {
    return [...enriched]
      .sort((a, b) => b.net_real_flow - a.net_real_flow)
      .slice(0, 10)
      .map((d) => ({ x: d.symbol, y: Number((d.net_real_flow / 1e6).toFixed(1)) }));
  }, [enriched]);

  const topLegalBuyers = useMemo(() => {
    return [...enriched]
      .sort((a, b) => b.net_legal_flow - a.net_legal_flow)
      .slice(0, 10)
      .map((d) => ({ x: d.symbol, y: Number((d.net_legal_flow / 1e6).toFixed(1)) }));
  }, [enriched]);

  const baseColumns = [
    { accessor: 'symbol', title: 'نماد', width: 80, sortable: true },
    { accessor: 'name_fa', title: 'نام', width: 130, sortable: true },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 110, sortable: true },
    { accessor: 'real_buy_volume', title: 'حجم خرید حقیقی', width: 115, textAlign: 'end', sortable: true, render: (r) => formatNum(r.real_buy_volume || 0) },
    { accessor: 'real_sell_volume', title: 'حجم فروش حقیقی', width: 115, textAlign: 'end', sortable: true, render: (r) => formatNum(r.real_sell_volume || 0) },
    {
      accessor: 'net_real_flow',
      title: 'خالص حقیقی',
      width: 110,
      textAlign: 'end',
      sortable: true,
      render: (r) => {
        const v = r.net_real_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        const sign = v > 0 ? '+' : '';
        return <Text size="sm" fw={600} c={color}>{sign}{formatNum(v)}</Text>;
      },
    },
    { accessor: 'legal_buy_volume', title: 'حجم خرید حقوقی', width: 115, textAlign: 'end', sortable: true, render: (r) => formatNum(r.legal_buy_volume || 0) },
    { accessor: 'legal_sell_volume', title: 'حجم فروش حقوقی', width: 115, textAlign: 'end', sortable: true, render: (r) => formatNum(r.legal_sell_volume || 0) },
    {
      accessor: 'net_legal_flow',
      title: 'خالص حقوقی',
      width: 110,
      textAlign: 'end',
      sortable: true,
      render: (r) => {
        const v = r.net_legal_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        const sign = v > 0 ? '+' : '';
        return <Text size="sm" fw={600} c={color}>{sign}{formatNum(v)}</Text>;
      },
    },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 80, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
  ];

  const columns = visibleColumns || baseColumns;

  // Keyboard shortcuts
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('client-type', baseColumns, filteredData),
  });

  // Bulk actions
  const handleBulkExport = () => {
    exportToCsv('client-type-selected', baseColumns, selectedRecords);
    notifications.show({
      title: 'صادرات موفق',
      message: `${selectedCount} ردیف صادر شد`,
      color: 'green',
    });
  };

  const skeleton = (
    <>
      <PageHeader title="حقیقی-حقوقی / جریان نقدینگی" />
      <SimpleGrid cols={{ base: 2, sm: 2, lg: 6 }} mb="md">
        {[1, 2, 3, 4, 5, 6].map((i) => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
        <RallyChartSkeleton height={320} />
        <RallyChartSkeleton height={320} />
      </SimpleGrid>
      <RallyTableSkeleton rows={8} columns={10} />
    </>
  );

  return (
    <PageShell loading={loading} error={error} hasData={data.length > 0} skeleton={skeleton} onRetry={refresh}>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'حقیقی-حقوقی' }]} />
      <PageHeader title="حقیقی-حقوقی / جریان نقدینگی">
        <DataFreshness lastUpdated={lastUpdated} />
        <Badge color="rally-green" variant="light">{formatNum(data.length)} نماد</Badge>
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      {/* 6 KPI cards: inflow, outflow, net for both real and legal */}
      <SimpleGrid cols={{ base: 2, sm: 2, lg: 6 }} mb="md">
        <RallyKPICard
          title="ورود پول حقیقی"
          value={formatTrillion(kpis.realIn)}
          icon={IconArrowUpRight}
          color={rallyColors.green}
          bgColor="#047857"
        />
        <RallyKPICard
          title="خروج پول حقیقی"
          value={formatTrillion(kpis.realOut)}
          icon={IconArrowDownRight}
          color={rallyColors.red}
          bgColor="#DC2626"
        />
        <RallyKPICard
          title="خالص حقیقی"
          value={formatTrillion(Math.abs(kpis.netReal))}
          icon={IconArrowsLeftRight}
          color={kpis.netReal >= 0 ? rallyColors.green : rallyColors.red}
          bgColor={kpis.netReal >= 0 ? '#047857' : '#B91C1C'}
        />
        <RallyKPICard
          title="ورود پول حقوقی"
          value={formatTrillion(kpis.legalIn)}
          icon={IconBuildingBank}
          color={rallyColors.purple}
          bgColor="#6D28D9"
        />
        <RallyKPICard
          title="خروج پول حقوقی"
          value={formatTrillion(kpis.legalOut)}
          icon={IconArrowDownRight}
          color={rallyColors.red}
          bgColor="#B91C1C"
        />
        <RallyKPICard
          title="خالص حقوقی"
          value={formatTrillion(Math.abs(kpis.netLegal))}
          icon={IconArrowsLeftRight}
          color={kpis.netLegal >= 0 ? rallyColors.green : rallyColors.red}
          bgColor={kpis.netLegal >= 0 ? '#047857' : '#B91C1C'}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
        <RallyMainCard title="۱۰ نماد برتر خرید حقیقی (م سهم)">
          {topRealBuyers.length > 0 ? (
            <RallyBarChart
              data={topRealBuyers}
              autoColorByValue
              height={320}
              aria-label="نمودار میله‌ای ۱۰ نماد برتر خرید حقیقی"
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y} م`}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">بدون داده</Text>
          )}
        </RallyMainCard>
        <RallyMainCard title="۱۰ نماد برتر خرید حقوقی (م سهم)">
          {topLegalBuyers.length > 0 ? (
            <RallyBarChart
              data={topLegalBuyers}
              autoColorByValue
              height={320}
              aria-label="نمودار میله‌ای ۱۰ نماد برتر خرید حقوقی"
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y} م`}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">بدون داده</Text>
          )}
        </RallyMainCard>
      </SimpleGrid>

      <BulkActionsToolbar
        selectedCount={selectedCount}
        onClear={clearSelection}
        onExport={handleBulkExport}
      />

      {/* Merged filter + table card — DensityToggle/Export/ColumnToggle in card header */}
      <RallyMainCard
        title="داده حقیقی-حقوقی"
        secondary={
          <Group gap="xs">
            <DensityToggle />
            <ExportButton filename="client_type" columns={baseColumns} records={filteredData} />
            <ColumnToggle columns={baseColumns} storageKey="client-type" onChange={setVisibleColumns} />
          </Group>
        }
        noPadding
      >
        <Stack gap="md" p="md" pb={0}>
          <Group gap="md" wrap="wrap">
            <TextInput
              ref={searchInputRef}
              label="جستجو در نماد، نام یا صنعت"
              labelProps={{ style: { display: 'none' } }}
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
              data={[{ value: '', label: 'همه صنایع' }, ...sectors.filter(Boolean).map((s) => ({ value: s, label: s }))]}
              value={selectedSector || ''}
              onChange={(v) => { setSelectedSector(v || null); setActivePreset(null); setPage(1); }}
              clearable
              searchable
              style={{ flex: 1, minWidth: 160, maxWidth: 240 }}
              size="sm"
            />
            <Badge color="rally-green" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum(enriched.length)}` : `${formatNum(enriched.length)} نماد`}
            </Badge>
            {anyFilterActive && (
              <Anchor size="xs" c="dimmed" onClick={clearAllFilters} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                حذف فیلترها
              </Anchor>
            )}
          </Group>
          <Group justify="space-between" wrap="wrap">
            <QuickFilters
              presets={quickFilterPresets}
              activePreset={activePreset}
              onPresetClick={(key) => {
                setActivePreset(key);
                setPage(1);
              }}
            />
            {isPresetSliced && (
              <Text size="xs" c="dimmed">نمایش ۵۰ نماد برتر</Text>
            )}
          </Group>
        </Stack>
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
          storeColumnsKey="client-type"
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={toggleSelection}
        />
      </RallyMainCard>
    </PageShell>
  );
}
