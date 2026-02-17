import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import MainLayout from './layout/MainLayout';

// Loading fallback
const PageLoader = () => (
  <Center h="60vh"><Loader size="lg" /></Center>
);

// Lazy-loaded pages (code splitting)
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Markets
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MarketOverview = lazy(() => import('./pages/MarketOverview'));
const Heatmap = lazy(() => import('./pages/Heatmap'));
const ClientType = lazy(() => import('./pages/ClientType'));
const Screener = lazy(() => import('./pages/Screener'));
const MarketIndices = lazy(() => import('./pages/MarketIndices'));
const ETFNav = lazy(() => import('./pages/ETFNav'));
const MarketPrices = lazy(() => import('./pages/MarketPrices'));
const Funds = lazy(() => import('./pages/Funds'));

// Options & Derivatives
const Options = lazy(() => import('./pages/Options'));
const OptionsCalculator = lazy(() => import('./pages/OptionsCalculator'));
const OptionsExplorer = lazy(() => import('./pages/OptionsExplorer'));

// IME
const IMEOptions = lazy(() => import('./pages/IMEOptions'));
const IMEFutures = lazy(() => import('./pages/IMEFutures'));
const IMECertificates = lazy(() => import('./pages/IMECertificates'));
const IMEFunds = lazy(() => import('./pages/IMEFunds'));
const IMEForwards = lazy(() => import('./pages/IMEForwards'));
const IMEPhysical = lazy(() => import('./pages/IMEPhysical'));

// Tools
const Codal = lazy(() => import('./pages/Codal'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Compare = lazy(() => import('./pages/Compare'));

// System
const SystemStatus = lazy(() => import('./pages/SystemStatus'));

// Stock detail
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Shareholders = lazy(() => import('./pages/Shareholders'));
const TickTrades = lazy(() => import('./pages/TickTrades'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="market" element={<MarketOverview />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="client-type" element={<ClientType />} />
          <Route path="screener" element={<Screener />} />
          <Route path="market-indices" element={<MarketIndices />} />
          <Route path="etf-nav" element={<ETFNav />} />
          <Route path="market-prices" element={<MarketPrices />} />
          <Route path="funds" element={<Funds />} />

          <Route path="options" element={<Options />} />
          <Route path="options-calculator" element={<OptionsCalculator />} />
          <Route path="options-explorer" element={<OptionsExplorer />} />

          <Route path="ime-options" element={<IMEOptions />} />
          <Route path="ime-futures" element={<IMEFutures />} />
          <Route path="ime-certificates" element={<IMECertificates />} />
          <Route path="ime-funds" element={<IMEFunds />} />
          <Route path="ime-forwards" element={<IMEForwards />} />
          <Route path="ime-physical" element={<IMEPhysical />} />

          <Route path="codal" element={<Codal />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="compare" element={<Compare />} />

          <Route path="system" element={<SystemStatus />} />

          <Route path="stock/:symbol" element={<StockDetail />} />
          <Route path="stock/:symbol/shareholders" element={<Shareholders />} />
          <Route path="stock/:symbol/tick-trades" element={<TickTrades />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
