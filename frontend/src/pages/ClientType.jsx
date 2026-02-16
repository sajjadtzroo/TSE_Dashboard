import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Group, Select, SimpleGrid, Text, TextInput, ActionIcon, Stack,
} from '@mantine/core';
import {
  IconArrowUpRight, IconArrowDownRight, IconBuildingBank, IconUser, IconSearch, IconX,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyDataTable from '../components/RallyDataTable';
import RallyBarChart from '../components/charts/RallyBarChart';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import DensityToggle from '../components/DensityToggle';
import QuickFilters from '../components/table/QuickFilters';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';
import useApiData from '../hooks/useApiData';
import usePagination from '../hooks/usePagination';
import useTableSearch from '../hooks/useTableSearch';
import useTableKeyboard from '../hooks/useTableKeyboard';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, formatTrillion } from '../utils/formatUtils';
import { exportToCsv } from '../utils/exportData';

export default function ClientType() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'symbol', direction: 'asc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const sectorParam = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
  const { data: rawData, loading, error, lastUpdated, refresh } = useApiData(`/api/client-type${sectorParam}`, { deps: [selectedSector] });
  const { data: rawSectors } = useApiData('/api/sectors');

  const data = useMemo(() => rawData.filter((item) => !isFundSector(item.sector_name_fa)), [rawData]);
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  // Computed KPI values
  const kpis = useMemo(() => {
    let realIn = 0, realOut = 0, legalIn = 0, legalOut = 0;
    data.forEach((row) => {
      realIn += (row.real_buy_volume || 0);
      realOut += (row.real_sell_volume || 0);
      legalIn += (row.legal_buy_volume || 0);
      legalOut += (row.legal_sell_volume || 0);
    });
    return { realIn, realOut, legalIn, legalOut };
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
        // Show stocks where real and legal flows are opposite
        return enriched.filter((item) => {
          const realPositive = item.net_real_flow > 0;
          const legalPositive = item.net_legal_flow > 0;
          return realPositive !== legalPositive && Math.abs(item.net_real_flow) > 100000 && Math.abs(item.net_legal_flow) > 100000;
        });
      default:
        return enriched;
    }
  }, [enriched, activePreset]);

  // Search functionality
  const { searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching } = useTableSearch(
    presetFilteredData,
    ['symbol', 'name_fa', 'sector_name_fa']
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

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 80, sortable: true },
    { accessor: 'name_fa', title: 'نام', width: 130, sortable: true },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 110, sortable: true },
    { accessor: 'real_buy_volume', title: 'حجم خرید حقیقی', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.real_buy_volume || 0) },
    { accessor: 'real_sell_volume', title: 'حجم فروش حقیقی', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.real_sell_volume || 0) },
    {
      accessor: 'net_real_flow',
      title: 'خالص حقیقی',
      width: 100,
      textAlign: 'end',
      sortable: true,
      render: (r) => {
        const v = r.net_real_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        return <Text size="sm" fw={600} c={color}>{formatNum(v)}</Text>;
      },
    },
    { accessor: 'legal_buy_volume', title: 'حجم خرید حقوقی', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.legal_buy_volume || 0) },
    { accessor: 'legal_sell_volume', title: 'حجم فروش حقوقی', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.legal_sell_volume || 0) },
    {
      accessor: 'net_legal_flow',
      title: 'خالص حقوقی',
      width: 100,
      textAlign: 'end',
      sortable: true,
      render: (r) => {
        const v = r.net_legal_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        return <Text size="sm" fw={600} c={color}>{formatNum(v)}</Text>;
      },
    },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 80, textAlign: 'end', sortable: true, render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
  ];

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData);

  // Keyboard shortcuts
  useTableKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: refresh,
    onExport: () => exportToCsv('client-type', columns, enriched),
  });

  if (loading && !data.length) {
    return (
      <>
        <PageHeader title="حقیقی-حقوقی / جریان نقدینگی" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          {[1, 2, 3, 4].map((i) => <RallyKPISkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
          <RallyChartSkeleton height={280} />
          <RallyChartSkeleton height={280} />
        </SimpleGrid>
        <RallyTableSkeleton rows={8} columns={10} />
      </>
    );
  }

  if (error && !data.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  return (
    <>
      <PageHeader title="حقیقی-حقوقی / جریان نقدینگی">
        <DataFreshness lastUpdated={lastUpdated} />
        <DensityToggle />
        <ExportButton filename="client_type" columns={columns} records={enriched} />
        <Badge color="rally-green" variant="light">{formatNum(data.length)} نماد</Badge>
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
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
          title="ورود پول حقوقی"
          value={formatTrillion(kpis.legalIn)}
          icon={IconBuildingBank}
          color={rallyColors.purple}
          bgColor="#6D28D9"
        />
        <RallyKPICard
          title="خروج پول حقوقی"
          value={formatTrillion(kpis.legalOut)}
          icon={IconUser}
          color={rallyColors.blue}
          bgColor="#1D4ED8"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
        <RallyMainCard title="۱۰ نماد برتر خرید حقیقی (م سهم)">
          {topRealBuyers.length > 0 ? (
            <RallyBarChart
              data={topRealBuyers}
              autoColorByValue
              height={280}
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}M`}
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
              height={280}
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}M`}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">بدون داده</Text>
          )}
        </RallyMainCard>
      </SimpleGrid>

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
            <Badge color="rally-green" variant="light">
              {isSearching || activePreset ? `${formatNum(resultCount)} از ${formatNum(enriched.length)}` : `${formatNum(enriched.length)} نماد`}
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

      <RallyMainCard title={`داده حقیقی-حقوقی (${formatNum(enriched.length)})`} noPadding>
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
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage={isSearching ? 'نتیجه‌ای یافت نشد' : 'داده‌ای موجود نیست'}
          onRetry={refresh}
          storeColumnsKey="client-type"
        />
      </RallyMainCard>
    </>
  );
}
