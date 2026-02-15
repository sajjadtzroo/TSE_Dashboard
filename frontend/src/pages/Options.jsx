import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, TextField, MenuItem, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function Options() {
  const [options, setOptions] = useState([]);
  const [underlying, setUnderlying] = useState('');
  const [optionType, setOptionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOptions();
  }, [underlying, optionType]);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (underlying) params.set('underlying', underlying);
      if (optionType) params.set('option_type', optionType);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/options${qs}`);
      setOptions(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const underlyingOptions = [...new Set(options.map((o) => o.underlying).filter(Boolean))].sort();

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.8, minWidth: 90 },
    {
      field: 'option_type',
      headerName: 'Type',
      flex: 0.5,
      minWidth: 60,
      renderCell: (params) => (
        <Chip
          label={params.value === 'call' ? 'Call' : 'Put'}
          size="small"
          sx={{
            bgcolor: params.value === 'call' ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
            color: params.value === 'call' ? colors.successMain : colors.errorMain,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    { field: 'underlying', headerName: 'Underlying', flex: 0.7, minWidth: 80 },
    {
      field: 'strike_price',
      headerName: 'Strike',
      flex: 0.7,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    { field: 'expiry_date', headerName: 'Expiry', flex: 0.7, minWidth: 90 },
    {
      field: 'close',
      headerName: 'Close',
      flex: 0.7,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'last',
      headerName: 'Last',
      flex: 0.7,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'close_change',
      headerName: 'Change',
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
            {val > 0 ? '+' : ''}{val?.toLocaleString() ?? 0}
          </Typography>
        );
      },
    },
    {
      field: 'volume',
      headerName: 'Volume',
      flex: 0.8,
      minWidth: 90,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'trades',
      headerName: 'Trades',
      flex: 0.5,
      minWidth: 65,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'open',
      headerName: 'Open',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'high',
      headerName: 'High',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'low',
      headerName: 'Low',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'bid_price_1',
      headerName: 'Bid',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
    {
      field: 'ask_price_1',
      headerName: 'Ask',
      flex: 0.7,
      minWidth: 75,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
  ];

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>Options Contracts</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            select
            label="Underlying"
            value={underlying}
            onChange={(e) => setUnderlying(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {underlyingOptions.map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Option Type"
            value={optionType}
            onChange={(e) => setOptionType(e.target.value)}
            size="small"
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="call">Call</MenuItem>
            <MenuItem value="put">Put</MenuItem>
          </TextField>

          <RefreshButton onRefreshComplete={fetchOptions} />

          <Chip
            label={`${options.length} options`}
            size="small"
            sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain }}
          />
          <Chip
            label={`${callCount} calls`}
            size="small"
            sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: colors.successMain }}
          />
          <Chip
            label={`${putCount} puts`}
            size="small"
            sx={{ bgcolor: 'rgba(244,67,54,0.15)', color: colors.errorMain }}
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
              rows={options}
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
