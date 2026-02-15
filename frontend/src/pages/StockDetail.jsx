import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Typography, CircularProgress, Alert, Chip, Divider } from '@mui/material';
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

export default function StockDetail() {
  const { symbol } = useParams();
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStockData();
  }, [symbol]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${symbol}`),
        axios.get(`/api/stocks/${symbol}/history?days=30`),
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

  // Price chart
  const priceChartOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent', zoom: { enabled: false } },
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
      categories: history.map((h) => {
        const d = h.date;
        return d ? d.slice(5) : '';
      }),
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
    tooltip: { theme: 'dark', y: { formatter: (v) => v?.toLocaleString() } },
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
      categories: history.map((h) => {
        const d = h.date;
        return d ? d.slice(5) : '';
      }),
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
    tooltip: { theme: 'dark', y: { formatter: (v) => v?.toLocaleString() } },
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
          <MainCard title="Price Chart (30 Days)" sx={{ mb: 3 }}>
            <Chart options={priceChartOptions} series={priceSeries} type="area" height={300} />
          </MainCard>

          {history.length > 0 && (
            <MainCard title="Volume Chart">
              <Chart options={volumeChartOptions} series={volumeSeries} type="bar" height={200} />
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
