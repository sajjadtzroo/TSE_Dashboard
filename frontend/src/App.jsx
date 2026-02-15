import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import MarketOverview from './pages/MarketOverview';
import StockDetail from './pages/StockDetail';
import Funds from './pages/Funds';
import Options from './pages/Options';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="market" element={<MarketOverview />} />
        <Route path="funds" element={<Funds />} />
        <Route path="options" element={<Options />} />
        <Route path="stock/:symbol" element={<StockDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
