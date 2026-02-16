import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Chip, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function TickTrades() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (urlSymbol) {
      fetchData(urlSymbol);
    }
  }, [urlSymbol]);

  const fetchData = async (sym) => {
    const target = sym || activeSymbol;
    if (!target) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/stocks/${target}/tick-trades`);
      setTrades(res.data);
      setActiveSymbol(target);
      setError(null);
    } catch (err) {
      setError(err.message);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchData(symbol);
    }
  };

  const columns = [
    { field: 'row_num', headerName: '#', flex: 0.3, minWidth: 50, type: 'number' },
    { field: 'time', headerName: 'Time', flex: 0.6, minWidth: 80 },
    {
      field: 'price',
      headerName: 'Price',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'volume',
      headerName: 'Volume',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'canceled',
      headerName: 'Canceled',
      flex: 0.5,
      minWidth: 70,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Yes' : 'No'}
          size="small"
          sx={{
            bgcolor: params.value ? 'rgba(244,67,54,0.15)' : 'rgba(76,175,80,0.15)',
            color: params.value ? colors.errorMain : colors.successMain,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Tick Trades{activeSymbol ? ` - ${activeSymbol}` : ''}
      </Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            label="Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            placeholder="Enter symbol and press Enter"
            sx={{ minWidth: 220 }}
          />

          <RefreshButton onRefreshComplete={() => fetchData()} />

          {trades.length > 0 && (
            <Chip
              label={`${trades.length} trades`}
              size="small"
              sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain }}
            />
          )}
        </Box>
      </MainCard>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Error loading data: {error}</Alert>}

      <MainCard content={false}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid
              rows={trades}
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
