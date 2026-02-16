import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Button, Group, MultiSelect, NumberInput, SimpleGrid,
} from '@mantine/core';
import { IconFilter, IconX } from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

const PRESETS = [
  {
    label: 'High Volume',
    apply: () => ({ volumeMin: 10000000 }),
  },
  {
    label: 'Positive Change',
    apply: () => ({ changeMin: 0.01 }),
  },
  {
    label: 'Low P/E',
    apply: () => ({ peMax: 10 }),
  },
  {
    label: 'High EPS',
    apply: () => ({ epsMin: 500 }),
  },
];

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
  const [allData, setAllData] = useState([]);
  const [sectorList, setSectorList] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const isFundSector = (s) => s && (s.includes('\u0635\u0646\u062f\u0648\u0642') || s.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc'));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [marketRes, sectorsRes] = await Promise.all([
        axios.get('/api/market-overview'),
        axios.get('/api/sectors'),
      ]);
      setAllData(marketRes.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setSectorList(sectorsRes.data.filter((s) => !isFundSector(s)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    { accessor: 'symbol', title: 'Symbol', width: 80 },
    { accessor: 'name_fa', title: 'Name', width: 150 },
    { accessor: 'sector_name_fa', title: 'Sector', width: 120 },
    { accessor: 'close', title: 'Close', width: 90, textAlign: 'end', render: (r) => r.close?.toLocaleString() },
    { accessor: 'close_change_pct', title: 'Change %', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'Volume', width: 110, textAlign: 'end', render: (r) => r.volume?.toLocaleString() },
    { accessor: 'trades', title: 'Trades', width: 75, textAlign: 'end', render: (r) => r.trades?.toLocaleString() },
    { accessor: 'pe_ratio', title: 'P/E', width: 65, textAlign: 'end', render: (r) => r.pe_ratio?.toFixed(2) || '-' },
    { accessor: 'eps', title: 'EPS', width: 80, textAlign: 'end', render: (r) => r.eps?.toLocaleString() || '-' },
    { accessor: 'market_cap', title: 'Market Cap', width: 100, textAlign: 'end', render: (r) => r.market_cap ? (r.market_cap / 1e9).toFixed(2) + 'B' : '-' },
  ];

  const paged = filteredData.slice((page - 1) * perPage, page * perPage);

  if (loading && !allData.length) {
    return (
      <>
        <PageHeader title="Stock Screener" />
        <RallyTableSkeleton rows={8} columns={10} />
      </>
    );
  }

  if (error && !allData.length) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  return (
    <>
      <PageHeader title="Stock Screener">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="screener" columns={columns} records={filteredData} />
        <Badge color="rally-green" variant="light">{filteredData.length} results</Badge>
        <RefreshButton onRefreshComplete={fetchData} />
      </PageHeader>

      <RallyMainCard title="Filters" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          <MultiSelect
            label="Sectors"
            placeholder="All sectors"
            data={sectorList.map((s) => ({ value: s, label: s }))}
            value={filters.sectors}
            onChange={(v) => setFilter('sectors', v)}
            searchable
            clearable
            size="sm"
          />
          <Group gap="xs" grow>
            <NumberInput
              label="Change % Min"
              placeholder="Min"
              value={filters.changeMin}
              onChange={(v) => setFilter('changeMin', v)}
              size="sm"
              step={0.5}
            />
            <NumberInput
              label="Change % Max"
              placeholder="Max"
              value={filters.changeMax}
              onChange={(v) => setFilter('changeMax', v)}
              size="sm"
              step={0.5}
            />
          </Group>
          <NumberInput
            label="Volume Min"
            placeholder="Min volume"
            value={filters.volumeMin}
            onChange={(v) => setFilter('volumeMin', v)}
            size="sm"
          />
          <Group gap="xs" grow>
            <NumberInput
              label="P/E Min"
              placeholder="Min"
              value={filters.peMin}
              onChange={(v) => setFilter('peMin', v)}
              size="sm"
              step={1}
            />
            <NumberInput
              label="P/E Max"
              placeholder="Max"
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
              label="EPS Min"
              placeholder="Min"
              value={filters.epsMin}
              onChange={(v) => setFilter('epsMin', v)}
              size="sm"
            />
            <NumberInput
              label="EPS Max"
              placeholder="Max"
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
              color="rally-green"
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
            Reset
          </Button>
        </Group>
      </RallyMainCard>

      <RallyMainCard title={`Results (${filteredData.length})`} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={filteredData.length}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="No stocks match your filters"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
