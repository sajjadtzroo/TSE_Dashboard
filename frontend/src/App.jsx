import { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import lazyRetry from './utils/lazyRetry';
const MainLayout = lazyRetry(() => import('./layout/MainLayout'), 'MainLayout');
const LoanMainLayout = lazyRetry(() => import('./layout/LoanMainLayout'), 'LoanMainLayout');
const CryptoMainLayout = lazyRetry(() => import('./layout/CryptoMainLayout'), 'CryptoMainLayout');
const CommodityMainLayout = lazyRetry(() => import('./layout/CommodityMainLayout'), 'CommodityMainLayout');
// PersianLoanMainLayout removed — merged into LoanMainLayout
const PortfolioMainLayout = lazyRetry(() => import('./layout/PortfolioMainLayout'), 'PortfolioMainLayout');
import { WidgetSizeProvider } from './core/context/WidgetSizeContext';

// Loading fallback
const PageLoader = () => (
  <Center h="60vh"><Loader size="lg" /></Center>
);

// ── Per-route document title + meta description (SEO) ────────────────
const SITE_NAME = 'فین‌هاب';
const ROUTE_META = [
  // Order matters: longer/more-specific paths first.
  { match: /^\/dashboard\/stock\/([^/]+)\/shareholders/, title: (m) => `سهامداران ${decodeURIComponent(m[1])}` },
  { match: /^\/dashboard\/stock\/([^/]+)\/tick-trades/, title: (m) => `معاملات ${decodeURIComponent(m[1])}` },
  { match: /^\/dashboard\/stock\/([^/]+)\/financials/, title: (m) => `صورت‌های مالی ${decodeURIComponent(m[1])}` },
  { match: /^\/dashboard\/stock\/([^/]+)/, title: (m) => `${decodeURIComponent(m[1])} — جزئیات نماد` },
  { match: /^\/dashboard\/index\/([^/]+)/, title: (m) => `شاخص ${decodeURIComponent(m[1])}` },
  { match: /^\/dashboard\/etf-nav\/compare/, title: 'مقایسه صندوق‌ها' },
  { match: /^\/dashboard\/etf-nav\/([^/]+)/, title: (m) => `صندوق ${decodeURIComponent(m[1])}` },
  { match: /^\/dashboard\/market-prices/, title: 'قیمت‌های بازار' },
  { match: /^\/dashboard\/market-indices/, title: 'شاخص‌های بازار' },
  { match: /^\/dashboard\/heatmap/, title: 'نقشه حرارتی بازار' },
  { match: /^\/dashboard\/screener/, title: 'فیلتر سهام' },
  { match: /^\/dashboard\/technical-analysis/, title: 'تحلیل تکنیکال' },
  { match: /^\/dashboard\/sector-rotation/, title: 'چرخش صنایع' },
  { match: /^\/dashboard\/options-calculator/, title: 'ماشین‌حساب اختیار معامله' },
  { match: /^\/dashboard\/options/, title: 'اختیار معامله' },
  { match: /^\/dashboard\/ime-/, title: 'بورس کالا' },
  { match: /^\/dashboard\/news/, title: 'اخبار بازار' },
  { match: /^\/dashboard\/codal/, title: 'کدال' },
  { match: /^\/dashboard\/watchlist/, title: 'دیده‌بان' },
  { match: /^\/dashboard\/compare/, title: 'مقایسه نمادها' },
  { match: /^\/dashboard\/funds/, title: 'صندوق‌های سرمایه‌گذاری' },
  { match: /^\/dashboard\/gold/, title: 'قیمت طلا' },
  { match: /^\/dashboard\/dollar/, title: 'قیمت دلار' },
  { match: /^\/dashboard\/client-type/, title: 'حقیقی و حقوقی' },
  { match: /^\/dashboard/, title: 'داشبورد بورس' },
  { match: /^\/crypto\/coin\/([^/]+)\/fundamentals/, title: (m) => `بنیادی ${decodeURIComponent(m[1])}` },
  { match: /^\/crypto\/coin\/([^/]+)/, title: (m) => `${decodeURIComponent(m[1])} — جزئیات رمزارز` },
  { match: /^\/crypto\/heatmap/, title: 'نقشه حرارتی رمزارز' },
  { match: /^\/crypto\/options/, title: 'اختیار معامله رمزارز' },
  { match: /^\/crypto\/futures/, title: 'فیوچرز رمزارز' },
  { match: /^\/crypto\/screener/, title: 'فیلتر رمزارز' },
  { match: /^\/crypto/, title: 'داشبورد رمزارز' },
  { match: /^\/loans\/list\/([^/]+)\/([^/]+)/, title: (m) => `جزئیات وام` },
  { match: /^\/loans\/calculator/, title: 'ماشین‌حساب وام' },
  { match: /^\/loans\/compare/, title: 'مقایسه وام‌ها' },
  { match: /^\/loans\/import/, title: 'افزودن وام' },
  { match: /^\/loans\/my/, title: 'وام‌های من' },
  { match: /^\/loans/, title: 'وام‌های بانکی' },
  { match: /^\/portfolio/, title: 'سبد سرمایه‌گذاری' },
  { match: /^\/login/, title: 'ورود' },
  { match: /^\/register/, title: 'ثبت‌نام' },
  { match: /^\/profile/, title: 'پروفایل کاربری' },
  { match: /^\/pricing/, title: 'تعرفه‌ها' },
  { match: /^\/about/, title: 'درباره ما' },
  { match: /^\/tutorial/, title: 'آموزش' },
  { match: /^\/comparison/, title: 'مقایسه' },
  { match: /^\/financial-modeling/, title: 'مدل‌سازی مالی' },
  { match: /^\/market-select/, title: 'انتخاب بازار' },
  { match: /^\/$/, title: `${SITE_NAME} — داشبورد بورس تهران، رمزارز و وام بانکی`, isFull: true },
];

function resolveTitle(pathname) {
  for (const r of ROUTE_META) {
    const m = pathname.match(r.match);
    if (m) {
      const t = typeof r.title === 'function' ? r.title(m) : r.title;
      return r.isFull ? t : `${t} | ${SITE_NAME}`;
    }
  }
  return `${SITE_NAME} — داشبورد بورس تهران`;
}

function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = resolveTitle(pathname);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', `https://finhub.ir${pathname}`);
  }, [pathname]);
  return null;
}

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
const MarketSelectPage = lazyRetry(() => import('./pages/MarketSelectPage'), 'MarketSelectPage');
const RegisterPage = lazyRetry(() => import('./pages/RegisterPage'), 'RegisterPage');
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'), 'ProfilePage');
const TutorialPage = lazyRetry(() => import('./pages/TutorialPage'), 'TutorialPage');
const AboutPage = lazyRetry(() => import('./pages/AboutPage'), 'AboutPage');
const PricingPage = lazyRetry(() => import('./pages/PricingPage'), 'PricingPage');
const ComparisonPage = lazyRetry(() => import('./pages/ComparisonPage'), 'ComparisonPage');

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
const DollarPrices = lazyRetry(() => import('./pages/DollarPrices'), 'DollarPrices');
const Funds = lazyRetry(() => import('./pages/Funds'), 'Funds');
const TechnicalAnalysis = lazyRetry(() => import('./pages/TechnicalAnalysis'), 'TechnicalAnalysis');
const SectorRotation = lazyRetry(() => import('./pages/SectorRotation'), 'SectorRotation');

