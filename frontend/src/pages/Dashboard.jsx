import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, CircularProgress, Alert, Chip, IconButton,
  Tooltip, LinearProgress, Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  IconBuildingBank,
  IconChartLine,
  IconVolume,
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconPlayerPlay,
  IconPlayerPause,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import MainCard from '../components/MainCard';
import KPICard from '../components/KPICard';
import RefreshButton from '../components/RefreshButton';
import EmptyState from '../components/EmptyState';
import colors from '../theme/colors';

const AUTO_REFRESH_INTERVALS = [
  { label: 'Off', seconds: 0 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading((prev) => prev); // keep current loading state for auto-refresh
      const [statsRes, marketRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/market-overview'),
      ]);
      setStats(statsRes.data);
      const isFund = (s) => s && (s.includes('\u0635\u0646\u062f\u0648\u0642') || s.includes('\u0627\u062e\u062a\u0635\u0627\u0635\u06cc'));
      setRecentData(marketRes.data.filter((item) => !isFund(item.sector_name_fa)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh > 0) {
      timerRef.current = setInterval(fetchData, autoRefresh * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, fetchData]);

  // Derived data
  const sortedByChange = [...recentData].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0));
  const topGainers = sortedByChange.filter((d) => d.close_change_pct > 0).slice(0, 5);
  const topLosers = sortedByChange.filter((d) => d.close_change_pct < 0).reverse().slice(0, 5);
  const advancers = recentData.filter((d) => d.close_change_pct > 0).length;
  const decliners = recentData.filter((d) => d.close_change_pct < 0).length;
  const unchanged = recentData.length - advancers - decliners;

  // Sector aggregation for pie chart
  const sectorMap = {};
  recentData.forEach((d) => {
    const s = d.sector_name_fa || 'Other';
    if (!sectorMap[s]) sectorMap[s] = { count: 0, totalValue: 0 };
    sectorMap[s].count += 1;
    sectorMap[s].totalValue += d.value || 0;
  });
  const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.8, minWidth: 80 },
    { field: 'name_fa', headerName: 'Name', flex: 1.5, minWidth: 150 },
    {
      field: 'close',
      headerName: 'Close Price',
      flex: 1,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'close_change_pct',
      headerName: 'Change %',
      flex: 0.8,
      minWidth: 90,
      type: 'number',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            color: params.value > 0 ? colors.successMain : params.value < 0 ? colors.errorMain : 'text.primary',
            fontWeight: 600,
          }}
        >
          {params.value > 0 ? '+' : ''}{params.value?.toFixed(2)}%
        </Typography>
      ),
    },
    {
      field: 'volume',
      headerName: 'Volume',
      flex: 1,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
  ];

  // Bar chart: Top 10 price changes
  const top10 = sortedByChange.slice(0, 5).concat(sortedByChange.slice(-5).reverse());
  const chartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
        colors: {
          ranges: [
            { from: -100, to: -0.001, color: colors.errorMain },
            { from: 0, to: 100, color: colors.successMain },
          ],
        },
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: top10.map((d) => d.symbol),
      labels: { style: { colors: colors.darkTextSecondary, fontSize: '10px' }, rotate: -45 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: colors.darkTextSecondary, fontSize: '11px' } },
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 3 },
    tooltip: { theme: 'dark' },
    theme: { mode: 'dark' },
  };

  const chartSeries = [{
    name: 'Change %',
    data: top10.map((d) => Number(d.close_change_pct?.toFixed(2)) || 0),
  }];

  // Sector pie chart
  const sectorPieOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: sectorEntries.map(([s]) => s),
    theme: { mode: 'dark' },
    colors: ['#2196f3', '#673ab7', '#00e676', '#ff9800', '#e91e63', '#00bcd4', '#ff5722', '#8bc34a'],
    legend: {
      position: 'bottom',
      labels: { colors: colors.darkTextSecondary },
      fontSize: '11px',
    },
    stroke: { colors: [colors.darkPaper], width: 2 },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark' },
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: true,
            name: { color: colors.darkTextPrimary },
            value: { color: colors.darkTextSecondary },
            total: { show: true, label: 'Total', color: colors.darkTextSecondary },
          },
        },
      },
    },
  };
  const sectorPieSeries = sectorEntries.map(([, v]) => v.count);

  // Market breadth bar
  const breadthTotal = advancers + decliners + unchanged || 1;
  const advPct = (advancers / breadthTotal) * 100;
  const decPct = (decliners / breadthTotal) * 100;

  // Mini table for gainers/losers
  const MiniTable = ({ data, type }) => (
    <Box>
      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No {type} today
        </Typography>
      ) : (
        data.map((d) => (
          <Box
            key={d.ins_code}
            onClick={() => navigate(`/stock/${d.symbol}`)}
            sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              py: 0.75, px: 0.5, cursor: 'pointer', borderRadius: '4px',
              '&:hover': { bgcolor: 'rgba(33,150,243,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {type === 'gainers' ? (
                <IconArrowUpRight size={14} color={colors.successMain} />
              ) : (
                <IconArrowDownRight size={14} color={colors.errorMain} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{d.symbol}</Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: type === 'gainers' ? colors.successMain : colors.errorMain,
                flexShrink: 0,
              }}
            >
              {d.close_change_pct > 0 ? '+' : ''}{d.close_change_pct?.toFixed(2)}%
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );

  if (loading && !recentData.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !recentData.length) {
    return (
      <Alert severity="error" action={
        <Chip label="Retry" size="small" onClick={fetchData} sx={{ cursor: 'pointer' }} />
      }>
        Error loading data: {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h3">Market Dashboard</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Auto-refresh */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {autoRefresh > 0 ? (
              <IconPlayerPause size={14} color={colors.successMain} />
            ) : (
              <IconPlayerPlay size={14} color={colors.darkTextSecondary} />
            )}
            {AUTO_REFRESH_INTERVALS.map((opt) => (
              <Chip
                key={opt.seconds}
                label={opt.label}
                size="small"
                onClick={() => setAutoRefresh(opt.seconds)}
                sx={{
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 24,
                  cursor: 'pointer',
                  bgcolor: autoRefresh === opt.seconds ? colors.primaryMain : 'rgba(255,255,255,0.06)',
                  color: autoRefresh === opt.seconds ? '#fff' : colors.darkTextSecondary,
                  '&:hover': { bgcolor: autoRefresh === opt.seconds ? colors.primaryMain : 'rgba(255,255,255,0.12)' },
                }}
              />
            ))}
          </Box>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <RefreshButton onRefreshComplete={fetchData} />
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Securities"
            value={stats?.total_securities?.toLocaleString() || '0'}
            icon={IconBuildingBank}
            color={colors.primaryDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Active Today"
            value={stats?.securities_with_data_today?.toLocaleString() || '0'}
            icon={IconChartLine}
            color={colors.secondaryDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Volume"
            value={stats?.total_volume_today ? (stats.total_volume_today / 1e9).toFixed(1) + 'B' : '0'}
            icon={IconVolume}
            color={colors.successDark}
            bgColor="#1b5e20"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Value"
            value={stats?.total_value_today ? (stats.total_value_today / 1e12).toFixed(2) + 'T' : '0'}
            icon={IconCalendar}
            color={colors.orangeDark}
            bgColor="#bf360c"
            subtitle={stats?.latest_date || ''}
          />
        </Grid>
      </Grid>

      {/* Market Breadth */}
      <MainCard sx={{ mb: 3, py: 0.5 }} contentSX={{ py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ minWidth: 100 }}>Market Breadth</Typography>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ width: `${advPct}%`, bgcolor: colors.successMain, transition: 'width 0.5s' }} />
              <Box sx={{ width: `${100 - advPct - decPct}%`, bgcolor: colors.grey600, transition: 'width 0.5s' }} />
              <Box sx={{ width: `${decPct}%`, bgcolor: colors.errorMain, transition: 'width 0.5s' }} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip icon={<IconTrendingUp size={14} />} label={`${advancers}`} size="small"
              sx={{ bgcolor: 'rgba(0,230,118,0.12)', color: colors.successMain, fontWeight: 600 }} />
            <Chip label={`${unchanged}`} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: colors.darkTextSecondary, fontWeight: 600 }} />
            <Chip icon={<IconTrendingDown size={14} />} label={`${decliners}`} size="small"
              sx={{ bgcolor: 'rgba(244,67,54,0.12)', color: colors.errorMain, fontWeight: 600 }} />
          </Box>
        </Box>
      </MainCard>

      {/* Charts row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <MainCard title="Top Gainers & Losers">
            {top10.length > 0 ? (
              <Chart options={chartOptions} series={chartSeries} type="bar" height={300} />
            ) : (
              <EmptyState message="No price data yet" />
            )}
          </MainCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <MainCard title="Sector Distribution">
            {sectorPieSeries.length > 0 ? (
              <Chart options={sectorPieOptions} series={sectorPieSeries} type="donut" height={300} />
            ) : (
              <EmptyState message="No sector data yet" />
            )}
          </MainCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <MainCard title="Top Gainers" contentSX={{ py: 1, px: 1.5 }}>
                <MiniTable data={topGainers} type="gainers" />
              </MainCard>
            </Grid>
            <Grid item xs={12}>
              <MainCard title="Top Losers" contentSX={{ py: 1, px: 1.5 }}>
                <MiniTable data={topLosers} type="losers" />
              </MainCard>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Data Table */}
      <MainCard title={`Active Stocks (${recentData.length})`}>
        {recentData.length === 0 ? (
          <EmptyState message="No market data available" onRetry={fetchData} />
        ) : (
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={recentData}
              columns={columns}
              getRowId={(row) => row.ins_code}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              onRowClick={(params) => navigate(`/stock/${params.row.symbol}`)}
              density="compact"
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': { borderColor: 'rgba(255,255,255,0.05)' },
                '& .MuiDataGrid-columnHeaders': { borderColor: 'rgba(255,255,255,0.08)' },
                '& .MuiDataGrid-row:hover': { cursor: 'pointer', bgcolor: 'rgba(33,150,243,0.08)' },
                '& .MuiDataGrid-footerContainer': { borderColor: 'rgba(255,255,255,0.05)' },
              }}
            />
          </Box>
        )}
      </MainCard>
    </Box>
  );
}
