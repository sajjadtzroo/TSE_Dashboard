import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import EmptyState from '../components/EmptyState';
import colors from '../theme/colors';

export default function IMEFutures() {
  const [futures, setFutures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ime/futures');
      setFutures(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'contract_code', headerName: 'Code', flex: 0.8, minWidth: 100 },
    { field: 'contract_description', headerName: 'Description', flex: 1.2, minWidth: 160 },
    { field: 'date_end', headerName: 'Expiry', flex: 0.7, minWidth: 90 },
    {
      field: 'day_remain',
      headerName: 'Days Left',
      flex: 0.5,
      minWidth: 70,
      type: 'number',
    },
    {
      field: 'last',
      headerName: 'Last',
      flex: 0.7,
      minWidth: 90,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'last_change_pct',
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
    {
      field: 'settlement_price',
      headerName: 'Settlement',
      flex: 0.7,
      minWidth: 90,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'volume',
      headerName: 'Volume',
      flex: 0.6,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'interest_open',
      headerName: 'Open Interest',
      flex: 0.7,
      minWidth: 95,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'margin_initial',
      headerName: 'Margin',
      flex: 0.7,
      minWidth: 90,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'bid_price_1',
      headerName: 'Bid',
      flex: 0.6,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
    {
      field: 'ask_price_1',
      headerName: 'Ask',
      flex: 0.6,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
    {
      field: 'trades',
      headerName: 'Trades',
      flex: 0.5,
      minWidth: 65,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
  ];

  if (error && !futures.length) {
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
      <Typography variant="h3" sx={{ mb: 3 }}>IME Futures</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <RefreshButton onRefreshComplete={fetchData} />

          <Chip
            label={`${futures.length} contracts`}
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
        ) : futures.length === 0 ? (
          <EmptyState message="No futures data available" onRetry={fetchData} />
        ) : (
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
              rows={futures}
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
