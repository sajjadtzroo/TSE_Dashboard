import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Card, Center, Divider, Grid, Group, Loader,
  SegmentedControl, Stack, Text, Title,
} from '@mantine/core';
import {
  IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight,
  IconUsers, IconBuildingBank, IconStar, IconStarFilled,
} from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyAreaChart from '../components/charts/RallyAreaChart';
import RallyBarChart from '../components/charts/RallyBarChart';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import rallyColors from '../theme/rallyColors';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import DataFreshness from '../components/DataFreshness';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import useWatchlist from '../hooks/useWatchlist';
import { toJalali } from '../utils/dateUtils';

const DURATION_OPTIONS = [
  { label: '1W', value: '7' },
  { label: '1M', value: '30' },
  { label: '3M', value: '90' },
  { label: '6M', value: '180' },
  { label: '1Y', value: '365' },
  { label: '3Y', value: '1095' },
  { label: '5Y', value: '1825' },
  { label: 'All', value: '100000' },
];

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { toggleSymbol, isWatched } = useWatchlist();
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchStockData(); }, [symbol]);
  useEffect(() => { if (stockData) fetchHistory(selectedDuration); }, [selectedDuration]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${symbol}`),
        axios.get(`/api/stocks/${symbol}/history?days=${selectedDuration}`),
      ]);
      setStockData(detailRes.data);
      setHistory(historyRes.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (days) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/stocks/${symbol}/history?days=${days}`);
      setHistory(res.data);
    } catch (err) { console.error('Error fetching history:', err); }
    finally { setHistoryLoading(false); }
  };

  if (loading) return (
    <>
      <RallyBreadcrumbs items={[{ label: 'Dashboard', path: '/' }, { label: 'Market', path: '/market' }, { label: symbol }]} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RallyKPISkeleton variant="accent-bar" />
        </Grid.Col>
      </Grid>
    </>
  );
  if (error) return <Alert color="red">Error loading stock data: {error}</Alert>;

  const { security, latest_ohlcv } = stockData;
  const isPositive = latest_ohlcv?.close_change >= 0;
  const days = Number(selectedDuration);

  const formatDateLabel = (d) => {
    if (!d) return '';
    if (days <= 30) return d.slice(5);
    if (days <= 365) return d.slice(2, 7);
    return d.slice(0, 7);
  };

  const tickCount = history.length > 200 ? 12 : history.length > 60 ? 10 : undefined;

  // Price chart data
  const priceData = history.map((h) => ({ x: formatDateLabel(h.date), y: h.close }));
  const volumeData = history.map((h) => ({ x: formatDateLabel(h.date), y: h.volume }));

  // History table
  const historyRows = [...history].reverse().map((h, i) => ({ id: i, ...h }));
  const historyPaged = historyRows.slice((page - 1) * perPage, page * perPage);

  const historyColumns = [
    { accessor: 'date', title: 'Date', width: 100, render: (r) => toJalali(r.date) },
    { accessor: 'open', title: 'Open', width: 90, textAlign: 'end', render: (r) => r.open?.toLocaleString() ?? '-' },
    { accessor: 'high', title: 'High', width: 90, textAlign: 'end', render: (r) => r.high?.toLocaleString() ?? '-' },
    { accessor: 'low', title: 'Low', width: 90, textAlign: 'end', render: (r) => r.low?.toLocaleString() ?? '-' },
    { accessor: 'close', title: 'Close', width: 90, textAlign: 'end', render: (r) => r.close?.toLocaleString() ?? '-' },
    { accessor: 'close_change_pct', title: 'Change %', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'Volume', width: 100, textAlign: 'end', render: (r) => r.volume?.toLocaleString() ?? '-' },
    { accessor: 'trades', title: 'Trades', width: 80, textAlign: 'end', render: (r) => r.trades?.toLocaleString() ?? '-' },
  ];

  const InfoRow = ({ label, value, color }) => (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );

  return (
    <>
      {/* Breadcrumbs */}
      <RallyBreadcrumbs items={[
        { label: 'Dashboard', path: '/' },
        { label: 'Market', path: '/market' },
        { label: security.symbol || symbol },
      ]} />

      {/* Header */}
      <Group gap="sm" mb="xs" wrap="wrap">
        <Title order={3}>{security.name_fa}</Title>
        <Badge color="rally-blue" variant="light">{security.symbol}</Badge>
        <Badge color={security.is_active ? 'rally-green' : 'gray'} variant="outline">
          {security.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <ActionIcon variant="subtle" size="sm" onClick={() => toggleSymbol(security.symbol)} color={isWatched(security.symbol) ? 'rally-yellow' : 'gray'}>
          {isWatched(security.symbol) ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>
      <Text size="sm" c="dimmed" mb="md">{security.sector_name_fa}</Text>

      <Grid gutter="md">
        {/* Charts Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard
            title={
              <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
                <Title order={4}>Price Chart</Title>
                <SegmentedControl
                  size="xs"
                  value={selectedDuration}
                  onChange={setSelectedDuration}
                  data={DURATION_OPTIONS}
                />
              </Group>
            }
            mb="md"
          >
            {historyLoading ? (
              <Center mih={280}><Loader color="rally-green" size="sm" /></Center>
            ) : (
              <RallyAreaChart
                data={priceData}
                fillColor={isPositive ? rallyColors.green : rallyColors.orange}
                strokeColor={isPositive ? rallyColors.green : rallyColors.orange}
                height={280}
                xTickCount={tickCount}
                yFormatter={(v) => v?.toLocaleString()}
                tooltipFormatter={(d) => {
                  const idx = history.findIndex((h) => formatDateLabel(h.date) === d.x);
                  return `${history[idx]?.date || d.x}\n${d.y?.toLocaleString()}`;
                }}
                zoomable
              />
            )}
          </RallyMainCard>

          {history.length > 0 && (
            <RallyMainCard title="Volume Chart" mb="md">
              <RallyBarChart
                data={volumeData}
                height={180}
                cornerRadius={2}
                xTickAngle={0}
                yFormatter={(v) => v ? (v / 1e6).toFixed(1) + 'M' : '0'}
                tooltipFormatter={(d) => {
                  const idx = history.findIndex((h) => formatDateLabel(h.date) === d.x);
                  return `${history[idx]?.date || d.x}\n${d.y?.toLocaleString()}`;
                }}
              />
            </RallyMainCard>
          )}

          {history.length > 0 && (
            <RallyMainCard title={`Historical Data (${history.length} days)`} noPadding>
              <RallyDataTable
                records={historyPaged}
                columns={historyColumns}
                page={page}
                onPageChange={setPage}
                recordsPerPage={perPage}
                onRecordsPerPageChange={(p) => { setPerPage(p); setPage(1); }}
                totalRecords={historyRows.length}
                minHeight={300}
              />
            </RallyMainCard>
          )}
        </Grid.Col>

        {/* Info Column */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          {latest_ohlcv && (
            <Card withBorder radius="md" mb="md">
              <Group gap="xs" mb="sm">
                {isPositive
                  ? <IconTrendingUp size={24} color={rallyColors.green} />
                  : <IconTrendingDown size={24} color={rallyColors.orange} />
                }
                <Text size="xl" fw={700} c={isPositive ? rallyColors.green : rallyColors.orange}>
                  {latest_ohlcv.close?.toLocaleString()}
                </Text>
              </Group>
              <Group gap={4} mb="sm">
                {isPositive
                  ? <IconArrowUpRight size={16} color={rallyColors.green} />
                  : <IconArrowDownRight size={16} color={rallyColors.orange} />
                }
                <Text size="sm" fw={600} c={isPositive ? rallyColors.green : rallyColors.orange}>
                  {latest_ohlcv.close_change > 0 ? '+' : ''}
                  {latest_ohlcv.close_change?.toLocaleString()} ({latest_ohlcv.close_change_pct?.toFixed(2)}%)
                </Text>
              </Group>
              <Divider mb="xs" color="rgba(238,238,238,0.06)" />
              <InfoRow label="Open" value={latest_ohlcv.open?.toLocaleString()} />
              <InfoRow label="High" value={latest_ohlcv.high?.toLocaleString()} />
              <InfoRow label="Low" value={latest_ohlcv.low?.toLocaleString()} />
              <InfoRow label="Last" value={latest_ohlcv.last?.toLocaleString()} />
              <InfoRow label="Volume" value={latest_ohlcv.volume?.toLocaleString()} />
              <InfoRow label="Trades" value={latest_ohlcv.trades?.toLocaleString()} />
            </Card>
          )}

          {latest_ohlcv && (latest_ohlcv.pe_ratio || latest_ohlcv.eps || latest_ohlcv.market_cap) && (
            <RallyMainCard title="Financial Indicators" mb="md">
              <InfoRow label="P/E Ratio" value={latest_ohlcv.pe_ratio?.toFixed(2) || 'N/A'} />
              <InfoRow label="EPS" value={latest_ohlcv.eps?.toLocaleString() || 'N/A'} />
              <InfoRow label="Market Cap" value={latest_ohlcv.market_cap?.toLocaleString() || 'N/A'} />
            </RallyMainCard>
          )}

          {latest_ohlcv && (latest_ohlcv.real_buy_count || latest_ohlcv.legal_buy_count) && (
            <RallyMainCard title="Client Activity">
              <Group gap="xs" mb={4}>
                <IconUsers size={18} color={rallyColors.blue} />
                <Text size="sm" fw={600}>Individual</Text>
              </Group>
              <InfoRow label="Buyers" value={latest_ohlcv.real_buy_count?.toLocaleString() || '0'} color={rallyColors.green} />
              <InfoRow label="Sellers" value={latest_ohlcv.real_sell_count?.toLocaleString() || '0'} color={rallyColors.orange} />
              <Divider my="xs" color="rgba(238,238,238,0.06)" />
              <Group gap="xs" mb={4}>
                <IconBuildingBank size={18} color={rallyColors.purple} />
                <Text size="sm" fw={600}>Institutional</Text>
              </Group>
              <InfoRow label="Buyers" value={latest_ohlcv.legal_buy_count?.toLocaleString() || '0'} color={rallyColors.green} />
              <InfoRow label="Sellers" value={latest_ohlcv.legal_sell_count?.toLocaleString() || '0'} color={rallyColors.orange} />
            </RallyMainCard>
          )}
        </Grid.Col>
      </Grid>
    </>
  );
}
