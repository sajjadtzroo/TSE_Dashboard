import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, Group, MultiSelect, NumberInput, SimpleGrid,
} from '@mantine/core';
import { IconFilter, IconX } from '@tabler/icons-react';
import PageShell from '../components/PageShell';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';
import { useMarketOverview, useSectors } from '../hooks/useMarketData';
import usePagination from '../hooks/usePagination';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, toPersianNum, formatTrillion } from '../utils/formatUtils';
import { PRESETS } from '../constants/screener';

const defaultFilters = {
  sectors: [],
  changeMin: '',
  changeMax: '',
  volumeMin: '',
  peMin: '',
  peMax: '',
  epsMin: '',
  epsMax: '',
};

export default function Screener() {
  const [filters, setFilters] = useState(defaultFilters);
  const navigate = useNavigate();

  const { data: rawData = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useMarketOverview();
  const { data: rawSectors = [] } = useSectors();
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const allData = useMemo(() => rawData.filter((item) => !isFundSector(item.sector_name_fa)), [rawData]);
  const sectorList = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const filteredData = useMemo(() => {
    return allData.filter((row) => {
      if (filters.sectors.length > 0 && !filters.sectors.includes(row.sector_name_fa)) return false;
      if (filters.changeMin !== '' && (row.close_change_pct ?? -Infinity) < Number(filters.changeMin)) return false;
      if (filters.changeMax !== '' && (row.close_change_pct ?? Infinity) > Number(filters.changeMax)) return false;
      if (filters.volumeMin !== '' && (row.volume ?? 0) < Number(filters.volumeMin)) return false;
      if (filters.peMin !== '' && (row.pe_ratio == null || row.pe_ratio < Number(filters.peMin))) return false;
      if (filters.peMax !== '' && (row.pe_ratio == null || row.pe_ratio > Number(filters.peMax))) return false;
      if (filters.epsMin !== '' && (row.eps == null || row.eps < Number(filters.epsMin))) return false;
      if (filters.epsMax !== '' && (row.eps == null || row.eps > Number(filters.epsMax))) return false;
      return true;
    });
  }, [allData, filters]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredData);

  const handleApplyPreset = (preset) => {
    const vals = preset.apply();
    setFilters((prev) => ({ ...prev, ...vals }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const columns = [
    { accessor: 'symbol', title: 'نماد', width: 100, noWrap: true },
    { accessor: 'name_fa', title: 'نام', width: 160, ellipsis: true },
    { accessor: 'sector_name_fa', title: 'صنعت', width: 160, ellipsis: true },
    { accessor: 'close', title: 'پایانی', width: 90, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', noWrap: true, render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'معاملات', width: 75, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.trades) },
    { accessor: 'pe_ratio', title: 'P/E', width: 65, textAlign: 'end', noWrap: true, render: (r) => r.pe_ratio != null ? toPersianNum(r.pe_ratio.toFixed(2)) : '-' },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', noWrap: true, render: (r) => formatNum(r.eps) },
    { accessor: 'market_cap', title: 'ارزش بازار', width: 110, textAlign: 'end', noWrap: true, render: (r) => formatTrillion(r.market_cap) },
  ];

  const skeleton = (
    <>
      <PageHeader title="فیلتر نمادها" />
      <RallyTableSkeleton rows={8} columns={10} />
    </>
  );

  return (
    <PageShell loading={loading} error={error} hasData={allData.length > 0} skeleton={skeleton} onRetry={refresh}>
      <PageHeader title="فیلتر نمادها">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="screener" columns={columns} records={filteredData} />
        <Badge color="rally-primary" variant="light">{formatNum(filteredData.length)} نتیجه</Badge>
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      <RallyMainCard title="فیلترها" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          <MultiSelect
            label="صنایع"
            placeholder="همه صنایع"
            data={sectorList.map((s) => ({ value: s, label: s }))}
            value={filters.sectors}
            onChange={(v) => setFilter('sectors', v)}
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
              step={0.5}
            />
            <NumberInput
              label="حداکثر تغییر ٪"
              placeholder="حداکثر"
              value={filters.changeMax}
              onChange={(v) => setFilter('changeMax', v)}
              size="sm"
              step={0.5}
            />
          </Group>
          <NumberInput
            label="حداقل حجم"
            placeholder="حداقل حجم"
            value={filters.volumeMin}
            onChange={(v) => setFilter('volumeMin', v)}
            size="sm"
          />
          <Group gap="xs" grow>
            <NumberInput
              label="حداقل P/E"
              placeholder="حداقل"
              value={filters.peMin}
              onChange={(v) => setFilter('peMin', v)}
              size="sm"
              step={1}
            />
            <NumberInput
              label="حداکثر P/E"
              placeholder="حداکثر"
              value={filters.peMax}
              onChange={(v) => setFilter('peMax', v)}
              size="sm"
              step={1}
            />
          </Group>
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          <Group gap="xs" grow>
            <NumberInput
              label="حداقل EPS"
              placeholder="حداقل"
              value={filters.epsMin}
              onChange={(v) => setFilter('epsMin', v)}
              size="sm"
            />
            <NumberInput
              label="حداکثر EPS"
              placeholder="حداکثر"
              value={filters.epsMax}
              onChange={(v) => setFilter('epsMax', v)}
              size="sm"
            />
          </Group>
        </SimpleGrid>

        <Group gap="xs" wrap="wrap">
          {PRESETS.map((preset) => (
            <Badge
              key={preset.label}
              size="lg"
              variant="light"
              color="rally-primary"
              style={{ cursor: 'pointer' }}
              onClick={() => handleApplyPreset(preset)}
            >
              {preset.label}
            </Badge>
          ))}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconX size={14} />}
            onClick={handleReset}
            color="gray"
          >
            بازنشانی
          </Button>
        </Group>
      </RallyMainCard>

      <RallyMainCard title={`نتایج (${formatNum(filteredData.length)})`} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          onRowClick={({ record }) => navigate(`/dashboard/stock/${record.symbol}`)}
          emptyMessage="نمادی با فیلترهای شما یافت نشد"
          onRetry={refresh}
        />
      </RallyMainCard>
    </PageShell>
  );
}