// Options & Derivatives
const Options = lazyRetry(() => import('./pages/Options'), 'Options');
const OptionsCalculator = lazyRetry(() => import('./pages/OptionsCalculator'), 'OptionsCalculator');
const OptionsExplorer = lazyRetry(() => import('./pages/OptionsExplorer'), 'OptionsExplorer');
const OptionsAnalytics = lazyRetry(() => import('./pages/OptionsAnalytics'), 'OptionsAnalytics');
const OptionsBinomial = lazyRetry(() => import('./pages/OptionsBinomial'), 'OptionsBinomial');
const OptionsHedging = lazyRetry(() => import('./pages/OptionsHedging'), 'OptionsHedging');
const OptionsMonteCarlo = lazyRetry(() => import('./pages/OptionsMonteCarlo'), 'OptionsMonteCarlo');
const OptionsExotic = lazyRetry(() => import('./pages/OptionsExotic'), 'OptionsExotic');
const OptionsBacktest = lazyRetry(() => import('./pages/OptionsBacktest'), 'OptionsBacktest');
const OptionsStochasticVol = lazyRetry(() => import('./pages/OptionsStochasticVol'), 'OptionsStochasticVol');

// IME
const IMEOptions = lazyRetry(() => import('./pages/IMEOptions'), 'IMEOptions');
const IMEFutures = lazyRetry(() => import('./pages/IMEFutures'), 'IMEFutures');
const IMECertificates = lazyRetry(() => import('./pages/IMECertificates'), 'IMECertificates');
const IMEFunds = lazyRetry(() => import('./pages/IMEFunds'), 'IMEFunds');
const IMEForwards = lazyRetry(() => import('./pages/IMEForwards'), 'IMEForwards');
const IMEPhysical = lazyRetry(() => import('./pages/IMEPhysical'), 'IMEPhysical');

