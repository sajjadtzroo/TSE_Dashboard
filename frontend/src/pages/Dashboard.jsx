import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import axios from 'axios'
import RefreshButton from '../components/RefreshButton'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentData, setRecentData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, marketRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/market-overview?limit=20')
      ])
      setStats(statsRes.data)
      setRecentData(marketRes.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name_fa', headerName: 'Name', width: 200 },
    {
      field: 'price_last',
      headerName: 'Last Price',
      width: 120,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_change_percent',
      headerName: 'Change %',
      width: 120,
      type: 'number',
      valueFormatter: (params) => `${params.value?.toFixed(2)}%`,
      cellClassName: (params) =>
        params.value > 0 ? 'positive-change' : params.value < 0 ? 'negative-change' : '',
    },
    {
      field: 'q_tot_tran_5j',
      headerName: 'Volume',
      width: 150,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
  ]

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Market Dashboard
        </Typography>
        <RefreshButton onRefreshComplete={fetchData} />
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Companies
              </Typography>
              <Typography variant="h4">{stats?.total_companies || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Today
              </Typography>
              <Typography variant="h4">{stats?.companies_with_data_today || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Volume
              </Typography>
              <Typography variant="h5">
                {stats?.total_volume_today?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Latest Date
              </Typography>
              <Typography variant="h6">{stats?.latest_date_formatted || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top 20 Active Stocks
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={recentData}
              columns={columns}
              getRowId={(row) => row.ins_code}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 20 },
                },
              }}
              pageSizeOptions={[10, 20]}
              onRowClick={(params) => navigate(`/stock/${params.row.symbol}`)}
              sx={{
                '& .positive-change': {
                  color: 'green',
                },
                '& .negative-change': {
                  color: 'red',
                },
                '& .MuiDataGrid-row:hover': {
                  cursor: 'pointer',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
