import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Typography, CircularProgress, Alert, Chip, Divider } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconArrowUpRight,
  IconArrowDownRight,
  IconUsers,
  IconBuildingBank,
} from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import MainCard from '../components/MainCard';
import colors from '../theme/colors';

const DURATION_OPTIONS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
  { label: 'All', days: 100000 },
];

export default function StockDetail() {
  const { symbol } = useParams();
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(30);

  useEffect(() => {
    fetchStockData();
  }, [symbol]);

  useEffect(() => {
    if (stockData) {
      fetchHistory(selectedDuration);
    }
  }, [selectedDuration]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${symbol}`),
        axios.get(`/api/stocks/${symbol}/history?days=${selectedDuration}`),
      ]);
      setStockData(detailRes.data);
      setHistory(historyRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (days) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/stocks/${symbol}/history?days=${days}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDurationChange = (days) => {
    setSelectedDuration(days);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading stock data: {error}</Alert>;
  }

  const { security, latest_ohlcv } = stockData;
  const isPositive = latest_ohlcv?.close_change >= 0;

  // X-axis label formatting based on duration
  const formatDateLabel = (d) => {
    if (!d) return '';
    if (selectedDuration <= 30) return d.slice(5);          // MM-DD
    if (selectedDuration <= 365) return d.slice(2, 7);      // YY-MM
    return d.slice(0, 7);                                   // YYYY-MM
  };

  // Show fewer labels when there are many data points
  const tickAmount = history.length > 200 ? 12 : history.length > 60 ? 10 : undefined;

  // Price chart
  const priceChartOptions = {
    chart: { type: 'area', toolbar: { show: true, tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }, background: 'transparent', zoom: { enabled: true } },
    stroke: { curve: 'smooth', width: 2 },
    colors: [isPositive ? colors.successMain : colors.errorMain],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: history.map((h) => formatDateLabel(h.date)),
      tickAmount,
      labels: { style: { colors: colors.darkTextSecondary, fontSize: '10px' }, rotate: -45, rotateAlways: history.length > 15 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: colors.darkTextSecondary, fontSize: '11px' },
        formatter: (v) => v?.toLocaleString(),
      },
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 3 },
    tooltip: { theme: 'dark', x: { formatter: (val, { dataPointIndex }) => history[dataPointIndex]?.date || '' }, y: { formatter: (v) => v?.toLocaleString() } },
    theme: { mode: 'dark' },
    dataLabels: { enabled: false },
  };

  const priceSeries = [{ name: 'Close Price', data: history.map((h) => h.close) }];

  // Volume chart
  const volumeChartOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    colors: [colors.secondaryMain],
    xaxis: {
      categories: history.map((h) => formatDateLabel(h.date)),
      tickAmount,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: colors.darkTextSecondary, fontSize: '11px' },
        formatter: (v) => v ? (v / 1e6).toFixed(1) + 'M' : '0',
      },
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 3 },
    tooltip: { theme: 'dark', x: { formatter: (val, { dataPointIndex }) => history[dataPointIndex]?.date || '' }, y: { formatter: (v) => v?.toLocaleString() } },
    theme: { mode: 'dark' },
    dataLabels: { enabled: false },
  };

  const volumeSeries = [{ name: 'Volume', data: history.map((h) => h.volume) }];

  const InfoRow = ({ label, value, color }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, color: color || 'text.primary' }}>{value}</Typography>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h3">{security.name_fa}</Typography>
          <Chip
            label={security.symbol}
            size="small"
            sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain, fontWeight: 600 }}
          />
          <Chip
            label={security.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={security.is_active ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {security.sector_name_fa}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Charts Column */}
        <Grid item xs={12} md={8}>
          <MainCard
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="h4">Price Chart</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {DURATION_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.days}
                      label={opt.label}
                      size="small"
                      onClick={() => handleDurationChange(opt.days)}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        bgcolor: selectedDuration === opt.days ? colors.primaryMain : 'rgba(255,255,255,0.08)',
                        color: selectedDuration === opt.days ? '#fff' : colors.darkTextSecondary,
                        '&:hover': {
                          bgcolor: selectedDuration === opt.days ? colors.primaryMain : 'rgba(255,255,255,0.15)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            }
            sx={{ mb: 3 }}
          >
            {historyLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Chart options={priceChartOptions} series={priceSeries} type="area" height={300} />
            )}
          </MainCard>

          {history.length > 0 && (
            <MainCard title="Volume Chart" sx={{ mb: 3 }}>
              <Chart options={volumeChartOptions} series={volumeSeries} type="bar" height={200} />
            </MainCard>
          )}

          {history.length > 0 && (
            <MainCard title={`Historical Data (${history.length} days)`}>
              <Box sx={{ width: '100%' }}>
                <DataGrid
                  rows={[...history].reverse().map((h, i) => ({ id: i, ...h }))}
                  columns={[
                    { field: 'date', headerName: 'Date', flex: 0.8, minWidth: 100 },
                    {
                      field: 'open',
                      headerName: 'Open',
                      flex: 0.7,
                      minWidth: 90,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                    {
                      field: 'high',
                      headerName: 'High',
                      flex: 0.7,
                      minWidth: 90,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                    {
                      field: 'low',
                      headerName: 'Low',
                      flex: 0.7,
                      minWidth: 90,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                    {
                      field: 'close',
                      headerName: 'Close',
                      flex: 0.7,
                      minWidth: 90,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                    {
                      field: 'close_change_pct',
                      headerName: 'Change %',
                      flex: 0.6,
                      minWidth: 80,
                      renderCell: (params) => {
                        const val = params.value;
                        if (val == null) return '-';
                        const color = val >= 0 ? colors.successMain : colors.errorMain;
                        return <Typography variant="body2" sx={{ color, fontWeight: 500 }}>{val > 0 ? '+' : ''}{val.toFixed(2)}%</Typography>;
                      },
                    },
                    {
                      field: 'volume',
                      headerName: 'Volume',
                      flex: 0.8,
                      minWidth: 100,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                    {
                      field: 'trades',
                      headerName: 'Trades',
                      flex: 0.6,
                      minWidth: 80,
                      valueFormatter: (params) => params.value?.toLocaleString() ?? '-',
                    },
                  ]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  density="compact"
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(255,255,255,0.05)' },
                    '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid rgba(255,255,255,0.1)' },
                  }}
                />
              </Box>
            </MainCard>
          )}
        </Grid>

        {/* Info Column */}
        <Grid item xs={12} md={4}>
          {latest_ohlcv && (
            <MainCard sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {isPositive ? (
                  <IconTrendingUp size={24} color={colors.successMain} />
                ) : (
                  <IconTrendingDown size={24} color={colors.errorMain} />
                )}
                <Typography variant="h2" sx={{ color: isPositive ? colors.successMain : colors.errorMain }}>
                  {latest_ohlcv.close?.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                {isPositive ? (
                  <IconArrowUpRight size={16} color={colors.successMain} />
                ) : (
                  <IconArrowDownRight size={16} color={colors.errorMain} />
                )}
                <Typography
                  variant="body1"
                  sx={{ color: isPositive ? colors.successMain : colors.errorMain, fontWeight: 600 }}
                >
                  {latest_ohlcv.close_change > 0 ? '+' : ''}
                  {latest_ohlcv.close_change?.toLocaleString()} ({latest_ohlcv.close_change_pct?.toFixed(2)}%)
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <InfoRow label="Open" value={latest_ohlcv.open?.toLocaleString()} />
              <InfoRow label="High" value={latest_ohlcv.high?.toLocaleString()} />
              <InfoRow label="Low" value={latest_ohlcv.low?.toLocaleString()} />
              <InfoRow label="Last" value={latest_ohlcv.last?.toLocaleString()} />
              <InfoRow label="Volume" value={latest_ohlcv.volume?.toLocaleString()} />
              <InfoRow label="Trades" value={latest_ohlcv.trades?.toLocaleString()} />
            </MainCard>
          )}

          {latest_ohlcv && (latest_ohlcv.pe_ratio || latest_ohlcv.eps || latest_ohlcv.market_cap) && (
            <MainCard
              title="Financial Indicators"
              sx={{ mb: 3 }}
            >
              <InfoRow label="P/E Ratio" value={latest_ohlcv.pe_ratio?.toFixed(2) || 'N/A'} />
              <InfoRow label="EPS" value={latest_ohlcv.eps?.toLocaleString() || 'N/A'} />
              <InfoRow label="Market Cap" value={latest_ohlcv.market_cap?.toLocaleString() || 'N/A'} />
            </MainCard>
          )}

          {latest_ohlcv && (latest_ohlcv.real_buy_count || latest_ohlcv.legal_buy_count) && (
            <MainCard title="Client Activity">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconUsers size={18} color={colors.primaryMain} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Individual</Typography>
              </Box>
              <InfoRow
                label="Buyers"
                value={latest_ohlcv.real_buy_count?.toLocaleString() || '0'}
                color={colors.successMain}
              />
              <InfoRow
                label="Sellers"
                value={latest_ohlcv.real_sell_count?.toLocaleString() || '0'}
                color={colors.errorMain}
              />

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconBuildingBank size={18} color={colors.secondaryMain} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Institutional</Typography>
              </Box>
              <InfoRow
                label="Buyers"
                value={latest_ohlcv.legal_buy_count?.toLocaleString() || '0'}
                color={colors.successMain}
              />
              <InfoRow
                label="Sellers"
                value={latest_ohlcv.legal_sell_count?.toLocaleString() || '0'}
                color={colors.errorMain}
              />
            </MainCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
