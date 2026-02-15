import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, TextField, MenuItem, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function MarketOverview() {
  const [marketData, setMarketData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSectors();
  }, []);

  useEffect(() => {
    fetchMarketData();
  }, [selectedSector]);

  const isFundSector = (s) => s && (s.includes('صندوق') || s.includes('اختصاصی'));

  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors');
      setSectors(res.data.filter((s) => !isFundSector(s)));
    } catch (err) {
      console.error('Error fetching sectors:', err);
    }
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : '';
      const res = await axios.get(`/api/market-overview${params}`);
      setMarketData(res.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.7, minWidth: 80 },
    { field: 'name_fa', headerName: 'Name', flex: 1.5, minWidth: 150 },
    { field: 'sector_name_fa', headerName: 'Sector', flex: 1.2, minWidth: 120 },
    { field: 'date', headerName: 'Date', flex: 0.8, minWidth: 90 },
    {
      field: 'price_last',
      headerName: 'Last Price',
      flex: 0.9,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_change_percent',
      headerName: 'Change %',
      flex: 0.7,
      minWidth: 85,
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
      field: 'price_min',
      headerName: 'Low',
      flex: 0.8,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_max',
      headerName: 'High',
      flex: 0.8,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'q_tot_tran_5j',
      headerName: 'Volume',
      flex: 1,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'z_tot_tran',
      headerName: 'Trades',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'pe_ratio',
      headerName: 'P/E',
      flex: 0.6,
      minWidth: 65,
      type: 'number',
      valueFormatter: (params) => params.value?.toFixed(2) || '-',
    },
    {
      field: 'eps',
      headerName: 'EPS',
      flex: 0.8,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
    {
      field: 'market_cap',
      headerName: 'Market Cap',
      flex: 1,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) =>
        params.value ? (params.value / 1e9).toFixed(2) + 'B' : '-',
    },
  ];

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>Market Overview</Typography>

      <MainCard
        sx={{ mb: 3 }}
        content={false}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            select
            label="Filter by Sector"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All Sectors</MenuItem>
            {sectors.map((sector) => (
              <MenuItem key={sector} value={sector}>{sector}</MenuItem>
            ))}
          </TextField>

          <RefreshButton onRefreshComplete={fetchMarketData} />

          <Chip
            label={`${marketData.length} stocks`}
            size="small"
            sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain }}
          />
        </Box>
      </MainCard>

      <MainCard content={false}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={marketData}
              columns={columns}
              getRowId={(row) => row.ins_code}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
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
