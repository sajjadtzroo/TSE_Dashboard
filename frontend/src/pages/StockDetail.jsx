import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import axios from 'axios'
import { COLORS } from '../theme/colors'

export default function StockDetail() {
  const { symbol } = useParams()
  const [stockData, setStockData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStockData()
  }, [symbol])

  const fetchStockData = async () => {
    try {
      setLoading(true)
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${symbol}`),
        axios.get(`/api/stocks/${symbol}/history?days=30`)
      ])
      setStockData(detailRes.data)
      setHistory(historyRes.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Error loading stock data: {error}</Alert>
  }

  const { company, latest_price, financial_indicator, client_type } = stockData

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {company.name_fa} ({company.symbol})
        </Typography>
        <Chip
          label={company.is_active ? 'Active' : 'Inactive'}
          color={company.is_active ? 'success' : 'default'}
        />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Sector: {company.sector_name_fa}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price Chart (30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[800]} />
                  <XAxis
                    dataKey="d_even"
                    stroke={COLORS.text.dark.secondary}
                    style={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke={COLORS.text.dark.secondary}
                    style={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: COLORS.background.darkSecondary,
                      border: `1px solid ${COLORS.gray[800]}`,
                      borderRadius: 8
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price_last"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                    name="Close Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Volume Chart
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray[800]} />
                    <XAxis
                      dataKey="d_even"
                      stroke={COLORS.text.dark.secondary}
                      style={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke={COLORS.text.dark.secondary}
                      style={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: COLORS.background.darkSecondary,
                        border: `1px solid ${COLORS.gray[800]}`,
                        borderRadius: 8
                      }}
                    />
                    <Bar dataKey="q_tot_tran_5j" fill={COLORS.secondary} name="Volume" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {latest_price && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Latest Price
                </Typography>
                <Typography variant="h4" sx={{ color: latest_price.price_change >= 0 ? COLORS.success : COLORS.error }}>
                  {latest_price.price_last?.toLocaleString()}
                </Typography>
                <Typography variant="body1" sx={{ color: latest_price.price_change >= 0 ? COLORS.success : COLORS.error }}>
                  {latest_price.price_change > 0 ? '+' : ''}
                  {latest_price.price_change?.toLocaleString()} (
                  {latest_price.price_change_percent?.toFixed(2)}%)
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Open: {latest_price.price_first?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    High: {latest_price.price_max?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Low: {latest_price.price_min?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Volume: {latest_price.q_tot_tran_5j?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Trades: {latest_price.z_tot_tran?.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {financial_indicator && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Financial Indicators
                </Typography>
                <Typography variant="body2">
                  P/E Ratio: {financial_indicator.pe_ratio?.toFixed(2) || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  EPS: {financial_indicator.eps?.toLocaleString() || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Market Cap: {financial_indicator.market_cap?.toLocaleString() || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  52-Week High: {financial_indicator.max_week?.toLocaleString() || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  52-Week Low: {financial_indicator.min_week?.toLocaleString() || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          )}

          {client_type && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Client Type Activity
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Individual Traders
                </Typography>
                <Typography variant="body2">
                  Buyers: {client_type.real_buyer_count?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2">
                  Sellers: {client_type.real_seller_count?.toLocaleString() || 0}
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Institutional Traders
                </Typography>
                <Typography variant="body2">
                  Buyers: {client_type.legal_buyer_count?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2">
                  Sellers: {client_type.legal_seller_count?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
