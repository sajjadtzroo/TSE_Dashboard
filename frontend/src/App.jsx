import { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import lazyRetry from './utils/lazyRetry';
import MainLayout from './layout/MainLayout';
import LoanMainLayout from './layout/LoanMainLayout';
import CryptoMainLayout from './layout/CryptoMainLayout';
import PortfolioMainLayout from './layout/PortfolioMainLayout';
import { WidgetSizeProvider } from './core/context/WidgetSizeContext';

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
const LoginPage = lazyRetry(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyRetry(() => import('./pages/RegisterPage'), 'RegisterPage');
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'), 'ProfilePage');
const TutorialPage = lazyRetry(() => import('./pages/TutorialPage'), 'TutorialPage');
const AboutPage = lazyRetry(() => import('./pages/AboutPage'), 'AboutPage');
const PricingPage = lazyRetry(() => import('./pages/PricingPage'), 'PricingPage');

// Markets
const Dashboard = lazyRetry(() => import('./pages/Dashboard'), 'Dashboard');
const MarketOverview = lazyRetry(() => import('./pages/MarketOverview'), 'MarketOverview');
const Heatmap = lazyRetry(() => import('./pages/Heatmap'), 'Heatmap');
const ClientType = lazyRetry(() => import('./pages/ClientType'), 'ClientType');
const Screener = lazyRetry(() => import('./pages/Screener'), 'Screener');
const MarketIndices = lazyRetry(() => import('./pages/MarketIndices'), 'MarketIndices');
const ETFNav = lazyRetry(() => import('./pages/ETFNav'), 'ETFNav');
const ETFDetail = lazyRetry(() => import('./pages/ETFDetail'), 'ETFDetail');
const ETFComparePage = lazyRetry(() => import('./pages/etf/ETFComparePage'), 'ETFComparePage');
const MarketPrices = lazyRetry(() => import('./pages/MarketPrices'), 'MarketPrices');
const GoldPrices = lazyRetry(() => import('./pages/GoldPrices'), 'GoldPrices');
const Funds = lazyRetry(() => import('./pages/Funds'), 'Funds');
const TechnicalAnalysis = lazyRetry(() => import('./pages/TechnicalAnalysis'), 'TechnicalAnalysis');

// Options & Derivatives
const Options = lazyRetry(() => import('./pages/Options'), 'Options');
const OptionsCalculator = lazyRetry(() => import('./pages/OptionsCalculator'), 'OptionsCalculator');
const OptionsExplorer = lazyRetry(() => import('./pages/OptionsExplorer'), 'OptionsExplorer');
const OptionsAnalytics = lazyRetry(() => import('./pages/OptionsAnalytics'), 'OptionsAnalytics');
const OptionsBinomial = lazyRetry(() => import('./pages/OptionsBinomial'), 'OptionsBinomial');
const OptionsHedging = lazyRetry(() => import('./pages/OptionsHedging'), 'OptionsHedging');

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
const Documents = lazyRetry(() => import('./pages/Documents'), 'Documents');
// Portfolio (top-level section)
const PortfolioProvider = lazyRetry(() => import('./pages/portfolio/PortfolioProvider'), 'PortfolioProvider');
const PortfolioDashboard = lazyRetry(() => import('./pages/portfolio/PortfolioDashboard'), 'PortfolioDashboard');
const PortfolioPerformance = lazyRetry(() => import('./pages/portfolio/PortfolioPerformance'), 'PortfolioPerformance');
const PortfolioRisk = lazyRetry(() => import('./pages/portfolio/PortfolioRisk'), 'PortfolioRisk');
const PortfolioSimulation = lazyRetry(() => import('./pages/portfolio/PortfolioSimulation'), 'PortfolioSimulation');
const PortfolioAnalyst = lazyRetry(() => import('./pages/portfolio/PortfolioAnalyst'), 'PortfolioAnalyst');

// Financial Modeling
const FinancialModelingPage = lazyRetry(() => import('./pages/FinancialModelingPage'), 'FinancialModelingPage');

// System
const SystemStatus = lazyRetry(() => import('./pages/SystemStatus'), 'SystemStatus');

// Stock detail
const StockDetail = lazyRetry(() => import('./pages/StockDetail'), 'StockDetail');
const IndexDetail = lazyRetry(() => import('./pages/IndexDetail'), 'IndexDetail');
const Shareholders = lazyRetry(() => import('./pages/Shareholders'), 'Shareholders');
const TickTrades = lazyRetry(() => import('./pages/TickTrades'), 'TickTrades');
const StockFinancials = lazyRetry(() => import('./pages/StockFinancials'), 'StockFinancials');

// Crypto
const CryptoDashboard = lazyRetry(() => import('./pages/crypto/CryptoDashboard'), 'CryptoDashboard');
const CoinDetail = lazyRetry(() => import('./pages/crypto/CoinDetail'), 'CoinDetail');
const CoinFundamentals = lazyRetry(() => import('./pages/crypto/CoinFundamentals'), 'CoinFundamentals');
const CryptoHeatmap = lazyRetry(() => import('./pages/crypto/CryptoHeatmap'), 'CryptoHeatmap');
const CryptoCompare = lazyRetry(() => import('./pages/crypto/CryptoCompare'), 'CryptoCompare');
const CryptoWatchlist = lazyRetry(() => import('./pages/crypto/CryptoWatchlist'), 'CryptoWatchlist');
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
const LoanAllMetrics = lazyRetry(() => import('./pages/loans/LoanAllMetrics'), 'LoanAllMetrics');

function App() {
  return (
    <WidgetSizeProvider>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing & info pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/financial-modeling" element={<FinancialModelingPage />} />

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
            <Route path="etf-nav/compare" element={<ETFComparePage />} />
            <Route path="etf-nav/:symbol" element={<ETFDetail />} />
            <Route path="market-prices" element={<MarketPrices />} />
            <Route path="gold" element={<GoldPrices />} />
            <Route path="funds" element={<Funds />} />
            <Route path="technical-analysis" element={<TechnicalAnalysis />} />

            <Route path="options" element={<Options />} />
            <Route path="options-calculator" element={<OptionsCalculator />} />
            <Route path="options-explorer" element={<OptionsExplorer />} />
            <Route path="options-analytics" element={<OptionsAnalytics />} />
            <Route path="options-binomial" element={<OptionsBinomial />} />
            <Route path="options-hedging" element={<OptionsHedging />} />

            <Route path="ime-options" element={<IMEOptions />} />
            <Route path="ime-futures" element={<IMEFutures />} />
            <Route path="ime-certificates" element={<IMECertificates />} />
            <Route path="ime-funds" element={<IMEFunds />} />
            <Route path="ime-forwards" element={<IMEForwards />} />
            <Route path="ime-physical" element={<IMEPhysical />} />

            <Route path="codal" element={<Codal />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="compare" element={<Compare />} />
            <Route path="documents" element={<Documents />} />
            <Route path="portfolio" element={<PortfolioRedirect />} />

            <Route path="system" element={<SystemStatus />} />

            <Route path="stock/:symbol" element={<StockDetail />} />
            <Route path="stock/:symbol/shareholders" element={<Shareholders />} />
            <Route path="stock/:symbol/tick-trades" element={<TickTrades />} />
            <Route path="stock/:symbol/financials" element={<StockFinancials />} />
            <Route path="index/:name" element={<IndexDetail />} />

            {/* Redirect old loan paths to new top-level /loans */}
            <Route path="loans/*" element={<LoanRedirect />} />
          </Route>
        </Route>

        {/* Crypto */}
        <Route path="/crypto" element={<CryptoMainLayout />}>
          <Route element={<PageBoundary />}>
            <Route index element={<CryptoDashboard />} />
            <Route path="coin/:symbol" element={<CoinDetail />} />
            <Route path="coin/:symbol/fundamentals" element={<CoinFundamentals />} />
            <Route path="heatmap" element={<CryptoHeatmap />} />
            <Route path="compare" element={<CryptoCompare />} />
            <Route path="watchlist" element={<CryptoWatchlist />} />
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
              <Route path="all-metrics" element={<LoanAllMetrics />} />
            </Route>
          </Route>
        </Route>

        {/* Portfolio (top-level) */}
        <Route path="/portfolio" element={<PortfolioMainLayout />}>
          <Route element={<PageBoundary />}>
            <Route element={<PortfolioProvider />}>
              <Route index element={<PortfolioDashboard />} />
              <Route path="performance" element={<PortfolioPerformance />} />
              <Route path="risk" element={<PortfolioRisk />} />
              <Route path="simulation" element={<PortfolioSimulation />} />
              <Route path="analyst" element={<PortfolioAnalyst />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
    </WidgetSizeProvider>
  );
}

/** Redirect /dashboard/loans/* → /loans/* for bookmarks/SEO */
function LoanRedirect() {
  const rest = window.location.pathname.replace(/^\/dashboard\/loans\/?/, '');
  return <Navigate to={`/loans/${rest}`} replace />;
}

/** Redirect /dashboard/portfolio → /portfolio */
function PortfolioRedirect() {
  return <Navigate to="/portfolio" replace />;
}

export default App;
