import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';

// بازارها (Markets)
import Dashboard from './pages/Dashboard';
import MarketOverview from './pages/MarketOverview';
import Heatmap from './pages/Heatmap';
import ClientType from './pages/ClientType';
import Screener from './pages/Screener';
import MarketIndices from './pages/MarketIndices';
import ETFNav from './pages/ETFNav';
import MarketPrices from './pages/MarketPrices';
import Funds from './pages/Funds';

// اختیار معامله و مشتقات (Options & Derivatives)
import Options from './pages/Options';
import OptionsCalculator from './pages/OptionsCalculator';
import OptionsExplorer from './pages/OptionsExplorer';

// بورس کالا (IME)
import IMEOptions from './pages/IMEOptions';
import IMEFutures from './pages/IMEFutures';
import IMECertificates from './pages/IMECertificates';
import IMEFunds from './pages/IMEFunds';
import IMEForwards from './pages/IMEForwards';
import IMEPhysical from './pages/IMEPhysical';

// ابزارها (Tools)
import Codal from './pages/Codal';
import Watchlist from './pages/Watchlist';
import Compare from './pages/Compare';

// سیستم (System)
import SystemStatus from './pages/SystemStatus';

// جزئیات نماد (Stock detail sub-pages)
import StockDetail from './pages/StockDetail';
import Shareholders from './pages/Shareholders';
import TickTrades from './pages/TickTrades';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* بازارها */}
        <Route index element={<Dashboard />} />
        <Route path="market" element={<MarketOverview />} />
        <Route path="heatmap" element={<Heatmap />} />
        <Route path="client-type" element={<ClientType />} />
        <Route path="screener" element={<Screener />} />
        <Route path="market-indices" element={<MarketIndices />} />
        <Route path="etf-nav" element={<ETFNav />} />
        <Route path="market-prices" element={<MarketPrices />} />
        <Route path="funds" element={<Funds />} />

        {/* اختیار معامله و مشتقات */}
        <Route path="options" element={<Options />} />
        <Route path="options-calculator" element={<OptionsCalculator />} />
        <Route path="options-explorer" element={<OptionsExplorer />} />

        {/* بورس کالا */}
        <Route path="ime-options" element={<IMEOptions />} />
        <Route path="ime-futures" element={<IMEFutures />} />
        <Route path="ime-certificates" element={<IMECertificates />} />
        <Route path="ime-funds" element={<IMEFunds />} />
        <Route path="ime-forwards" element={<IMEForwards />} />
        <Route path="ime-physical" element={<IMEPhysical />} />

        {/* ابزارها */}
        <Route path="codal" element={<Codal />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="compare" element={<Compare />} />

        {/* سیستم */}
        <Route path="system" element={<SystemStatus />} />

        {/* جزئیات نماد */}
        <Route path="stock/:symbol" element={<StockDetail />} />
        <Route path="stock/:symbol/shareholders" element={<Shareholders />} />
        <Route path="stock/:symbol/tick-trades" element={<TickTrades />} />

        {/* 404 — redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
