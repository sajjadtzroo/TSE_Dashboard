import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import MainCard from '../components/MainCard';
import RefreshButton from '../components/RefreshButton';
import colors from '../theme/colors';

export default function Codal() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/codal');
      setReports(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'symbol', headerName: 'Symbol', flex: 0.6, minWidth: 80 },
    { field: 'company_name', headerName: 'Company', flex: 1, minWidth: 130 },
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {params.value}
            </Typography>
            {row.link_pdf && (
              <Chip
                label="PDF"
                size="small"
                component="a"
                href={row.link_pdf}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                sx={{
                  bgcolor: 'rgba(244,67,54,0.15)',
                  color: colors.errorMain,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 20,
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
        );
      },
    },
    { field: 'date_publish', headerName: 'Date', flex: 0.6, minWidth: 85 },
    { field: 'time_publish', headerName: 'Time', flex: 0.5, minWidth: 65 },
  ];

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 3 }}>Codal Reports</Typography>

      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <RefreshButton onRefreshComplete={fetchData} />

          <Chip
            label={`${reports.length} reports`}
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
              rows={reports}
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
