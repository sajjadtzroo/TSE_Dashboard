import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, TextField, MenuItem, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function IMEOptions() {
  const [options, setOptions] = useState([]);
  const [commodity, setCommodity] = useState('');
  const [optionType, setOptionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [commodity, optionType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (commodity) params.set('commodity', commodity);
      if (optionType) params.set('option_type', optionType);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/ime/options${qs}`);
      setOptions(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const commodityOptions = [...new Set(options.map((o) => o.commodity).filter(Boolean))].sort();

  const columns = [
    { field: 'contract_code', headerName: 'Code', flex: 0.9, minWidth: 110 },
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
    { field: 'commodity', headerName: 'Commodity', flex: 0.6, minWidth: 80 },
    {
      field: 'price_strike',
      headerName: 'Strike',
      flex: 0.7,
      minWidth: 90,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
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
      minWidth: 85,
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
      field: 'settlement_price',
      headerName: 'Settlement',
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
  ];

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  const callCount = options.filter((o) => o.option_type === 'call').length;
  const putCount = options.filter((o) => o.option_type === 'put').length;

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>IME Options</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            select
            label="Commodity"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {commodityOptions.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
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

          <RefreshButton onRefreshComplete={fetchData} />

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
