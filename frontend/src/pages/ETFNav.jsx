import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import EmptyState from '../components/EmptyState';
import colors from '../theme/colors';

export default function ETFNav() {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/market/etf-nav');
      setEtfs(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.7, minWidth: 90 },
    { field: 'name_fa', headerName: 'Name', flex: 1.2, minWidth: 160 },
    {
      field: 'nav_issuance',
      headerName: 'NAV Issuance',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'nav_redemption',
      headerName: 'NAV Redemption',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'last_price',
      headerName: 'Last Price',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'bubble_pct',
      headerName: 'Bubble%',
      flex: 0.6,
      minWidth: 80,
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
    { field: 'fund_type', headerName: 'Fund Type', flex: 0.7, minWidth: 90 },
  ];

  if (error && !etfs.length) {
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
      <Typography variant="h3" sx={{ mb: 3 }}>ETF NAV</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <RefreshButton onRefreshComplete={fetchData} />

          <Chip
            label={`${etfs.length} ETFs`}
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
        ) : etfs.length === 0 ? (
          <EmptyState message="No ETF data available" onRetry={fetchData} />
        ) : (
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
              rows={etfs}
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
