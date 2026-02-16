import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function IMECertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certType, setCertType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ime/certificates');
      setCertificates(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCerts = certType === 'all'
    ? certificates
    : certificates.filter((row) => String(row.cert_type) === certType);

  const columns = [
    { field: 'contract_code', headerName: 'Code', flex: 0.8, minWidth: 100 },
    { field: 'name', headerName: 'Name', flex: 1.2, minWidth: 160 },
    { field: 'commodity', headerName: 'Commodity', flex: 0.8, minWidth: 100 },
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
      field: 'close',
      headerName: 'Close',
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
      field: 'trades',
      headerName: 'Trades',
      flex: 0.5,
      minWidth: 65,
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

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>IME Certificates</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <Chip
            label="All"
            size="small"
            clickable
            onClick={() => setCertType('all')}
            sx={{
              bgcolor: certType === 'all' ? 'rgba(33,150,243,0.25)' : 'rgba(33,150,243,0.08)',
              color: colors.primaryMain,
              fontWeight: certType === 'all' ? 700 : 400,
              border: certType === 'all' ? `1px solid ${colors.primaryMain}` : '1px solid transparent',
            }}
          />
          <Chip
            label="General (1)"
            size="small"
            clickable
            onClick={() => setCertType('1')}
            sx={{
              bgcolor: certType === '1' ? 'rgba(33,150,243,0.25)' : 'rgba(33,150,243,0.08)',
              color: colors.primaryMain,
              fontWeight: certType === '1' ? 700 : 400,
              border: certType === '1' ? `1px solid ${colors.primaryMain}` : '1px solid transparent',
            }}
          />
          <Chip
            label="Coin/Saffron (2)"
            size="small"
            clickable
            onClick={() => setCertType('2')}
            sx={{
              bgcolor: certType === '2' ? 'rgba(33,150,243,0.25)' : 'rgba(33,150,243,0.08)',
              color: colors.primaryMain,
              fontWeight: certType === '2' ? 700 : 400,
              border: certType === '2' ? `1px solid ${colors.primaryMain}` : '1px solid transparent',
            }}
          />

          <RefreshButton onRefreshComplete={fetchData} />

          <Chip
            label={`${filteredCerts.length} certificates`}
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
              rows={filteredCerts}
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
