import { useState, useMemo, useRef } from 'react';
import {
  Badge,
  Group,
  Select,
  Text,
  TextInput,
  ActionIcon,
  Stack,
  SegmentedControl,
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RefreshButton from '../../components/RefreshButton';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import ColumnToggle from '../../components/ColumnToggle';
import DensityToggle from '../../components/DensityToggle';
import QuickFilters from '../../components/table/QuickFilters';
import useDeribitOptionsChain from '../../hooks/useDeribitOptionsChain';
import usePagination from '../../hooks/usePagination';
import useTableSearch from '../../hooks/useTableSearch';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';
import { exportToCsv } from '../../utils/exportData';

function ExpiryCell({ value, daysToExpiry }) {
  if (!value) return <Text size="sm">-</Text>;
  const days = daysToExpiry ?? 0;
  let color = rallyColors.green;
  let bgColor = 'rgba(34,197,94,0.08)';
  if (days < 7) { color = rallyColors.red; bgColor = 'rgba(239,68,68,0.12)'; }
  else if (days < 30) { color = rallyColors.yellow; bgColor = 'rgba(245,158,11,0.10)'; }
  return (
    <Text
      size="sm"
      fw={500}
      c={color}
      style={{ backgroundColor: bgColor, borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}
    >
      {value}
      <Text span size="xs" c="dimmed" ml={4}>({Math.round(days)}ر)</Text>
    </Text>
  );
}

function IVCell({ value }) {
  if (value == null) return <span style={{ color: 'rgba(156,163,175,0.3)' }}>-</span>;
  let color = rallyColors.green;
  if (value > 100) color = rallyColors.red;
  else if (value > 60) color = rallyColors.yellow;
  return <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</span>;
}

function MoneynessCell({ value }) {
  if (!value) return <span style={{ color: 'rgba(156,163,175,0.3)' }}>-</span>;
  const colors = { ITM: 'green', ATM: 'yellow', OTM: 'red' };
  return <Badge size="xs" variant="light" color={colors[value] || 'gray'}>{value}</Badge>;
}

export default function CryptoOptions() {
  const {
    currency, setCurrency,
    selectedExpiry, setSelectedExpiry,
    options: allOptions,
    expiries,
    callCount, putCount,
    underlyingPrice,
    loading,
    refetch,
  } = useDeribitOptionsChain();

  const [optionType, setOptionType] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'strike_price', direction: 'asc' });
  const [activePreset, setActivePreset] = useState(null);
  const searchInputRef = useRef(null);

  // Filter by option type
  const typeFiltered = useMemo(() => {
    if (!optionType) return allOptions;
    return allOptions.filter((o) => o.option_type === optionType);
  }, [allOptions, optionType]);

  // Quick filter presets
  const quickFilterPresets = [
    { key: 'expiring-soon', label: 'سررسید نزدیک (<۷ روز)', icon: 'clock' },
    { key: 'high-oi', label: 'بهره باز بالا', icon: 'volume' },
    { key: 'itm', label: 'In-the-Money', icon: 'target' },
    { key: 'otm', label: 'Out-of-Money', icon: 'arrows-up-down' },
  ];

  const presetFiltered = useMemo(() => {
    if (!activePreset) return typeFiltered;
    switch (activePreset) {
      case 'expiring-soon':
        return typeFiltered.filter((o) => o.daysToExpiry > 0 && o.daysToExpiry < 7);
      case 'high-oi':
        return [...typeFiltered].sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 50);
      case 'itm':
        return typeFiltered.filter((o) => o.moneyness === 'ITM');
      case 'otm':
        return typeFiltered.filter((o) => o.moneyness === 'OTM');
      default:
        return typeFiltered;
    }
  }, [typeFiltered, activePreset]);

  const { searchQuery, setSearchQuery, filteredData, clearSearch, resultCount, isSearching } =
    useTableSearch(presetFiltered, ['instrument_name', 'option_type']);

  const sortedData = useMemo(() => {
    if (!sortStatus?.columnAccessor || !filteredData) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortStatus.columnAccessor];
      const bVal = b[sortStatus.columnAccessor];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number') return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      return sortStatus.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortStatus]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(sortedData);

  const allColumns = [
    { accessor: 'instrument_name', title: 'نماد', width: 200, sortable: true },
    {
      accessor: 'option_type', title: 'نوع', width: 65, sortable: true,
      render: (r) => (
        <Badge size="sm" variant="light" color={r.option_type === 'call' ? 'rally-primary' : 'rally-red'}>
          {r.option_type === 'call' ? 'Call' : 'Put'}
        </Badge>
      ),
    },
    { accessor: 'strike_price', title: 'اعمال', width: 100, textAlign: 'end', sortable: true, render: (r) => formatNum(r.strike_price) },
    { accessor: 'expiry_date', title: 'سررسید', width: 130, sortable: true, render: (r) => <ExpiryCell value={r.expiry_date} daysToExpiry={r.daysToExpiry} /> },
    { accessor: 'mark_price', title: 'مارک', width: 90, textAlign: 'end', sortable: true, render: (r) => r.mark_price != null ? r.mark_price.toFixed(4) : '-' },
    { accessor: 'bid_price', title: 'خرید', width: 80, textAlign: 'end', sortable: true, render: (r) => r.bid_price != null ? r.bid_price.toFixed(4) : '-' },
    { accessor: 'ask_price', title: 'فروش', width: 80, textAlign: 'end', sortable: true, render: (r) => r.ask_price != null ? r.ask_price.toFixed(4) : '-' },
    { accessor: 'iv', title: 'IV%', width: 70, textAlign: 'end', sortable: true, render: (r) => <IVCell value={r.iv} /> },
    { accessor: 'delta', title: 'دلتا', width: 65, textAlign: 'end', sortable: true, render: (r) => r.delta != null ? r.delta.toFixed(4) : '-' },
    { accessor: 'gamma', title: 'گاما', width: 65, textAlign: 'end', sortable: true, render: (r) => r.gamma != null ? r.gamma.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'theta', title: 'تتا', width: 65, textAlign: 'end', sortable: true, render: (r) => r.theta != null ? r.theta.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'vega', title: 'وگا', width: 65, textAlign: 'end', sortable: true, render: (r) => r.vega != null ? r.vega.toFixed(4) : '-', defaultHidden: true },
    { accessor: 'open_interest', title: 'بهره باز', width: 90, textAlign: 'end', sortable: true, render: (r) => formatNum(r.open_interest) },
    { accessor: 'volume', title: 'حجم', width: 80, textAlign: 'end', sortable: true, render: (r) => formatNum(r.volume) },
    { accessor: 'moneyness', title: 'وضعیت', width: 65, sortable: true, render: (r) => <MoneynessCell value={r.moneyness} />, defaultHidden: true },
    { accessor: 'bs_price', title: 'BS قیمت', width: 90, textAlign: 'end', sortable: true, render: (r) => r.bs_price != null ? r.bs_price.toFixed(4) : '-', defaultHidden: true },
  ];

  const columns = visibleColumns || allColumns;

  return (
    <>
      <PageHeader title={`اختیار معامله ${currency} — Deribit`}>
        <DensityToggle />
        <ColumnToggle columns={allColumns} storageKey="crypto-options" onChange={setVisibleColumns} />
        <ExportButton filename="crypto-options" columns={columns} records={allOptions} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Stack gap="md" p="md">
          <Group gap="md" wrap="wrap">
            <SegmentedControl
              value={currency}
              onChange={(v) => { setCurrency(v); setSelectedExpiry(null); setPage(1); }}
              data={[{ value: 'BTC', label: 'BTC' }, { value: 'ETH', label: 'ETH' }]}
              size="sm"
            />
            <TextInput
              ref={searchInputRef}
              placeholder="جستجو در نماد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={searchQuery && (
                <ActionIcon size="sm" variant="subtle" onClick={clearSearch}><IconX size={14} /></ActionIcon>
              )}
              style={{ flex: 1, minWidth: 200 }}
              size="sm"
            />
            <Select
              placeholder="نوع اختیار"
              data={[{ value: '', label: 'همه' }, { value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }]}
              value={optionType || ''}
              onChange={(v) => { setOptionType(v || null); setPage(1); }}
              clearable
              style={{ minWidth: 120, maxWidth: 160 }}
              size="sm"
            />
            <Select
              placeholder="سررسید"
              data={[{ value: '', label: 'همه' }, ...expiries.map((e) => ({ value: e, label: e }))]}
              value={selectedExpiry || ''}
              onChange={(v) => { setSelectedExpiry(v || null); setPage(1); }}
              clearable
              style={{ minWidth: 120, maxWidth: 160 }}
              size="sm"
            />
            <RefreshButton onRefreshComplete={refetch} />
            {underlyingPrice != null && (
              <Badge color="rally-blue" variant="light">
                {currency}: ${formatNum(underlyingPrice?.toFixed(2))}
              </Badge>
            )}
            <Badge color="rally-primary" variant="light">
              {isSearching || activePreset ? `${resultCount} از ${allOptions.length}` : `${allOptions.length} اختیار`}
            </Badge>
            <Badge color="rally-primary" variant="light">{callCount} Call</Badge>
            <Badge color="rally-red" variant="light">{putCount} Put</Badge>
          </Group>
          <QuickFilters
            presets={quickFilterPresets}
            activePreset={activePreset}
            onPresetClick={(key) => { setActivePreset(activePreset === key ? null : key); setPage(1); }}
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
          onRetry={refetch}
          storeColumnsKey="crypto-options"
        />
      </RallyMainCard>
    </>
  );
}
