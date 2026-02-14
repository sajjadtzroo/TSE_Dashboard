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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import axios from 'axios'
import RefreshButton from '../components/RefreshButton'

export default function Funds() {
  const [fundsData, setFundsData] = useState([])
  const [sectors, setSectors] = useState([])
  const [selectedSector, setSelectedSector] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSectors()
  }, [])

  useEffect(() => {
    fetchFundsData()
  }, [selectedSector])

  const fetchSectors = async () => {
    try {
      const res = await axios.get('/api/sectors')
      // Filter for fund-related sectors
      const fundSectors = res.data.filter(s =>
        s && (s.includes('صندوق') || s.includes('سرمایه'))
      )
      setSectors(fundSectors)
    } catch (err) {
      console.error('Error fetching sectors:', err)
    }
  }

  const fetchFundsData = async () => {
    try {
      setLoading(true)
      const params = selectedSector ? `?sector=${encodeURIComponent(selectedSector)}` : ''
      const res = await axios.get(`/api/market-overview${params}`)

      // Filter for fund-like instruments
      const funds = res.data.filter(item => {
        const symbol = item.symbol?.toLowerCase() || ''
        const name = item.name_fa || ''
        const sector = item.sector_name_fa || ''

        return sector.includes('صندوق') ||
               sector.includes('سرمایه') ||
               name.includes('صندوق')
      })

      setFundsData(funds)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name_fa', headerName: 'Name', width: 250 },
    { field: 'sector_name_fa', headerName: 'Type', width: 180 },
    { field: 'date', headerName: 'Date', width: 110 },
    {
      field: 'price_last',
      headerName: 'NAV / Price',
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
      field: 'eps',
      headerName: 'EPS',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value?.toLocaleString() || 'N/A',
    },
  ]

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Investment Funds
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              label="Filter by Type"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              sx={{ minWidth: 250 }}
            >
              <MenuItem value="">All Fund Types</MenuItem>
              {sectors.map((sector) => (
                <MenuItem key={sector} value={sector}>
                  {sector}
                </MenuItem>
              ))}
            </TextField>

            <RefreshButton onRefreshComplete={fetchFundsData} />

            <Typography variant="body2" color="textSecondary">
              Showing {fundsData.length} funds
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
                rows={fundsData}
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
