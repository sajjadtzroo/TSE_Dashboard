import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Center, Group, Select,
} from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyTreemap from '../components/charts/RallyTreemap';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import RallyChartSkeleton from '../components/RallyChartSkeleton';

export default function Heatmap() {
  const [marketData, setMarketData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sizeMetric, setSizeMetric] = useState('market_cap');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      setMarketData(marketRes.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setSectors(sectorsRes.data.filter((s) => !isFundSector(s)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = selectedSector
    ? marketData.filter((d) => d.sector_name_fa === selectedSector)
    : marketData;

  if (loading && !marketData.length) {
    return (
      <>
        <PageHeader title="Market Heatmap" />
        <RallyChartSkeleton height={600} />
      </>
    );
  }

  if (error && !marketData.length) {
    return <Alert color="red" title="Error">{error}</Alert>;
  }

  return (
    <>
      <PageHeader title="Market Heatmap">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={fetchData} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          <Select
            placeholder="Filter by Sector"
            data={[{ value: '', label: 'All Sectors' }, ...sectors.map((s) => ({ value: s, label: s }))]}
            value={selectedSector || ''}
            onChange={(v) => setSelectedSector(v || null)}
            clearable
            searchable
            w={220}
            size="sm"
          />
          <Select
            label="Size by"
            data={[
              { value: 'market_cap', label: 'Market Cap' },
              { value: 'volume', label: 'Volume' },
            ]}
            value={sizeMetric}
            onChange={(v) => setSizeMetric(v)}
            w={160}
            size="sm"
          />
        </Group>
      </RallyMainCard>

      <RallyMainCard>
        {filteredData.length > 0 ? (
          <RallyTreemap
            data={filteredData}
            groupBy="sector_name_fa"
            sizeAccessor={sizeMetric}
            colorAccessor="close_change_pct"
            onCellClick={(d) => navigate(`/stock/${d.symbol}`)}
            height={600}
          />
        ) : (
          <Center py="xl">
            <Alert color="gray">No data to display</Alert>
          </Center>
        )}
      </RallyMainCard>
    </>
  );
}