// Tools
const NewsPage = lazyRetry(() => import('./pages/NewsPage'), 'NewsPage');
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
const PortfolioOptimization = lazyRetry(() => import('./pages/portfolio/PortfolioOptimization'), 'PortfolioOptimization');
const TransactionLedger = lazyRetry(() => import('./pages/portfolio/TransactionLedger'), 'TransactionLedger');
const ProfitAndLoss = lazyRetry(() => import('./pages/portfolio/ProfitAndLoss'), 'ProfitAndLoss');
const PortfolioGoals = lazyRetry(() => import('./pages/portfolio/PortfolioGoals'), 'PortfolioGoals');
const PortfolioAlerts = lazyRetry(() => import('./pages/portfolio/PortfolioAlerts'), 'PortfolioAlerts');
const PortfolioTax = lazyRetry(() => import('./pages/portfolio/PortfolioTax'), 'PortfolioTax');

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
const CryptoOptions = lazyRetry(() => import('./pages/crypto/CryptoOptions'), 'CryptoOptions');
const CryptoOptionsCalculator = lazyRetry(() => import('./pages/crypto/CryptoOptionsCalculator'), 'CryptoOptionsCalculator');
const CryptoOptionsExplorer = lazyRetry(() => import('./pages/crypto/CryptoOptionsExplorer'), 'CryptoOptionsExplorer');
const CryptoOptionsBinomial = lazyRetry(() => import('./pages/crypto/CryptoOptionsBinomial'), 'CryptoOptionsBinomial');
const CryptoOptionsHedging = lazyRetry(() => import('./pages/crypto/CryptoOptionsHedging'), 'CryptoOptionsHedging');
const CryptoOptionsAnalytics = lazyRetry(() => import('./pages/crypto/CryptoOptionsAnalytics'), 'CryptoOptionsAnalytics');
const CryptoFutures = lazyRetry(() => import('./pages/crypto/CryptoFutures'), 'CryptoFutures');
const CryptoFuturesCalculator = lazyRetry(() => import('./pages/crypto/CryptoFuturesCalculator'), 'CryptoFuturesCalculator');
const CryptoScreener = lazyRetry(() => import('./pages/crypto/CryptoScreener'), 'CryptoScreener');
const CryptoTechnicalAnalysis = lazyRetry(() => import('./pages/crypto/CryptoTechnicalAnalysis'), 'CryptoTechnicalAnalysis');
const CryptoCategoryRotation = lazyRetry(() => import('./pages/crypto/CryptoCategoryRotation'), 'CryptoCategoryRotation');
const CryptoRiskAnalytics = lazyRetry(() => import('./pages/crypto/CryptoRiskAnalytics'), 'CryptoRiskAnalytics');
const CryptoNewsSentiment = lazyRetry(() => import('./pages/crypto/CryptoNewsSentiment'), 'CryptoNewsSentiment');

// Commodity
const CommodityDashboard = lazyRetry(() => import('./pages/commodity/CommodityDashboard'), 'CommodityDashboard');
const CommodityHeatmap = lazyRetry(() => import('./pages/commodity/CommodityHeatmap'), 'CommodityHeatmap');
const CommodityCompare = lazyRetry(() => import('./pages/commodity/CommodityCompare'), 'CommodityCompare');
const CommodityWatchlist = lazyRetry(() => import('./pages/commodity/CommodityWatchlist'), 'CommodityWatchlist');
const CommodityCharts = lazyRetry(() => import('./pages/commodity/CommodityCharts'), 'CommodityCharts');
const CommodityDetail = lazyRetry(() => import('./pages/commodity/CommodityDetail'), 'CommodityDetail');

