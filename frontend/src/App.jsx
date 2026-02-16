import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import MarketOverview from './pages/MarketOverview';
import StockDetail from './pages/StockDetail';
import Funds from './pages/Funds';
import Options from './pages/Options';
import IMEOptions from './pages/IMEOptions';
import IMEFutures from './pages/IMEFutures';
import MarketIndices from './pages/MarketIndices';
import ETFNav from './pages/ETFNav';
import MarketPrices from './pages/MarketPrices';
import IMECertificates from './pages/IMECertificates';
import IMEFunds from './pages/IMEFunds';
import IMEForwards from './pages/IMEForwards';
import IMEPhysical from './pages/IMEPhysical';
import Shareholders from './pages/Shareholders';
import Codal from './pages/Codal';
import TickTrades from './pages/TickTrades';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="market" element={<MarketOverview />} />
        <Route path="market-indices" element={<MarketIndices />} />
        <Route path="etf-nav" element={<ETFNav />} />
        <Route path="market-prices" element={<MarketPrices />} />
        <Route path="funds" element={<Funds />} />
        <Route path="options" element={<Options />} />
        <Route path="codal" element={<Codal />} />
        <Route path="ime-options" element={<IMEOptions />} />
        <Route path="ime-futures" element={<IMEFutures />} />
        <Route path="ime-certificates" element={<IMECertificates />} />
        <Route path="ime-funds" element={<IMEFunds />} />
        <Route path="ime-forwards" element={<IMEForwards />} />
        <Route path="ime-physical" element={<IMEPhysical />} />
        <Route path="stock/:symbol" element={<StockDetail />} />
        <Route path="stock/:symbol/shareholders" element={<Shareholders />} />
        <Route path="stock/:symbol/tick-trades" element={<TickTrades />} />
      </Route>
    </Routes>
  );
}

export default App;
