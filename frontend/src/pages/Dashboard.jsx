import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  IconBuildingBank,
  IconChartLine,
  IconVolume,
  IconCalendar,
} from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import MainCard from '../components/MainCard';
import KPICard from '../components/KPICard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, marketRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/market-overview?limit=20'),
      ]);
      setStats(statsRes.data);
      setRecentData(marketRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.8, minWidth: 80 },
    { field: 'name_fa', headerName: 'Name', flex: 1.5, minWidth: 150 },
    {
      field: 'price_last',
      headerName: 'Last Price',
      flex: 1,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_change_percent',
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
      field: 'q_tot_tran_5j',
      headerName: 'Volume',
      flex: 1,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
  ];

  // Mini chart data from top 20
  const chartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      sparkline: { enabled: false },
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
        colors: {
          ranges: [
            { from: -100, to: 0, color: colors.errorMain },
            { from: 0.01, to: 100, color: colors.successMain },
          ],
        },
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: recentData.slice(0, 10).map((d) => d.symbol),
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

  const chartSeries = [
    {
      name: 'Change %',
      data: recentData.slice(0, 10).map((d) => d.price_change_percent?.toFixed(2) || 0),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h3">Market Dashboard</Typography>
        <RefreshButton onRefreshComplete={fetchData} />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Companies"
            value={stats?.total_companies?.toLocaleString() || '0'}
            icon={IconBuildingBank}
            color={colors.primaryDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Active Today"
            value={stats?.companies_with_data_today?.toLocaleString() || '0'}
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
            title="Latest Date"
            value={stats?.latest_date_formatted || 'N/A'}
            icon={IconCalendar}
            color={colors.orangeDark}
            bgColor="#bf360c"
          />
        </Grid>
      </Grid>

      {/* Charts + Table */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <MainCard title="Top 10 Price Changes">
            <Chart options={chartOptions} series={chartSeries} type="bar" height={320} />
          </MainCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <MainCard title="Top 20 Active Stocks">
            <Box sx={{ height: 370, width: '100%' }}>
              <DataGrid
                rows={recentData}
                columns={columns}
                getRowId={(row) => row.ins_code}
                initialState={{
                  pagination: { paginationModel: { pageSize: 20 } },
                }}
                pageSizeOptions={[10, 20]}
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
          </MainCard>
        </Grid>
      </Grid>
    </Box>
  );
}