// Persian Loan
const PersianLoanHome = lazyRetry(() => import('./pages/persian-loan/PersianLoanHome'), 'PersianLoanHome');
const PersianLoanChat = lazyRetry(() => import('./pages/persian-loan/PersianLoanChat'), 'PersianLoanChat');

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
    <RouteTitle />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing & info pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/market-select" element={<MarketSelectPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/comparison" element={<ComparisonPage />} />
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
            <Route path="dollar" element={<DollarPrices />} />
            <Route path="funds" element={<Funds />} />
            <Route path="technical-analysis" element={<TechnicalAnalysis />} />
            <Route path="sector-rotation" element={<SectorRotation />} />

            <Route path="options" element={<Options />} />
            <Route path="options-calculator" element={<OptionsCalculator />} />
            <Route path="options-explorer" element={<OptionsExplorer />} />
            <Route path="options-analytics" element={<OptionsAnalytics />} />
            <Route path="options-binomial" element={<OptionsBinomial />} />
            <Route path="options-hedging" element={<OptionsHedging />} />
            <Route path="options-monte-carlo" element={<OptionsMonteCarlo />} />
            <Route path="options-exotic" element={<OptionsExotic />} />
            <Route path="options-backtest" element={<OptionsBacktest />} />
            <Route path="options-stochastic-vol" element={<OptionsStochasticVol />} />

            <Route path="ime-options" element={<IMEOptions />} />
            <Route path="ime-futures" element={<IMEFutures />} />
            <Route path="ime-certificates" element={<IMECertificates />} />
            <Route path="ime-funds" element={<IMEFunds />} />
            <Route path="ime-forwards" element={<IMEForwards />} />
            <Route path="ime-physical" element={<IMEPhysical />} />

            <Route path="news" element={<NewsPage />} />
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
            <Route path="options" element={<CryptoOptions />} />
            <Route path="options/calculator" element={<CryptoOptionsCalculator />} />
            <Route path="options/explorer" element={<CryptoOptionsExplorer />} />
            <Route path="options/binomial" element={<CryptoOptionsBinomial />} />
            <Route path="options/hedging" element={<CryptoOptionsHedging />} />
            <Route path="options/analytics" element={<CryptoOptionsAnalytics />} />
            <Route path="futures" element={<CryptoFutures />} />
            <Route path="futures/calculator" element={<CryptoFuturesCalculator />} />
            <Route path="screener" element={<CryptoScreener />} />
            <Route path="technical-analysis" element={<CryptoTechnicalAnalysis />} />
            <Route path="category-rotation" element={<CryptoCategoryRotation />} />
            <Route path="risk-analytics" element={<CryptoRiskAnalytics />} />
            <Route path="news-sentiment" element={<CryptoNewsSentiment />} />
          </Route>
        </Route>

        {/* Commodity (top-level) */}
        <Route path="/commodity" element={<CommodityMainLayout />}>
          <Route element={<PageBoundary />}>
            <Route index element={<CommodityDashboard />} />
            <Route path="heatmap" element={<CommodityHeatmap />} />
            <Route path="compare" element={<CommodityCompare />} />
            <Route path="watchlist" element={<CommodityWatchlist />} />
            <Route path="charts" element={<CommodityCharts />} />
            <Route path=":symbol" element={<CommodityDetail />} />
          </Route>
        </Route>

        {/* Redirect old /persian-loan paths to unified /loans/advisor */}
        <Route path="/persian-loan" element={<Navigate to="/loans/advisor" replace />} />
        <Route path="/persian-loan/chat" element={<Navigate to="/loans/advisor/chat" replace />} />

        {/* Loans (unified: traditional loans + وام‌یار advisor) */}
        <Route path="/loans" element={<LoanMainLayout />}>
          <Route element={<PageBoundary />}>
            {/* وام‌یار advisor */}
            <Route path="advisor" element={<PersianLoanHome />} />
            <Route path="advisor/chat" element={<PersianLoanChat />} />

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
              <Route path="optimization" element={<PortfolioOptimization />} />
              <Route path="transactions" element={<TransactionLedger />} />
              <Route path="pnl" element={<ProfitAndLoss />} />
              <Route path="tax" element={<PortfolioTax />} />
              <Route path="goals" element={<PortfolioGoals />} />
              <Route path="alerts" element={<PortfolioAlerts />} />
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
