import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip, Tabs, Tab } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function MarketPrices() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/market/prices');
      setPrices(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrices = category === 'all'
    ? prices
    : prices.filter((row) => row.market_type === category);

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.7, minWidth: 90 },
    { field: 'name_fa', headerName: 'Name', flex: 1.2, minWidth: 160 },
    {
      field: 'price',
      headerName: 'Price',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_toman',
      headerName: 'Price (Toman)',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'change_pct',
      headerName: 'Change%',
      flex: 0.6,
      minWidth: 75,
      type: 'number',
      renderCell: (params) => {
        const val = params.value;
        return (
          <Typography
            variant="body2"
            sx={{
              color: val > 0 ? colors.successMain : val < 0 ? colors.errorMain : 'text.primary',
              fontWeight: 600,
            }}
          >
            {val != null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '-'}
          </Typography>
        );
      },
    },
    { field: 'unit', headerName: 'Unit', flex: 0.5, minWidth: 70 },
    {
      field: 'market_cap',
      headerName: 'Market Cap',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
  ];

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>Market Prices</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <Tabs
            value={category}
            onChange={(e, newVal) => setCategory(newVal)}
            sx={{
              '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none' },
              '& .MuiTabs-indicator': { bgcolor: colors.primaryMain },
            }}
          >
            <Tab label="All" value="all" />
            <Tab label="Gold" value="gold" />
            <Tab label="Currency" value="currency" />
            <Tab label="Commodity" value="commodity" />
            <Tab label="Crypto" value="crypto" />
          </Tabs>

          <RefreshButton onRefreshComplete={fetchData} />

          <Chip
            label={`${filteredPrices.length} items`}
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
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
              rows={filteredPrices}
              columns={columns}
              getRowId={(row) => row.id}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              density="compact"
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': { borderColor: 'rgba(255,255,255,0.05)' },
                '& .MuiDataGrid-columnHeaders': { borderColor: 'rgba(255,255,255,0.08)' },
                '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(33,150,243,0.08)' },
                '& .MuiDataGrid-footerContainer': { borderColor: 'rgba(255,255,255,0.05)' },
              }}
            />
          </Box>
        )}
      </MainCard>
    </Box>
  );
}
