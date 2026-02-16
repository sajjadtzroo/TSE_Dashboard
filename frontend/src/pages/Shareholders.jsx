import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Chip, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function Shareholders() {
  const { symbol: urlSymbol } = useParams();
  const [symbol, setSymbol] = useState(urlSymbol || '');
  const [activeSymbol, setActiveSymbol] = useState(urlSymbol || '');
  const [shareholders, setShareholders] = useState([]);
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
      const res = await axios.get(`/api/stocks/${target}/shareholders`);
      setShareholders(res.data);
      setActiveSymbol(target);
      setError(null);
    } catch (err) {
      setError(err.message);
      setShareholders([]);
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
    { field: 'name', headerName: 'Name', flex: 1.5, minWidth: 200 },
    {
      field: 'volume',
      headerName: 'Volume',
      flex: 0.8,
      minWidth: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'percent',
      headerName: 'Percent',
      flex: 0.6,
      minWidth: 80,
      type: 'number',
      valueFormatter: (params) => params.value != null ? `${params.value.toFixed(2)}%` : '-',
    },
    {
      field: 'change',
      headerName: 'Change',
      flex: 0.8,
      minWidth: 100,
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
            {val != null ? `${val > 0 ? '+' : ''}${val.toLocaleString()}` : '-'}
          </Typography>
        );
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Shareholders{activeSymbol ? ` - ${activeSymbol}` : ''}
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

          {shareholders.length > 0 && (
            <Chip
              label={`${shareholders.length} shareholders`}
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
              rows={shareholders}
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
