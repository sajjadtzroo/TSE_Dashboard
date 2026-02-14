import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import axios from 'axios'
import RefreshButton from '../components/RefreshButton'

export default function MarketOverview() {
  const [marketData, setMarketData] = useState([])
  const [sectors, setSectors] = useState([])
  const [selectedSector, setSelectedSector] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSectors()
  }, [])

  useEffect(() => {
    fetchMarketData()
  }, [selectedSector])

  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors')
      setSectors(res.data)
    } catch (err) {
      console.error('Error fetching sectors:', err)
    }
  }

  const fetchMarketData = async () => {
    try {
      setLoading(true)
      // Don't pass limit to get all stocks
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : ''
      const res = await axios.get(`/api/market-overview${params}`)
      setMarketData(res.data)
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
    { field: 'sector_name_fa', headerName: 'Sector', width: 150 },
    { field: 'date', headerName: 'Date', width: 110 },
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
      width: 100,
      type: 'number',
      valueFormatter: (params) => `${params.value?.toFixed(2)}%`,
      cellClassName: (params) =>
        params.value > 0 ? 'positive-change' : params.value < 0 ? 'negative-change' : '',
    },
    {
      field: 'price_min',
      headerName: 'Low',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'price_max',
      headerName: 'High',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'q_tot_tran_5j',
      headerName: 'Volume',
      width: 150,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'z_tot_tran',
      headerName: 'Trades',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString(),
    },
    {
      field: 'pe_ratio',
      headerName: 'P/E',
      width: 80,
      type: 'number',
      valueFormatter: (params) => params.value?.toFixed(2) || '-',
    },
    {
      field: 'eps',
      headerName: 'EPS',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || '-',
    },
    {
      field: 'market_cap',
      headerName: 'Market Cap',
      width: 150,
      type: 'number',
      valueFormatter: (params) => params.value ? (params.value / 1000000000).toFixed(2) + 'B' : '-',
    },
  ]

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Market Overview
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              label="Filter by Sector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Sectors</MenuItem>
              {sectors.map((sector) => (
                <MenuItem key={sector} value={sector}>
                  {sector}
                </MenuItem>
              ))}
            </TextField>

            <RefreshButton onRefreshComplete={fetchMarketData} />

            <Typography variant="body2" color="textSecondary">
              Showing {marketData.length} stocks
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={marketData}
                columns={columns}
                getRowId={(row) => row.ins_code}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                onRowClick={(params) => navigate(`/stock/${params.row.symbol}`)}
                sx={{
                  '& .positive-change': {
                    color: 'green',
                    fontWeight: 'bold',
                  },
                  '& .negative-change': {
                    color: 'red',
                    fontWeight: 'bold',
                  },
                  '& .MuiDataGrid-row:hover': {
                    cursor: 'pointer',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
