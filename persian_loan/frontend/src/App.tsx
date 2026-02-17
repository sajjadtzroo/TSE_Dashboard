/**
 * App Entry Point
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { RTLProvider } from './theme/RTLProvider';
import { LoanSelectionProvider } from './context/LoanSelectionContext';
import { SidebarProvider } from './context/SidebarContext';
import { MainLayout } from './components/layout';
import { LoadingPage } from './components/ui';
import { LogViewer } from './components/LogViewer';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Banks = lazy(() => import('./pages/Banks'));
const BankDetail = lazy(() => import('./pages/BankDetail'));
const Loans = lazy(() => import('./pages/Loans'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Import = lazy(() => import('./pages/Import'));
const MyLoans = lazy(() => import('./pages/MyLoans'));
const Compare = lazy(() => import('./pages/Compare'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Calculators = lazy(() => import('./pages/Calculators'));
const LoanOptimizer = lazy(() => import('./features/loan-optimizer/LoanOptimizerPage'));
const MuiThemeTest = lazy(() => import('./components/test/MuiThemeTest').then(m => ({ default: m.MuiThemeTest })));

function App() {
  // Debug: Check environment
  console.log('🚀 App loaded - DEV mode:', import.meta.env.DEV);
  console.log('🚀 App loaded - MODE:', import.meta.env.MODE);

  return (
    <RTLProvider>
      <LoanSelectionProvider>
        <SidebarProvider>
          <Suspense fallback={<LoadingPage />}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="banks" element={<Banks />} />
                  <Route path="banks/:bankId" element={<BankDetail />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="loans/:bankId/:loanId" element={<LoanDetail />} />
                  <Route path="compare" element={<Compare />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="calculator" element={<Calculator />} />
                  <Route path="calculators" element={<Calculators />} />
                  <Route path="calculators/:type" element={<Calculators />} />
                  <Route path="loan-optimizer" element={<LoanOptimizer />} />
                  <Route path="import" element={<Import />} />
                  <Route path="my-loans" element={<MyLoans />} />
                  <Route path="mui-test" element={<MuiThemeTest />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </Suspense>
          <Toaster />
          {/* Log Viewer - Only in development */}
          {import.meta.env.DEV && <LogViewer />}
        </SidebarProvider>
      </LoanSelectionProvider>
    </RTLProvider>
  );
}

export default App;
