import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Group, Select, SimpleGrid, Text,
} from '@mantine/core';
import {
  IconArrowUpRight, IconArrowDownRight, IconBuildingBank, IconUser,
} from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyDataTable from '../components/RallyDataTable';
import RallyBarChart from '../components/charts/RallyBarChart';
import RefreshButton from '../components/RefreshButton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import rallyColors from '../theme/rallyColors';

export default function ClientType() {
  const [data, setData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const navigate = useNavigate();

  const isFundSector = (s) => s && (s.includes('\u0635\u0646\u062f\u0648\u0642') || s.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc'));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
      const [ctRes, sectorsRes] = await Promise.all([
        axios.get(`/api/client-type${params}`),
        axios.get('/api/sectors'),
      ]);
      setData(ctRes.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setSectors(sectorsRes.data.filter((s) => !isFundSector(s)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [selectedSector]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const formatTrillion = (v) => {
    const t = v / 1e12;
    if (Math.abs(t) >= 1) return t.toFixed(2) + 'T';
    const b = v / 1e9;
    if (Math.abs(b) >= 1) return b.toFixed(1) + 'B';
    const m = v / 1e6;
    return m.toFixed(0) + 'M';
  };

  const columns = [
    { accessor: 'symbol', title: 'Symbol', width: 80 },
    { accessor: 'name_fa', title: 'Name', width: 130 },
    { accessor: 'sector_name_fa', title: 'Sector', width: 110 },
    { accessor: 'real_buy_volume', title: 'Real Buy Vol', width: 100, textAlign: 'end', render: (r) => (r.real_buy_volume || 0).toLocaleString() },
    { accessor: 'real_sell_volume', title: 'Real Sell Vol', width: 100, textAlign: 'end', render: (r) => (r.real_sell_volume || 0).toLocaleString() },
    {
      accessor: 'net_real_flow',
      title: 'Net Real',
      width: 100,
      textAlign: 'end',
      render: (r) => {
        const v = r.net_real_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        return <Text size="sm" fw={600} c={color}>{v?.toLocaleString()}</Text>;
      },
    },
    { accessor: 'legal_buy_volume', title: 'Legal Buy Vol', width: 100, textAlign: 'end', render: (r) => (r.legal_buy_volume || 0).toLocaleString() },
    { accessor: 'legal_sell_volume', title: 'Legal Sell Vol', width: 100, textAlign: 'end', render: (r) => (r.legal_sell_volume || 0).toLocaleString() },
    {
      accessor: 'net_legal_flow',
      title: 'Net Legal',
      width: 100,
      textAlign: 'end',
      render: (r) => {
        const v = r.net_legal_flow;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.orange : undefined;
        return <Text size="sm" fw={600} c={color}>{v?.toLocaleString()}</Text>;
      },
    },
    { accessor: 'close_change_pct', title: 'Change %', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
  ];

  const paged = enriched.slice((page - 1) * perPage, page * perPage);

  if (loading && !data.length) {
    return (
      <>
        <PageHeader title="Client Type / Money Flow" />
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
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  return (
    <>
      <PageHeader title="Client Type / Money Flow">
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="client_type" columns={columns} records={enriched} />
        <Badge color="rally-green" variant="light">{data.length} stocks</Badge>
        <RefreshButton onRefreshComplete={fetchData} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
        <RallyKPICard
          title="Real Money In"
          value={formatTrillion(kpis.realIn)}
          icon={IconArrowUpRight}
          color={rallyColors.green}
          bgColor="#4d8a7a"
        />
        <RallyKPICard
          title="Real Money Out"
          value={formatTrillion(kpis.realOut)}
          icon={IconArrowDownRight}
          color={rallyColors.orange}
          bgColor="#BF4030"
        />
        <RallyKPICard
          title="Legal Money In"
          value={formatTrillion(kpis.legalIn)}
          icon={IconBuildingBank}
          color={rallyColors.purple}
          bgColor="#7B2FBF"
        />
        <RallyKPICard
          title="Legal Money Out"
          value={formatTrillion(kpis.legalOut)}
          icon={IconUser}
          color={rallyColors.blue}
          bgColor="#3a7ca5"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
        <RallyMainCard title="Top 10 Real Net Buyers (M shares)">
          {topRealBuyers.length > 0 ? (
            <RallyBarChart
              data={topRealBuyers}
              autoColorByValue
              height={280}
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}M`}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">No data</Text>
          )}
        </RallyMainCard>
        <RallyMainCard title="Top 10 Legal Net Buyers (M shares)">
          {topLegalBuyers.length > 0 ? (
            <RallyBarChart
              data={topLegalBuyers}
              autoColorByValue
              height={280}
              tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}M`}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">No data</Text>
          )}
        </RallyMainCard>
      </SimpleGrid>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Filter by Sector"
            data={[{ value: '', label: 'All Sectors' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => { setSelectedSector(v || null); setPage(1); }}
            clearable
            searchable
            w={220}
            size="sm"
          />
        </Group>
      </RallyMainCard>

      <RallyMainCard title={`Client Type Data (${enriched.length})`} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          loading={loading}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
          totalRecords={enriched.length}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="No client type data available"
          onRetry={fetchData}
        />
      </RallyMainCard>
    </>
  );
}
