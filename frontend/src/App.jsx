import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/Layout'
import MarketOverview from './pages/MarketOverview'
import StockDetail from './pages/StockDetail'
import Dashboard from './pages/Dashboard'
import Funds from './pages/Funds'

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/market" element={<MarketOverview />} />
          <Route path="/funds" element={<Funds />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App
