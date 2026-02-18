import { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import lazyRetry from './utils/lazyRetry';
import MainLayout from './layout/MainLayout';
import LoanMainLayout from './layout/LoanMainLayout';
import CryptoMainLayout from './layout/CryptoMainLayout';

// Loading fallback
const PageLoader = () => (
  <Center h="60vh"><Loader size="lg" /></Center>
);

// Per-route-group error boundary + suspense
function PageBoundary() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  );
}

// Lazy-loaded pages with automatic retry on CSS/chunk preload failures
const LandingPage = lazyRetry(() => import('./pages/LandingPage'), 'LandingPage');

// Markets
const Dashboard = lazyRetry(() => import('./pages/Dashboard'), 'Dashboard');
const MarketOverview = lazyRetry(() => import('./pages/MarketOverview'), 'MarketOverview');
const Heatmap = lazyRetry(() => import('./pages/Heatmap'), 'Heatmap');
const ClientType = lazyRetry(() => import('./pages/ClientType'), 'ClientType');
const Screener = lazyRetry(() => import('./pages/Screener'), 'Screener');
const MarketIndices = lazyRetry(() => import('./pages/MarketIndices'), 'MarketIndices');
const ETFNav = lazyRetry(() => import('./pages/ETFNav'), 'ETFNav');
const MarketPrices = lazyRetry(() => import('./pages/MarketPrices'), 'MarketPrices');
const Funds = lazyRetry(() => import('./pages/Funds'), 'Funds');

// Options & Derivatives
const Options = lazyRetry(() => import('./pages/Options'), 'Options');
const OptionsCalculator = lazyRetry(() => import('./pages/OptionsCalculator'), 'OptionsCalculator');
const OptionsExplorer = lazyRetry(() => import('./pages/OptionsExplorer'), 'OptionsExplorer');

// IME
const IMEOptions = lazyRetry(() => import('./pages/IMEOptions'), 'IMEOptions');
const IMEFutures = lazyRetry(() => import('./pages/IMEFutures'), 'IMEFutures');
const IMECertificates = lazyRetry(() => import('./pages/IMECertificates'), 'IMECertificates');
const IMEFunds = lazyRetry(() => import('./pages/IMEFunds'), 'IMEFunds');
const IMEForwards = lazyRetry(() => import('./pages/IMEForwards'), 'IMEForwards');
const IMEPhysical = lazyRetry(() => import('./pages/IMEPhysical'), 'IMEPhysical');

// Tools
const Codal = lazyRetry(() => import('./pages/Codal'), 'Codal');
const Watchlist = lazyRetry(() => import('./pages/Watchlist'), 'Watchlist');
const Compare = lazyRetry(() => import('./pages/Compare'), 'Compare');

// System
const SystemStatus = lazyRetry(() => import('./pages/SystemStatus'), 'SystemStatus');

// Stock detail
const StockDetail = lazyRetry(() => import('./pages/StockDetail'), 'StockDetail');
const Shareholders = lazyRetry(() => import('./pages/Shareholders'), 'Shareholders');
const TickTrades = lazyRetry(() => import('./pages/TickTrades'), 'TickTrades');

// Crypto
const CryptoDashboard = lazyRetry(() => import('./pages/crypto/CryptoDashboard'), 'CryptoDashboard');
const CoinDetail = lazyRetry(() => import('./pages/crypto/CoinDetail'), 'CoinDetail');
const CryptoHeatmap = lazyRetry(() => import('./pages/crypto/CryptoHeatmap'), 'CryptoHeatmap');
const CryptoCompare = lazyRetry(() => import('./pages/crypto/CryptoCompare'), 'CryptoCompare');
const MarketCapChart = lazyRetry(() => import('./pages/crypto/MarketCapChart'), 'MarketCapChart');

// Loans
const LoanLayout = lazyRetry(() => import('./pages/loans/LoanLayout'), 'LoanLayout');
const LoanDashboard = lazyRetry(() => import('./pages/loans/LoanDashboard'), 'LoanDashboard');
const LoanBanks = lazyRetry(() => import('./pages/loans/LoanBanks'), 'LoanBanks');
const LoanBankDetail = lazyRetry(() => import('./pages/loans/LoanBankDetail'), 'LoanBankDetail');
const LoansList = lazyRetry(() => import('./pages/loans/LoansList'), 'LoansList');
const LoanDetail = lazyRetry(() => import('./pages/loans/LoanDetail'), 'LoanDetail');
const LoanCompare = lazyRetry(() => import('./pages/loans/LoanCompare'), 'LoanCompare');
const LoanAnalytics = lazyRetry(() => import('./pages/loans/LoanAnalytics'), 'LoanAnalytics');
const LoanCalculator = lazyRetry(() => import('./pages/loans/LoanCalculator'), 'LoanCalculator');
const LoanCalculators = lazyRetry(() => import('./pages/loans/LoanCalculators'), 'LoanCalculators');
const LoanImport = lazyRetry(() => import('./pages/loans/LoanImport'), 'LoanImport');
const MyLoans = lazyRetry(() => import('./pages/loans/MyLoans'), 'MyLoans');

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard (market) */}
        <Route path="/dashboard" element={<MainLayout />}>
          <Route element={<PageBoundary />}>
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

            {/* Redirect old loan paths to new top-level /loans */}
            <Route path="loans/*" element={<LoanRedirect />} />
          </Route>
        </Route>

        {/* Crypto */}
        <Route path="/crypto" element={<CryptoMainLayout />}>
          <Route element={<PageBoundary />}>
            <Route index element={<CryptoDashboard />} />
            <Route path="coin/:symbol" element={<CoinDetail />} />
            <Route path="heatmap" element={<CryptoHeatmap />} />
            <Route path="compare" element={<CryptoCompare />} />
            <Route path="market-cap" element={<MarketCapChart />} />
          </Route>
        </Route>

        {/* Loans (top-level) */}
        <Route path="/loans" element={<LoanMainLayout />}>
          <Route element={<PageBoundary />}>
            <Route element={<LoanLayout />}>
              <Route index element={<LoanDashboard />} />
              <Route path="banks" element={<LoanBanks />} />
              <Route path="banks/:bankId" element={<LoanBankDetail />} />
              <Route path="list" element={<LoansList />} />
              <Route path="list/:bankId/:loanId" element={<LoanDetail />} />
              <Route path="compare" element={<LoanCompare />} />
              <Route path="analytics" element={<LoanAnalytics />} />
              <Route path="calculator" element={<LoanCalculator />} />
              <Route path="calculators" element={<LoanCalculators />} />
              <Route path="calculators/:type" element={<LoanCalculators />} />
              <Route path="import" element={<LoanImport />} />
              <Route path="my-loans" element={<MyLoans />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

/** Redirect /dashboard/loans/* → /loans/* for bookmarks/SEO */
function LoanRedirect() {
  const rest = window.location.pathname.replace(/^\/dashboard\/loans\/?/, '');
  return <Navigate to={`/loans/${rest}`} replace />;
}

export default App;
