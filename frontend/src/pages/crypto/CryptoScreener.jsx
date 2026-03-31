import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, Group, MultiSelect, NumberInput, SimpleGrid,
} from '@mantine/core';
import { IconFilter, IconX } from '@tabler/icons-react';
import PageShell from '../../components/PageShell';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RefreshButton from '../../components/RefreshButton';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import DataFreshness from '../../components/DataFreshness';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import RallyTableSkeleton from '../../components/RallyTableSkeleton';
import CryptoIcon from '../../components/CryptoIcon';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import usePagination from '../../hooks/usePagination';
import { CRYPTO_CATEGORIES, CRYPTO_CATEGORY_LABELS, getCryptoCategory } from '../../constants/crypto';
import { CRYPTO_PRESETS } from '../../constants/cryptoScreener';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

const categoryOptions = Object.keys(CRYPTO_CATEGORIES).map((cat) => ({
  value: cat,
  label: CRYPTO_CATEGORY_LABELS[cat] || cat,
}));

const defaultFilters = {
  categories: [],
  changeMin: '',
  changeMax: '',
  volumeMin: '',
  mcapMin: '',
  mcapMax: '',
};

function formatMcap(v) {
  if (v == null) return '-';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${formatNum(v)}`;
}

export default function CryptoScreener() {
  const [filters, setFilters] = useState(defaultFilters);
  const navigate = useNavigate();

  const { data: rawData = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useCryptoMarket();
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const allData = useMemo(() =>
    rawData.map((c) => ({ ...c, category: getCryptoCategory(c.symbol) })),
    [rawData],
  );

  const filteredData = useMemo(() => {
    return allData.filter((row) => {
      if (filters.categories.length > 0 && !filters.categories.includes(row.category)) return false;
      if (filters.changeMin !== '' && (row.price_change_pct_24h ?? -Infinity) < Number(filters.changeMin)) return false;
      if (filters.changeMax !== '' && (row.price_change_pct_24h ?? Infinity) > Number(filters.changeMax)) return false;
      if (filters.volumeMin !== '' && (row.volume_24h ?? 0) < Number(filters.volumeMin)) return false;
      if (filters.mcapMin !== '' && (row.market_cap_usd ?? 0) < Number(filters.mcapMin)) return false;
      if (filters.mcapMax !== '' && (row.market_cap_usd ?? Infinity) > Number(filters.mcapMax)) return false;
      return true;
    });
  }, [allData, filters]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredData);

  const handleApplyPreset = (preset) => {
    setFilters((prev) => ({ ...prev, ...preset.apply() }));
    setPage(1);
  };
  const handleReset = () => { setFilters(defaultFilters); setPage(1); };
  const setFilter = (key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); };

  const columns = [
    {
      accessor: 'symbol', title: 'نماد', width: 110, noWrap: true,
      render: (r) => (
        <Group gap={6} wrap="nowrap">
          <CryptoIcon symbol={r.symbol} size={20} />
          {r.symbol}
        </Group>
      ),
    },
    { accessor: 'name_fa', title: 'نام', width: 130, ellipsis: true },
    {
      accessor: 'category', title: 'دسته‌بندی', width: 100,
      render: (r) => CRYPTO_CATEGORY_LABELS[r.category] || r.category || '-',
    },
    { accessor: 'last_price', title: 'قیمت ($)', width: 110, textAlign: 'end', noWrap: true, render: (r) => r.last_price != null ? `$${formatNum(r.last_price)}` : '-' },
    { accessor: 'price_change_pct_24h', title: 'تغییر ۲۴h', width: 90, textAlign: 'end', noWrap: true, render: (r) => <PercentChangeCell value={r.price_change_pct_24h} /> },
    { accessor: 'volume_24h', title: 'حجم ۲۴h', width: 120, textAlign: 'end', noWrap: true, render: (r) => formatMcap(r.volume_24h) },
    { accessor: 'market_cap_usd', title: 'ارزش بازار', width: 120, textAlign: 'end', noWrap: true, render: (r) => formatMcap(r.market_cap_usd) },
  ];

  const skeleton = (
    <>
      <PageHeader title="فیلتر رمزارزها" />
      <RallyTableSkeleton rows={8} columns={7} />
    </>
  );

  return (
    <PageShell loading={loading} error={error} hasData={allData.length > 0} skeleton={skeleton} onRetry={refresh}>
      <PageHeader title="فیلتر رمزارزها">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="crypto-screener" columns={columns} records={filteredData} />
        <Badge color="yellow" variant="light">{formatNum(filteredData.length)} نتیجه</Badge>
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      <RallyMainCard title="فیلترها" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          <MultiSelect
            label="دسته‌بندی"
            placeholder="همه دسته‌ها"
            data={categoryOptions}
            value={filters.categories}
            onChange={(v) => setFilter('categories', v)}
            searchable
            clearable
            size="sm"
          />
          <Group gap="xs" grow>
            <NumberInput
              label="حداقل تغییر ٪"
              placeholder="حداقل"
              value={filters.changeMin}
              onChange={(v) => setFilter('changeMin', v)}
              size="sm"
              step={1}
            />
            <NumberInput
              label="حداکثر تغییر ٪"
              placeholder="حداکثر"
              value={filters.changeMax}
              onChange={(v) => setFilter('changeMax', v)}
              size="sm"
              step={1}
            />
          </Group>
          <NumberInput
            label="حداقل حجم ($)"
            placeholder="حداقل حجم"
            value={filters.volumeMin}
            onChange={(v) => setFilter('volumeMin', v)}
            size="sm"
          />
          <Group gap="xs" grow>
            <NumberInput
              label="حداقل ارزش بازار ($)"
              placeholder="حداقل"
              value={filters.mcapMin}
              onChange={(v) => setFilter('mcapMin', v)}
              size="sm"
            />
            <NumberInput
              label="حداکثر ارزش بازار ($)"
              placeholder="حداکثر"
              value={filters.mcapMax}
              onChange={(v) => setFilter('mcapMax', v)}
              size="sm"
            />
          </Group>
        </SimpleGrid>

        <Group gap="xs" wrap="wrap">
          {CRYPTO_PRESETS.map((preset) => (
            <Badge
              key={preset.label}
              size="lg"
              variant="light"
              color="yellow"
              style={{ cursor: 'pointer' }}
              onClick={() => handleApplyPreset(preset)}
            >
              {preset.label}
            </Badge>
          ))}
          <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={handleReset} color="gray">
            بازنشانی
          </Button>
        </Group>
      </RallyMainCard>

      <RallyMainCard title={`نتایج (${formatNum(filteredData.length)})`} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="symbol"
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          onRowClick={({ record }) => navigate(`/crypto/coin/${record.symbol}`)}
          emptyMessage="رمزارزی با فیلترهای شما یافت نشد"
          onRetry={refresh}
        />
      </RallyMainCard>
    </PageShell>
  );
}
